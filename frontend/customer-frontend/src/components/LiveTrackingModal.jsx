import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { Navigation, X } from "lucide-react";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { createRealtimeSocket } from "@shared/utils/realtime";
import { fetchGeocode, fetchOsrmRoute, formatEta, formatEtaDuration, haversineKm } from "@shared/utils/mapUtils";

const DEFAULT_ZOOM = 14;
const DEFAULT_CENTER = { lat: 30.3165, lng: 78.0322 };
const ROUTE_INTERVAL_MS = 5000;

const customerPinIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const workerLiveIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#16a34a;border:3px solid #fff;box-shadow:0 0 0 2px #16a34a;"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

// Fit both markers on the very first fix, then leave the map alone
// so the user can zoom/pan freely.
function InitialFit({ workerPosition, customerPosition }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!workerPosition || fittedRef.current) return;
    fittedRef.current = true;

    if (customerPosition) {
      try {
        map.fitBounds(
          [
            [workerPosition.lat, workerPosition.lng],
            [customerPosition.lat, customerPosition.lng]
          ],
          { padding: [48, 48], maxZoom: 16 }
        );
      } catch (_) {
        map.setView([workerPosition.lat, workerPosition.lng], DEFAULT_ZOOM);
      }
    } else {
      map.setView([workerPosition.lat, workerPosition.lng], DEFAULT_ZOOM);
    }
  // customerPosition is stable for the modal's lifetime (derived from booking data).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerPosition]);

  return null;
}

