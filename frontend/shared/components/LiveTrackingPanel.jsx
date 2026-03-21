import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  MapPin,
  Navigation,
  AlertCircle,
  Battery,
  Signal,
  Clock,
  Phone,
  MessageCircle,
  X,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";

/**
 * LiveTrackingPanel - Real-time worker location tracking with:
 * - Map display with worker location and destination
 * - Recenter to worker button
 * - Follow-worker camera toggle
 * - Connection quality badge
 * - GPS accuracy badge
 * - Worker speed/ETA estimate
 * - Route refresh button
 * - Arrival ring animation
 * - Share trip status text
 * - Permission health check card
 * - Accuracy warning
 * - Battery saver warning
 * - Background sharing indicator
 * - Auto-stop on completion
 * - Last-sent timestamp
 * - Safety notice before first share
 * - Manual "Send location now" button
 */

const GPS_ACCURACY_THRESHOLD = 50; // meters

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateETA(distance, speedKmh = 20) {
  if (!distance || !speedKmh) return "Calculating...";
  const minutes = Math.round((distance / speedKmh) * 60);
  if (minutes < 1) return "< 1 min";
  if (minutes === 1) return "1 min";
  if (minutes > 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
  return `${minutes} min`;
}

function LiveTrackingPanel({
  bookingId = "",
  workerName = "Worker",
  workerPhone = "",
  isTracking = false,
  onToggleTracking = () => {},
  currentLocation = { lat: 0, lng: 0 },
  workerLocation = { lat: 20.5937, lng: 78.9629 },
  destination = { lat: 19.076, lng: 72.8777 },
  gpsAccuracy = 10,
  connectionQuality = "good", // poor, fair, good
  batteryLevel = 85,
  lastLocationUpdate = new Date(),
  workerSpeed = 0,
  onRecenter = () => {},
  onRequestLocation = () => {},
  onToggleFollow = () => {},
  shouldAutoStop = false,
  onAutoStop = () => {},
  isBackgroundMode = false,
  onContactWorker = () => {},
  showSafetyNotice = false,
  onAcceptSafetyNotice = () => {},
  locationPermissionStatus = "granted",
}) {
  const [followWorker, setFollowWorker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [gpsWarningDismissed, setGpsWarningDismissed] = useState(false);
  const [batteryWarningDismissed, setBatteryWarningDismissed] = useState(
    false
  );

  // Calculate distance and ETA
  const distance = useMemo(
    () => calculateDistance(
      currentLocation.lat,
      currentLocation.lng,
      destination.lat,
      destination.lng
    ),
    [currentLocation, destination]
  );

  const eta = useMemo(
    () => calculateETA(distance, Math.max(workerSpeed || 0, 20)),
    [distance, workerSpeed]
  );

  // GPS accuracy assessment
  const gpsStatus = useMemo(() => {
    if (gpsAccuracy <= 10) return { level: "excellent", color: "text-green-600" };
    if (gpsAccuracy <= 25) return { level: "good", color: "text-emerald-600" };
    if (gpsAccuracy <= 50) return { level: "fair", color: "text-amber-600" };
    return { level: "poor", color: "text-red-600" };
  }, [gpsAccuracy]);

  // Connection quality assessment
  const connectionStatus = useMemo(() => {
    const colors = {
      excellent: { bg: "bg-green-100", text: "text-green-700", dots: 4 },
      good: { bg: "bg-emerald-100", text: "text-emerald-700", dots: 3 },
      fair: { bg: "bg-amber-100", text: "text-amber-700", dots: 2 },
      poor: { bg: "bg-red-100", text: "text-red-700", dots: 1 },
    };
    return (
      colors[connectionQuality] || colors.fair
    );
  }, [connectionQuality]);

  const connectionMessage = useMemo(() => {
    if (connectionQuality === "excellent") return "Live updates are very stable.";
    if (connectionQuality === "good") return "Live updates are stable.";
    if (connectionQuality === "poor") return "Connection is weak. Updates may be delayed.";
    return "Connection is moderate. Minor delays possible.";
  }, [connectionQuality]);

  const handleCopyLocation = useCallback(() => {
    const locText = `${workerLocation.lat.toFixed(6)}, ${workerLocation.lng.toFixed(6)}`;
    navigator.clipboard.writeText(locText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [workerLocation]);

  const handleToggleFollow = useCallback(() => {
    setFollowWorker((prev) => !prev);
    onToggleFollow?.(!followWorker);
  }, [followWorker, onToggleFollow]);

  // Auto-stop logic
  useEffect(() => {
    if (shouldAutoStop && isTracking) {
      onAutoStop?.();
    }
  }, [shouldAutoStop, isTracking, onAutoStop]);

  return (
    <div className="space-y-4">
      {/* Safety Notice */}
      {showSafetyNotice && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Safety Reminder</p>
              <p className="text-sm text-amber-800 mt-1">
                Your live location will be shared with the customer during this booking. They can see your real-time movement until the service is completed.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onAcceptSafetyNotice}
            className="w-full px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 font-semibold text-sm"
          >
            I Understand, Continue
          </button>
        </div>
      )}

      {/* Permission Health */}
      <div
        className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${
          locationPermissionStatus === "granted"
            ? "border-emerald-200 bg-emerald-50"
            : "border-red-200 bg-red-50"
        }`}
      >
        <ShieldAlert
          className={`h-4 w-4 mt-0.5 ${
            locationPermissionStatus === "granted" ? "text-emerald-700" : "text-red-700"
          }`}
        />
        <div>
          <p
            className={`text-xs font-semibold ${
              locationPermissionStatus === "granted" ? "text-emerald-800" : "text-red-800"
            }`}
          >
            Location Permission {locationPermissionStatus === "granted" ? "Healthy" : "Required"}
          </p>
          <p
            className={`text-xs mt-0.5 ${
              locationPermissionStatus === "granted" ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {locationPermissionStatus === "granted"
              ? "Permission granted. Background sharing is available during active booking."
              : "Please enable location permission to start live sharing."}
          </p>
        </div>
      </div>

      {/* Map Container */}
      <div className="rounded-lg border border-gray-200 overflow-hidden bg-gray-100 h-64 relative">
        {/* Placeholder map - in production this would be actual map rendering */}
        <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center relative">
          {/* Worker location marker */}
          <div
            className="absolute transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: "60%",
              top: "60%",
            }}
          >
            <div className="relative">
              <div className="w-8 h-8 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                <Navigation className="h-4 w-4 text-white" />
              </div>
              {/* Arrival ring animation */}
              {isTracking && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-ping" />
                  <div className="absolute -inset-1 rounded-full border border-blue-200 animate-pulse" />
                </>
              )}
            </div>
          </div>

          {/* Map placeholder text */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-500">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Map integration required</p>
            </div>
          </div>
        </div>

        {/* Map controls */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={onRecenter}
            className="p-2 bg-white rounded-lg shadow-sm hover:shadow-md text-gray-700 hover:bg-gray-50 transition-all"
            title="Recenter to worker"
          >
            <Navigation className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleToggleFollow}
            className={`p-2 rounded-lg shadow-sm transition-all ${
              followWorker
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-white text-gray-700 hover:bg-gray-50"
            }`}
            title="Toggle follow worker"
          >
            <Navigation className="h-4 w-4" />
          </button>
        </div>

        {/* Distance and ETA overlay */}
        <div className="absolute bottom-3 left-3 bg-white/90 rounded-lg px-3 py-2 shadow-sm">
          <p className="text-xs font-semibold text-gray-900">
            {distance.toFixed(1)} km away
          </p>
          <p className="text-xs text-gray-600">ETA: {eta}</p>
        </div>
        
        {/* Route refresh button */}
        <button
          type="button"
          onClick={handleRefreshRoute}
          disabled={routeRefreshing}
          className="absolute bottom-3 right-3 p-2 bg-white rounded-lg shadow-sm hover:shadow-md text-gray-700 hover:bg-gray-50 transition-all disabled:opacity-60"
          title="Refresh route"
        >
          <RefreshCw className={`h-4 w-4 ${routeRefreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Status Cards Row */}
      <div className="grid grid-cols-3 gap-2">
        {/* Connection Quality */}
        <div
          className={`rounded-lg ${connectionStatus.bg} ${connectionStatus.text} px-3 py-2 text-center`}
        >
          <p className="text-xs font-semibold">Connection</p>
          <div className="flex items-center justify-center gap-1 mt-1">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`h-2 w-1 rounded-full ${
                  i < connectionStatus.dots ? "bg-current" : "bg-current/30"
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] mt-1 capitalize">{connectionQuality}</p>
          <p className="mt-1 text-[10px] leading-tight">{connectionMessage}</p>
        </div>

        {/* GPS Accuracy */}
        <div
          className={`rounded-lg border border-gray-200 bg-white px-3 py-2 text-center`}
        >
          <p className="text-xs font-semibold text-gray-900">GPS</p>
          <p className={`text-xs font-bold mt-1 ${gpsStatus.color}`}>
            ±{gpsAccuracy}m
          </p>
          <p className="text-[10px] text-gray-600 capitalize">
            {gpsStatus.level}
          </p>
        </div>

        {/* Battery Level */}
        <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-center">
          <p className="text-xs font-semibold text-gray-900">Battery</p>
          <p className={`text-xs font-bold mt-1 ${
            batteryLevel > 20 ? "text-green-600" : "text-red-600"
          }`}>
            {batteryLevel}%
          </p>
          <Battery className={`h-3 w-3 mx-auto mt-1 ${
            batteryLevel > 20 ? "text-green-600" : "text-red-600"
          }`} />
        </div>
      </div>

      {/* Warnings */}
      {gpsAccuracy > GPS_ACCURACY_THRESHOLD && !gpsWarningDismissed && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-800">Low GPS Accuracy</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Location accuracy is reduced. Move outdoors for better signal.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGpsWarningDismissed(true)}
            className="flex-shrink-0 text-amber-600 hover:text-amber-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {batteryLevel <= 20 && !batteryWarningDismissed && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-red-800">Low Battery</p>
            <p className="text-xs text-red-700 mt-0.5">
              Battery is low. Enable battery saver mode or charge soon.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setBatteryWarningDismissed(true)}
            className="flex-shrink-0 text-red-600 hover:text-red-700"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Location Status */}
      <div className="rounded-lg border border-gray-200 bg-white/80 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-900">
              Location Sharing {isTracking ? "Active" : "Inactive"}
            </p>
            <p className="text-xs text-gray-600">
              Last update: {lastLocationUpdate.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
            <p className="text-xs text-gray-600">
              Trip status: {isTracking ? "En route and sharing" : "Not sharing location"}
            </p>
            {isBackgroundMode && (
              <p className="text-xs font-medium text-amber-600">
                Background sharing active. Battery usage may increase.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onToggleTracking?.(!isTracking)}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
              isTracking
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            {isTracking ? "Stop Sharing" : "Start Sharing"}
          </button>
        </div>

        {isTracking && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onRequestLocation}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              Send Location Now
            </button>
            <button
              type="button"
              onClick={handleCopyLocation}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
              title="Copy coordinates"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        )}
      </div>

      {/* Worker Contact */}
      {isTracking && (
        <div className="rounded-lg border border-gray-200 bg-white/80 p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">
            Contact {workerName}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onContactWorker?.("call")}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg font-medium text-sm"
            >
              <Phone className="h-4 w-4" />
              Call
            </button>
            <button
              type="button"
              onClick={() => onContactWorker?.("message")}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg font-medium text-sm"
            >
              <MessageCircle className="h-4 w-4" />
              Message
            </button>
          </div>
        </div>
      )}

      {/* Details Toggle */}
      <button
        type="button"
        onClick={() => setShowDetails(!showDetails)}
        className="w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg text-center border border-gray-200"
      >
        {showDetails ? "Hide" : "Show"} Details
      </button>

      {/* Detailed Info */}
      {showDetails && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Worker Speed:</span>
            <span className="font-medium text-gray-900">
              {workerSpeed || 0} km/h
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">ETA:</span>
            <span className="font-medium text-gray-900">{eta}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Coordinates:</span>
            <span className="font-mono text-xs text-gray-700">
              {workerLocation.lat.toFixed(4)}, {workerLocation.lng.toFixed(4)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Booking ID:</span>
            <span className="font-mono text-xs text-gray-700">{bookingId}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default LiveTrackingPanel;

  const [routeRefreshing, setRouteRefreshing] = useState(false);

  const handleRefreshRoute = useCallback(() => {
    setRouteRefreshing(true);
    // Simulate route refresh with 1.5s delay
    setTimeout(() => {
      setRouteRefreshing(false);
    }, 1500);
  }, []);
