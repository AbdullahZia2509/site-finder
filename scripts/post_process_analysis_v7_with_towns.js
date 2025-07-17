import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";

// --- Configuration ---
const INPUT_CSV_FILE = "commercial_land_analysis_results.csv";
const LOOKUP_CSV_FILE = "towns_data.csv";
const OUTPUT_CSV_FILE = "post_processed_commercial_land_data.csv";
const SQFT_TO_ACRES_FACTOR = 43560; // 1 acre = 43,560 sq ft

// --- Helper Functions ---

// (Keep all helper functions: parseNumeric, extractTown, calculateScore, assignRanks as they are)

/**
 * Safely parses a string value into a numeric format, handling various
 * non-numeric characters and common text values like 'POA' or 'Ask agent'.
 * @param {string} value - The input string to parse.
 * @returns {number|NaN} The parsed number or NaN if parsing fails.
 */
function parseNumeric(value) {
  if (typeof value !== "string") {
    return NaN;
  }
  const lowerValue = value.toLowerCase();
  if (
    lowerValue === "poa" ||
    lowerValue === "ask agent" ||
    lowerValue === "offers invited" ||
    lowerValue.trim() === ""
  ) {
    return NaN;
  }
  // Remove all non-digit, non-decimal, non-hyphen characters
  // Keep hyphen for ranges like "56,192-346,738"
  const cleanedValue = lowerValue.replace(/[^0-9.-]/g, "");

  // Handle ranges, take the first number
  if (cleanedValue.includes("-")) {
    const parts = cleanedValue.split("-");
    return parseFloat(parts[0]);
  }
  return parseFloat(cleanedValue);
}

/**
 * Extracts a "town" from a brokerDisplayAddress string.
 * This is a simple heuristic: takes the last non-empty comma-separated part of the address.
 * Adjust as needed for different address formats.
 * @param {string} address - The brokerDisplayAddress string.
 * @returns {string} The extracted town or empty string.
 */
function extractTown(address) {
  if (typeof address !== "string" || address.trim() === "") return "";
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");
  if (parts.length > 0) {
    return parts[parts.length - 1];
  }
  return "";
}

/**
 * Calculates a score for a given value based on min/max range.
 * Can be configured for "high is good" (direct) or "low is good" (inverse) metrics.
 * @param {number} value - The value to score.
 * @param {number} min - The minimum value in the dataset for this metric.
 * @param {number} max - The maximum value in the dataset for this metric.
 * @param {number} maxScore - The maximum score to assign (e.g., 20).
 * @param {number} minScore - The minimum score to assign (e.g., 0).
 * @param {boolean} highIsGood - True if higher values should receive higher scores, false if lower values should receive higher scores.
 * @returns {number} The calculated score.
 */
function calculateScore(
  value,
  min,
  max,
  maxScore = 20,
  minScore = 0,
  highIsGood = true
) {
  if (isNaN(value)) {
    return minScore; // Default to minimum score for unparseable values
  }
  if (min === max) {
    return maxScore; // If all values are the same, the "best" score is assigned (maxScore)
  }

  let score;
  if (highIsGood) {
    // Direct proportionality: (value - min) / (max - min) maps min to 0, max to 1
    // Then scale to (maxScore - minScore) range and shift by minScore
    score = ((value - min) / (max - min)) * (maxScore - minScore) + minScore;
  } else {
    // Inverse proportionality: (max - value) / (max - min) maps min to 1, max to 0
    // Then scale to (maxScore - minScore) range and shift by minScore
    score = ((max - value) / (max - min)) * (maxScore - minScore) + minScore;
  }

  return Math.max(minScore, Math.min(maxScore, score)); // Ensure score is within bounds
}

/**
 * Assigns ranks based on a score column.
 * Handles ties by assigning the same rank to tied scores, then skipping ranks.
 * @param {Array<Object>} data - The array of objects (rows) to rank.
 * @param {string} scoreColumn - The name of the column containing the scores.
 * @param {string} rankColumn - The name of the column where ranks will be stored.
 * @param {string} sortOrder - 'asc' for ascending rank (lowest score = rank 1), 'desc' for descending (highest score = rank 1).
 */
