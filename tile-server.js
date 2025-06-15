// server.js

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import MBTiles from "@mapbox/mbtiles";

// Get directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

// Enable CORS for all routes
app.use(cors());

// Add CORS headers (can be redundant if cors() middleware handles it, but harmless)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Serve static files from the public directory
app.use(express.static("public"));

// Centralized storage for MBTiles instances
const mbtilesInstances = {};

// Function to open an MBTiles file and store its instance
async function openMBTiles(name, filename) {
  if (mbtilesInstances[name]) {
    return mbtilesInstances[name];
  }

  const mbtilesPath = path.join(__dirname, "public", "vector-tiles", filename);
  console.log(`Looking for MBTiles '${name}' at:`, mbtilesPath);

  return new Promise((resolve, reject) => {
    new MBTiles(`${mbtilesPath}?mode=ro`, (err, mbtiles) => {
      if (err) {
        console.error(`Error opening MBTiles '${name}':`, err);
        mbtilesInstances[name] = null; // Mark as failed or unavailable
        reject(err);
      } else {
        console.log(`Successfully opened MBTiles file: ${name}`);
        mbtilesInstances[name] = mbtiles;
        resolve(mbtiles);
      }
    });
  });
}

// Initialize MBTiles instances on server start (or lazily on first request)
// It's generally better to initialize them here so errors are caught early
(async () => {
  try {
    await openMBTiles("postcode", "postcode_to_bua_mapped.mbtiles");
    await openMBTiles("competitions", "competition_data.mbtiles");
    await openMBTiles("commercial_land", "commercial_land.mbtiles");
  } catch (error) {
    console.error("Failed to initialize one or more MBTiles files:", error);
    // Depending on criticality, you might want to exit the process here
  }
})();

// Helper function to handle tile requests
async function handleTileRequest(req, res, mbtilesName) {
  const { z, x, y } = req.params;
  // console.log(`Request for tile '${mbtilesName}' z:${z} x:${x} y:${y}`); // Uncomment for verbose logging

  try {
    const mbtiles = mbtilesInstances[mbtilesName];
    if (!mbtiles) {
      console.error(
        `MBTiles instance for '${mbtilesName}' not found or failed to load.`
      );
      return res.status(500).send("MBTiles source not available.");
    }

    mbtiles.getTile(
      parseInt(z),
      parseInt(x),
      parseInt(y),
      (err, tile, headers) => {
        if (err) {
          // console.error(`Error getting tile '${mbtilesName}' z:${z} x:${x} y:${y}:`, err.message); // Uncomment for verbose logging
          // 204 No Content for missing tiles, common for tile servers
          if (err.message === "Tile does not exist") {
            res.status(204).send();
          } else {
            res.status(500).send("Error fetching tile");
          }
        } else {
          // console.log(`Serving tile '${mbtilesName}' z:${z} x:${x} y:${y}`); // Uncomment for verbose logging
          res.set(headers);
          res.send(tile);
        }
      }
    );
  } catch (error) {
    console.error(`Error in tile handler for '${mbtilesName}':`, error);
    res.status(500).send("Internal Server Error");
  }
}

// Add a simple route to test the server
app.get("/", (req, res) => {
  res.send("Tile server is running");
});

// Routes for postcode_to_bua_mapped tiles and metadata
app.get("/vector-tiles/postcode-to-bua/:z/:x/:y.pbf", (req, res) =>
  handleTileRequest(req, res, "postcode")
);
app.get("/vector-tiles/postcode-to-bua.json", (req, res) => {
  const tilesJsonPath = path.join(
    __dirname,
    "public",
    "vector-tiles",
    "postcode_to_bua_mapped.json"
  ); // Renamed for clarity
  console.log("Serving postcode_to_bua_mapped.json from:", tilesJsonPath);
  res.sendFile(tilesJsonPath);
});

// New Routes for competition_data tiles and metadata
app.get("/vector-tiles/competitions/:z/:x/:y.pbf", (req, res) =>
  handleTileRequest(req, res, "competitions")
);
app.get("/vector-tiles/competitions.json", (req, res) => {
  const tilesJsonPath = path.join(
    __dirname,
    "public",
    "vector-tiles",
    "competition_data.json"
  );
  console.log("Serving competition_data.json from:", tilesJsonPath);
  res.sendFile(tilesJsonPath);
});

// New Routes for commercial_land tiles and metadata
app.get("/vector-tiles/commercial-land/:z/:x/:y.pbf", (req, res) =>
  handleTileRequest(req, res, "commercial_land")
);
app.get("/vector-tiles/commercial-land.json", (req, res) => {
  const tilesJsonPath = path.join(
    __dirname,
    "public",
    "vector-tiles",
    "commercial_land.json"
  );
  console.log("Serving commercial_land.json from:", tilesJsonPath);
  res.sendFile(tilesJsonPath);
});

// Start the server
app.listen(port, "0.0.0.0", () => {
  console.log(`Tile server running at http://0.0.0.0:${port}`);
  console.log(`MBTiles files:`);
  console.log(
    ` - postcode_to_bua_mapped.mbtiles: http://0.0.0.0:${port}/vector-tiles/postcode-to-bua/{z}/{x}/{y}.pbf`
  );
  console.log(
    ` - competition_data.mbtiles: http://0.0.0.0:${port}/vector-tiles/competitions/{z}/{x}/{y}.pbf`
  );
  console.log(
    ` - commercial_land.mbtiles: http://0.0.0.0:${port}/vector-tiles/commercial-land/{z}/{x}/{y}.pbf`
  );
});
