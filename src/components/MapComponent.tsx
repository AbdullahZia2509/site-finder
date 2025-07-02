// MapComponent.tsx

import React, { useEffect, useState, useRef, useCallback } from "react";
import mapboxgl, { LngLatLike } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css";
import MapboxGeocoder from "@mapbox/mapbox-gl-geocoder";
import {
  GeoJSONFeature,
  readCommercialLandData,
  readCompetitionsData,
} from "./CSVReader";
import * as turf from "@turf/turf";
import { booleanPointInPolygon } from "@turf/turf";

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
  const [selectedCommercialSites, setSelectedCommercialSites] = useState<
    GeoJSONFeature[]
  >([]);
  const [circleCompetitors, setCircleCompetitors] = useState<GeoJSONFeature[]>(
    []
  );
  const [selectedPopulationPoints, setSelectedPopulationPoints] = useState<
    GeoJSONFeature[]
  >([]);
  const [selectedTrafficPoints, setSelectedTrafficPoints] = useState<
    GeoJSONFeature[]
  >([]);
  const [selectedIncomePoints, setSelectedIncomePoints] = useState<
    GeoJSONFeature[]
  >([]);
  const [selectedLondonDataPoints, setSelectedLondonDataPoints] = useState<
    GeoJSONFeature[]
  >([]);
  const [drawingCircle, setDrawingCircle] = useState(false);
  const [radius, setRadius] = useState<number>(1000); // in meters
  const [showCommercialLayer, setShowCommercialLayer] = useState(true);
  const [showLocationsLayer, setShowLocationsLayer] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showTrafficHeatmap, setShowTrafficHeatmap] = useState(true);
  const [showPopulationHeatmap, setShowPopulationHeatmap] = useState(true);
  const [showPopulationPoints, setShowPopulationPoints] = useState(false);
  const [showLondonDataHeatmap, setShowLondonDataHeatmap] = useState(true);
  const [showIncomesHeatmap, setShowIncomesHeatmap] = useState(true);

  // Effect for initial Mapbox GL JS map setup
  useEffect(() => {
    mapboxgl.accessToken =
      "pk.eyJ1IjoiYWJkdWxsYWh6aWEwOSIsImEiOiJjbWJncjhweDcwMjRoMnZzODJnZ3Z4NGluIn0.suiaxiuSk_p_6NAeZ8mmRQ";

    const map = new mapboxgl.Map({
      container: mapContainerRef.current!,
      style: "mapbox://styles/mapbox/dark-v11",
      center: INITIAL_CENTER,
      zoom: INITIAL_ZOOM,
      maxZoom: 14,
    });

    mapRef.current = map;
    // Initialize Mapbox Geocoder (search box)
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl as any, // Type assertion to avoid compatibility issues
      marker: false,
      placeholder: "Search for locations",
      proximity: {
        longitude: center[0],
        latitude: center[1],
      },
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

  // Add vector tile layer for postcode data and population heatmap
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const map = mapRef.current;

    // Add the vector tile source (if not already added by previous logic)
    if (!map.getSource("postcode-tiles")) {
      map.addSource("postcode-tiles", {
        type: "vector",
        url: "http://localhost:3001/vector-tiles/postcode_to_bua_mapped.json",
      });
    }

    // Add the traffic data vector tile source
    if (!map.getSource("traffic-tiles")) {
      map.addSource("traffic-tiles", {
        type: "vector",
        url: "http://localhost:3001/vector-tiles/traffic.json",
      });
    }

    // Add the London data vector tile source
    if (!map.getSource("london-data-tiles")) {
      map.addSource("london-data-tiles", {
        type: "vector",
        url: "http://localhost:3001/vector-tiles/london_data.json",
      });
    }

    // Add the UK salaries vector tile source
    if (!map.getSource("uk-salaries-tiles")) {
      map.addSource("uk-salaries-tiles", {
        type: "vector",
        url: "http://localhost:3001/vector-tiles/uk_salaries.json",
      });
    }

    // Add the postcode points layer (if not already added)
    if (!map.getLayer("postcode-points")) {
      map.addLayer({
        id: "postcode-points",
        type: "circle",
        source: "postcode-tiles",
        "source-layer": "postcode_to_bua_mapped",
        paint: {
          "circle-radius": 4,
          "circle-color": "#007cbf",
          "circle-opacity": 0.8,
          "circle-stroke-width": 1,
          "circle-stroke-color": "#fff",
        },
        minzoom: 0,
        maxzoom: 24,
        layout: {
          visibility: showPopulationPoints ? "visible" : "none", // Toggle based on population points checkbox
        },
      });

      // Add popup on click for postcode points
      map.on("click", "postcode-points", (e) => {
        if (!e.features) return;

        const feature = e.features[0];
        const coordinates = feature.geometry.coordinates.slice();
        const properties = feature.properties || {};

        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.Popup()
          .setLngLat(coordinates as [number, number])
          .setHTML(
            `
            <div>
              <strong>Postcode:</strong> ${properties.postcode || "N/A"}<br>
              <strong>BUA Name:</strong> ${properties.bua_name || "N/A"}<br>
              <strong>Population:</strong> ${properties.population || "N/A"}
            </div>
          `
          )
          .addTo(map);
      });

      // Change cursor on hover for postcode points
      map.on("mouseenter", "postcode-points", () => {
        if (map) map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "postcode-points", () => {
        if (map) map.getCanvas().style.cursor = "";
      });
    }

    // Add the population heatmap layer, sourced from the same vector tiles
    if (!map.getLayer("population-heatmap")) {
      map.addLayer(
        {
          id: "population-heatmap",
          type: "heatmap",
          source: "postcode-tiles", // Source from your existing vector tiles
          "source-layer": "postcode_to_bua_mapped", // Use the correct source layer
          maxzoom: 15,
          paint: {
            "heatmap-weight": {
              property: "population_count", // Assuming your population field is named 'population_count' in the vector tiles
              type: "exponential",
              stops: [
                [0, 0], // Population 0 has 0 weight
                [500, 0.2], // Population 500 has 0.2 weight
                [1000, 0.5], // Population 1000 has 0.5 weight
                [5000, 0.8], // Population 5000 has 0.8 weight
                [10000, 1], // Population 10000+ has full weight
              ],
            },
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              11,
              1,
              15,
              3,
            ],
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
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              11,
              15,
              15,
              20,
            ],
            "heatmap-opacity": 0.8,
          },
          layout: {
            visibility: showPopulationHeatmap ? "visible" : "none", // Controlled by state
          },
        },
        "waterway-label" // Place the layer below labels
      );
    }

    // Add the traffic heatmap layer
    if (!map.getLayer("traffic-heatmap")) {
      map.addLayer(
        {
          id: "traffic-heatmap",
          type: "heatmap",
          source: "traffic-tiles", // Source from traffic vector tiles
          "source-layer": "traffic_data", // Use the correct source layer name
          maxzoom: 15,
          paint: {
            "heatmap-weight": {
              property: "all_motor_vehicles", // Use the traffic count field
              type: "exponential",
              stops: [
                [0, 0], // No traffic has 0 weight
                [1000, 0.2], // Low traffic
                [5000, 0.5], // Medium traffic
                [10000, 0.8], // High traffic
                [20000, 1], // Very high traffic
              ],
            },
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              11,
              1,
              15,
              3,
            ],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(0, 255, 0, 0)", // Transparent Green for 0 density
              0.1,
              "green", // Green for low density
              0.3,
              "yellow", // Yellow for medium-low density
              0.5,
              "orange", // Orange for medium density
              0.7,
              "orangered", // Orange-Red for medium-high density
              1,
              "red", // Red for high density
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              11,
              15,
              15,
              20,
            ],
            "heatmap-opacity": 0.8,
          },
          layout: {
            visibility: showTrafficHeatmap ? "visible" : "none",
          },
        },
        "waterway-label" // Place the layer below labels
      );
    }

    // Add population heatmap layer
    if (!map.getLayer("population-heat")) {
      map.addLayer({
        id: "population-heat",
        type: "heatmap",
        source: "postcode-tiles",
        "source-layer": "postcode_to_bua_mapped",
        paint: {
          // Increase the heatmap weight based on frequency and property magnitude
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["get", "population"],
            0,
            0,
            20000,
            1,
          ],
          // Increase the heatmap color weight weight by zoom level
          // heatmap-intensity is a multiplier on top of heatmap-weight
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            1,
            9,
            3,
          ],
          // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
          // Begin color ramp at 0-stop with a 0-transparancy color
          // to create a blur-like effect.
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(236,222,239,0)",
            0.2,
            "rgb(208,209,230)",
            0.4,
            "rgb(166,189,219)",
            0.6,
            "rgb(103,169,207)",
            0.8,
            "rgb(28,144,153)",
            1,
            "rgb(1,108,89)",
          ],
          // Adjust the heatmap radius by zoom level
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 20],
          // Transition from heatmap to circle layer by zoom level
          "heatmap-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            7,
            1,
            9,
            0.5,
          ],
        },
        layout: {
          visibility: showPopulationHeatmap ? "visible" : "none",
        },
      });
    } else {
      map.setLayoutProperty(
        "population-heat",
        "visibility",
        showPopulationHeatmap ? "visible" : "none"
      );
    }

    // Add London data heatmap layer
    if (!map.getLayer("london-data-heat")) {
      map.addLayer({
        id: "london-data-heat",
        type: "heatmap",
        source: "london-data-tiles",
        "source-layer": "london_data",
        paint: {
          // Increase the heatmap weight based on frequency and property magnitude
          "heatmap-weight": 1,
          // Increase the heatmap color weight weight by zoom level
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            1,
            9,
            3,
          ],
          // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0,128,0,0)",
            0.2,
            "rgba(0,128,0,0.2)",
            0.4,
            "rgba(0,128,0,0.4)",
            0.6,
            "rgba(0,128,0,0.6)",
            0.8,
            "rgba(0,128,0,0.8)",
            1,
            "rgba(0,128,0,1)",
          ],
          // Adjust the heatmap radius by zoom level
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 20],
          // Transition from heatmap to circle layer by zoom level
          "heatmap-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            7,
            1,
            9,
            0.5,
          ],
        },
        layout: {
          visibility: showLondonDataHeatmap ? "visible" : "none",
        },
      });
    } else {
      map.setLayoutProperty(
        "london-data-heat",
        "visibility",
        showLondonDataHeatmap ? "visible" : "none"
      );
    }

    // Add UK salaries heatmap layer
    if (!map.getLayer("uk-salaries-heat")) {
      map.addLayer({
        id: "uk-salaries-heat",
        type: "heatmap",
        source: "uk-salaries-tiles",
        "source-layer": "uk_salaries",
        paint: {
          // Increase the heatmap weight based on frequency and property magnitude
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["get", "salary"],
            0,
            0,
            100000,
            1,
          ],
          // Increase the heatmap color weight weight by zoom level
          "heatmap-intensity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            0,
            1,
            9,
            3,
          ],
          // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(128,0,128,0)",
            0.2,
            "rgba(128,0,128,0.2)",
            0.4,
            "rgba(128,0,128,0.4)",
            0.6,
            "rgba(128,0,128,0.6)",
            0.8,
            "rgba(128,0,128,0.8)",
            1,
            "rgba(128,0,128,1)",
          ],
          // Adjust the heatmap radius by zoom level
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 9, 20],
          // Transition from heatmap to circle layer by zoom level
          "heatmap-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            7,
            1,
            9,
            0.5,
          ],
        },
        layout: {
          visibility: showIncomesHeatmap ? "visible" : "none",
        },
      });
    } else {
      map.setLayoutProperty(
        "uk-salaries-heat",
        "visibility",
        showIncomesHeatmap ? "visible" : "none"
      );
    }
    const getDataAndAddLayers = async () => {
      try {
        const competitions = await readCompetitionsData();
        const commercials = await readCommercialLandData();

        competitions.features.forEach((d, i) => (d.properties.id = i));
        commercials.features.forEach((d, i) => (d.properties.id = i));

        setCompetitionData(competitions.features);
        setCommercialLandData(commercials.features);

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

          // Change cursor on hover for commercial points
          map.on("mouseenter", "commercial", () => {
            if (map) map.getCanvas().style.cursor = "pointer";
          });

          map.on("mouseleave", "commercial", () => {
            if (map) map.getCanvas().style.cursor = "";
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

          // Change cursor on hover for competitor points
          map.on("mouseenter", "locations", () => {
            if (map) map.getCanvas().style.cursor = "pointer";
          });

          map.on("mouseleave", "locations", () => {
            if (map) map.getCanvas().style.cursor = "";
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
        if (map.getLayer("commercial")) map.removeLayer("commercial");
        if (map.getSource("commercial")) map.removeSource("commercial");

        if (map.getLayer("locations")) map.removeLayer("locations");
        if (map.getSource("locations")) map.removeSource("locations");

        // Clean up population heatmap layer if it was added
        if (map.getLayer("population-heatmap"))
          map.removeLayer("population-heatmap");

        // Clean up traffic heatmap layer if it was added
        if (map.getLayer("traffic-heatmap")) map.removeLayer("traffic-heatmap");
      }
    };
  }, [mapLoaded, showPopulationHeatmap]); // Added showPopulationHeatmap to dependency array

  // Visibility toggle for commercial layer
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

  // Visibility toggle for locations layer
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

  // Visibility toggle for traffic heatmap layer
  useEffect(() => {
    if (!mapRef.current || !mapLoaded) return;
    const map = mapRef.current;
    if (map.getLayer("traffic-heatmap")) {
      map.setLayoutProperty(
        "traffic-heatmap",
        "visibility",
        showTrafficHeatmap ? "visible" : "none"
      );
    }
  }, [showTrafficHeatmap, mapLoaded]);

  // Effect for toggling the population heatmap
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const map = mapRef.current;

    // Toggle the population heatmap layer
    if (map.getLayer("population-heatmap")) {
      map.setLayoutProperty(
        "population-heatmap",
        "visibility",
        showPopulationHeatmap ? "visible" : "none"
      );
    }
  }, [mapLoaded, showPopulationHeatmap]);

  // Effect for toggling the population points
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;

    const map = mapRef.current;

    // Toggle the postcode points layer
    if (map.getLayer("postcode-points")) {
      map.setLayoutProperty(
        "postcode-points",
        "visibility",
        showPopulationPoints ? "visible" : "none"
      );
    }
  }, [showPopulationPoints, mapLoaded]);

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
    // Use directly imported turf functions
    const circle = turf.circle(turf.point(center), radiusInKm, points);
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

      // Filter commercial sites within the circle
      const visibleCommercialSites = (
        showCommercialLayer ? commercialLandData : []
      ).filter((point: GeoJSONFeature) => {
        try {
          const pt = turf.point(point.geometry.coordinates);
          const polygonGeoJSON = circleGeoJSON.geometry as GeoJSON.Polygon;
          const poly = turf.polygon(polygonGeoJSON.coordinates);
          return booleanPointInPolygon(pt, poly);
        } catch (error) {
          console.error(
            "Error during commercial point in polygon check:",
            error
          );
          return false;
        }
      });

      // Filter competitors within the circle
      const visibleCompetitors = (
        showLocationsLayer ? competitionData : []
      ).filter((point: GeoJSONFeature) => {
        try {
          const pt = turf.point(point.geometry.coordinates);
          const polygonGeoJSON = circleGeoJSON.geometry as GeoJSON.Polygon;
          const poly = turf.polygon(polygonGeoJSON.coordinates);
          return booleanPointInPolygon(pt, poly);
        } catch (error) {
          console.error(
            "Error during competition point in polygon check:",
            error
          );
          return false;
        }
      });

      // Store commercial sites and competitors separately
      setSelectedCommercialSites(visibleCommercialSites);
      setCircleCompetitors(visibleCompetitors);

      // Combine for display purposes
      const visibleCommercialAndCompetitionPoints = [
        ...visibleCommercialSites,
        ...visibleCompetitors,
      ];

      // Filter population points within the circle
      // Get all population points from the map source
      const populationPoints: GeoJSONFeature[] = [];
      if (map.getSource("postcode-tiles")) {
        // Get features from the postcode-tiles source
        const features = map.querySourceFeatures("postcode-tiles", {
          sourceLayer: "postcode_to_bua_mapped",
        });

        // Convert to GeoJSONFeature format and filter by circle
        const filteredPopulationPoints = features
          .map((feature) => {
            return {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates:
                  feature.geometry.type === "Point"
                    ? (feature.geometry as any).coordinates
                    : [0, 0],
              },
              properties: {
                ...feature.properties,
                pointType: "population",
              },
            } as GeoJSONFeature;
          })
          .filter((pointFeature) => {
            try {
              const pt = turf.point(pointFeature.geometry.coordinates);
              const polygonGeoJSON = circleGeoJSON.geometry as GeoJSON.Polygon;
              const poly = turf.polygon(polygonGeoJSON.coordinates);
              return booleanPointInPolygon(pt, poly);
            } catch (error) {
              return false;
            }
          });

        populationPoints.push(...filteredPopulationPoints);
      }

      // Filter traffic points within the circle
      const trafficPoints: GeoJSONFeature[] = [];
      if (map.getSource("traffic-tiles")) {
        // Get features from the traffic-tiles source
        const trafficFeatures = map.querySourceFeatures("traffic-tiles", {
          sourceLayer: "traffic_data",
        });

        // Convert to GeoJSONFeature format and filter by circle
        const filteredTrafficPoints = trafficFeatures
          .map((feature) => {
            return {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates:
                  feature.geometry.type === "Point"
                    ? (feature.geometry as any).coordinates
                    : feature.geometry.type === "LineString"
                    ? // For LineString, use the midpoint of the line
                      [
                        (feature.geometry as any).coordinates[0][0],
                        (feature.geometry as any).coordinates[0][1],
                      ]
                    : [0, 0],
              },
              properties: {
                ...feature.properties,
                pointType: "traffic",
              },
            } as GeoJSONFeature;
          })
          .filter((pointFeature) => {
            try {
              const pt = turf.point(pointFeature.geometry.coordinates);
              const polygonGeoJSON = circleGeoJSON.geometry as GeoJSON.Polygon;
              const poly = turf.polygon(polygonGeoJSON.coordinates);
              return booleanPointInPolygon(pt, poly);
            } catch (error) {
              return false;
            }
          });

        trafficPoints.push(...filteredTrafficPoints);
      }

      // Filter income points within the circle
      const incomePoints: GeoJSONFeature[] = [];
      if (map.getSource("uk-salaries-tiles")) {
        // Get features from the uk-salaries-tiles source
        const incomeFeatures = map.querySourceFeatures("uk-salaries-tiles", {
          sourceLayer: "uk_salaries",
        });

        // Convert to GeoJSONFeature format and filter by circle
        const filteredIncomePoints = incomeFeatures
          .map((feature) => {
            return {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates:
                  feature.geometry.type === "Point"
                    ? (feature.geometry as any).coordinates
                    : [0, 0],
              },
              properties: {
                ...feature.properties,
                pointType: "income",
              },
            } as GeoJSONFeature;
          })
          .filter((pointFeature) => {
            try {
              const pt = turf.point(pointFeature.geometry.coordinates);
              const polygonGeoJSON = circleGeoJSON.geometry as GeoJSON.Polygon;
              const poly = turf.polygon(polygonGeoJSON.coordinates);
              return booleanPointInPolygon(pt, poly);
            } catch (error) {
              return false;
            }
          });

        incomePoints.push(...filteredIncomePoints);
      }
      
      // Filter London data points within the circle
      const londonDataPoints: GeoJSONFeature[] = [];
      if (map.getSource("london-data-tiles")) {
        // Get features from the london-data-tiles source
        const londonFeatures = map.querySourceFeatures("london-data-tiles", {
          sourceLayer: "london_data",
        });

        // Convert to GeoJSONFeature format and filter by circle
        const filteredLondonPoints = londonFeatures
          .map((feature) => {
            return {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates:
                  feature.geometry.type === "Point"
                    ? (feature.geometry as any).coordinates
                    : [0, 0],
              },
              properties: {
                ...feature.properties,
                pointType: "london",
              },
            } as GeoJSONFeature;
          })
          .filter((pointFeature) => {
            try {
              const pt = turf.point(pointFeature.geometry.coordinates);
              const polygonGeoJSON = circleGeoJSON.geometry as GeoJSON.Polygon;
              const poly = turf.polygon(polygonGeoJSON.coordinates);
              return booleanPointInPolygon(pt, poly);
            } catch (error) {
              return false;
            }
          });

        londonDataPoints.push(...filteredLondonPoints);
      }

      setSelectedPoints(visibleCommercialAndCompetitionPoints);
      setSelectedPopulationPoints(populationPoints);
      setSelectedTrafficPoints(trafficPoints);
      setSelectedIncomePoints(incomePoints);
      setSelectedLondonDataPoints(londonDataPoints);
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

    // Determine if this is a competition or commercial land popup
    const isCompetition = props.pointType === "competitor";
    const isCommercialLand = props.pointType === "commercial";

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

    // Add additional details right after image for commercial land
    if (isCommercialLand) {
      // Additional Details (Size, Prices) as TL;DR
      let tldrDetails = "";
      if (props.size) tldrDetails += `Size: ${props.size} sqft, `;
      if (props.price_1) tldrDetails += `Price: ${props.price_1}, `;
      if (props.property) tldrDetails += `Property: ${props.property}, `;
      if (props.category) tldrDetails += `Category: ${props.category}`;

      if (tldrDetails) {
        popupHTML += `<p class="popup-tldr"><strong>Details:</strong> ${tldrDetails.replace(
          /,\s*$/,
          ""
        )}</p>`;
      }
    }

    if (isCompetition) {
      // COMPETITION POPUP STRUCTURE

      // Address: Prefer 'full_address', fallback to 'address'
      if (props.full_address || props.address) {
        popupHTML += `<p class="popup-address"><strong>Address:</strong>${
          props.full_address || props.address
        }</p>`;
      }

      // Website
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

      // Contact Info
      if (props.phone) {
        popupHTML += `<p class="popup-phone"><strong>Phone:</strong> ${props.phone}</p>`;
      } else if (props.phone_1) {
        popupHTML += `<p class="popup-phone"><strong>Phone:</strong> ${props.phone_1}</p>`;
      }

      // Rating and Reviews
      if (props.rating) {
        const ratingText = props.rating;
        const reviewsText = props.reviews ? ` (${props.reviews} reviews)` : "";
        popupHTML += `<p class="popup-rating"><strong>Rating:</strong> ${ratingText}/5.0${reviewsText}</p>`;
      }
    } else if (isCommercialLand) {
      // COMMERCIAL LAND POPUP STRUCTURE

      // Web Link
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

      // Description
      if (props.description) {
        popupHTML += `<p class="popup-description"><strong>Description:</strong><br/>${props.description}</p>`;
      }

      // Address (for misc text)
      if (props.full_address || props.address) {
        popupHTML += `<p class="popup-address"><strong>Address:</strong>${
          props.full_address || props.address
        }</p>`;
      }
    } else {
      // FALLBACK FOR OTHER TYPES OF POINTS

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

      // Website
      if (props.site || props.url) {
        let siteUrl = props.site || props.url;
        if (!/^https?:\/\//i.test(siteUrl)) {
          siteUrl = "https://" + siteUrl;
        }
        popupHTML += `<p class="popup-website"><strong>Website:</strong> <a href="${siteUrl}" target="_blank" rel="noopener noreferrer">${
          props.site || props.url
        }</a></p>`;
      }

      // Description
      if (props.description) {
        popupHTML += `<p class="popup-description"><strong>Description:</strong><br/>${props.description}</p>`;
      }
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

  const flyToStore = (feature: GeoJSONFeature) => {
    mapRef.current?.flyTo({ center: feature.geometry.coordinates, zoom: 15 });
  };

  // CSV export is now handled directly in the button click handler

  return (
    <>
      <div className="topbar">
        Longitude: {center[0].toFixed(4)} | Latitude: {center[1].toFixed(4)} |
        Zoom: {zoom.toFixed(2)}
      </div>

      <div className="map-controls">
        <div className="legend">
          <div className="legend-item">
            <input
              type="checkbox"
              checked={showCommercialLayer}
              onChange={() => setShowCommercialLayer(!showCommercialLayer)}
            />
            <div
              className="legend-marker"
              style={{ backgroundColor: "#4CAF50" }}
            ></div>
            <span>Commercial Land</span>
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
              checked={showTrafficHeatmap}
              onChange={() => setShowTrafficHeatmap(!showTrafficHeatmap)}
            />
            <div
              className="legend-marker"
              style={{
                background:
                  "linear-gradient(to right, green, yellow, orange, red)",
                width: "20px",
              }}
            ></div>
            <span>Traffic Heatmap</span>
          </div>
          <div className="legend-item">
            <input
              type="checkbox"
              checked={showPopulationHeatmap}
              onChange={() => setShowPopulationHeatmap(!showPopulationHeatmap)}
            />
            <div
              className="legend-marker"
              style={{
                background:
                  "linear-gradient(to right, blue, cyan, lime, yellow, red)",
                width: "20px",
              }}
            ></div>
            <span>Population Heatmap</span>
          </div>
          <div className="legend-item">
            <input
              type="checkbox"
              checked={showPopulationPoints}
              onChange={() => setShowPopulationPoints(!showPopulationPoints)}
            />
            <div
              className="legend-marker"
              style={{ backgroundColor: "#007cbf" }}
            ></div>
            <span>Population Points</span>
          </div>
          <div className="legend-item">
            <input
              type="checkbox"
              checked={showLondonDataHeatmap}
              onChange={() => setShowLondonDataHeatmap(!showLondonDataHeatmap)}
            />
            <div
              className="legend-marker"
              style={{
                background:
                  "linear-gradient(to right, #c6ffdd, #68b35c, #267326)",
                width: "20px",
              }}
            ></div>
            <span>London Data Heatmap</span>
          </div>
          <div className="legend-item">
            <input
              type="checkbox"
              checked={showIncomesHeatmap}
              onChange={() => setShowIncomesHeatmap(!showIncomesHeatmap)}
            />
            <div
              className="legend-marker"
              style={{
                background:
                  "linear-gradient(to right, #e6ccff, #9966ff, #6600cc)",
                width: "20px",
              }}
            ></div>
            <span>UK Salaries Heatmap</span>
          </div>
        </div>
      </div>

      <div className="selected-points-box">
        <h3>Selected Points ({selectedPoints.length})</h3>
        <button
          onClick={() => {
            const csv = convertToCSV(
              selectedCommercialSites,
              circleCompetitors,
              selectedPopulationPoints,
              selectedTrafficPoints,
              selectedIncomePoints,
              selectedLondonDataPoints
            );
            if (csv) {
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const link = document.createElement("a");
              const url = URL.createObjectURL(blob);
              link.setAttribute("href", url);
              link.setAttribute("download", "site-data.csv");
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            } else {
              alert("No commercial sites selected to export");
            }
          }}
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

function convertToCSV(
  commercialSites: GeoJSONFeature[],
  competitors: GeoJSONFeature[],
  populationPoints: GeoJSONFeature[],
  trafficPoints: GeoJSONFeature[],
  incomePoints: GeoJSONFeature[],
  londonDataPoints: GeoJSONFeature[]
): string {
  // Only export if there are commercial sites
  if (commercialSites.length === 0) return "";

  // Filter out any features that don't have properties
  commercialSites = commercialSites.filter(
    (site) => site.properties && site.properties.id
  );

  // Define the structure for RightMove (commercial) data columns
  const rightmoveColumns = [
    { header: "RIGHTMOVE ID", key: "id" },
    { header: "features/2 (SIZE)", key: "size" },
    { header: "price_1 (PRICE)", key: "price_1" },
    { header: "RIGHTMOVE URL", key: "url" },
    { header: "brokerDisplayAddress", key: "brokerDisplayAddress" },
    { header: "brokerDisplayName", key: "brokerDisplayName" },
    // Note: brokerProfileUrl is not in the GeoJSONFeature properties type
    // We'll use a fallback property if available
    { header: "brokerProfileUrl", key: "brokerProfileUrl" },
  ];

  // Count competitors by category
  const competitorCategories = new Set<string>();
  const maxCompetitorsByCategory: { [category: string]: number } = {};

  competitors.forEach((comp) => {
    const category = comp.properties.category || "Unknown";
    competitorCategories.add(category);
    maxCompetitorsByCategory[category] =
      (maxCompetitorsByCategory[category] || 0) + 1;
  });

  // Create rows for each commercial site
  const rows: string[][] = [];

  // Create the header row
  const headerRow: string[] = [];

  // RIGHTMOVE SITE DATA section
  headerRow.push("RIGHTMOVE SITE DATA");
  rightmoveColumns.forEach((col) => {
    headerRow.push(col.header);
  });

  // COMPETITOR sections
  let competitorNum = 1;
  Array.from(competitorCategories).forEach((category) => {
    for (let i = 0; i < maxCompetitorsByCategory[category]; i++) {
      headerRow.push(`COMPETITOR ${competitorNum}`);
      headerRow.push(`category`);
      headerRow.push(`name`);
      headerRow.push(`url`);
      competitorNum++;
    }
  });

  // TRAFFIC DATA section
  headerRow.push("TRAFFIC DATA");
  headerRow.push("TOTAL ON THAT POSTCODE");

  // POPULATION DATA
  headerRow.push("POPULATION DATA");
  headerRow.push("TOTAL POPULATION");

  // INCOME DATA section
  headerRow.push("INCOME DATA");
  headerRow.push("AVG SALARY", "MIN SALARY", "MAX SALARY", "DATA POINTS");
  
  // LONDON DATA section
  headerRow.push("LONDON DATA");
  headerRow.push("POPULATION");

  // Add header row to rows
  rows.push(headerRow);

  // Create data rows for each commercial site
  commercialSites.forEach((site) => {
    const dataRow: string[] = [];

    // RIGHTMOVE SITE DATA
    dataRow.push(""); // Section header cell is empty

    // Add RightMove data
    rightmoveColumns.forEach((col) => {
      let value = "";

      // Safe property access with type checking
      const props = site.properties || {};

      if (col.key === "id") {
        value = String(props.id || "");
      } else if (col.key === "size") {
        // Access size directly or use a type assertion for features
        const anyProps = props as any;
        value = String(
          props["features/2"] ||
            (anyProps.features ? anyProps.features.split(",")[2] : "")
        );
      } else if (col.key === "price_1") {
        value = String(props.price_1 || "");
      } else if (col.key === "url") {
        value = String(props.url || "");
      } else if (col.key === "brokerDisplayAddress") {
        value = String(props.brokerDisplayAddress || "");
      } else if (col.key === "brokerDisplayName") {
        value = String(props.brokerDisplayName || "");
      } else if (col.key === "brokerProfileUrl") {
        // Access brokerProfileUrl or brokerUrl with type assertion
        const anyProps = props as any;
        value = String(anyProps.brokerProfileUrl || anyProps.brokerUrl || "");
      }

      dataRow.push(value);
    });

    // COMPETITOR DATA
    // For each competitor category and count, add placeholder cells
    Array.from(competitorCategories).forEach((category) => {
      for (let i = 0; i < maxCompetitorsByCategory[category]; i++) {
        dataRow.push(""); // Competitor number
        dataRow.push(""); // category
        dataRow.push(""); // name
        dataRow.push(""); // url
      }
    });

    // TRAFFIC DATA
    dataRow.push(""); // Section header

    // Calculate total traffic count from all traffic points
    let totalTrafficCount = 0;
    trafficPoints.forEach((point) => {
      const trafficCount = point.properties.all_motor_vehicles || 0;
      totalTrafficCount += Number(trafficCount);
    });

    dataRow.push(String(totalTrafficCount)); // TOTAL TRAFFIC COUNT

    // POPULATION DATA
    dataRow.push(""); // Section header

    // Add total population data if available
    if (populationPoints.length > 0) {
      // Create a Set to track unique population values
      const uniquePopulations = new Set<number>();

      // Add all valid population values to the Set
      populationPoints.forEach((point) => {
        const population = Number(point.properties.BUA_Population);
        if (!isNaN(population) && population > 0) {
          uniquePopulations.add(population);
        }
      });

      // Sum the unique population values
      const totalPopulation = Array.from(uniquePopulations).reduce(
        (sum, pop) => sum + pop,
        0
      );

      // Add the total to the row
      dataRow.push(String(totalPopulation || 0));
    } else {
      // Add placeholder if no population data
      dataRow.push("0");
    }

    // INCOME DATA
    dataRow.push(""); // Section header
    
    // Process income data if available
    if (incomePoints.length > 0) {
      // Calculate average salary in the area
      let totalSalary = 0;
      let salaryCount = 0;
      
      incomePoints.forEach((point) => {
        const salary = Number(point.properties.salary);
        if (!isNaN(salary) && salary > 0) {
          totalSalary += salary;
          salaryCount++;
        }
      });
      
      const avgSalary = salaryCount > 0 ? Math.round(totalSalary / salaryCount) : 0;
      
      // Find min and max salaries
      let minSalary = Number.MAX_VALUE;
      let maxSalary = 0;
      
      incomePoints.forEach((point) => {
        const salary = Number(point.properties.salary);
        if (!isNaN(salary) && salary > 0) {
          minSalary = Math.min(minSalary, salary);
          maxSalary = Math.max(maxSalary, salary);
        }
      });
      
      if (minSalary === Number.MAX_VALUE) minSalary = 0;
      
      // Add income data to the row
      dataRow.push(String(avgSalary)); // Average salary
      dataRow.push(String(minSalary)); // Min salary
      dataRow.push(String(maxSalary)); // Max salary
      dataRow.push(String(salaryCount)); // Number of salary data points
    } else {
      // Add placeholder if no income data
      dataRow.push("", "", "", ""); // INCOME 1-4
    }
    
    // LONDON DATA
    dataRow.push(""); // Section header
    
    // Process London data if available
    if (londonDataPoints.length > 0) {
      // Calculate total London population
      let totalPopulation = 0;
      
      // Create a Set to track unique London data points to avoid double-counting
      const uniqueIds = new Set<string>();
      
      londonDataPoints.forEach((point) => {
        // Use a unique identifier for each point to avoid duplicates
        const pointId = `${point.geometry.coordinates[0]}-${point.geometry.coordinates[1]}`;
        
        if (!uniqueIds.has(pointId)) {
          uniqueIds.add(pointId);
          
          // Use the correct property name 'Population Total' for London data
          const population = Number(point.properties["Population Total"] || 0);
          
          if (!isNaN(population)) totalPopulation += population;
        }
      });
      
      // Add London population data to the row
      dataRow.push(String(totalPopulation)); // Population
    } else {
      // Add placeholder if no London data
      dataRow.push("");
    }

    rows.push(dataRow);
  });

  // Process all competitors and organize them by category
  const processedCompetitors: { [category: string]: GeoJSONFeature[] } = {};

  // First, sort competitors by category
  competitors.forEach((comp) => {
    const category = comp.properties.category || "Unknown";
    if (!processedCompetitors[category]) {
      processedCompetitors[category] = [];
    }
    processedCompetitors[category].push(comp);
  });

  // Only process the commercial site rows - no separate rows for competitors
  if (rows.length > 1) {
    // For each commercial site row (skipping header row)
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];

      // Calculate the position to insert competitor data
      // Start after RightMove data (header + rightmoveColumns)
      const startPos = 1 + rightmoveColumns.length;

      // Now add all competitors, category by category
      let competitorPos = startPos;
      let competitorNum = 1;

      // Process each category
      Array.from(competitorCategories).forEach((category) => {
        // Get competitors for this category
        const categoryCompetitors = processedCompetitors[category] || [];

        // Process each competitor in this category
        for (let j = 0; j < maxCompetitorsByCategory[category]; j++) {
          // If we have a competitor at this position, use its data
          if (j < categoryCompetitors.length) {
            const comp = categoryCompetitors[j];
            const name = String(comp.properties.name || "");
            const url = String(
              comp.properties.site || comp.properties.url || ""
            );

            // Update the competitor cells
            row[competitorPos] = `COMPETITOR ${competitorNum}`;
            row[competitorPos + 1] = category;
            row[competitorPos + 2] = name;
            row[competitorPos + 3] = url;
          }

          // Move to next competitor position
          competitorPos += 4;
          competitorNum++;
        }
      });
    }
  }

  // Convert rows to CSV format
  const csvRows = rows.map((row) => {
    return row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",");
  });

  return csvRows.join("\n");
}
