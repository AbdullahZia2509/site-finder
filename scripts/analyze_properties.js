import fs from "fs/promises"; // For reading files
import geolib from "geolib"; // For geographical calculations
import RBush from "rbush"; // For spatial indexing

// --- Configuration ---
const COMMERCIAL_LAND_FILE = "../public/optimized/commercial_land.geojson";
const COMPETITION_DATA_FILE = "../public/optimized/competition_data.geojson";
const POPULATION_DATA_FILE =
  "../public/optimized/postcode_to_bua_mapped.geojson";
const TRAFFIC_DATA_FILE = "../public/optimized/traffic_data.geojson";

const RADIUS_KM = 5; // 5 kilometers radius
const EARTH_RADIUS_KM = 6371; // Approximate Earth radius in kilometers for rough bounding box calculation

// --- Helper Functions ---

/**
 * Safely reads and parses a GeoJSON file.
 * @param {string} filePath - The path to the GeoJSON file.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of GeoJSON Feature objects.
 */
async function readGeoJson(filePath) {
  console.log(`[INFO] Attempting to read GeoJSON file: ${filePath}`);
  try {
    const fileContent = await fs.readFile(filePath, { encoding: "utf8" });
    const geojsonData = JSON.parse(fileContent);

    if (
      geojsonData.type !== "FeatureCollection" ||
      !Array.isArray(geojsonData.features)
    ) {
      throw new Error(
        "Invalid GeoJSON structure: Expected a FeatureCollection with an array of features."
      );
    }

    console.log(
      `[SUCCESS] Successfully read ${geojsonData.features.length} features from ${filePath}`
    );
    return geojsonData.features;
  } catch (error) {
    console.error(
      `[ERROR] Error reading GeoJSON file ${filePath}:`,
      error.message
    );
    throw error;
  }
}

/**
 * Safely gets a property from a GeoJSON feature's properties.
 * @param {Object} feature - The GeoJSON feature object.
 * @param {string} propertyName - The name of the property to retrieve.
 * @param {*} defaultValue - The default value to return if the property is not found or properties object is missing.
 * @returns {*} The property value or the default value.
 */
function getFeatureProperty(feature, propertyName, defaultValue = "") {
  if (
    !feature ||
    !feature.properties ||
    typeof feature.properties !== "object"
  ) {
    return defaultValue;
  }
  return feature.properties[propertyName] !== undefined
    ? feature.properties[propertyName]
    : defaultValue;
}

/**
 * Checks if two geographical points are within a specified radius.
 * @param {Object} coords1 - First point {latitude, longitude}.
 * @param {Object} coords2 - Second point {latitude, longitude}.
 * @param {number} radiusKm - The radius in kilometers.
 * @returns {boolean} True if within radius, false otherwise.
 */
function isWithinRadius(coords1, coords2, radiusKm) {
  const distanceMeters = geolib.getDistance(coords1, coords2);
  return distanceMeters / 1000 <= radiusKm;
}

