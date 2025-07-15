import fs from "fs/promises"; // For reading files
import geolib from "geolib"; // For geographical calculations
import RBush from "rbush"; // For spatial indexing

// --- Configuration ---
const COMMERCIAL_LAND_FILE = "../public/optimized/commercial_land.geojson";
const COMPETITION_DATA_FILE = "../public/optimized/competition_data.geojson";
const POPULATION_DATA_FILE =
  "../public/optimized/postcode_to_bua_mapped.geojson";
const TRAFFIC_DATA_FILE = "../public/optimized/traffic_data.geojson";
const UK_SALARIES_FILE = "../public/uk_salaries.geojson";
const LONDON_DATA_FILE = "../public/london_data.geojson"; // NEW: Add London data file

// const RADIUS_KM = 5; // 5 kilometers radius

// --- Parameter Handling ---
// Get command-line arguments, excluding 'node' and the script path
const args = process.argv.slice(2);

// Default radius if not provided
const DEFAULT_RADIUS_KM = 5;
let RADIUS_KM = DEFAULT_RADIUS_KM;

// Check if a radius argument was provided
if (args.length > 0) {
  const parsedRadius = parseFloat(args[0]);
  if (!isNaN(parsedRadius) && parsedRadius > 0) {
    RADIUS_KM = parsedRadius;
    console.log(`[INFO] Using custom radius: ${RADIUS_KM} km`);
  } else {
    console.warn(
      `[WARN] Invalid radius provided: "${args[0]}". Using default radius: ${DEFAULT_RADIUS_KM} km`
    );
  }
} else {
  console.log(
    `[INFO] No radius provided. Using default radius: ${DEFAULT_RADIUS_KM} km`
  );
}

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

// --- NEW: Function to get town from postcode using postcodes.io API ---
const postcodeCache = new Map(); // Cache to store postcode results and avoid repeated API calls

/**
 * Gets the post town for a given full UK postcode using the postcodes.io API.
 * Caches results to reduce API calls.
 * @param {string} fullPostcode - The full UK postcode (e.g., "SW1A 0AA").
 * @returns {Promise<string>} The post town, or "N/A" if not found or an error occurs.
 */
