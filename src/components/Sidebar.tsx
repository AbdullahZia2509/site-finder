import { useEffect, useState } from "react";
import {
  readCompetitionsData,
  type GeoJSONFeature,
  type GeoJSONFeatureCollection,
} from "./CSVReader";
import mapboxgl from "mapbox-gl";

export default function Sidebar({
  mapRef,
}: {
  mapRef: React.RefObject<mapboxgl.Map>;
}) {
  const [competitionData, setCompetitionData] = useState<GeoJSONFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  function buildLocationList() {
    setIsLoading(true);
    readCompetitionsData().then((data: GeoJSONFeatureCollection) => {
      setCompetitionData(data.features);
      setIsLoading(false);
    });
  }

  useEffect(() => {
    buildLocationList();
  }, []);

  return (
    <div className="sidebar">
      <div className="heading">
        <h1>Storage Sites</h1>
      </div>
      <div id="listings" className="listings">
        {isLoading && <p>Loading...</p>}
        {!isLoading && competitionData.length === 0 && <p>No results found</p>}
        {competitionData.map((competition: GeoJSONFeature) => (
          <div
            key={competition.properties.id}
            className="item"
            onClick={() => {
              flyToStore(competition);
              createPopUp(competition);
            }}
          >
            <a href="#" className="title">
              {competition.properties.name}
            </a>
            <small>
              {competition.properties.address} | {competition.properties.phone}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}
