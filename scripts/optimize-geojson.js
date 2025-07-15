import { fileURLToPath } from "url";
import { dirname, join, basename } from "path";
import { execSync } from "child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const INPUT_DIR = join(__dirname, "../../public");
const OUTPUT_DIR = join(__dirname, "../../public/optimized");
const VECTOR_TILES_DIR = join(__dirname, "../../public/vector-tiles");

// Files to process
const FILES_TO_OPTIMIZE = [
  // 'competition_data.geojson',
  // 'commercial_land.geojson',
  // "traffic_data.geojson",
  // "postcode_to_bua_mapped.csv", // Replaced population_data.geojson with the CSV file
  // "postcode_with_london_data.csv",
  // "london_data.geojson",
  // "uk_salaries.geojson"
];

// Create output directories if they don't exist
[OUTPUT_DIR, VECTOR_TILES_DIR].forEach((dir) => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

// Check if Tippecanoe is installed
function isTippecanoeInstalled() {
  try {
    execSync("tippecanoe --version", { stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
}

// Convert CSV to GeoJSON
function csvToGeoJSON(csvPath, outputPath) {
  try {
    console.log(`Converting ${basename(csvPath)} to GeoJSON...`);

    // Read the CSV file
    const csvContent = readFileSync(csvPath, "utf-8");
    const lines = csvContent.split("\n");
    const headers = lines[0]
      .split(",")
      .map((h) => h.trim().replace(/^"|"$/g, ""));

    console.log(`Found headers: ${headers.join(", ")}`);
    console.log(`First data line: ${lines[1]}`);

    // Create GeoJSON features
    const features = [];
    let lineCount = 0;
    const totalLines = lines.length - 1; // Subtract 1 for header
    let lastProgress = -1;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      lineCount++;

      // Show progress every 1%
      const progress = Math.floor((i / totalLines) * 100);
      if (progress > lastProgress) {
        console.log(`Processing: ${progress}% (${i}/${totalLines} lines)`);
        lastProgress = progress;
      }

      // Handle quoted CSV values properly
      const values =
        lines[i].match(
          /(?:\"[^\"]*\"|\'[^\']*\'|[^,\s][^,]*[^,\s])(?=\s*,|\s*$)/g
        ) || [];

      // Clean up values
      const cleanValues = values.map((v) =>
        v.trim().replace(/^["']|["']$/g, "")
      );

      const properties = {};
      let lng, lat;

      // Parse CSV values
      headers.forEach((header, index) => {
        const value = cleanValues[index] || "";

        // Check for coordinates - match exact column names from your CSV
        if (header === "Longitude") {
          lng = parseFloat(value);
        } else if (header === "Latitude") {
          lat = parseFloat(value);
        } else {
          properties[header] = value;
        }
      });

      if (lng && !isNaN(lng) && lat && !isNaN(lat)) {
        features.push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [lng, lat],
          },
          properties: {
            ...properties,
            postcode: properties.Postcode || "",
            bua_code: properties.BUA_Code || "",
            bua_name: properties.BUA_Name || "",
            population: properties.BUA_Population || "",
          },
        });
      } else if (lineCount <= 5) {
        // Log first few parsing issues for debugging
        console.log(
          `Skipping line ${i}: Could not parse coordinates. Longitude: ${lng}, Latitude: ${lat}`
        );
        console.log(`Headers: ${headers.join(", ")}`);
        console.log(`Values: ${cleanValues.join(" | ")}`);
      }
    }

    // Create GeoJSON object
    const geojson = {
      type: "FeatureCollection",
      features,
    };

    // Save the GeoJSON file
    writeFileSync(outputPath, JSON.stringify(geojson));
    console.log(`Converted to GeoJSON: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error(`Error converting CSV to GeoJSON: ${error.message}`);
    return null;
  }
}

// Optimize GeoJSON using Mapshaper
function optimizeGeoJSON(inputPath, outputPath, isCSV = false) {
  try {
    console.log(`Processing ${basename(inputPath)}...`);

    let geoJsonPath = inputPath;

    // If input is CSV, convert it to GeoJSON first
    if (isCSV) {
      geoJsonPath = outputPath.replace(".geojson", "_temp.geojson");
      if (!csvToGeoJSON(inputPath, geoJsonPath)) {
        return false;
      }
    }

    // Use Mapshaper to simplify and clean the GeoJSON
    execSync(
      `mapshaper ${geoJsonPath} -simplify 15% -o ${outputPath} format=geojson precision=0.0001`
    );

    // Clean up temporary file if it exists
    if (isCSV) {
      try {
        unlinkSync(geoJsonPath);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    console.log(`Optimized file saved to ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`Error optimizing ${inputPath}:`, error.message);
    return false;
  }
}

// Convert GeoJSON to vector tiles
function convertToVectorTiles(inputPath, outputDir, layerName) {
  try {
    const filename = basename(inputPath);
    console.log(`Converting ${filename} to vector tiles...`);

    const mbtilesPath = join(outputDir, `${layerName}.mbtiles`);

    // Convert to vector tiles using Tippecanoe
    execSync(
      `tippecanoe -o ${mbtilesPath} -z 14 -Z 8 --drop-densest-as-needed --extend-zooms-if-still-dropping --drop-fraction-as-needed --coalesce-densest-as-needed --simplify-only-low-zooms --detect-shared-borders --read-parallel --layer=${layerName} --force ${inputPath}`
    );

    console.log(`Created vector tiles at ${mbtilesPath}`);
    return true;
  } catch (error) {
    console.error(
      `Error creating vector tiles for ${inputPath}:`,
      error.message
    );
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log("Starting GeoJSON optimization...");
    console.log(`Current directory: ${process.cwd()}`);
    console.log(`Input directory: ${INPUT_DIR}`);
    console.log(`Output directory: ${OUTPUT_DIR}`);
    console.log(`Vector tiles directory: ${VECTOR_TILES_DIR}`);

    // Check if Tippecanoe is installed
    if (!isTippecanoeInstalled()) {
      throw new Error("Tippecanoe is not installed. Please install it first.");
    }

    // List files in input directory
    try {
      console.log("\nFiles in input directory:");
      const files = execSync(`ls -la ${INPUT_DIR}`).toString();
      console.log(files);
    } catch (e) {
      console.error("Error listing input directory:", e.message);
    }

    // Process each file
    for (const filename of FILES_TO_OPTIMIZE) {
      const inputPath = join(INPUT_DIR, filename);

      console.log(`\nProcessing ${filename}...`);
      console.log(`Input path: ${inputPath}`);

      if (existsSync(inputPath)) {
        console.log(`File exists: ${inputPath}`);

        // Check if file is CSV
        const isCSV = filename.endsWith(".csv");
        const outputFilename = isCSV
          ? filename.replace(".csv", ".geojson")
          : filename;
        const outputPath = join(OUTPUT_DIR, outputFilename);

        console.log(`Output path: ${outputPath}`);

        // Create output directory if it doesn't exist
        const outputDir = dirname(outputPath);
        if (!existsSync(outputDir)) {
          console.log(`Creating directory: ${outputDir}`);
          mkdirSync(outputDir, { recursive: true });
        }

        // Optimize GeoJSON (or convert and optimize CSV)
        if (await optimizeGeoJSON(inputPath, outputPath, isCSV)) {
          // Convert to vector tiles
          const layerName = basename(outputFilename, ".geojson");
          await convertToVectorTiles(outputPath, VECTOR_TILES_DIR, layerName);
        }
      } else {
        console.warn(`File not found: ${inputPath}`);
        console.warn(`Current working directory: ${process.cwd()}`);
      }
    }

    console.log("\n✅ Optimization and vector tile generation complete!");
    console.log(`📁 Optimized GeoJSON files: ${OUTPUT_DIR}`);
    console.log(`🗺️  Vector tiles: ${VECTOR_TILES_DIR}`);
  } catch (error) {
    console.error("\n❌ Error during optimization:", error.message);
    process.exit(1);
  }
}

// Run the script
main();
