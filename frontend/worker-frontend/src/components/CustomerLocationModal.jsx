import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Circle, MapContainer, Marker, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, Navigation, Radio, X } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { createRealtimeSocket } from "@shared/utils/realtime";
import { fetchGeocode, fetchOsrmRoute, formatEta, formatEtaDuration, haversineKm } from "@shared/utils/mapUtils";

const DEFAULT_ZOOM = 14;
const DEFAULT_CENTER = { lat: 30.3165, lng: 78.0322 };
const ROUTE_INTERVAL_MS = 5000;

// Red SVG pin for customer location
const customerPinIcon = L.divIcon({
  className: "",
  html: `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="38" viewBox="0 0 26 38">
    <path fill="#ef4444" stroke="#b91c1c" stroke-width="1.5" d="M13 1C6.925 1 2 5.925 2 12c0 8.5 11 25 11 25s11-16.5 11-25C24 5.925 19.075 1 13 1z"/>
    <circle fill="white" cx="13" cy="12" r="5"/>
  </svg>`,
  iconSize: [26, 38],
  iconAnchor: [13, 38]
});

// Blue dot for worker's own live position
const workerDotIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 2px #2563eb;"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// Fit both markers into view exactly once on the first GPS fix.
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
  // customerPosition is derived from booking props that never change during
  // the modal's lifetime, so omitting it from deps is intentional.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerPosition]);

  return null;
}