function assignRanks(data, scoreColumn, rankColumn, sortOrder = "desc") {
  // Sort the data based on the score column
  data.sort((a, b) => {
    const scoreA = a[scoreColumn];
    const scoreB = b[scoreColumn];

    // Handle NaN values during sorting: NaNs go to the end for 'desc' (worst rank), beginning for 'asc' (best rank)
    if (isNaN(scoreA) && isNaN(scoreB)) return 0;
    if (isNaN(scoreA)) return sortOrder === "desc" ? 1 : -1;
    if (isNaN(scoreB)) return sortOrder === "desc" ? -1 : 1;

    if (sortOrder === "desc") {
      return scoreB - scoreA; // Highest score first
    } else {
      return scoreA - scoreB; // Lowest score first
    }
  });

  // Assign ranks
  let currentRank = 1;
  for (let i = 0; i < data.length; i++) {
    // If the current score is different from the previous one, update the rank
    // Or if the index is 0 (first element)
    if (i > 0 && data[i][scoreColumn] !== data[i - 1][scoreColumn]) {
      currentRank = i + 1;
    }
    data[i][rankColumn] = currentRank;
  }
}

// --- Main Processing Function ---
async function processColumns() {
  console.time("Total Processing Time");
  console.log("[START] Initiating column processing script.");

  let records = [];
  let townLookup = new Map();

  try {
    // Read and parse the lookup CSV file first
    console.log(`[INFO] Loading lookup data from ${LOOKUP_CSV_FILE}...`);
    const lookupFileContent = await fs.readFile(
      path.join(process.cwd(), LOOKUP_CSV_FILE),
      { encoding: "utf8" }
    );

    await new Promise((resolve, reject) => {
      parse(
        lookupFileContent,
        {
          columns: true, // Treat the first row as column headers
          skip_empty_lines: true,
          // Add this to handle potential issues with initial character parsing
          // This tells csv-parse to trim whitespace from parsed values by default
          ltrim: true,
          rtrim: true,
        },
        (err, output) => {
          if (err) {
            console.error("[ERROR] CSV Parse Error in lookup file:", err);
            return reject(err);
          }
          output.forEach((row, index) => {
            // Log raw values before processing
            // console.log(`[DEBUG] Lookup Row ${index}: Raw ID="${row.id}", Raw Town="${row.Town}"`);

            if (row.id && row.Town) {
              const lookupId = row.id.trim();
              const lookupTown = row.Town.trim();
              townLookup.set(lookupId, lookupTown);
              // Log what is actually being stored in the map
              // console.log(`[DEBUG] Lookup Map Stored: Key="${lookupId}", Value="${lookupTown}"`);
            } else {
              console.warn(
                `[WARN] Skipping lookup row ${index} due to missing 'id' or 'Town' column. Raw row:`,
                row
              );
            }
          });
          console.log(`[INFO] Loaded ${townLookup.size} town lookup entries.`);
          resolve();
        }
      );
    });

    // Read the main input CSV file
    const fileContent = await fs.readFile(
      path.join(process.cwd(), INPUT_CSV_FILE),
      { encoding: "utf8" }
    );

    // Parse the CSV content
    await new Promise((resolve, reject) => {
      parse(
        fileContent,
        {
          columns: true, // Treat the first row as column headers
          skip_empty_lines: true,
          // Add this for the main input file as well
          ltrim: true,
          rtrim: true,
        },
        (err, output) => {
          if (err) {
            console.error("[ERROR] CSV Parse Error in main input file:", err);
            return reject(err);
          }
          records = output;
          resolve();
        }
      );
    });

    if (records.length === 0) {
      console.warn("No data found in the input CSV file.");
      return;
    }

    // Initialize min/max values for scoring for relevant columns
    let minMax = {
      pricePer1000SqFt: { min: Infinity, max: -Infinity },
      competitionTotal: { min: Infinity, max: -Infinity },
      populationTotal: { min: Infinity, max: -Infinity },
      incomeAverage: { min: Infinity, max: -Infinity },
      trafficTotal: { min: Infinity, max: -Infinity },
    };

    // Identify dynamic income and competitor columns from the input headers
    const dynamicIncomeCols = [];
    const dynamicCompetitorNameCols = [];
    const inputHeaders = Object.keys(records[0] || {});

    inputHeaders.forEach((header) => {
      if (header.startsWith("INCOME ")) {
        dynamicIncomeCols.push(header);
      } else if (header.startsWith("name_")) {
        dynamicCompetitorNameCols.push(header);
      }
    });
    dynamicIncomeCols.sort((a, b) => {
      const numA = parseInt(a.replace("INCOME ", ""), 10);
      const numB = parseInt(b.replace("INCOME ", ""), 10);
      return numA - numB;
    });
    dynamicCompetitorNameCols.sort((a, b) => {
      const numA = parseInt(a.replace("name_", ""), 10);
      const numB = parseInt(b.replace("name_", ""), 10);
      return numA - numB;
    });

    console.log("[INFO] Starting calculations for specified columns...");

    // First Pass: Calculate intermediate values and find min/max for scoring
    const intermediateData = records.map((row) => {
      const processedRow = {};

      // Col G - Size (sq ft) - copy directly
      const sizeSqFtStr = row["features/2 (SIZE)"] || "";
      processedRow["Size (sq ft)"] = sizeSqFtStr;
      const sizeSqFt = parseNumeric(sizeSqFtStr);

      // Col F - Price - copy directly
      const priceStr = row["price_1 (PRICE)"] || "";
      processedRow["Price"] = priceStr;
      const price = parseNumeric(priceStr);

      // Col C - Size (acres)
      processedRow["Size (acres)"] =
        isNaN(sizeSqFt) || sizeSqFt === 0
          ? 0.0
          : sizeSqFt / SQFT_TO_ACRES_FACTOR;

      // Col H - Price per 1000 sqft
      let pricePer1000SqFt = 0;
      if (!isNaN(price) && !isNaN(sizeSqFt) && sizeSqFt > 0) {
        pricePer1000SqFt = (price / sizeSqFt) * 1000;
      }
      processedRow["£ per 1000 Sq Ft"] = pricePer1000SqFt;

      // Update min/max for pricePer1000SqFt for scoring in the next pass
      if (!isNaN(processedRow["£ per 1000 Sq Ft"])) {
        minMax["pricePer1000SqFt"].min = Math.min(
          minMax["pricePer1000SqFt"].min,
          processedRow["£ per 1000 Sq Ft"]
        );
        minMax["pricePer1000SqFt"].max = Math.max(
          minMax["pricePer1000SqFt"].max,
          processedRow["£ per 1000 Sq Ft"]
        );
      }

      // --- START REVISED MODIFICATION FOR TOWN COLUMN (Exact Match) ---
      const rightmoveId = (row["RIGHTMOVE ID"] || "").trim(); // Get ID from main data, trimmed
      let townFromLookup = "";
      if (rightmoveId) {
        // Log the ID being looked up and its length
        // console.log(`[DEBUG] Looking up RIGHTMOVE ID: "${rightmoveId}" (length: ${rightmoveId.length})`);
        townFromLookup = townLookup.get(rightmoveId) || "";
        // Log the result of the lookup
        // console.log(`[DEBUG] Lookup result for "${rightmoveId}": "${townFromLookup}"`);
      }

      // Prioritize the town from the lookup.
      // Only fall back to extractTown if the lookup yielded no valid town.
      if (townFromLookup !== "") {
        processedRow["Town"] = townFromLookup;
      } else {
        // Keep this debug message, it's useful
        console.log(
          `[DEBUG] Could not find town for RIGHTMOVE ID "${rightmoveId}" in lookup (exact match). Falling back to extractTown.`
        );

        // IMPORTANT: To further debug, inspect the raw data for this specific row.
        // You can add a more detailed log here if you consistently get these errors for certain IDs:
        // console.log(`[DEBUG] Full row data for failed lookup:`, row);
        // console.log(`[DEBUG] Available lookup keys:`, Array.from(townLookup.keys()).slice(0, 5)); // Log first 5 keys

        processedRow["Town"] = extractTown(row["brokerDisplayAddress"]);
      }
      // --- END REVISED MODIFICATION FOR TOWN COLUMN (Exact Match) ---

      // Col E - url (Rightmove url)
      processedRow["Rightmove url"] = row["RIGHTMOVE URL"] || "";

      // Col K - Competition Total
      let competitionCount = 0;
      for (const compNameCol of dynamicCompetitorNameCols) {
        const competitorName = row[compNameCol];
        const competitorCategoryCol = `category_${compNameCol.replace(
          "name_",
          ""
        )}`;
        const competitorCategory = row[competitorCategoryCol];

        if (
          competitorName &&
          competitorName.trim() !== "" &&
          competitorCategory &&
          competitorCategory.trim() !== ""
        ) {
          competitionCount++;
        }
      }
      processedRow["Competition Total"] = competitionCount;
      // Update min/max for CompetitionTotal for scoring in the next pass
      if (!isNaN(processedRow["Competition Total"])) {
        minMax["competitionTotal"].min = Math.min(
          minMax["competitionTotal"].min,
          processedRow["Competition Total"]
        );
        minMax["competitionTotal"].max = Math.max(
          minMax["competitionTotal"].max,
          processedRow["Competition Total"]
        );
      }

      // Col N - Population Total
      const populationTotal = parseNumeric(row["TOTAL POPULATION"]) || 0;
      processedRow["Population Total"] = populationTotal;
      // Update min/max for PopulationTotal for scoring in the next pass
      if (!isNaN(processedRow["Population Total"])) {
        minMax["populationTotal"].min = Math.min(
          minMax["populationTotal"].min,
          processedRow["Population Total"]
        );
        minMax["populationTotal"].max = Math.max(
          minMax["populationTotal"].max,
          processedRow["Population Total"]
        );
      }

      // Col Q - Income Average
      let incomeSum = 0;
      let incomeCount = 0;
      for (const incomeCol of dynamicIncomeCols) {
        const incomeVal = parseNumeric(row[incomeCol]);
        if (!isNaN(incomeVal) && incomeVal > 0) {
          incomeSum += incomeVal;
          incomeCount++;
        }
      }
      const incomeAverage = incomeCount > 0 ? incomeSum / incomeCount : 0.0;
      processedRow["Income Average"] = incomeAverage;
      // Update min/max for IncomeAverage for scoring in the next pass
      if (!isNaN(processedRow["Income Average"])) {
        minMax["incomeAverage"].min = Math.min(
          minMax["incomeAverage"].min,
          processedRow["Income Average"]
        );
        minMax["incomeAverage"].max = Math.max(
          minMax["incomeAverage"].max,
          processedRow["Income Average"]
        );
      }

      // Col T - Traffic Total
      const trafficTotal = parseNumeric(row["TOTAL ON THAT POSTCODE"]) || 0;
      processedRow["Traffic Total"] = trafficTotal;
      // Update min/max for TrafficTotal for scoring in the next pass
      if (!isNaN(processedRow["Traffic Total"])) {
        minMax["trafficTotal"].min = Math.min(
          minMax["trafficTotal"].min,
          processedRow["Traffic Total"]
        );
        minMax["trafficTotal"].max = Math.max(
          minMax["trafficTotal"].max,
          processedRow["Traffic Total"]
        );
      }

      // Retain original RIGHTMOVE ID for potential future use (e.g., tie-breaking)
      processedRow["RIGHTMOVE ID"] = row["RIGHTMOVE ID"] || "";

      return processedRow;
    });

    // Handle cases where minMax values might still be Infinity (e.g., all parsed values were 0 or NaN)
    for (const key in minMax) {
      if (minMax[key].min === Infinity) {
        minMax[key].min = 0;
      }
      if (minMax[key].max === -Infinity) {
        minMax[key].max = 0;
      }
    }

    // Second Pass: Calculate Scores and Ranks
    console.log("[INFO] Calculating Scores and Ranks...");
    intermediateData.forEach((row) => {
      // Price Score (low is good)
      row["Price Score"] = calculateScore(
        row["£ per 1000 Sq Ft"],
        minMax["pricePer1000SqFt"].min,
        minMax["pricePer1000SqFt"].max,
        20,
        0,
        false // highIsGood = false for low is good
      );
      // Competition Score (low is good)
      row["Competition Score"] = calculateScore(
        row["Competition Total"],
        minMax["competitionTotal"].min,
        minMax["competitionTotal"].max,
        20,
        0,
        false // highIsGood = false for low is good
      );
      // Population Score (high is good)
      row["Population Score"] = calculateScore(
        row["Population Total"],
        minMax["populationTotal"].min,
        minMax["populationTotal"].max,
        20,
        0,
        true // highIsGood = true for high is good
      );
      // Income Score (high is good)
      row["Income Score"] = calculateScore(
        row["Income Average"],
        minMax["incomeAverage"].min,
        minMax["incomeAverage"].max,
        20,
        0,
        true // highIsGood = true for high is good
      );
      // Traffic Score (high is good)
      row["Traffic Score"] = calculateScore(
        row["Traffic Total"],
        minMax["trafficTotal"].min,
        minMax["trafficTotal"].max,
        20,
        0,
        true // highIsGood = true for high is good
      );

      // Calculate Overall Score (sum of all individual scores)
      row["Overall Score"] =
        row["Price Score"] +
        row["Competition Score"] +
        row["Population Score"] +
        row["Income Score"] +
        row["Traffic Score"];
    });

    // Assign Ranks
    assignRanks(intermediateData, "Price Score", "Price Rank", "desc");
    assignRanks(
      intermediateData,
      "Competition Score",
      "Competition Rank",
      "desc"
    );
    assignRanks(
      intermediateData,
      "Population Score",
      "Population Rank",
      "desc"
    );
    assignRanks(intermediateData, "Income Score", "Income Rank", "desc");
    assignRanks(intermediateData, "Traffic Score", "Traffic Rank", "desc");
    assignRanks(intermediateData, "Overall Score", "Overall Rank", "desc"); // Overall Rank

    console.log(
      "[SUCCESS] All specified columns calculated and ranks assigned."
    );

    // Define the exact output headers and their order
    const outputHeaders = [
      "Overall Rank", // New column: Overall Rank
      "Overall Score", // New column: Overall Score
      "Size (acres)",
      "Town", // Now populated from lookup or extractTown
      "Rightmove url",
      "Price",
      "Size (sq ft)",
      "£ per 1000 Sq Ft",
      "Price Score",
      "Price Rank",
      "Competition Total",
      "Competition Score",
      "Competition Rank",
      "Population Total",
      "Population Score",
      "Population Rank",
      "Income Average",
      "Income Score",
      "Income Rank",
      "Traffic Total",
      "Traffic Score",
      "Traffic Rank",
    ];

    // Prepare data for CSV stringification, ensuring column order and applying final formatting
    const finalRecords = intermediateData.map((row) => {
      const newRow = {};
      outputHeaders.forEach((col) => {
        let value = row[col];
        // Apply specific formatting for display here
        if (
          col === "Size (acres)" ||
          col === "£ per 1000 Sq Ft" ||
          col === "Income Average" ||
          col === "Price Score" ||
          col === "Competition Score" ||
          col === "Population Score" ||
          col === "Income Score" ||
          col === "Traffic Score" ||
          col === "Overall Score" // Added for formatting
        ) {
          value =
            typeof value === "number" && !isNaN(value)
              ? value.toFixed(2)
              : "0.00";
        }
        // Handle ranks as integers
        else if (
          col === "Price Rank" ||
          col === "Competition Rank" ||
          col === "Population Rank" ||
          col === "Income Rank" ||
          col === "Traffic Rank" ||
          col === "Overall Rank" // Added for formatting
        ) {
          value =
            typeof value === "number" && !isNaN(value) ? Math.round(value) : "";
        }
        newRow[col] = value !== undefined ? value : "";
      });
      return newRow;
    });

    // Convert the processed data back to CSV format
    const outputCsv = await new Promise((resolve, reject) => {
      stringify(
        finalRecords,
        {
          header: true, // Include header row
          columns: outputHeaders, // Ensure column order
        },
        (err, output) => {
          if (err) return reject(err);
          resolve(output);
        }
      );
    });

    // Write the processed data to a new CSV file
    await fs.writeFile(path.join(process.cwd(), OUTPUT_CSV_FILE), outputCsv);
    console.log(`[SUCCESS] Processed data saved to ${OUTPUT_CSV_FILE}`);
  } catch (error) {
    console.error(
      "[FATAL] An unhandled error occurred during processing:",
      error
    );
  }
  console.timeEnd("Total Processing Time");
  console.log("[END] Script execution finished.");
}

processColumns(); // Execute the main function
