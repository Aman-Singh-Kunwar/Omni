import React, { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { DEFAULT_ZOOM, TILE_STYLES, currentLocationIcon, pinIcon } from "./constants";
import "./map-icons.css";

function MapViewController({ position }) {
  const map = useMap();
  useEffect(() => {
    if (!position) {
      return;
    }
    map.setView([position.lat, position.lng], map.getZoom() || DEFAULT_ZOOM, { animate: true });
  }, [map, position]);
  return null;
}

function MapWheelZoomController({ enableWheelZoom }) {
  const map = useMap();

  useEffect(() => {
    if (!map?.scrollWheelZoom) {
      return;
    }

    if (enableWheelZoom) {
      map.scrollWheelZoom.enable();
    } else {
      map.scrollWheelZoom.disable();
    }
  }, [map, enableWheelZoom]);

  return null;
}

function MapSelectionLayer({ position, onSelect }) {
  useMapEvents({
    click(event) {
      onSelect({ lat: event.latlng.lat, lng: event.latlng.lng });
    }
  });

  if (!position) {
    return null;
  }

  return (
    <Marker
      position={[position.lat, position.lng]}
      icon={pinIcon}
      draggable
      eventHandlers={{
        dragend(event) {
          const marker = event.target;
          const nextLatLng = marker?.getLatLng?.();
          if (!nextLatLng) {
            return;
          }
          onSelect({ lat: nextLatLng.lat, lng: nextLatLng.lng });
        }
      }}
    />
  );
}

function CurrentLocationLayer({ currentPosition }) {
  if (!currentPosition) {
    return null;
  }

  return <Marker position={[currentPosition.lat, currentPosition.lng]} icon={currentLocationIcon} interactive={false} />;
}

function MapCanvas({ selectedPosition, currentPosition = null, mapStyle, mapHovered, onSelect, onMapMouseEnter, onMapMouseLeave }) {
  return (
    <div
      className="h-72 overflow-hidden rounded-xl border border-slate-200 sm:h-80"
      onMouseEnter={onMapMouseEnter}
      onMouseLeave={onMapMouseLeave}
    >
      <MapContainer center={[selectedPosition.lat, selectedPosition.lng]} zoom={DEFAULT_ZOOM} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer attribution={TILE_STYLES[mapStyle].attribution} url={TILE_STYLES[mapStyle].url} />
        <MapViewController position={selectedPosition} />
        <MapWheelZoomController enableWheelZoom={mapHovered} />
        <CurrentLocationLayer currentPosition={currentPosition} />
        <MapSelectionLayer position={selectedPosition} onSelect={onSelect} />
      </MapContainer>
    </div>
  );
}

export default MapCanvas;
