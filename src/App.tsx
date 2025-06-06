import { useRef } from "react";
import "./App.css";
import MapComponent from "./components/MapComponent";

function App() {
  const mapRef = useRef<mapboxgl.Map>();

  return (
    <>
      <div className="map-container">
        <MapComponent mapRef={mapRef} />
      </div>
    </>
  );
}

export default App;