function LiveTrackingModal({ open, onClose, booking, authToken }) {
  const [workerPosition, setWorkerPosition] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(null);
  const [routeCoords, setRouteCoords] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);
  const [mapTile, setMapTile] = useState("street");
  const [geocodedArea, setGeocodedArea] = useState(null);
  const socketRef = useRef(null);
  const lastRouteFetchRef = useRef(0);
  const routeAbortRef = useRef(null);

  const customerPosition =
    booking?.locationLat != null && booking?.locationLng != null
      ? { lat: Number(booking.locationLat), lng: Number(booking.locationLng) }
      : null;

  // When GPS coords are absent, fall back to a geocoded area derived from
  // the typed address text. effectiveCustomerPos is used for routing/ETA/map.
  const effectiveCustomerPos = customerPosition ||
    (geocodedArea ? { lat: geocodedArea.lat, lng: geocodedArea.lng } : null);

  const bookingId = String(booking?.id || "").trim();
  const workerName = String(booking?.workerName || booking?.provider || "Worker").trim();
  const serviceLabel = String(booking?.service || "Service").trim();
  const mapCenter = effectiveCustomerPos || DEFAULT_CENTER;

  const distanceKm =
    workerPosition && effectiveCustomerPos
      ? haversineKm(workerPosition, effectiveCustomerPos)
      : null;
  const etaLabel = routeDuration != null
    ? formatEtaDuration(routeDuration)
    : distanceKm != null ? formatEta(distanceKm) : null;

  // Socket connection
  useEffect(() => {
    if (!open || !authToken || !bookingId) return undefined;

    const socket = createRealtimeSocket(authToken);
    if (!socket) return undefined;
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join:booking", bookingId);
    });

    socket.on("worker:location", (data) => {
      if (String(data?.bookingId || "") !== bookingId) return;
      const lat = Number(data?.lat);
      const lng = Number(data?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      setWorkerPosition({ lat, lng });
      setLastUpdated(Date.now());
      setSecondsAgo(0);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [open, authToken, bookingId]);

  // Geocode the text address when there are no exact GPS coordinates.
  useEffect(() => {
    if (!open || customerPosition) return undefined;
    const text = String(booking?.location || "").trim();
    if (!text) return undefined;
    let active = true;
    fetchGeocode(text).then((result) => {
      if (active) setGeocodedArea(result);
    });
    return () => { active = false; };
  // booking.location and customerPosition are stable for the modal's lifetime.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Throttled OSRM route fetch with AbortController to cancel stale requests.
  // Fires immediately on first fix, then at most once every ROUTE_INTERVAL_MS.
  // Also re-runs when geocodedArea becomes available so the route draws as
  // soon as we have both positions.
  useEffect(() => {
    if (!workerPosition || !effectiveCustomerPos) {
      if (!workerPosition) setRouteCoords(null);
      return;
    }

    const now = Date.now();
    if (now - lastRouteFetchRef.current < ROUTE_INTERVAL_MS) return;
    lastRouteFetchRef.current = now;

    // Cancel any in-flight request before starting a new one
    if (routeAbortRef.current) {
      routeAbortRef.current.abort();
    }
    const controller = new AbortController();
    routeAbortRef.current = controller;

    fetchOsrmRoute(workerPosition, effectiveCustomerPos, controller.signal)
      .then((result) => {
        if (result) {
          setRouteCoords(result.coords);
          if (result.durationSeconds != null) setRouteDuration(result.durationSeconds);
        }
      })
      .catch(() => {});
  // geocodedArea is added so a route fetch fires once geocoding resolves.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerPosition, geocodedArea]);

  // Seconds-ago ticker
  useEffect(() => {
    if (!open || lastUpdated == null) return undefined;
    const id = setInterval(() => {
      setSecondsAgo(Math.round((Date.now() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [open, lastUpdated]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      if (routeAbortRef.current) {
        routeAbortRef.current.abort();
        routeAbortRef.current = null;
      }
      setWorkerPosition(null);
      setLastUpdated(null);
      setSecondsAgo(null);
      setRouteCoords(null);
      setRouteDuration(null);
      setGeocodedArea(null);
      lastRouteFetchRef.current = 0;
    }
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  // Show OSRM road route only — no straight-line fallback to avoid flash
  const polylinePositions = routeCoords;

  const modalContent = (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/55 backdrop-blur-md ui-modal-overlay ui-touch-scroll">
      <div className="flex min-h-full items-start justify-center p-4 sm:items-center">
        <div className="my-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ui-modal-surface">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-lg font-bold text-slate-900">Live Worker Tracking</h4>
                {workerPosition && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
                    Live
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {workerName} &mdash; {serviceLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 ui-touch-target"
              aria-label="Close tracking"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            {workerPosition ? (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                <Navigation className="h-5 w-5 text-green-700" />
                <div>
                  <p className="text-sm font-semibold text-green-800">
                    {distanceKm != null ? `${distanceKm.toFixed(2)} km away` : "Location received"}
                    {etaLabel ? ` · ETA ${etaLabel}` : ""}
                  </p>
                  {secondsAgo != null && (
                    <p className="text-xs text-green-600">
                      Updated {secondsAgo === 0 ? "just now" : `${secondsAgo}s ago`}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Waiting for worker to share their location&hellip;
              </div>
            )}

            {/* Map tile toggle */}
            <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMapTile("street")}
                className={`flex-1 py-1.5 transition-colors ${mapTile === "street" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                Street
              </button>
              <button
                type="button"
                onClick={() => setMapTile("satellite")}
                className={`flex-1 py-1.5 transition-colors ${mapTile === "satellite" ? "bg-blue-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                Satellite
              </button>
            </div>

            <div className="h-72 overflow-hidden rounded-xl border border-slate-200 sm:h-80">
              <MapContainer
                center={[mapCenter.lat, mapCenter.lng]}
                zoom={DEFAULT_ZOOM}
                scrollWheelZoom
                className="h-full w-full"
              >
                <TileLayer
                  attribution={
                    mapTile === "satellite"
                      ? '&copy; <a href="https://www.esri.com">Esri</a>'
                      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  }
                  url={
                    mapTile === "satellite"
                      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  }
                />
                <InitialFit workerPosition={workerPosition} customerPosition={effectiveCustomerPos} />
                {polylinePositions && (
                  <Polyline
                    positions={polylinePositions}
                    color="#16a34a"
                    weight={4}
                    opacity={0.8}
                  />
                )}
                {/* Exact GPS pin */}
                {customerPosition && (
                  <Marker position={[customerPosition.lat, customerPosition.lng]} icon={customerPinIcon} />
                )}
                {/* Approximate area circle when only a text address was given */}
                {!customerPosition && geocodedArea && (
                  <Circle
                    center={[geocodedArea.lat, geocodedArea.lng]}
                    radius={geocodedArea.radius}
                    pathOptions={{
                      color: "#2563eb",
                      fillColor: "#3b82f6",
                      fillOpacity: 0.15,
                      weight: 2
                    }}
                  />
                )}
                {workerPosition && (
                  <Marker position={[workerPosition.lat, workerPosition.lng]} icon={workerLiveIcon} />
                )}
              </MapContainer>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              {customerPosition ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-blue-600" />
                  Your booking location
                </span>
              ) : geocodedArea ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-blue-500 bg-blue-100" />
                  Approximate area
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-green-600" />
                Worker&apos;s live position
              </span>
              {polylinePositions && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-5 bg-green-600" style={{ borderTop: "3px solid #16a34a" }} />
                  Road route
                </span>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ui-touch-target"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default LiveTrackingModal;