function CustomerLocationModal({ open, onClose, booking, authToken }) {
  const [workerPosition, setWorkerPosition] = useState(null);
  const [gpsError, setGpsError] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [routeCoords, setRouteCoords] = useState(null);
  const [routeDuration, setRouteDuration] = useState(null);
  const [mapTile, setMapTile] = useState("street");
  const [geocodedArea, setGeocodedArea] = useState(null);

  const socketRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastPositionRef = useRef(null);
  const shareIntervalRef = useRef(null);
  const lastRouteFetchRef = useRef(0);
  const routeAbortRef = useRef(null);
  // Last position that was actually emitted — used to skip redundant emits
  // when the worker is stationary or within the movement threshold.
  const lastEmittedPosRef = useRef(null);

  const customerPosition =
    booking?.locationLat != null && booking?.locationLng != null
      ? { lat: Number(booking.locationLat), lng: Number(booking.locationLng) }
      : null;

  // When exact GPS coords are absent, fall back to a geocoded area circle.
  const effectiveCustomerPos = customerPosition ||
    (geocodedArea ? { lat: geocodedArea.lat, lng: geocodedArea.lng } : null);

  const bookingId = String(booking?.id || booking?._id || "").trim();
  const customerName = String(booking?.customerName || "Customer").trim();
  const serviceLabel = String(booking?.service || "Service").trim();

  const distanceKm =
    workerPosition && effectiveCustomerPos
      ? haversineKm(workerPosition, effectiveCustomerPos)
      : null;
  const etaLabel = routeDuration != null
    ? formatEtaDuration(routeDuration)
    : distanceKm != null ? formatEta(distanceKm) : null;
  const mapCenter = effectiveCustomerPos || DEFAULT_CENTER;

  // Start GPS watch when modal opens
  useEffect(() => {
    if (!open) return undefined;

    if (!navigator?.geolocation) {
      setGpsError("GPS not supported on this device.");
      return undefined;
    }

    setGpsError("");

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        lastPositionRef.current = loc;
        setWorkerPosition(loc);
        setGpsError("");
      },
      (err) => setGpsError(`GPS error: ${err.message}`),
      { enableHighAccuracy: true, maximumAge: 2000 }
    );

    watchIdRef.current = watchId;

    return () => {
      navigator.geolocation.clearWatch(watchId);
      watchIdRef.current = null;
      lastPositionRef.current = null;
    };
  }, [open]);

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
  // Fires immediately on first GPS fix, then at most once every ROUTE_INTERVAL_MS.
  // Also re-runs when geocodedArea resolves so the route draws immediately.
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
  // geocodedArea added so route fetch fires once geocoding resolves.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerPosition, geocodedArea]);

  const stopSharing = useCallback(() => {
    if (shareIntervalRef.current) {
      clearInterval(shareIntervalRef.current);
      shareIntervalRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setIsSharing(false);
  }, []);

  const startSharing = useCallback(() => {
    if (!authToken || !bookingId) return;

    const socket = createRealtimeSocket(authToken);
    if (!socket) return;

    socketRef.current = socket;

    const interval = setInterval(() => {
      const pos = lastPositionRef.current;
      if (!pos || !socketRef.current?.connected) return;

      // Skip the emit if the worker hasn't moved >= 10 metres since the last
      // emitted position — avoids flooding the server with identical events
      // while the worker is stationary or barely moving (GPS jitter).
      const prev = lastEmittedPosRef.current;
      if (prev && haversineKm(prev, pos) * 1000 < 10) return;

      lastEmittedPosRef.current = pos;
      socketRef.current.emit("worker:location", { bookingId, lat: pos.lat, lng: pos.lng });
    }, 1000);

    shareIntervalRef.current = interval;
    setIsSharing(true);
  }, [authToken, bookingId]);

  // Warn before browser tab/window close while sharing is active
  useEffect(() => {
    if (!isSharing) return undefined;
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSharing]);

  // Clean up on close — but only stop sharing if worker is NOT actively sharing
  useEffect(() => {
    if (!open) {
      if (!isSharing) {
        if (routeAbortRef.current) {
          routeAbortRef.current.abort();
          routeAbortRef.current = null;
        }
        setWorkerPosition(null);
        setGpsError("");
        setRouteCoords(null);
        setRouteDuration(null);
        setGeocodedArea(null);
        lastRouteFetchRef.current = 0;
        lastEmittedPosRef.current = null;
      }
    }
  }, [open, isSharing]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopSharing();
      if (watchIdRef.current != null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (routeAbortRef.current) {
        routeAbortRef.current.abort();
        routeAbortRef.current = null;
      }
    };
  }, [stopSharing]);

  if (!open || typeof document === "undefined") return null;

  const handleClose = () => {
    if (isSharing) return;
    onClose();
  };

  // Show OSRM road route only — no straight-line fallback to avoid flash
  const polylinePositions = routeCoords;

  const modalContent = (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/55 backdrop-blur-md">
      <div className="flex min-h-full items-start justify-center p-4 sm:items-center">
        <div className="my-4 w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                <h4 className="text-lg font-bold text-slate-900">Customer Location</h4>
              </div>
              <p className="text-xs text-slate-500">
                {customerName} &mdash; {serviceLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSharing}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Close"
              title={isSharing ? "Stop sharing before closing" : "Close"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 p-4 sm:p-6">
            {workerPosition && effectiveCustomerPos && (
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <Navigation className="h-5 w-5 text-blue-700" />
                <p className="text-sm font-semibold text-blue-800">
                  {distanceKm.toFixed(2)} km to customer
                  {etaLabel ? ` · ETA ${etaLabel}` : ""}
                </p>
              </div>
            )}

            {gpsError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {gpsError}
              </div>
            )}

            {/* Map tile toggle */}
            <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMapTile("street")}
                className={`flex-1 py-1.5 transition-colors ${mapTile === "street" ? "bg-purple-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                Street
              </button>
              <button
                type="button"
                onClick={() => setMapTile("satellite")}
                className={`flex-1 py-1.5 transition-colors ${mapTile === "satellite" ? "bg-purple-600 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                Satellite
              </button>
            </div>

            {/* Map */}
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
                    color="#2563eb"
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
                      color: "#ef4444",
                      fillColor: "#f87171",
                      fillOpacity: 0.15,
                      weight: 2
                    }}
                  />
                )}
                {workerPosition && (
                  <Marker position={[workerPosition.lat, workerPosition.lng]} icon={workerDotIcon} />
                )}
              </MapContainer>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              {customerPosition ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  Customer location
                </span>
              ) : geocodedArea ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded-full border-2 border-red-400 bg-red-100" />
                  Approximate area
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-blue-600" />
                Your position
              </span>
              {polylinePositions && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="inline-block h-0.5 w-5" style={{ borderTop: "3px solid #2563eb" }} />
                  Road route
                </span>
              )}
            </div>

            {/* Share toggle + close */}
            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
              {isSharing && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  Location sharing is active. Stop sharing before closing this panel or leaving the page.
                </p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={isSharing ? stopSharing : startSharing}
                  disabled={!workerPosition}
                  className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                    isSharing
                      ? "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                >
                  <Radio className={`h-4 w-4 ${isSharing ? "animate-pulse" : ""}`} />
                  {isSharing ? "Stop Sharing Location" : "Share My Location Live"}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSharing}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  title={isSharing ? "Stop sharing before closing" : undefined}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default CustomerLocationModal;
