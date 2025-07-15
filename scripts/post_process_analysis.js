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

// --- Main Processing Function ---
async function processBasicColumns() {
  console.time("Total Processing Time");
  console.log("[START] Initiating basic column processing script.");

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

    const processedData = records.map((row) => {
      const newRow = {};

      // Col C - Size (acres)
      const sizeSqFt = parseNumeric(row["features/2 (SIZE)"]);
      newRow["Size (acres)"] =
        isNaN(sizeSqFt) || sizeSqFt === 0
          ? 0.0
          : (sizeSqFt / SQFT_TO_ACRES_FACTOR).toFixed(2);

      // Col D – Town
      newRow["Town"] = extractTown(row["brokerDisplayAddress"]);

      // Col E – url (Rightmove url)
      newRow["Rightmove url"] = row["RIGHTMOVE URL"] || "";

      // Col F – Price
      newRow["Price"] = row["price_1 (PRICE)"] || "";

      // Col G – Size (sq ft)
      newRow["Size (sq ft)"] = row["features/2 (SIZE)"] || "";

      // Col H - £/1000 sqft
      const price = parseNumeric(row["price_1 (PRICE)"]);
      newRow["£ per 1000 Sq Ft"] =
        isNaN(price) || isNaN(sizeSqFt) || sizeSqFt === 0
          ? 0.0
          : (price / (sizeSqFt / 1000)).toFixed(2);

      // Col K – Competition Total
      let competitionCount = 0;
      for (const compNameCol of dynamicCompetitorNameCols) {
        if (row[compNameCol] && row[compNameCol].trim() !== "") {
          competitionCount++;
        }
      }
      newRow["Competition Total"] = competitionCount;

      // Col N – Population Total
      newRow["Population Total"] = parseNumeric(row["TOTAL POPULATION"]) || 0;

      // Col Q – Income Average (renamed from Income Total as per previous discussion)
      let incomeSum = 0;
      let incomeCount = 0;
      for (const incomeCol of dynamicIncomeCols) {
        const incomeVal = parseNumeric(row[incomeCol]);
        if (!isNaN(incomeVal) && incomeVal > 0) {
          // Only sum valid positive incomes
          incomeSum += incomeVal;
          incomeCount++;
        }
      }
      newRow["Income Average"] =
        incomeCount > 0 ? (incomeSum / incomeCount).toFixed(2) : 0.0;

      // Col T – Traffic Total
      newRow["Traffic Total"] =
        parseNumeric(row["TOTAL ON THAT POSTCODE"]) || 0;

      return newRow;
    });

    console.log("[SUCCESS] All specified columns calculated.");

    // Define the exact output headers and their order
    const outputHeaders = [
      "Size (acres)",
      "Town",
      "Rightmove url",
      "Price",
      "Size (sq ft)",
      "£ per 1000 Sq Ft",
      "Competition Total",
      "Population Total",
      "Income Average",
      "Traffic Total",
    ];

    // Convert the processed data back to CSV format
    const outputCsv = await new Promise((resolve, reject) => {
      stringify(
        processedData,
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

processBasicColumns(); // Execute the main function
