// MapComponent.tsx

import { useRef, useEffect, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  loadVisiblePopulation,
  readCommercialLandData,
  readCompetitionsData,
  type GeoJSONFeature,
} from "./CSVReader";
import * as turf from "@turf/turf";
import { booleanPointInPolygon } from "@turf/turf"; // Attempt different import style
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";

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
  const [selectedPoints, setSelectedPoints] = useState<GeoJSONFeature[]>([]); // This will now only hold commercial and storage sites
  const [drawingCircle, setDrawingCircle] = useState(false);
  const [radius, setRadius] = useState<number>(1000); // in meters
  const [showCommercialLayer, setShowCommercialLayer] = useState(true);
  const [showLocationsLayer, setShowLocationsLayer] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showTrafficLayer, setShowTrafficLayer] = useState(true);
  const [showPopulationHeatmap, setShowPopulationHeatmap] = useState(true);

  function debounce<F extends (...args: any[]) => void>(
    func: F,
    waitFor: number
  ) {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<F>): void => {
      if (timeout !== null) {
        clearTimeout(timeout);
      }
      timeout = setTimeout(() => func(...args), waitFor);
    };
  }

  // Effect for initial Mapbox GL JS map setup
  useEffect(() => {
    mapboxgl.accessToken =
      "pk.eyJ1IjoiYWJkdWxsYWh6aWEwOSIsImEiOiJjbWJncjhweDcwMjRoMnZzODJnZ3Z4NGluIn0.suiaxiuSk_p_6NAeZ8mmRQ";

    const map = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: "mapbox://styles/mapbox/dark-v11",
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      minZoom: 10.12,
      maxZoom: 14,
    });

    mapRef.current = map;
    // Initialize Mapbox Geocoder (search box)
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      marker: true,
      types: "country, region, place, poi, postcode",
      proximity: INITIAL_CENTER,
    });

    map.addControl(geocoder, "top-left");

    map.on("move", () => {
      const { lng, lat } = map.getCenter();
      setCenter([lng, lat]);
      setZoom(map.getZoom());
    });

    map.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      map.remove();
    };
  }, []);

  // Effect for fetching data and adding all layers to the map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const map = mapRef.current;

    const getDataAndAddLayers = async () => {
      try {
        const competitions = await readCompetitionsData();
        const commercials = await readCommercialLandData();

        competitions.features.forEach((d, i) => (d.properties.id = i));
        commercials.features.forEach((d, i) => (d.properties.id = i));

        setCompetitionData(competitions.features);
        setCommercialLandData(commercials.features);

        if (!map.getSource("mapbox-traffic-data")) {
          map.addSource("mapbox-traffic-data", {
            type: "vector",
            url: "mapbox://mapbox.mapbox-traffic-v1", // Mapbox's official traffic tileset
          });
        }

        if (!map.getLayer("traffic-line")) {
          map.addLayer(
            {
              id: "traffic-line",
              type: "line",
              source: "mapbox-traffic-data",
              "source-layer": "traffic", // The source-layer name for Mapbox traffic data
              paint: {
                "line-width": {
                  base: 1.5,
                  stops: [
                    [10, 1.5],
                    [14, 3],
                    [18, 5],
                  ],
                },
                "line-color": [
                  "match",
                  ["get", "congestion"],
                  "low",
                  "#3bb2d0", // Light blue for low traffic
                  "moderate",
                  "#ffed01", // Yellow for moderate
                  "heavy",
                  "#ff8c1a", // Orange for heavy
                  "severe",
                  "#ff0000", // Red for severe
                  "#cccccc", // Default for unknown
                ],
                "line-opacity": 0.8,
              },
              filter: ["==", "$type", "LineString"], // Ensure it only renders line features
              layout: {
                visibility: showTrafficLayer ? "visible" : "none",
              },
            },
            "waterway-label"
          ); // Place it below waterway labels for better visibility
        }

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
              visibility: showCommercialLayer ? "visible" : "none",
            },
          });
        }

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
              visibility: showLocationsLayer ? "visible" : "none",
            },
          });
        }
      } catch (error) {
        console.error("Failed to load map data or add layers:", error);
      }
    };

    getDataAndAddLayers();

    return () => {
      const map = mapRef.current;
      if (map) {
        if (map.getLayer("traffic-line")) map.removeLayer("traffic-line");
        if (map.getSource("mapbox-traffic-data"))
          map.removeSource("mapbox-traffic-data");

        if (map.getLayer("commercial")) map.removeLayer("commercial");
        if (map.getSource("commercial")) map.removeSource("commercial");

        if (map.getLayer("locations")) map.removeLayer("locations");
        if (map.getSource("locations")) map.removeSource("locations");
      }
    };
  }, [mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const map = mapRef.current;

    const updatePopulationDataAndLayers = async () => {
      console.log("MapComponent: Updating population data for bounds...");
      const bounds = map.getBounds();
      if (!bounds) {
        console.warn("MapComponent: Map bounds not available for data update.");
        return;
      }

      try {
        const newPopulationData = await loadVisiblePopulation(
          bounds.getWest(),
          bounds.getSouth(),
          bounds.getEast(),
          bounds.getNorth()
        );

        const source = map.getSource("population") as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData(newPopulationData as any);
        } else {
          map.addSource("population", {
            type: "geojson",
            data: newPopulationData as any,
          });

          map.addLayer(
            {
              id: "population-heatmap",
              type: "heatmap",
              source: "population",
              maxzoom: 15,
              paint: {
                "heatmap-weight": {
                  property: "population_count",
                  type: "exponential",
                  stops: [
                    [0, 0], // Population 0 has 0 weight
                    [500, 0.2], // Population 50 has 0.2 weight
                    [1000, 0.5], // Population 200 has 0.5 weight
                    [5000, 0.8], // Population 1000 has 0.8 weight
                    [10000, 1], // Population 5000+ has full weight
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
                  "rgba(0, 0, 255, 0)", // Transparent Blue for 0 density
                  0.1,
                  "royalblue", // Royal Blue for low density
                  0.3,
                  "cyan", // Cyan for medium-low density
                  0.5,
                  "lime", // Lime Green for medium density
                  0.7,
                  "yellow", // Yellow for medium-high density
                  1,
                  "red", // Red for high density
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
            },
            "waterway-label"
          );

          map.addLayer({
            id: "population-points",
            type: "circle",
            source: "population",
            minzoom: 14,
            paint: {
              "circle-radius": 3,
              "circle-color": "#00CC00",
              "circle-opacity": 0.6,
            },
          });
        }
        console.log("MapComponent: Population data updated.");
      } catch (error) {
        console.error("MapComponent: Error updating population data:", error);
      }
    };

    const debouncedUpdate = debounce(updatePopulationDataAndLayers, 500);

    updatePopulationDataAndLayers();

    map.on("moveend", debouncedUpdate);

    return () => {
      const map = mapRef.current;
      if (map) {
        if (map.getLayer("population-heatmap"))
          map.removeLayer("population-heatmap");
        if (map.getLayer("population-points"))
          map.removeLayer("population-points");
        if (map.getSource("population")) map.removeSource("population");
      }
    };
  }, [mapLoaded]);

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
  }, [showCommercialLayer, mapLoaded]);

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
  }, [showLocationsLayer, mapLoaded]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    if (map.getLayer("traffic-line")) {
      map.setLayoutProperty(
        "traffic-line", // Changed from traffic-heatmap/traffic-point
        "visibility",
        showTrafficLayer ? "visible" : "none"
      );
    }
  }, [showTrafficLayer, mapLoaded]);

  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    if (map.getLayer("population-heatmap")) {
      map.setLayoutProperty(
        "population-heatmap",
        "visibility",
        showPopulationHeatmap ? "visible" : "none"
      );
    }
    if (map.getLayer("population-points")) {
      map.setLayoutProperty(
        "population-points",
        "visibility",
        showPopulationHeatmap ? "visible" : "none"
      );
    }
  }, [showPopulationHeatmap, mapLoaded]);

  // Effect for handling map clicks on locations and commercial layers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const handleClick = (e: mapboxgl.MapMouseEvent) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: ["locations", "commercial"],
      });

      if (!features.length) return;
      const feature = features[0] as GeoJSONFeature;
      flyToStore(feature);
      createPopUp(feature);
    };

    map.on("click", handleClick);
    return () => {
      map.off("click", handleClick);
    };
  }, [competitionData, commercialLandData]);

  const resetMap = () => {
    mapRef.current?.flyTo({ center: INITIAL_CENTER, zoom: INITIAL_ZOOM });
  };

  const createGeoJSONCircle = (
    center: [number, number],
    radiusInMeters: number,
    points = 64
  ): GeoJSON.Feature => {
    const radiusInKm = radiusInMeters / 1000;
    const circle = turf.circle(turf.point(center), radiusInKm, {
      steps: points,
    });
    return circle;
  };

  const startDrawingCircle = () => {
    if (!mapRef.current) return;
    if (drawingCircle) return;

    setDrawingCircle(true);
    setSelectedPoints([]);

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

      // Filter and list Commercial and Competition points
      const visibleCommercialAndCompetitionPoints = [
        ...(showCommercialLayer ? commercialLandData : []),
        ...(showLocationsLayer ? competitionData : []),
      ].filter((point: GeoJSONFeature) => {
        // Explicitly type point
        try {
          const pt = turf.point(point.geometry.coordinates); // point.geometry.coordinates is valid due to GeoJSONFeature type
          const polygonGeoJSON = circleGeoJSON.geometry as GeoJSON.Polygon; // Explicitly type for turf.polygon
          const poly = turf.polygon(polygonGeoJSON.coordinates);
          return booleanPointInPolygon(pt, poly); // Use destructured import
        } catch (error) {
          console.error(
            "Error during commercial/competition point in polygon check:",
            error
          );
          return false;
        }
      });
      setSelectedPoints(visibleCommercialAndCompetitionPoints);
      setDrawingCircle(false);
      map.off("click", onClick); // Remove click listener after drawing
    };

    map.on("click", onClick);
  };

  const createPopUp = (feature: GeoJSONFeature) => {
    const popUps = document.getElementsByClassName("mapboxgl-popup");
    if (popUps.length) popUps[0].remove();

    const props = feature.properties;
    let popupHTML = `<div class="custom-popup-content">`;

    // Title: Prefer 'name', fallback to 'pageTitle'
    const title = props.name || props.pageTitle || "Unnamed Location";
    popupHTML += `<h3>${title}</h3>`;

    // Category/Type
    if (props.category || props.type) {
      popupHTML += `<p class="popup-category"><strong>Category:</strong>${
        props.category || props.type
      }</p>`;
    }

    // Address: Prefer 'full_address', fallback to 'address'
    if (props.full_address || props.address) {
      popupHTML += `<p class="popup-address"><strong>Address:</strong>${
        props.full_address || props.address
      }</p>`;
    }

    // Contact Info
    if (props.phone) {
      popupHTML += `<p class="popup-phone"><strong>Phone:</strong> ${props.phone}</p>`;
    } else if (props.phone_1) {
      popupHTML += `<p class="popup-phone"><strong>Phone:</strong> ${props.phone_1}</p>`;
    }

    if (props.site) {
      let siteUrl = props.site;
      if (!/^https?:\/\//i.test(siteUrl)) {
        siteUrl = "https://" + siteUrl;
      }
      popupHTML += `<p class="popup-website"><strong>Website:</strong> <a href="${siteUrl}" target="_blank" rel="noopener noreferrer">${props.site}</a></p>`;
    } else if (props.url) {
      let siteUrl = props.url;
      if (!/^https?:\/\//i.test(siteUrl)) {
        siteUrl = "https://" + siteUrl;
      }
      popupHTML += `<p class="popup-website"><strong>Website:</strong> <a href="${siteUrl}" target="_blank" rel="noopener noreferrer">${props.url}</a></p>`;
    }

    // Rating and Reviews
    if (props.rating) {
      const ratingText = props.rating;
      const reviewsText = props.reviews ? ` (${props.reviews} reviews)` : "";
      popupHTML += `<p class="popup-rating"><strong>Rating:</strong> ${ratingText}${reviewsText}</p>`;
    }

    // Description
    if (props.description) {
      popupHTML += `<p class="popup-description"><strong>Description:</strong><br/>${props.description}</p>`;
    }

    // Image for Popup - Check both photo and images/0 properties
    const imageUrl = props.photo?.trim() || (props as any)["images/0"]?.trim();
    if (imageUrl) {
      popupHTML += `
        <div class="popup-photo-container" style="margin: 10px 0;">
          <img 
            src="${imageUrl}" 
            alt="Location Image" 
            style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 4px; border: 1px solid #eee;"
            crossOrigin="anonymous"
            onError="this.style.display='none'"
          />
        </div>
      `;
    }

    // Additional Details Section
    popupHTML += `<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee;"><h4 style="margin: 0; padding: 0;">Additional Details:</h4><ul style="list-style: none; padding-left: 0; font-size: 12px;">`;

    type DetailItem = {
      label: string;
      key: keyof GeoJSONFeature["properties"];
      isUrl?: boolean;
    };

    const detailsToShow: DetailItem[] = [
      { label: "Property Type", key: "property" },
      { label: "Sub-Type", key: "propertySubType" },
      { label: "Sector", key: "sector" },
      { label: "Size (SqFt)", key: "size" }, // Added unit for clarity
      { label: "UK Country", key: "ukCountry" },
      { label: "Outcode", key: "outcode" },
      { label: "Price per SqFt", key: "pricePerSqFt" },
      { label: "Price 1", key: "price_1" },
      { label: "Price 2", key: "price_2" },
      { label: "BUA Population", key: "BUA_Population" },
      { label: "All Motor Vehicles", key: "all_motor_vehicles" },
      { label: "Year (Traffic)", key: "year" },
      { label: "Query Source", key: "query" },
    ];

    detailsToShow.forEach((detail) => {
      // Check if props is not undefined and then if the key exists
      if (
        props &&
        props[detail.key] !== undefined &&
        props[detail.key] !== null &&
        String(props[detail.key]).trim() !== ""
      ) {
        popupHTML += `<li><strong>${detail.label}:</strong> ${
          props[detail.key]
        }</li>`;
      }
    });

    popupHTML += `</ul></div>`; // Close additional details
    popupHTML += `</div>`; // Close custom-popup-content

    new mapboxgl.Popup({
      closeOnClick: false,
      maxWidth: "350px",
      closeButton: true,
    }) // Increased maxWidth slightly
      .setLngLat(feature.geometry.coordinates as mapboxgl.LngLatLike)
      .setHTML(popupHTML)
      .addTo(mapRef.current!);
  };

  // ... (rest of the code remains the same)
  const flyToStore = (feature: GeoJSONFeature) => {
    mapRef.current?.flyTo({ center: feature.geometry.coordinates, zoom: 15 });
  };

  const downloadCSV = () => {
    const csv = convertToCSV(selectedPoints); // This will only download commercial and storage sites
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
            checked={showTrafficLayer}
            onChange={() => setShowTrafficLayer(!showTrafficLayer)}
          />
          {/* You can keep the old marker or change it to represent lines */}
          <div
            className="legend-marker"
            style={{
              backgroundColor: "transparent", // No fill for lines
              borderBottom: "3px solid #ffed01", // Example for moderate traffic line
              width: "20px", // Make it look like a line segment
            }}
          ></div>
          <span>Traffic (Live Lines)</span> {/* Updated text */}
        </div>
        <div className="legend-item">
          <input
            type="checkbox"
            checked={showPopulationHeatmap}
            onChange={() => setShowPopulationHeatmap(!showPopulationHeatmap)}
          />
          <div
            className="legend-marker"
            style={{ backgroundColor: "rgba(0,109,44,0.8)" }}
          ></div>
          <span>Population Heatmap</span>
        </div>
      </div>

      <div className="selected-points-box">
        <h3>Selected Points ({selectedPoints.length})</h3>
        {/* Removed display of totalPopulationInCircle */}
        {/* Removed display of totalTrafficInCircle */}
        <button
          onClick={downloadCSV}
          className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none dark:focus:ring-blue-800"
        >
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
                    <h4>
                      {point.properties.pageTitle ||
                        `Commercial Site ID: ${point.properties.id}`}
                    </h4>
                    {point.properties.property && (
                      <p>
                        <strong>Property:</strong> {point.properties.property}
                      </p>
                    )}
                    {point.properties.propertySubType && (
                      <p>
                        <strong>Property Sub Type:</strong>{" "}
                        {point.properties.propertySubType}
                      </p>
                    )}
                    {point.properties.sector && (
                      <p>
                        <strong>Sector:</strong> {point.properties.sector}
                      </p>
                    )}
                    {point.properties.size && (
                      <p>
                        <strong>Size:</strong> {point.properties.size}
                      </p>
                    )}
                    {point.properties.type && (
                      <p>
                        <strong>Type:</strong> {point.properties.type}
                      </p>
                    )}
                    {point.properties.ukCountry && (
                      <p>
                        <strong>UK Country:</strong>{" "}
                        {point.properties.ukCountry}
                      </p>
                    )}
                    {point.properties.url && (
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
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div ref={mapContainerRef} className="map" />
      <div className="absolute top-14 left-3 bg-white/85 p-2 rounded h-fit flex flex-col gap-2 w-60">
        <h3 className="font-bold text-lg font-sans">Controls</h3>
        <button
          className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700"
          onClick={resetMap}
        >
          Reset Map
        </button>
        <button
          className="text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:hover:bg-gray-700 dark:focus:ring-gray-700 dark:border-gray-700"
          onClick={startDrawingCircle}
        >
          Draw Circle
        </button>
        <div className="relative mb-6">
          <label className="block mb-2 text-sm font-medium text-gray-900">
            Radius:
          </label>
          <input
            type="range"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value) || 0)}
            className="w-full"
            min={100}
            max={5000}
          />
          <span className="text-xs text-gray-700 absolute start-0 -bottom-2">
            1KM
          </span>
          <span className="text-xs text-gray-700 absolute end-0 -bottom-2">
            5KM
          </span>
        </div>
        <p className="text-xs">Radius: {(radius / 1000).toFixed(2)}KM</p>
      </div>
    </>
  );
}

function convertToCSV(data: GeoJSONFeature[]): string {
  if (data.length === 0) return "";

  const allKeys = new Set<string>();
  data.forEach((item) => {
    Object.keys(item.properties || {}).forEach((key) => allKeys.add(key));
    if (item.geometry && item.geometry.coordinates) {
      allKeys.add("longitude");
      allKeys.add("latitude");
    }
  });

  const headers = Array.from(allKeys).sort();

  const rows = data.map((item) =>
    headers
      .map((key) => {
        let value: any;
        if (key === "longitude") {
          value = item.geometry?.coordinates?.[0] ?? "";
        } else if (key === "latitude") {
          value = item.geometry?.coordinates?.[1] ?? "";
        } else {
          value = (item.properties as any)?.[key] ?? "";
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  return `${headers.join(",")}\n${rows.join("\n")}`;
}
