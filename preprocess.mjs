import Papa from "papaparse";
import fsp from "fs/promises";
import path from "path";

const publicDir = "./public";

// Helper function to read a CSV file
async function readCsv(filePath) {
  const csvText = await fsp.readFile(filePath, "utf-8");
  return Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  }).data;
}

// Helper function to write a GeoJSON file
async function writeGeoJson(filePath, data) {
  await fsp.writeFile(filePath, JSON.stringify(data));
  console.log(`Successfully created ${path.basename(filePath)}`);
}

// 1. Process competition_data.csv
async function processCompetitionData() {
  const data = await readCsv(path.join(publicDir, "competition_data.csv"));
  const features = data
    .filter(
      (row) =>
        row.longitude &&
        row.latitude &&
        (row.type === "Storage" ||
          row.type === "Self storage facility" ||
          row.type === "Storage facility")
    )
    .map((row) => {
      const { longitude, latitude, ...rest } = row;
      const longitudeNum = parseFloat(longitude);
      const latitudeNum = parseFloat(latitude);
      if (isNaN(longitudeNum) || isNaN(latitudeNum)) return null;

      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [longitudeNum, latitudeNum] },
        properties: { ...rest, pointType: "competitor" },
      };
    })
    .filter(Boolean);

  await writeGeoJson(path.join(publicDir, "competition_data.geojson"), {
    type: "FeatureCollection",
    features,
  });
}

// 2. Process commercial_land.csv
async function processCommercialLandData() {
  const data = await readCsv(path.join(publicDir, "commercial_land.csv"));
  const features = data
    .filter((row) => row.longitude && row.latitude)
    .map((row) => {
      const longitudeNum = parseFloat(row.latitude);
      const latitudeNum = parseFloat(row.longitude);
      if (isNaN(longitudeNum) || isNaN(latitudeNum)) return null;

      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [longitudeNum, latitudeNum] },
        properties: { ...row, pointType: "commercial" },
      };
    })
    .filter(Boolean);

  await writeGeoJson(path.join(publicDir, "commercial_land.geojson"), {
    type: "FeatureCollection",
    features,
  });
}

// 3. Process traffic_data.csv
async function processTrafficData() {
  const data = await readCsv(path.join(publicDir, "traffic_data.csv"));
  const features = data
    .filter((row) => row.longitude && row.latitude)
    .map((row) => {
      const longitudeNum = parseFloat(row.longitude);
      const latitudeNum = parseFloat(row.latitude);
      if (isNaN(longitudeNum) || isNaN(latitudeNum)) return null;

      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [longitudeNum, latitudeNum] },
        properties: {
          pointType: "traffic",
          year: parseInt(row.year, 10),
          all_motor_vehicles: parseInt(row.all_motor_vehicles, 10) || 0,
        },
      };
    })
    .filter(Boolean);

  await writeGeoJson(path.join(publicDir, "traffic_data.geojson"), {
    type: "FeatureCollection",
    features,
  });
}

// 4. Process population data chunks
async function processPopulationChunks() {
  const chunksDir = path.join(publicDir, "chunks");
  try {
    const files = await fsp.readdir(chunksDir);
    const csvChunks = files.filter(
      (file) => file.startsWith("chunk_") && file.endsWith(".csv")
    );

    if (csvChunks.length === 0) {
      console.log("No population chunks found to process.");
      return;
    }

    console.log(`Found ${csvChunks.length} population chunks. Processing...`);

    for (const csvFile of csvChunks) {
      const csvFilePath = path.join(chunksDir, csvFile);
      const geojsonFilePath = csvFilePath.replace(".csv", ".geojson");

      const data = await readCsv(csvFilePath);
      const features = data
        .filter((row) => row.Latitude && row.Longitude)
        .map((row) => {
          const { Latitude, Longitude, ...rest } = row;
          const longitudeNum = parseFloat(Longitude);
          const latitudeNum = parseFloat(Latitude);
          if (isNaN(longitudeNum) || isNaN(latitudeNum)) return null;

          return {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [longitudeNum, latitudeNum],
            },
            properties: {
              ...rest,
              BUA_Population: parseInt(row.BUA_Population, 10) || 0,
            },
          };
        })
        .filter(Boolean);

      await writeGeoJson(geojsonFilePath, {
        type: "FeatureCollection",
        features,
      });
    }
    console.log("Finished processing population chunks.");
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(
        "Chunks directory not found, skipping population chunk processing."
      );
    } else {
      console.error("Error processing population chunks:", error);
      throw error;
    }
  }
}

// Main function to run all processors
async function main() {
  try {
    console.log("Starting preprocessing...");

    await Promise.all([
      processCompetitionData(),
      processCommercialLandData(),
      processTrafficData(),
      processPopulationChunks(),
    ]);

    console.log("Preprocessing finished successfully!");
  } catch (error) {
    console.error("An error occurred during preprocessing:", error);
  }
}

main();
