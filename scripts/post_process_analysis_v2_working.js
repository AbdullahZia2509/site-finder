import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse";
import { stringify } from "csv-stringify";

// --- Configuration ---
const INPUT_CSV_FILE = "commercial_land_analysis_results.csv";
const OUTPUT_CSV_FILE = "post_processed_commercial_land_data.csv";
const SQFT_TO_ACRES_FACTOR = 43560; // 1 acre = 43,560 sq ft

// --- Helper Functions ---

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
 * Calculates a Price Score for a given value based on min/max range,
 * where the lowest value scores 20 and the highest scores 0.
 * @param {number} value - The Cost per 1000 Sq Ft value to score.
 * @param {number} min - The minimum Cost per 1000 Sq Ft value in the dataset.
 * @param {number} max - The maximum Cost per 1000 Sq Ft value in the dataset.
 * @returns {number} The calculated score (0-20).
 */
function calculatePriceScore(value, min, max) {
  if (isNaN(value)) {
    return 0; // Or some other default for unparseable values
  }
  if (min === max) {
    return 20; // If all values are the same, the "cheapest" (and only) value scores 20
  }

  // Linear interpolation: Score = MaxScore - ((Value - MinValue) / (MaxValue - MinValue)) * MaxScore
  // In our case: MaxScore = 20, MinScore = 0
  // Score = 20 - ((value - min) / (max - min)) * 20
  let score = 20 - ((value - min) / (max - min)) * 20;

  return Math.max(0, Math.min(20, score)); // Ensure score is between 0 and 20
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
    // Or if it's the very first element (i=0)
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
  try {
    // Read the input CSV file
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
        },
        (err, output) => {
          if (err) return reject(err);
          records = output;
          resolve();
        }
      );
    });

    if (records.length === 0) {
      console.warn("No data found in the input CSV file.");
      return;
    }

    // Initialize min/max values for scoring (only for £ per 1000 Sq Ft for now)
    let minMax = {
      pricePer1000SqFt: { min: Infinity, max: -Infinity },
    };

    // Identify dynamic income and competitor columns from the input headers
    const dynamicIncomeCols = [];
    const dynamicCompetitorNameCols = []; // We only need name_X for counting
    const inputHeaders = Object.keys(records[0] || {});

    inputHeaders.forEach((header) => {
      if (header.startsWith("INCOME ")) {
        dynamicIncomeCols.push(header);
      } else if (header.startsWith("name_")) {
        // Assuming name_X indicates a competitor entry
        dynamicCompetitorNameCols.push(header);
      }
    });
    // Sort to ensure consistent iteration (e.g., INCOME 1, INCOME 2...)
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

      // Col G – Size (sq ft) - copy directly
      const sizeSqFtStr = row["features/2 (SIZE)"] || "";
      processedRow["Size (sq ft)"] = sizeSqFtStr;
      const sizeSqFt = parseNumeric(sizeSqFtStr);

      // Col F – Price - copy directly
      const priceStr = row["price_1 (PRICE)"] || "";
      processedRow["Price"] = priceStr;
      const price = parseNumeric(priceStr);

      // Col C - Size (acres)
      processedRow["Size (acres)"] =
        isNaN(sizeSqFt) || sizeSqFt === 0
          ? 0.0
          : sizeSqFt / SQFT_TO_ACRES_FACTOR; // No toFixed(2) here

      // Col H - £/1000 sqft
      let pricePer1000SqFt = 0;
      if (!isNaN(price) && !isNaN(sizeSqFt) && sizeSqFt > 0) {
        pricePer1000SqFt = (price / sizeSqFt) * 1000;
      }
      // Store unrounded value for accurate min/max and scoring
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

      // Col D – Town
      processedRow["Town"] = extractTown(row["brokerDisplayAddress"]);

      // Col E – url (Rightmove url)
      processedRow["Rightmove url"] = row["RIGHTMOVE URL"] || "";

      // Col K – Competition Total
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

      // Col N – Population Total
      processedRow["Population Total"] =
        parseNumeric(row["TOTAL POPULATION"]) || 0;

      // Col Q – Income Average
      let incomeSum = 0;
      let incomeCount = 0;
      for (const incomeCol of dynamicIncomeCols) {
        const incomeVal = parseNumeric(row[incomeCol]);
        if (!isNaN(incomeVal) && incomeVal > 0) {
          incomeSum += incomeVal;
          incomeCount++;
        }
      }
      processedRow["Income Average"] =
        incomeCount > 0 ? incomeSum / incomeCount : 0.0; // No toFixed(2) here

      // Col T – Traffic Total
      processedRow["Traffic Total"] =
        parseNumeric(row["TOTAL ON THAT POSTCODE"]) || 0;

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
    console.log("[INFO] Calculating Price Score and Price Rank...");
    intermediateData.forEach((row) => {
      row["Price Score"] = calculatePriceScore(
        row["£ per 1000 Sq Ft"], // Use the unrounded value here
        minMax["pricePer1000SqFt"].min,
        minMax["pricePer1000SqFt"].max
      );
    });

    // Assign Price Rank (highest score = rank 1, same rank for ties)
    assignRanks(intermediateData, "Price Score", "Price Rank", "desc");

    console.log(
      "[SUCCESS] All specified columns calculated and ranks assigned."
    );

    // Define the exact output headers and their order
    const outputHeaders = [
      "Size (acres)",
      "Town",
      "Rightmove url",
      "Price",
      "Size (sq ft)",
      "£ per 1000 Sq Ft", // This will now contain unrounded numeric value
      "Price Score",
      "Price Rank",
      "Competition Total",
      "Population Total",
      "Income Average",
      "Traffic Total",
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
          col === "Income Average"
        ) {
          value =
            typeof value === "number" && !isNaN(value)
              ? value.toFixed(2)
              : "0.00";
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