// --- Main Analysis Function ---
async function analyzeCommercialLand() {
  console.time("Total Analysis Time");
  console.log("[START] Initiating commercial land analysis script.");

  console.time("Data Loading Time");
  console.log("[INFO] Loading all necessary data files...");
  let commercialLandFeatures,
    competitionFeatures,
    populationFeatures,
    trafficFeatures;

  try {
    commercialLandFeatures = await readGeoJson(COMMERCIAL_LAND_FILE);
    competitionFeatures = await readGeoJson(COMPETITION_DATA_FILE);
    populationFeatures = await readGeoJson(POPULATION_DATA_FILE);
    trafficFeatures = await readGeoJson(TRAFFIC_DATA_FILE);
  } catch (error) {
    console.error("[FATAL] Failed to load one or more GeoJSON files. Exiting.");
    return;
  }
  console.timeEnd("Data Loading Time");

  if (commercialLandFeatures.length === 0) {
    console.warn(
      "[WARN] No commercial land properties found in the GeoJSON. Exiting."
    );
    return;
  }

  console.time("RBush Tree Building Time");
  console.log(
    "[INFO] Data loaded. Starting spatial indexing for population and traffic data..."
  );

  // --- Build spatial indexes using RBush ---
  const populationRtree = new RBush();
  const populationItems = populationFeatures
    .map((feature) => {
      // Population coordinates should be read directly from geometry
      const [lon, lat] = feature.geometry?.coordinates || [NaN, NaN];
      if (isNaN(lon) || isNaN(lat)) {
        console.warn(
          `[WARN] Skipping population feature with invalid coordinates from geometry: ${JSON.stringify(
            feature.properties
          )}`
        );
        return null;
      }
      return {
        minX: lon,
        minY: lat,
        maxX: lon,
        maxY: lat,
        data: feature, // Store the original feature data
      };
    })
    .filter(Boolean); // Remove nulls
  console.log(
    `[INFO] Inserting ${populationItems.length} population points into RBush tree.`
  );
  populationRtree.load(populationItems);
  console.log("[INFO] Population RBush tree built.");

  const trafficRtree = new RBush();
  const trafficItems = trafficFeatures
    .map((feature) => {
      const [lon, lat] = feature.geometry?.coordinates || [NaN, NaN];
      if (isNaN(lon) || isNaN(lat)) {
        console.warn(
          `[WARN] Skipping traffic feature with invalid coordinates: ${JSON.stringify(
            feature.properties
          )}`
        );
        return null;
      }
      return {
        minX: lon,
        minY: lat,
        maxX: lon,
        maxY: lat,
        data: feature, // Store the original feature data
      };
    })
    .filter(Boolean); // Remove nulls
  console.log(
    `[INFO] Inserting ${trafficItems.length} traffic points into RBush tree.`
  );
  trafficRtree.load(trafficItems);
  console.log("[INFO] Traffic RBush tree built.");
  console.timeEnd("RBush Tree Building Time");

  console.time("Analysis Loop Time");
  console.log(
    `[INFO] Starting analysis for ${commercialLandFeatures.length} commercial land properties...`
  );
  const results = [];
  let processedCount = 0;
  let maxCompetitorsFound = 0; // Track the maximum number of competitors found for any land property

  for (const landPropertyFeature of commercialLandFeatures) {
    processedCount++;
    if (processedCount % 100 === 0) {
      console.log(
        `[PROGRESS] Processed ${processedCount} of ${commercialLandFeatures.length} commercial land properties.`
      );
    }

    const [landLon, landLat] = landPropertyFeature.geometry?.coordinates || [
      NaN,
      NaN,
    ];
    // const landProperties = landPropertyFeature.properties; // Already covered by getFeatureProperty calls

    const propertyIdentifier = getFeatureProperty(
      landPropertyFeature,
      "id",
      `Unknown Property (Index: ${processedCount - 1})`
    );

    if (isNaN(landLat) || isNaN(landLon)) {
      console.warn(
        `[WARN] Skipping commercial land property ${propertyIdentifier} due to invalid coordinates: (${landLat}, ${landLon})`
      );
      continue;
    }

    const commercialLandCoords = { latitude: landLat, longitude: landLon };

    let nearbyCompetitors = []; // Array to store all nearby competitor details

    let totalTraffic = 0;
    let trafficFoundFlag = "";

    const uniquePopulationBUAs = new Set();
    let totalPopulation = 0;
    let populationFoundFlag = "";

    // --- Find nearby competitors ---
    for (const competitorFeature of competitionFeatures) {
      const [compLon, compLat] = competitorFeature.geometry?.coordinates || [
        NaN,
        NaN,
      ];
      // const competitorProperties = competitorFeature.properties; // Covered by getFeatureProperty

      if (isNaN(compLat) || isNaN(compLon)) {
        continue;
      }

      const competitorCoords = { latitude: compLat, longitude: compLon };

      if (isWithinRadius(commercialLandCoords, competitorCoords, RADIUS_KM)) {
        nearbyCompetitors.push({
          category: getFeatureProperty(competitorFeature, "category"),
          name: getFeatureProperty(competitorFeature, "name"),
          url: getFeatureProperty(competitorFeature, "site"),
        });
      }
    }
    // Update max competitors found for dynamic column generation
    if (nearbyCompetitors.length > maxCompetitorsFound) {
      maxCompetitorsFound = nearbyCompetitors.length;
      console.log(
        `[INFO] New maximum competitors found: ${maxCompetitorsFound} (at property: ${propertyIdentifier})`
      );
    }

    // --- Find nearby traffic data using RBush ---
    const bbox_lon_delta =
      ((RADIUS_KM / (EARTH_RADIUS_KM * Math.cos((landLat * Math.PI) / 180))) *
        180) /
      Math.PI;
    const bbox_lat_delta = ((RADIUS_KM / EARTH_RADIUS_KM) * 180) / Math.PI;

    const trafficSearchBox = {
      minX: landLon - bbox_lon_delta,
      minY: landLat - bbox_lat_delta,
      maxX: landLon + bbox_lon_delta,
      maxY: landLat + bbox_lat_delta,
    };

    const nearbyTrafficCandidates = trafficRtree.search(trafficSearchBox);
    for (const item of nearbyTrafficCandidates) {
      const trafficFeature = item.data;
      const [trafficLon, trafficLat] = trafficFeature.geometry?.coordinates || [
        NaN,
        NaN,
      ];
      // const trafficProperties = trafficFeature.properties; // Covered by getFeatureProperty

      const allMotorVehicles =
        parseInt(
          getFeatureProperty(trafficFeature, "all_motor_vehicles", "0"),
          10
        ) || 0;

      const trafficCoords = { latitude: trafficLat, longitude: trafficLon };
      if (isWithinRadius(commercialLandCoords, trafficCoords, RADIUS_KM)) {
        totalTraffic += allMotorVehicles;
        trafficFoundFlag = "TRAFFIC DATA";
      }
    }
    if (trafficFoundFlag && totalTraffic === 0) {
      console.warn(
        `[WARN] Traffic data found for ${propertyIdentifier} within radius, but total traffic is 0. Check 'all_motor_vehicles' property.`
      );
    }

    // --- Find nearby population data using RBush ---
    const populationSearchBox = {
      minX: landLon - bbox_lon_delta,
      minY: landLat - bbox_lat_delta,
      maxX: landLon + bbox_lon_delta,
      maxY: landLat + bbox_lat_delta,
    };

    const nearbyPopulationCandidates =
      populationRtree.search(populationSearchBox);
    for (const item of nearbyPopulationCandidates) {
      const popFeature = item.data;
      // population coordinates are read directly from geometry, NOT properties
      const [popLon, popLat] = popFeature.geometry?.coordinates || [NaN, NaN];

      const buaName =
        getFeatureProperty(popFeature, "BUA_Name", null) &&
        typeof getFeatureProperty(popFeature, "BUA_Name", null) === "string"
          ? getFeatureProperty(popFeature, "BUA_Name", "").trim()
          : null;

      const buaPopulation =
        parseInt(
          getFeatureProperty(popFeature, "BUA_Population", "0") &&
            typeof getFeatureProperty(popFeature, "BUA_Population", "0") ===
              "string"
            ? getFeatureProperty(popFeature, "BUA_Population", "0").replace(
                /[, ]/g,
                ""
              )
            : "0",
          10
        ) || 0;

      if (
        isNaN(popLat) ||
        isNaN(popLon) ||
        isNaN(buaPopulation) ||
        buaName === null
      ) {
        // If coordinates or essential population data is invalid, skip this specific population point
        continue;
      }

      const popCoords = { latitude: popLat, longitude: popLon };
      if (isWithinRadius(commercialLandCoords, popCoords, RADIUS_KM)) {
        if (!uniquePopulationBUAs.has(buaName)) {
          totalPopulation += buaPopulation;
          uniquePopulationBUAs.add(buaName);
          populationFoundFlag = "POPULATION DATA";
        }
      }
    }
    if (populationFoundFlag && totalPopulation === 0) {
      console.warn(
        `[WARN] Population data found for ${propertyIdentifier} within radius, but total population is 0. Check 'BUA_Population' property.`
      );
    }

    // Prepare the base result object (before dynamic competitor columns)
    const baseResult = {
      "RIGHTMOVE SITE DATA": getFeatureProperty(
        landPropertyFeature,
        "displayAddress"
      ),
      "RIGHTMOVE ID": getFeatureProperty(landPropertyFeature, "id"),
      "features/2 (SIZE)": getFeatureProperty(landPropertyFeature, "size"),
      "price_1 (PRICE)": getFeatureProperty(landPropertyFeature, "price_1"),
      "RIGHTMOVE URL": getFeatureProperty(landPropertyFeature, "url"),
      brokerDisplayAddress: getFeatureProperty(
        landPropertyFeature,
        "brokerDisplayAddress"
      ),
      brokerDisplayName: getFeatureProperty(
        landPropertyFeature,
        "brokerDisplayName"
      ),
      brokerProfileUrl: getFeatureProperty(
        landPropertyFeature,
        "brokerProfileUrl"
      ),
      "TRAFFIC DATA": trafficFoundFlag,
      "TOTAL ON THAT POSTCODE": totalTraffic,
      "POPULATION DATA": populationFoundFlag,
      "TOTAL POPULATION": totalPopulation,
      "INCOME DATA": "",
      "INCOME 1": "",
      "INCOME 2": "",
      "INCOME 3": "",
      "INCOME 4": "",
      // We'll add competitor data dynamically below,
      // but store the raw array here for easier access during final CSV construction
      _nearbyCompetitors: nearbyCompetitors,
    };

    results.push(baseResult);
  }
  console.timeEnd("Analysis Loop Time");
  console.log("[INFO] Analysis complete.");

  console.time("CSV Output Time");
  if (results.length > 0) {
    // --- NEW: Explicitly build the CSV header ---
    const fixedHeaders = [
      "RIGHTMOVE SITE DATA",
      "RIGHTMOVE ID",
      "features/2 (SIZE)",
      "price_1 (PRICE)",
      "RIGHTMOVE URL",
      "brokerDisplayAddress",
      "brokerDisplayName",
      "brokerProfileUrl",
      "TRAFFIC DATA",
      "TOTAL ON THAT POSTCODE",
      "POPULATION DATA",
      "TOTAL POPULATION",
      "INCOME DATA",
      "INCOME 1",
      "INCOME 2",
      "INCOME 3",
      "INCOME 4",
    ];

    const dynamicCompetitorHeaders = [];
    for (let i = 0; i < maxCompetitorsFound; i++) {
      dynamicCompetitorHeaders.push(
        `COMPETITOR ${i + 1}`, // Flag whether a competitor exists at this index
        `category_${i + 1}`,
        `name_${i + 1}`,
        `url_${i + 1}`
      );
    }
    const outputCsvHeader = [...fixedHeaders, ...dynamicCompetitorHeaders].join(
      ","
    );

    // --- NEW: Map results to CSV rows based on the full header ---
    const outputCsvRows = results.map((row) => {
      const rowValues = [];

      // Add fixed values
      rowValues.push(
        String(row["RIGHTMOVE SITE DATA"]),
        String(row["RIGHTMOVE ID"]),
        String(row["features/2 (SIZE)"]),
        String(row["price_1 (PRICE)"]),
        String(row["RIGHTMOVE URL"]),
        String(row["brokerDisplayAddress"]),
        String(row["brokerDisplayName"]),
        String(row["brokerProfileUrl"]),
        String(row["TRAFFIC DATA"]),
        String(row["TOTAL ON THAT POSTCODE"]),
        String(row["POPULATION DATA"]),
        String(row["TOTAL POPULATION"]),
        String(row["INCOME DATA"]),
        String(row["INCOME 1"]),
        String(row["INCOME 2"]),
        String(row["INCOME 3"]),
        String(row["INCOME 4"])
      );

      // Add dynamic competitor values
      const nearbyCompetitors = row._nearbyCompetitors || [];
      for (let i = 0; i < maxCompetitorsFound; i++) {
        const competitor = nearbyCompetitors[i] || {};
        rowValues.push(
          competitor.name ? `COMPETITOR ${i + 1}` : "", // Flag based on name presence
          competitor.category || "",
          competitor.name || "",
          competitor.url || competitor.site || ""
        );
      }

      // Map and quote values for CSV
      return rowValues
        .map((value) => {
          const stringValue = String(value);
          // Check for commas, double quotes, and newlines (both \n and \r)
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n") ||
            stringValue.includes("\r")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`; // Enclose in quotes and escape internal quotes
          }
          return stringValue;
        })
        .join(",");
    });

    await fs.writeFile(
      "commercial_land_analysis_results.csv",
      `${outputCsvHeader}\n${outputCsvRows.join("\n")}`
    );
    console.log(
      "[SUCCESS] Results saved to commercial_land_analysis_results.csv"
    );
  } else {
    console.warn(
      "[WARN] No results to write to CSV file. This might mean no valid commercial land properties were processed."
    );
  }
  console.timeEnd("CSV Output Time");
  console.timeEnd("Total Analysis Time");
  console.log("[END] Script execution finished.");
}

// --- Run the analysis ---
analyzeCommercialLand().catch((error) => {
  console.error("[FATAL] An unhandled error occurred during analysis:", error);
});
