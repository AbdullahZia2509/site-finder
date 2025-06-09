import Papa from "papaparse";

export type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
};

export type GeoJSONFeature = {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: {
    query?: string;
    name?: string;
    address?: string;
    full_address?: string; // Added for richer address info
    phone?: string;
    phone_1?: string; // Added as a fallback phone
    site?: string;
    id?: number;
    outcode?: string;
    pageTitle?: string;
    pricePerSqFt?: string;
    price_1?: string;
    price_2?: string;
    property?: string;
    propertySubType?: string;
    sector?: string;
    size?: string;
    type?: string;
    category?: string; // Added for category/type info
    ukCountry?: string;
    url?: string;
    pointType?: string;
    year?: number;
    all_motor_vehicles?: number;
    BUA_Population?: number;
    rating?: string | number; // Added for rating
    reviews?: string | number; // Added for reviews count
    description?: string; // Added for description
    photo?: string; // Added for photo URL
  };
};

export const readCompetitionsData = (): Promise<GeoJSONFeatureCollection> => {
  return fetch("/competition_data.csv")
    .then((response) => response.text())
    .then((csvText) => {
      return new Promise<GeoJSONFeatureCollection>((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              const tempObj: GeoJSONFeatureCollection = {
                type: "FeatureCollection",
                features: [],
              };

              results.data.forEach((row: any) => {
                if (row.longitude === "" || row.latitude === "") return;
                if (
                  row.type === "Storage" ||
                  row.type === "Self storage facility" ||
                  row.type === "Storage facility"
                ) {
                  console.log(row.type);
                  const { longitude, latitude, ...rest } = row;
                  // Make sure latitude and longitude are numbers
                  const longitudeNum = parseFloat(longitude);
                  const latitudeNum = parseFloat(latitude);

                  if (isNaN(longitudeNum) || isNaN(latitudeNum)) {
                    // Skip invalid rows or handle as needed
                    return;
                  }

                  const geoJsonFeature: GeoJSONFeature = {
                    type: "Feature",
                    geometry: {
                      type: "Point",
                      coordinates: [longitudeNum, latitudeNum],
                    },
                    properties: {
                      query: row.query,
                      name: row.name,
                      address: row.full_address,
                      phone: row.phone,
                      site: row.site,
                      pointType: "competitor",
                      ...rest,
                    },
                  };

                  tempObj.features.push(geoJsonFeature);
                }
              });

              resolve(tempObj);
            } catch (err) {
              reject(err);
            }
          },
          error: (err: any) => {
            reject(err);
          },
        });
      });
    });
};

export const readCommercialLandData = (): Promise<GeoJSONFeatureCollection> => {
  return fetch("/commercial_land.csv")
    .then((response) => response.text())
    .then((csvText) => {
      return new Promise<GeoJSONFeatureCollection>((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              const tempObj: GeoJSONFeatureCollection = {
                type: "FeatureCollection",
                features: [],
              };

              results.data.forEach((row: any) => {
                // Make sure latitude and longitude are numbers
                const longitude = parseFloat(row.longitude);
                const latitude = parseFloat(row.latitude);

                if (isNaN(longitude) || isNaN(latitude)) {
                  // Skip invalid rows or handle as needed
                  return;
                }

                const geoJsonFeature: GeoJSONFeature = {
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: [latitude, longitude],
                  },
                  properties: {
                    outcode: row.outcode,
                    pageTitle: row.pageTitle,
                    pricePerSqFt: row.pricePerSqFt,
                    price_1: row.price_1,
                    price_2: row.price_2,
                    property: row.property,
                    propertySubType: row.propertySubType,
                    sector: row.sector,
                    size: row.size,
                    type: row.type,
                    ukCountry: row.ukCountry,
                    url: row.url,
                    id: row.id,
                    pointType: "commercial",
                  },
                };

                tempObj.features.push(geoJsonFeature);
              });
              resolve(tempObj);
            } catch (err) {
              reject(err);
            }
          },
          error: (err: any) => {
            reject(err);
          },
        });
      });
    });
};

export const readPopulationData = (): Promise<GeoJSONFeatureCollection> => {
  return fetch("/postcode_to_bua_mapped.csv")
    .then((response) => response.text())
    .then((csvText) => {
      return new Promise<GeoJSONFeatureCollection>((resolve, reject) => {
        const tempObj: GeoJSONFeatureCollection = {
          type: "FeatureCollection",
          features: [],
        };

        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          step: (result) => {
            const row: any = result.data;
            const { Latitude, Longitude, ...rest } = row;
            const longitude = parseFloat(Longitude);
            const latitude = parseFloat(Latitude);

            if (isNaN(longitude) || isNaN(latitude)) return;

            const geoJsonFeature: GeoJSONFeature = {
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [longitude, latitude], // Fix: [lon, lat] is correct GeoJSON order
              },
              properties: {
                pointType: "population",
                ...rest,
              },
            };

            tempObj.features.push(geoJsonFeature);
          },
          complete: () => {
            resolve(tempObj);
          },
          error: (err: any) => {
            reject(err);
          },
        });
      });
    });
};

export const readTrafficData = (): Promise<GeoJSONFeatureCollection> => {
  return fetch("/traffic_data.csv")
    .then((response) => response.text())
    .then((csvText) => {
      return new Promise<GeoJSONFeatureCollection>((resolve, reject) => {
        Papa.parse(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              const tempObj: GeoJSONFeatureCollection = {
                type: "FeatureCollection",
                features: [],
              };

              results.data.forEach((row: any) => {
                // Make sure latitude and longitude are numbers
                const longitude = parseFloat(row.longitude);
                const latitude = parseFloat(row.latitude);

                if (isNaN(longitude) || isNaN(latitude)) {
                  // Skip invalid rows or handle as needed
                  return;
                }

                const geoJsonFeature: GeoJSONFeature = {
                  type: "Feature",
                  geometry: {
                    type: "Point",
                    coordinates: [longitude, latitude],
                  },
                  properties: {
                    pointType: "traffic",
                    year: parseInt(row.year, 10),
                    all_motor_vehicles:
                      parseInt(row.all_motor_vehicles, 10) || 0,
                  },
                };

                tempObj.features.push(geoJsonFeature);
              });
              resolve(tempObj);
            } catch (err) {
              reject(err);
            }
          },
          error: (err: any) => {
            reject(err);
          },
        });
      });
    });
};

export async function loadVisiblePopulation(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number
) {
  const features: GeoJSONFeature[] = [];
  const totalChunks = 18; // adjust to match your number of CSV files

  for (let i = 1; i <= totalChunks; i++) {
    const url = `/chunks/chunk_${i}.csv`;
    try {
      const response = await fetch(url);
      const text = await response.text();

      await new Promise((resolve, reject) => {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          step: (result: any) => {
            const { Latitude, Longitude, BUA_Population, ...rest } =
              result.data;
            const lat = parseFloat(Latitude);
            const lng = parseFloat(Longitude);
            if (
              isNaN(lat) ||
              isNaN(lng) ||
              lng < minLng ||
              lng > maxLng ||
              lat < minLat ||
              lat > maxLat
            )
              return;

            features.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: [lng, lat] },
              properties: {
                ...rest,
                BUA_Population: parseInt(BUA_Population, 10) || 0,
              },
            });
          },
          complete: resolve,
          error: reject,
        });
      });
    } catch (e) {
      console.error(`Error loading ${url}:`, e);
    }
  }

  return { type: "FeatureCollection", features };
}
