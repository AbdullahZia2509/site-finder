import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  readCommercialLandData,
  readCompetitionsData,
  readTrafficData,
  type GeoJSONFeature,
} from "./CSVReader"; // Removed readPopulationData as it's not currently used
import * as turf from "@turf/turf";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder"; // Import the geocoder
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css"; // Import geocoder CSS

const INITIAL_CENTER: [number, number] = [-0.1278, 51.5074];
const INITIAL_ZOOM = 10.12;

export default function MapComponent({
  mapRef,
}: {
  mapRef: React.RefObject<mapboxgl.Map>;
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [center, setCenter] = useState<[number, number]>(INITIAL_CENTER);
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [competitionData, setCompetitionData] = useState<GeoJSONFeature[]>([]);
  const [commercialLandData, setCommercialLandData] = useState<
    GeoJSONFeature[]
  >([]);
  const [selectedPoints, setSelectedPoints] = useState<GeoJSONFeature[]>([]);
  const [drawingCircle, setDrawingCircle] = useState(false);
  const [radius, setRadius] = useState<number>(1000); // in meters
  const [showCommercialLayer, setShowCommercialLayer] = useState(true);
  const [showLocationsLayer, setShowLocationsLayer] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [trafficData, setTrafficData] = useState<GeoJSONFeature[]>([]);
  const [showTrafficLayer, setShowTrafficLayer] = useState(true);

  // Effect for initial Mapbox GL JS map setup
  useEffect(() => {
    mapboxgl.accessToken =
      "pk.eyJ1IjoiYWJkdWxsYWh6aWEwOSIsImEiOiJjbWJncjhweDcwMjRoMnZzODJnZ3Z4NGluIn0.suiaxiuSk_p_6NAeZ8mmRQ";

    const map = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: "mapbox://styles/mapbox/dark-v11",
      center: INITIAL_CENTER, // Use initial constants here for clarity
      zoom: INITIAL_ZOOM, // Use initial constants here for clarity
    });

    mapRef.current = map;
    // Initialize Mapbox Geocoder (search box)
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken, // Use the same access token
      mapboxgl: mapboxgl, // Pass the mapboxgl object
      marker: true, // Show a marker on the search result
      types: "country, region, place, poi, postcode", // Limit search to address and points of interest
      proximity: INITIAL_CENTER, // Prefer results near the initial map center
    });

    // Add the geocoder control to the map
    map.addControl(geocoder, "top-left"); // Added to the top-left corner

    // Update center and zoom state on map movement
    map.on("move", () => {
      const { lng, lat } = map.getCenter();
      setCenter([lng, lat]);
      setZoom(map.getZoom());
    });

    // Set mapLoaded state to true once the map's style is fully loaded
    map.on("load", () => {
      setMapLoaded(true);
    });

    // Cleanup function to remove the map when the component unmounts
    return () => {
      map.remove();
    };
  }, []); // Empty dependency array means this effect runs only once on mount

  // Effect for fetching data and adding all layers to the map
  // This effect runs only once after the map is loaded (`mapLoaded` becomes true)
  useEffect(() => {
    // Ensure map is loaded and available before attempting to add sources/layers
    if (!mapLoaded || !mapRef.current) return;

    const map = mapRef.current;

    const getDataAndAddLayers = async () => {
      try {
        const competitions = await readCompetitionsData();
        const commercials = await readCommercialLandData();
        const traffic = await readTrafficData();

        // Assign unique IDs to features (important for consistency, though Mapbox may not strictly require it for all layers)
        competitions.features.forEach((d, i) => (d.properties.id = i));
        commercials.features.forEach((d, i) => (d.properties.id = i));
        traffic.features.forEach((d, i) => (d.properties.id = i));

        // Update React state with fetched data
        setCompetitionData(competitions.features);
        setCommercialLandData(commercials.features);
        setTrafficData(traffic.features);

        // Add traffic source and heatmap layer first (to be underneath point layers)
        if (!map.getSource("traffic")) {
          // Check if source already exists
          map.addSource("traffic", {
            type: "geojson",
            data: traffic,
          });
        }

        if (!map.getLayer("traffic-heatmap")) {
          // Check if layer already exists
          map.addLayer(
            {
              id: "traffic-heatmap",
              type: "heatmap",
              source: "traffic",
              maxzoom: 15,
              paint: {
                "heatmap-weight": {
                  property: "all_motor_vehicles", // Corrected property name (no trailing space)
                  type: "exponential",
                  stops: [
                    [1, 0],
                    [62, 1], // Assuming 62 is a relevant max for your data's 'all_motor_vehicles'
                  ],
                },
                "heatmap-intensity": {
                  stops: [
                    [11, 1],
                    [15, 3],
                  ],
                },
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0,
                  "rgba(33,102,172,0)",
                  0.2,
                  "rgb(103,169,207)",
                  0.4,
                  "rgb(209,229,240)",
                  0.6,
                  "rgb(253,219,199)",
                  0.8,
                  "rgb(239,138,98)",
                  1,
                  "rgb(178,24,43)",
                ],
                "heatmap-radius": {
                  stops: [
                    [11, 15],
                    [15, 20],
                  ],
                },
                "heatmap-opacity": {
                  default: 1,
                  stops: [
                    [14, 1],
                    [15, 0],
                  ],
                },
              },
              layout: {
                visibility: showTrafficLayer ? "visible" : "none", // Set initial visibility
              },
            },
            "waterway-label" // Insert above this layer for better visual stacking
          );
        }

        // Add traffic point layer (if you still need it for higher zooms, make sure its visibility is also managed)
        if (!map.getLayer("traffic-point")) {
          map.addLayer(
            {
              id: "traffic-point",
              type: "circle",
              source: "traffic",
              minzoom: 14, // Only visible above zoom level 14
              paint: {
                "circle-radius": {
                  property: "all_motor_vehicles",
                  type: "exponential",
                  stops: [
                    [{ zoom: 15, value: 1 }, 5],
                    [{ zoom: 15, value: 62 }, 10], // Assuming 62 is max value
                    [{ zoom: 22, value: 1 }, 20],
                    [{ zoom: 22, value: 62 }, 50],
                  ],
                },
                "circle-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "mag"],
                  1,
                  "rgba(33,102,172,0)",
                  2,
                  "rgb(103,169,207)",
                  3,
                  "rgb(209,229,240)",
                  4,
                  "rgb(253,219,199)",
                  5,
                  "rgb(239,138,98)",
                  6,
                  "rgb(178,24,43)",
                ],
                "circle-stroke-color": "white",
                "circle-stroke-width": 1,
                "circle-opacity": {
                  stops: [
                    [14, 0],
                    [15, 1],
                  ],
                },
              },
              layout: {
                visibility: showTrafficLayer ? "visible" : "none", // Match heatmap visibility
              },
            },
            "waterway-label" // Place similarly to heatmap, or on top if desired
          );
        }

        // Add commercial land source and layer
        if (!map.getSource("commercial")) {
          map.addSource("commercial", { type: "geojson", data: commercials });
        }
        if (!map.getLayer("commercial")) {
          map.addLayer({
            id: "commercial",
            type: "circle",
            source: "commercial",
            paint: { "circle-color": "#1a73e8" },
            layout: {
              visibility: showCommercialLayer ? "visible" : "none", // Set initial visibility
            },
          });
        }

        // Add competitor locations source and layer
        if (!map.getSource("locations")) {
          map.addSource("locations", { type: "geojson", data: competitions });
        }
        if (!map.getLayer("locations")) {
          map.addLayer({
            id: "locations",
            type: "circle",
            source: "locations",
            paint: { "circle-color": "#FF0000" },
            layout: {
              visibility: showLocationsLayer ? "visible" : "none", // Set initial visibility
            },
          });
        }
      } catch (error) {
        console.error("Failed to load map data or add layers:", error);
      }
    };

    getDataAndAddLayers();

    // Cleanup: Remove layers and sources when component unmounts or mapLoaded changes (rare for mapLoaded)
    return () => {
      const map = mapRef.current;
      if (map) {
        // Remove layers first, then sources
        if (map.getLayer("traffic-heatmap")) map.removeLayer("traffic-heatmap");
        if (map.getLayer("traffic-point")) map.removeLayer("traffic-point"); // Remove point layer too
        if (map.getSource("traffic")) map.removeSource("traffic");

        if (map.getLayer("commercial")) map.removeLayer("commercial");
        if (map.getSource("commercial")) map.removeSource("commercial");

        if (map.getLayer("locations")) map.removeLayer("locations");
        if (map.getSource("locations")) map.removeSource("locations");
      }
    };
  }, [mapLoaded]); // This effect depends on mapLoaded

  // Effect to toggle Commercial Sites layer visibility
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    if (map.getLayer("commercial")) {
      map.setLayoutProperty(
        "commercial",
        "visibility",
        showCommercialLayer ? "visible" : "none"
      );
    }
  }, [showCommercialLayer, mapLoaded]); // Reruns when showCommercialLayer or mapLoaded changes

  // Effect to toggle Storage Sites layer visibility
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    if (map.getLayer("locations")) {
      map.setLayoutProperty(
        "locations",
        "visibility",
        showLocationsLayer ? "visible" : "none"
      );
    }
  }, [showLocationsLayer, mapLoaded]); // Reruns when showLocationsLayer or mapLoaded changes

  // Effect to toggle Traffic Heatmap layer visibility
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    // Ensure you target the correct layer ID
    if (map.getLayer("traffic-heatmap")) {
      map.setLayoutProperty(
        "traffic-heatmap",
        "visibility",
        showTrafficLayer ? "visible" : "none"
      );
    }
    // If you also want to toggle traffic-point layer, add it here:
    if (map.getLayer("traffic-point")) {
      map.setLayoutProperty(
        "traffic-point",
        "visibility",
        showTrafficLayer ? "visible" : "none"
      );
    }
  }, [showTrafficLayer, mapLoaded]); // Reruns when showTrafficLayer or mapLoaded changes

  // Effect for handling map clicks on locations and commercial layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["locations", "commercial"], // Only query features on these layers
      });

      if (!features.length) return; // If no features are clicked, do nothing
      const feature = features[0] as GeoJSONFeature; // Get the first feature found
      flyToStore(feature); // Calls flyToStore with the clicked feature
      createPopUp(feature); // Calls createPopUp with the clicked feature
    };

    map.on("click", handleClick); // Attach the click listener
    return () => {
      map.off("click", handleClick); // Clean up the listener when component unmounts
    };
  }, [competitionData, commercialLandData]);

  const resetMap = () => {
    mapRef.current?.flyTo({ center: INITIAL_CENTER, zoom: INITIAL_ZOOM });
  };

  // Improved createGeoJSONCircle using Turf.js for better accuracy
  const createGeoJSONCircle = (
    center: [number, number],
    radiusInMeters: number,
    points = 64
  ): GeoJSON.Feature => {
    const radiusInKm = radiusInMeters / 1000; // Turf.js expects radius in kilometers
    const circle = turf.circle(turf.point(center), radiusInKm, {
      steps: points,
    });
    return circle;
  };

  const startDrawingCircle = () => {
    if (!mapRef.current) return;
    if (drawingCircle) return;

    setDrawingCircle(true);

    const map = mapRef.current;

    const onClick = (e: mapboxgl.MapMouseEvent) => {
      const center: [number, number] = [e.lngLat.lng, e.lngLat.lat];
      const circleGeoJSON = createGeoJSONCircle(center, radius);

      if (map.getSource("circle")) {
        (map.getSource("circle") as mapboxgl.GeoJSONSource).setData(
          circleGeoJSON
        );
      } else {
        map.addSource("circle", { type: "geojson", data: circleGeoJSON });
        map.addLayer({
          id: "circle",
          type: "fill",
          source: "circle",
          paint: {
            "fill-color": "#007bff",
            "fill-opacity": 0.3,
          },
        });
      }

      // Filter points based on current visibility of their layers
      const visiblePoints = [
        ...(showLocationsLayer ? competitionData : []),
        ...(showCommercialLayer ? commercialLandData : []),
        // If you want to include traffic points in selection:
        // ...(showTrafficLayer ? trafficData.filter(d => d.geometry.type === 'Point') : []),
      ];

      const selected = visiblePoints.filter((point) => {
        try {
          const pt = turf.point(point.geometry.coordinates);
          // Ensure circleGeoJSON.geometry.coordinates is treated as a valid polygon type for turf.polygon
          // For a simple circle, it's usually `[array_of_points]`
          const polygon = turf.polygon(
            circleGeoJSON.geometry.coordinates as any
          ); // Cast to any to satisfy type if turf.circle returns a slightly different structure
          return turf.booleanPointInPolygon(pt, polygon);
        } catch (error) {
          console.error("Error during point in polygon check:", error);
          return false;
        }
      });

      setSelectedPoints(selected);
      setDrawingCircle(false);
      map.off("click", onClick); // Remove click listener after drawing
    };

    map.on("click", onClick);
  };

  const createPopUp = (feature: GeoJSONFeature) => {
    const popUps = document.getElementsByClassName("mapboxgl-popup");
    if (popUps.length) popUps[0].remove(); // Close existing popups

    const isCompetitor = feature.properties?.pointType === "competitor";

    new mapboxgl.Popup({ closeOnClick: true })
      .setLngLat(feature.geometry.coordinates)
      .setHTML(
        `<h3>${
          isCompetitor ? feature.properties.name : feature.properties.pageTitle
        }</h3><h4>${
          isCompetitor
            ? feature.properties.address
            : feature.properties.property
        }</h4>`
      )
      .addTo(mapRef.current!);
  };

  const flyToStore = (feature: GeoJSONFeature) => {
    mapRef.current?.flyTo({ center: feature.geometry.coordinates, zoom: 15 });
  };

  const downloadCSV = () => {
    const csv = convertToCSV(selectedPoints);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "selected_points.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="topbar">
        Longitude: {center[0].toFixed(4)} | Latitude: {center[1].toFixed(4)} |
        Zoom: {zoom.toFixed(2)}
      </div>

      <div className="legend">
        <div className="legend-item">
          <input
            type="checkbox"
            checked={showCommercialLayer}
            onChange={() => setShowCommercialLayer(!showCommercialLayer)}
          />
          <div
            className="legend-marker"
            style={{ backgroundColor: "#1a73e8" }}
          ></div>
          <span>Commercial Sites</span>
        </div>
        <div className="legend-item">
          <input
            type="checkbox"
            checked={showLocationsLayer}
            onChange={() => setShowLocationsLayer(!showLocationsLayer)}
          />
          <div
            className="legend-marker"
            style={{ backgroundColor: "#FF0000" }}
          ></div>
          <span>Storage Sites</span>
        </div>
        <div className="legend-item">
          <input
            type="checkbox"
            checked={showTrafficLayer} // Controlled by showTrafficLayer state
            onChange={() => setShowTrafficLayer(!showTrafficLayer)}
          />
          <div
            className="legend-marker"
            style={{ backgroundColor: "rgba(178,24,43,0.8)" }} // Example color
          ></div>
          <span>Traffic Heatmap</span>
        </div>
      </div>

      <div className="selected-points-box">
        <h3>Selected Points ({selectedPoints.length})</h3>
        <button onClick={downloadCSV} style={{ marginBottom: "10px" }}>
          Download CSV
        </button>
        <div className="points-list">
          {selectedPoints.map((point, i) => (
            <div key={i} className="point-item">
              <div className="point-info">
                {point.properties.pointType === "competitor" ? (
                  <>
                    <h4>{point.properties.name}</h4>
                    <p>{point.properties.address}</p>
                    <p>Phone: {point.properties.phone}</p>
                    <p>Site: {point.properties.site}</p>
                  </>
                ) : (
                  <>
                    <h4>{point.properties.pageTitle}</h4>
                    <p>
                      <strong>Property:</strong> {point.properties.property}
                    </p>
                    <p>
                      <strong>Property Sub Type:</strong>{" "}
                      {point.properties.propertySubType}
                    </p>
                    <p>
                      <strong>Sector:</strong> {point.properties.sector}
                    </p>
                    <p>
                      <strong>Size:</strong> {point.properties.size}
                    </p>
                    <p>
                      <strong>Type:</strong> {point.properties.type}
                    </p>
                    <p>
                      <strong>UK Country:</strong> {point.properties.ukCountry}
                    </p>
                    <p>
                      <strong>URL:</strong>{" "}
                      <a
                        href={point.properties.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {point.properties.url}
                      </a>
                    </p>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div ref={mapContainerRef} className="map" />
      <div style={{ marginTop: "10px" }}>
        <button
          className="reset-button"
          onClick={resetMap}
          style={{ marginRight: "10px" }}
        >
          Reset Map
        </button>
        <button className="draw-circle-button" onClick={startDrawingCircle}>
          Draw Circle
        </button>
        <label style={{ marginLeft: "10px", marginRight: "5px" }}>
          Radius (m):
        </label>
        <input
          type="number"
          value={radius}
          onChange={(e) => setRadius(parseInt(e.target.value) || 0)}
          style={{
            width: "80px",
            padding: "4px",
            position: "absolute",
            top: "120px",
            zIndex: "1",
            left: "12px",
          }}
          min={100}
          max={10000}
        />
      </div>
    </>
  );
}

// Helper function to convert GeoJSON features to CSV format
function convertToCSV(data: GeoJSONFeature[]): string {
  if (data.length === 0) return "";

  // Collect all unique property keys from all features
  const allKeys = new Set<string>();
  data.forEach((item) => {
    Object.keys(item.properties || {}).forEach((key) => allKeys.add(key));
    // Also include geometry coordinates as separate columns if needed
    if (item.geometry && item.geometry.coordinates) {
      allKeys.add("longitude");
      allKeys.add("latitude");
    }
  });

  // Sort headers for consistent CSV output
  const headers = Array.from(allKeys).sort();

  // Map each feature to a CSV row
  const rows = data.map((item) =>
    headers
      .map((key) => {
        let value: any;
        if (key === "longitude") {
          value = item.geometry?.coordinates?.[0] ?? "";
        } else if (key === "latitude") {
          value = item.geometry?.coordinates?.[1] ?? "";
        } else {
          value = item.properties?.[key] ?? "";
        }
        // Escape double quotes by replacing with two double quotes, and wrap value in quotes
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  // Combine headers and rows
  return `${headers.join(",")}\n${rows.join("\n")}`;
}
