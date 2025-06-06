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
    phone?: string;
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
    ukCountry?: string;
    url?: string;
    pointType?: string;
    year?: number;
    all_motor_vehicles?: number;
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
                    query: row.query,
                    name: row.name,
                    address: row.full_address,
                    phone: row.phone,
                    site: row.site,
                    pointType: "competitor",
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
  return fetch("/population-postcodes.csv")
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
                    pointType: "population",
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
