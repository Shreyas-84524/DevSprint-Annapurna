"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";

// Fix for default marker icons missing in Next.js/Leaflet integrations
const iconFix = () => {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
};

interface MapViewProps {
  volunteerCoords?: [number, number];
  pickupCoords?: [number, number];
  deliveryCoords?: [number, number];
  routeGeometry?: [number, number][]; // optional road route geometry points [lat, lng]
}

export default function MapView({
  volunteerCoords,
  pickupCoords,
  deliveryCoords,
  routeGeometry,
}: MapViewProps) {
  useEffect(() => {
    iconFix();
  }, []);

  const defaultCenter: [number, number] = [19.0760, 72.8777];

  // Configurable tile provider: Geoapify if browser key is present, fallback to standard OSM
  const geoapifyKey = process.env.NEXT_PUBLIC_GEOAPIFY_MAP_KEY;
  const tileUrl = geoapifyKey
    ? `https://maps.geoapify.com/v1/tile/osm-carto/{z}/{x}/{y}.png?apiKey=${geoapifyKey}`
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const attribution = geoapifyKey
    ? 'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
      <MapContainer
        center={volunteerCoords || pickupCoords || defaultCenter}
        zoom={13}
        style={{ height: "400px", width: "100%", zIndex: 0 }}
      >
        <TileLayer attribution={attribution} url={tileUrl} />

        {volunteerCoords && (
          <Marker position={volunteerCoords}>
            <Popup>Volunteer Location</Popup>
          </Marker>
        )}

        {pickupCoords && (
          <Marker position={pickupCoords}>
            <Popup>Pickup Location</Popup>
          </Marker>
        )}

        {deliveryCoords && (
          <Marker position={deliveryCoords}>
            <Popup>Delivery Destination</Popup>
          </Marker>
        )}

        {/* Render calculated road route if available, otherwise direct polyline */}
        {routeGeometry && routeGeometry.length > 0 ? (
          <Polyline
            positions={routeGeometry}
            pathOptions={{ color: "#EAB308", weight: 5 }}
          />
        ) : (
          pickupCoords &&
          deliveryCoords && (
            <Polyline
              positions={[pickupCoords, deliveryCoords]}
              pathOptions={{ color: "#EAB308", weight: 4, dashArray: "5, 10" }}
            />
          )
        )}
      </MapContainer>
    </div>
  );
}
