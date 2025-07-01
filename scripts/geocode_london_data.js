// Import the necessary library for geocoding using ES module syntax
import NodeGeocoder from "node-geocoder";

// The input CSV data for London boroughs
const inputData = `
gss_code,gss_name,WD22CD,Population Total
E09000002,Barking and Dagenham,E05014053,219992
E09000003,Barnet,E05013628,389101
E09000004,Bexley,E05011217,247835
E09000005,Brent,E05013496,341221
E09000006,Bromley,E05013987,329578
E09000007,Camden,E05013652,218049
E09000001,City of London,E09000001,10847
E09000008,Croydon,E05011462,392224
E09000009,Ealing,E05013518,369937
E09000010,Enfield,E05013672,327224
E09000011,Greenwich,E05014072,291080
E09000012,Hackney,E05009367,261491
E09000013,Hammersmith and Fulham,E05013733,185238
E09000014,Haringey,E05013585,261811
E09000015,Harrow,E05013542,261185
E09000016,Havering,E05013967,264703
E09000017,Hillingdon,E05013564,310681
E09000018,Hounslow,E05013606,290488
E09000019,Islington,E05013697,220373
E09000020,Kensington and Chelsea,E05009388,146154
E09000021,Kingston upon Thames,E05013928,168302
E09000022,Lambeth,E05014095,615465
E09000023,Lewisham,E05013714,298653
E09000024,Merton,E05013810,214709
E09000025,Newham,E05013904,358645
E09000026,Redbridge,E05011234,310911
E09000027,Richmond upon Thames,E05013774,194894
E09000028,Southwark,E05011095,311913
E09000029,Sutton,E05013754,210053
E09000030,Tower Hamlets,E05009317,325789
E09000031,Waltham Forest,E05013882,275887
E09000032,Wandsworth,E05014009,329035
E09000033,Westminster,E05013792,211365
`;

// Configure the geocoder with Mapbox
const options = {
  provider: "mapbox",
  apiKey: "YOUR_MAPBOX_API_KEY", // IMPORTANT: Replace with your actual Mapbox API key
  formatter: null, // 'null' means we get the full response
};

const geocoder = NodeGeocoder(options);

/**
 * Parses the input CSV data string into an array of objects.
 * Each object will represent a row with headers as keys.
 * @param {string} dataString - The raw input CSV data string.
 * @returns {Array<Object>} An array of parsed data objects.
 */
function parseInputData(dataString) {
  const lines = dataString.trim().split("\n");
  const headers = lines[0].split(","); // Get headers from the first line
  const parsedData = [];

  for (let i = 1; i < lines.length; i++) {
    // Start from the second line for data
    const values = lines[i].split(",");
    const rowObject = {};
    for (let j = 0; j < headers.length; j++) {
      rowObject[headers[j].trim()] = values[j].trim();
    }
    parsedData.push(rowObject);
  }
  return parsedData;
}

/**
 * Adds longitude and latitude to each location in the data using a geocoding service.
 * Includes a delay between requests to respect API rate limits.
 * @param {Array<Object>} data - An array of data objects, each containing a 'gss_name' (borough name).
 * @returns {Promise<Array<Object>>} A promise that resolves to the data with added coordinates.
 */
async function geocodeLocations(data) {
  const geocodedData = [];
  for (const item of data) {
    const locationName = item.gss_name;
    let res = null;

    // Attempt 1: Try with "Borough of" prefix
    const query1 = `Borough of ${locationName}, London, United Kingdom`;
    console.log(`Attempting geocoding (query 1): ${query1}...`);
    try {
      res = await geocoder.geocode(query1);
    } catch (error) {
      console.error(`Error with query 1 for ${locationName}: ${error.message}`);
    }

    // If no result from attempt 1, try a more generic query
    if (!res || res.length === 0) {
      const query2 = `${locationName}, London, United Kingdom`;
      console.log(`Attempting geocoding (query 2): ${query2}...`);
      try {
        res = await geocoder.geocode(query2);
      } catch (error) {
        console.error(
          `Error with query 2 for ${locationName}: ${error.message}`
        );
      }
    }

    if (res && res.length > 0) {
      const { latitude, longitude } = res[0]; // Take the first result
      geocodedData.push({
        ...item,
        latitude: latitude,
        longitude: longitude,
      });
      console.log(
        `Found: ${locationName} -> Lat: ${latitude}, Lon: ${longitude}`
      );
    } else {
      geocodedData.push({
        ...item,
        latitude: null,
        longitude: null,
        error: "No coordinates found after multiple attempts",
      });
      console.warn(
        `No coordinates found for: ${locationName} after multiple attempts`
      );
    }

    // Pause for a short period to avoid hitting rate limits (e.g., 100ms for Mapbox, check their docs)
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return geocodedData;
}

// Main execution function
async function main() {
  console.log("Starting geocoding process for London boroughs...");
  const parsedData = parseInputData(inputData);
  const results = await geocodeLocations(parsedData);

  console.log("\n--- Geocoding Results for London Boroughs ---");
  console.log(JSON.stringify(results, null, 2)); // Pretty print the JSON output
}

main();