async function getTownFromPostcode(fullPostcode) {
  if (!fullPostcode || fullPostcode.trim() === "") {
    return "N/A (Missing Postcode)";
  }

  const normalizedPostcode = fullPostcode.toUpperCase().replace(/\s/g, ""); // Normalize: uppercase, no spaces

  if (postcodeCache.has(normalizedPostcode)) {
    return postcodeCache.get(normalizedPostcode);
  }

  try {
    // console.log(`[INFO] Looking up town for postcode: ${normalizedPostcode} via API...`);
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${normalizedPostcode}`
    );
    const data = await response.json();

    if (data.status === 200 && data.result && data.result.post_town) {
      const town = data.result.post_town;
      postcodeCache.set(normalizedPostcode, town);
      return town;
    } else if (data.status === 404) {
      // console.warn(`[WARN] Postcode not found: ${normalizedPostcode}`);
      postcodeCache.set(normalizedPostcode, "N/A (Postcode Not Found)");
      return "N/A (Postcode Not Found)";
    } else {
      console.error(
        `[ERROR] API error for postcode ${normalizedPostcode}: ${
          data.error || "Unknown error"
        }`
      );
      postcodeCache.set(normalizedPostcode, "N/A (API Error)");
      return "N/A (API Error)";
    }
  } catch (error) {
    console.error(
      `[ERROR] Failed to fetch town for postcode ${normalizedPostcode}:`,
      error.message
    );
    postcodeCache.set(normalizedPostcode, "N/A (API Fetch Failed)");
    return "N/A (API Fetch Failed)";
  }
}
// --- END NEW FUNCTION ---

// --- Main Analysis Function ---
async function analyzeCommercialLand() {
  console.time("Total Analysis Time");
  console.log("[START] Initiating commercial land analysis script.");

  console.time("Data Loading Time");
  console.log("[INFO] Loading all necessary data files...");
  let commercialLandFeatures,
    competitionFeatures,
    populationFeatures,
    trafficFeatures,
    salaryFeatures,
    londonFeatures; // NEW: Declare londonFeatures

  try {
    commercialLandFeatures = await readGeoJson(COMMERCIAL_LAND_FILE);
    competitionFeatures = await readGeoJson(COMPETITION_DATA_FILE);
    populationFeatures = await readGeoJson(POPULATION_DATA_FILE);
    trafficFeatures = await readGeoJson(TRAFFIC_DATA_FILE);
    salaryFeatures = await readGeoJson(UK_SALARIES_FILE);
    londonFeatures = await readGeoJson(LONDON_DATA_FILE); // NEW: Load London data
  } catch (error) {
    console.error("[FATAL] Failed to load one or more data files. Exiting.");
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
    "[INFO] Data loaded. Starting spatial indexing for population, traffic, and salary data..."
  );

  // --- Build spatial indexes using RBush ---
  const populationRtree = new RBush();
  // Combine all population features
  const allPopulationFeatures = [...populationFeatures, ...londonFeatures];
  const populationItems = allPopulationFeatures
    .map((feature) => {
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

  const salaryRtree = new RBush();
  const salaryItems = salaryFeatures
    .map((feature) => {
      const [lon, lat] = feature.geometry?.coordinates || [NaN, NaN];
      if (isNaN(lon) || isNaN(lat)) {
        console.warn(
          `[WARN] Skipping salary feature with invalid coordinates: ${JSON.stringify(
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
        data: feature, // Store the original feature
      };
    })
    .filter(Boolean); // Remove nulls
  console.log(
    `[INFO] Inserting ${salaryItems.length} salary points into RBush tree.`
  );
  salaryRtree.load(salaryItems);
  console.log("[INFO] Salary RBush tree built.");

  console.timeEnd("RBush Tree Building Time");

  console.time("Analysis Loop Time");
  console.log(
    `[INFO] Starting analysis for ${commercialLandFeatures.length} commercial land properties...`
  );
  const results = [];
  let processedCount = 0;
  let maxCompetitorsFound = 0; // Track the maximum number of competitors found for any land property
  let maxIncomesFound = 0; // Track the maximum number of incomes found for any land property

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

    let nearbyCompetitors = [];
    let totalTraffic = 0; // This will now hold the nearest traffic value
    let trafficFoundFlag = "";
    const uniquePopulationAreas = new Set();
    let totalPopulation = 0;
    let populationFoundFlag = "";
    let nearbySalaries = [];
    let incomeFoundFlag = "";
    let townName = "N/A"; // NEW: Initialize townName

    // --- NEW: Extract and get town from postcode ---
    const outcode = getFeatureProperty(landPropertyFeature, "outcode");
    const incode = getFeatureProperty(landPropertyFeature, "incode");
    let fullPostcode = "";

    if (outcode && incode) {
      fullPostcode = `${outcode} ${incode}`;
      townName = await getTownFromPostcode(fullPostcode); // Await the API call for town
    } else if (outcode) {
      // If only outcode is present, try to get town, might be less precise or require a different API strategy
      // For postcodes.io, a full postcode is ideal. We'll still try but mark if missing incode.
      fullPostcode = outcode; // Just the outcode
      townName = await getTownFromPostcode(fullPostcode);
      if (
        townName === "N/A (Postcode Not Found)" ||
        townName === "N/A (API Error)"
      ) {
        townName = "N/A (Missing Incode)"; // More specific if full lookup failed without incode
      }
    } else {
      townName = "N/A (No Postcode Data)";
    }
    // --- END NEW POSTCODE/TOWN EXTRACTION ---

    // --- Find nearby competitors ---
    for (const competitorFeature of competitionFeatures) {
      const [compLon, compLat] = competitorFeature.geometry?.coordinates || [
        NaN,
        NaN,
      ];

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
    if (nearbyCompetitors.length > maxCompetitorsFound) {
      maxCompetitorsFound = nearbyCompetitors.length;
      // console.log(`[INFO] New maximum competitors found: ${maxCompetitorsFound} (at property: ${propertyIdentifier})`); // Commented to reduce log spam
    }

    // --- Find nearest traffic data using RBush ---
    const bbox_lon_delta =
      ((RADIUS_KM / (EARTH_RADIUS_KM * Math.cos((landLat * Math.PI) / 180))) *
        180) /
      Math.PI;
    const bbox_lat_delta = ((RADIUS_KM / EARTH_RADIUS_KM) * 180) / Math.PI;

    const searchBox = {
      minX: landLon - bbox_lon_delta,
      minY: landLat - bbox_lat_delta,
      maxX: landLon + bbox_lon_delta,
      maxY: landLat + bbox_lat_delta,
    };

    const nearbyTrafficCandidates = trafficRtree.search(searchBox);
    let minTrafficDistance = Infinity;
    let nearestTrafficValue = 0; // Initialize to 0

    for (const item of nearbyTrafficCandidates) {
      const trafficFeature = item.data;
      const [trafficLon, trafficLat] = trafficFeature.geometry?.coordinates || [
        NaN,
        NaN,
      ];

      const allMotorVehicles =
        parseInt(
          getFeatureProperty(trafficFeature, "all_motor_vehicles", "0"),
          10
        ) || 0;

      const trafficCoords = { latitude: trafficLat, longitude: trafficLon };
      const currentDistance =
        geolib.getDistance(commercialLandCoords, trafficCoords) / 1000; // Convert to KM

      if (currentDistance <= RADIUS_KM) {
        // Check if within radius
        if (currentDistance < minTrafficDistance) {
          minTrafficDistance = currentDistance;
          nearestTrafficValue = allMotorVehicles;
          trafficFoundFlag = "TRAFFIC DATA"; // Set flag if at least one is found
        }
      }
    }
    totalTraffic = nearestTrafficValue; // Assign the nearest value

    if (trafficFoundFlag && totalTraffic === 0) {
      console.warn(
        `[WARN] Traffic data found for ${propertyIdentifier} within radius, but total traffic is 0. Check 'all_motor_vehicles' property.`
      );
    }

    // --- Find nearby population data using RBush (now includes London data) ---
    const nearbyPopulationCandidates = populationRtree.search(searchBox);
    for (const item of nearbyPopulationCandidates) {
      const popFeature = item.data;
      const [popLon, popLat] = popFeature.geometry?.coordinates || [NaN, NaN];

      let areaName;
      let areaPopulation;

      // Check if it's a BUA feature (from postcode_to_bua_mapped.geojson)
      if (getFeatureProperty(popFeature, "BUA_Name", null) !== null) {
        areaName = getFeatureProperty(popFeature, "BUA_Name").trim();
        areaPopulation =
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
      }
      // Check if it's a London borough feature (from london_data.geojson)
      else if (getFeatureProperty(popFeature, "gss_name", null) !== null) {
        areaName = getFeatureProperty(popFeature, "gss_name").trim();
        areaPopulation =
          parseInt(
            getFeatureProperty(popFeature, "Population Total", "0"),
            10
          ) || 0;
      } else {
        // Unrecognized population feature type, skip
        // console.warn(`[WARN] Unrecognized population feature type encountered: ${JSON.stringify(popFeature.properties)}`); // Uncomment if you want to log these
        continue;
      }

      if (
        isNaN(popLat) ||
        isNaN(popLon) ||
        isNaN(areaPopulation) ||
        areaName === null ||
        areaName === ""
      ) {
        continue; // Skip invalid or unidentifiable population points
      }

      const popCoords = { latitude: popLat, longitude: popLon };
      if (isWithinRadius(commercialLandCoords, popCoords, RADIUS_KM)) {
        if (!uniquePopulationAreas.has(areaName)) {
          totalPopulation += areaPopulation;
          uniquePopulationAreas.add(areaName);
          populationFoundFlag = "POPULATION DATA";
        }
      }
    }
    if (populationFoundFlag && totalPopulation === 0) {
      console.warn(
        `[WARN] Population data found for ${propertyIdentifier} within radius, but total population is 0. Check 'BUA_Population'/'Population Total' property.`
      );
    }

    // --- Find nearby salary data using RBush ---
    const nearbySalaryCandidates = salaryRtree.search(searchBox);
    for (const item of nearbySalaryCandidates) {
      const salaryFeature = item.data;
      const [salaryLon, salaryLat] = salaryFeature.geometry?.coordinates || [
        NaN,
        NaN,
      ];

      const salaryValue = parseFloat(
        getFeatureProperty(salaryFeature, "salary", NaN)
      );

      if (isNaN(salaryLat) || isNaN(salaryLon) || isNaN(salaryValue)) {
        continue;
      }

      const salaryCoords = { latitude: salaryLat, longitude: salaryLon };
      if (isWithinRadius(commercialLandCoords, salaryCoords, RADIUS_KM)) {
        nearbySalaries.push(salaryValue);
        incomeFoundFlag = "INCOME DATA";
      }
    }

    // Update maxIncomesFound for dynamic columns
    if (nearbySalaries.length > maxIncomesFound) {
      maxIncomesFound = nearbySalaries.length;
      // console.log(`[INFO] New maximum incomes found: ${maxIncomesFound} (at property: ${propertyIdentifier})`); // Commented to reduce log spam
    }

    if (incomeFoundFlag && nearbySalaries.length === 0) {
      console.warn(
        `[WARN] Income data flag set for ${propertyIdentifier} within radius, but no salaries found. This might indicate an issue with property names or data values.`
      );
    }

    // Prepare the base result object
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
      // NEW: Add Postcode and Town
      POSTCODE: fullPostcode,
      TOWN: townName,
      // END NEW
      "TRAFFIC DATA": trafficFoundFlag,
      "TOTAL ON THAT POSTCODE": totalTraffic, // Now holds the nearest traffic value
      "POPULATION DATA": populationFoundFlag,
      "TOTAL POPULATION": totalPopulation,
      "INCOME DATA": incomeFoundFlag,
      _nearbyCompetitors: nearbyCompetitors, // Store raw array for CSV construction
      _nearbySalaries: nearbySalaries, // Store raw array for CSV construction
    };

    results.push(baseResult);
  }
  console.timeEnd("Analysis Loop Time");
  console.log("[INFO] Analysis complete.");

  console.time("CSV Output Time");
  if (results.length > 0) {
    // Fixed headers before dynamic income and competitor columns
    const fixedHeadersBeforeDynamic = [
      "RIGHTMOVE SITE DATA",
      "RIGHTMOVE ID",
      "features/2 (SIZE)",
      "price_1 (PRICE)",
      "RIGHTMOVE URL",
      "brokerDisplayAddress",
      "brokerDisplayName",
      "brokerProfileUrl",
      "POSTCODE", // NEW: Added Postcode
      "TOWN", // NEW: Added Town
      "TRAFFIC DATA",
      "TOTAL ON THAT POSTCODE",
      "POPULATION DATA",
      "TOTAL POPULATION",
      "INCOME DATA", // This is the marker for income data start
    ];

    // Generate dynamic income headers
    const dynamicIncomeHeaders = [];
    for (let i = 0; i < maxIncomesFound; i++) {
      dynamicIncomeHeaders.push(`INCOME ${i + 1}`);
    }

    // Generate dynamic competitor headers
    const dynamicCompetitorHeaders = [];
    for (let i = 0; i < maxCompetitorsFound; i++) {
      dynamicCompetitorHeaders.push(
        `COMPETITOR ${i + 1}`,
        `category_${i + 1}`,
        `name_${i + 1}`,
        `url_${i + 1}`
      );
    }

    // Combine all headers in the desired order: Fixed -> Dynamic Income -> Dynamic Competitor
    const outputCsvHeader = [
      ...fixedHeadersBeforeDynamic,
      ...dynamicIncomeHeaders, // Income headers come directly after 'INCOME DATA'
      ...dynamicCompetitorHeaders, // Competitor headers come after income
    ].join(",");

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
        String(row["POSTCODE"]), // NEW: Add Postcode value
        String(row["TOWN"]), // NEW: Add Town value
        String(row["TRAFFIC DATA"]),
        String(row["TOTAL ON THAT POSTCODE"]),
        String(row["POPULATION DATA"]),
        String(row["TOTAL POPULATION"]),
        String(row["INCOME DATA"])
      );

      // Add dynamic income values
      const nearbySalaries = row._nearbySalaries || [];
      for (let i = 0; i < maxIncomesFound; i++) {
        rowValues.push(
          nearbySalaries[i] !== undefined ? String(nearbySalaries[i]) : ""
        );
      }

      // Add dynamic competitor values
      const nearbyCompetitors = row._nearbyCompetitors || [];
      for (let i = 0; i < maxCompetitorsFound; i++) {
        const competitor = nearbyCompetitors[i] || {};
        rowValues.push(
          competitor.name ? `COMPETITOR ${i + 1}` : "",
          competitor.category || "",
          competitor.name || "",
          competitor.url || ""
        );
      }

      return rowValues
        .map((value) => {
          const stringValue = String(value);
          // CSV escaping logic
          if (
            stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n") ||
            stringValue.includes("\r")
          ) {
            return `"${stringValue.replace(/"/g, '""')}"`;
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
