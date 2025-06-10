// The types are used by other components, so we keep them here.
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
    full_address?: string;
    phone?: string;
    phone_1?: string;
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
    category?: string;
    ukCountry?: string;
    url?: string;
    pointType?: string;
    year?: number;
    all_motor_vehicles?: number;
    BUA_Population?: number;
    rating?: string | number;
    reviews?: string | number;
    description?: string;
    photo?: string;
  };
};

/**
 * Fetches a pre-processed GeoJSON file.
 * @param url The path to the .geojson file.
 * @returns A Promise that resolves to a GeoJSONFeatureCollection.
 */
const fetchGeoJSON = async (url: string): Promise<GeoJSONFeatureCollection> => {
  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}. ${errorText}`);
  }
  return response.json();
};

// --- Refactored Data Fetching Functions ---

export const readCompetitionsData = (): Promise<GeoJSONFeatureCollection> => {
  return fetchGeoJSON("/competition_data.geojson");
};

export const readCommercialLandData = (): Promise<GeoJSONFeatureCollection> => {
  return fetchGeoJSON("/commercial_land.geojson");
};

export const readTrafficData = (): Promise<GeoJSONFeatureCollection> => {
  return fetchGeoJSON("/traffic_data.geojson");
};

/**
 * Loads and filters population data from pre-processed GeoJSON chunks
 * based on the visible map bounds.
 * @param minLng The minimum longitude of the map bounds.
 * @param minLat The minimum latitude of the map bounds.
 * @param maxLng The maximum longitude of the map bounds.
 * @param maxLat The maximum latitude of the map bounds.
 * @returns A GeoJSONFeatureCollection containing only the features within the bounds.
 */
export async function loadVisiblePopulation(
  minLng: number,
  minLat: number,
  maxLng: number,
  maxLat: number
): Promise<GeoJSONFeatureCollection> {
  const allFeatures: GeoJSONFeature[] = [];
  const totalChunks = 18; // This should match the number of chunk files

  for (let i = 1; i <= totalChunks; i++) {
    const url = `/chunks/chunk_${i}.geojson`;
    try {
      // Fetch the pre-processed GeoJSON chunk
      const chunkCollection = await fetchGeoJSON(url);
      
      // Filter features within the current map bounds
      const visibleFeatures = chunkCollection.features.filter(feature => {
        const [lng, lat] = feature.geometry.coordinates;
        return lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat;
      });

      allFeatures.push(...visibleFeatures);

    } catch (e) {
      // It's possible a chunk doesn't exist, so we can log and continue
      console.warn(`Could not load or process ${url}:`, e);
    }
  }

  return { type: "FeatureCollection", features: allFeatures };
}
