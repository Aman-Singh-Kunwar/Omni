import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DEFAULT_CENTER = { lat: 30.3165, lng: 78.0322 };
const DEFAULT_ZOOM = 14;

const TILE_STYLES = {
  street: {
    label: "Street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  satellite: {
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
  }
};

const pinIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const currentLocationIcon = L.divIcon({
  className: "omni-current-location-icon",
  html: `
    <div class="omni-current-location-icon__outer">
      <div class="omni-current-location-icon__inner"></div>
    </div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

export { DEFAULT_CENTER, DEFAULT_ZOOM, TILE_STYLES, pinIcon, currentLocationIcon };
