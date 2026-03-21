import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Crosshair, Home, Loader2, MapPin, Search, Trash2, X } from "lucide-react";
import "leaflet/dist/leaflet.css";
import MapCanvas from "./location-picker/MapCanvas";
import { DEFAULT_CENTER, TILE_STYLES } from "./location-picker/constants";
import { deriveAddressLabel, normalizePosition, toCoordinateLabel, toSearchResult } from "./location-picker/utils";

function LocationPickerModal({ open, initialLabel = "", initialPosition = null, initialSearchText = "", onClose, onConfirm }) {
  const [selectedPosition, setSelectedPosition] = useState(() => normalizePosition(initialPosition) || DEFAULT_CENTER);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [selectedLabel, setSelectedLabel] = useState(() => String(initialLabel || ""));
  const [locationError, setLocationError] = useState("");
  const [locating, setLocating] = useState(false);
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [mapStyle, setMapStyle] = useState("street");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [mapHovered, setMapHovered] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [homeLocation, setHomeLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('home_location');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [workLocation, setWorkLocation] = useState(() => {
    try {
      const saved = localStorage.getItem('work_location');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const lookupRequestIdRef = useRef(0);
  const searchRequestIdRef = useRef(0);
  const modalCardRef = useRef(null);
  const modalContentScrollRef = useRef(null);
  const copyTimeoutRef = useRef(null);

  const normalizedInitialPosition = useMemo(() => normalizePosition(initialPosition) || DEFAULT_CENTER, [initialPosition]);
  const hasSelection = Boolean(normalizePosition(selectedPosition));

  const resolveAddress = useCallback(async (position) => {
    const normalized = normalizePosition(position);
    if (!normalized) {
      setSelectedLabel("");
      return;
    }

    const requestId = lookupRequestIdRef.current + 1;
    lookupRequestIdRef.current = requestId;
    setReverseGeocoding(true);
    setLocationError("");

    try {
      const query = new URLSearchParams({
        format: "jsonv2",
        lat: String(normalized.lat),
        lon: String(normalized.lng)
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${query.toString()}`);
      if (!response.ok) {
        throw new Error("Unable to resolve address right now.");
      }

      const data = await response.json();
      if (lookupRequestIdRef.current !== requestId) {
        return;
      }
      const resolvedLabel = deriveAddressLabel(data, normalized);
      setSelectedLabel(resolvedLabel);
    } catch (_error) {
      if (lookupRequestIdRef.current !== requestId) {
        return;
      }
      const coordinateLabel = toCoordinateLabel(normalized);
      setSelectedLabel(coordinateLabel);
      setLocationError("Address lookup failed. Coordinates will be used.");
    } finally {
      if (lookupRequestIdRef.current === requestId) {
        setReverseGeocoding(false);
      }
    }
  }, []);

  const handleSelectPosition = useCallback(
    (position) => {
      const normalized = normalizePosition(position);
      if (!normalized) {
        return;
      }
      setSearchQuery("");
      setSelectedPosition(normalized);
      resolveAddress(normalized);
    },
    [resolveAddress]
  );

  const handleUseCurrentLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not supported on this device.");
      return;
    }

    setLocating(true);
    setLocationError("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
        handleSelectPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => {
        setLocating(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError("Location permission denied. Please allow access and try again.");
          return;
        }
        setLocationError("Unable to fetch current location.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [handleSelectPosition]);

  const handleCopyCoordinates = useCallback(async () => {
    const normalized = normalizePosition(selectedPosition);
    if (!normalized) return;
    
    const coordText = toCoordinateLabel(normalized);
    try {
      await navigator.clipboard.writeText(coordText);
      setCopiedCoords(true);
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = setTimeout(() => setCopiedCoords(false), 2000);
    } catch {
      setLocationError("Failed to copy coordinates");
    }
  }, [selectedPosition]);

  const handleSetHomeLocation = useCallback(() => {
    const normalized = normalizePosition(selectedPosition);
    if (!normalized) return;
    
    try {
      const homeData = {
        lat: normalized.lat,
        lng: normalized.lng,
        label: selectedLabel || toCoordinateLabel(normalized)
      };
      localStorage.setItem('home_location', JSON.stringify(homeData));
      setHomeLocation(homeData);
      setLocationError("");
    } catch {
      setLocationError("Failed to save home location");
    }
  }, [selectedPosition, selectedLabel]);

  const handleSetWorkLocation = useCallback(() => {
    const normalized = normalizePosition(selectedPosition);
    if (!normalized) return;
    
    try {
      const workData = {
        lat: normalized.lat,
        lng: normalized.lng,
        label: selectedLabel || toCoordinateLabel(normalized)
      };
      localStorage.setItem('work_location', JSON.stringify(workData));
      setWorkLocation(workData);
      setLocationError("");
    } catch {
      setLocationError("Failed to save work location");
    }
  }, [selectedPosition, selectedLabel]);

  const handleClearHomeLocation = useCallback(() => {
    localStorage.removeItem('home_location');
    setHomeLocation(null);
  }, []);

  const handleClearWorkLocation = useCallback(() => {
    localStorage.removeItem('work_location');
    setWorkLocation(null);
  }, []);

  const handleConfirm = () => {
    const normalized = normalizePosition(selectedPosition);
    if (!normalized) {
      return;
    }

    const locationText = String(selectedLabel || "").trim() || toCoordinateLabel(normalized);
    onConfirm({
      location: locationText,
      lat: normalized.lat,
      lng: normalized.lng
    });
  };

  const performSearch = useCallback(async (rawQuery) => {
    const query = String(rawQuery || "").trim();
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setSearching(true);
    setLocationError("");

    try {
      const params = new URLSearchParams({
        format: "jsonv2",
        q: query,
        limit: "8",
        addressdetails: "1",
        "accept-language": "en"
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Unable to search places right now.");
      }
      const data = await response.json();
      if (searchRequestIdRef.current !== requestId) {
        return;
      }

      const nextResults = Array.isArray(data) ? data.map(toSearchResult).filter(Boolean) : [];
      setSearchResults(nextResults);
      if (!nextResults.length && query.length >= 3) {
        setLocationError("No places found for this search.");
      }
    } catch (_error) {
      if (searchRequestIdRef.current !== requestId) {
        return;
      }
      setSearchResults([]);
      setLocationError("Place search failed. Try another keyword.");
    } finally {
      if (searchRequestIdRef.current === requestId) {
        setSearching(false);
      }
    }
  }, []);

  const handleSearch = useCallback(() => {
    performSearch(searchQuery);
  }, [performSearch, searchQuery]);

  const handleSelectSearchResult = (result) => {
    const normalized = normalizePosition(result);
    if (!normalized) {
      return;
    }

    setSelectedPosition(normalized);
    setSelectedLabel(String(result?.label || toCoordinateLabel(normalized)));
    setSearchResults([]);
    setSearchQuery("");
    setLocationError("");
    resolveAddress(normalized);
  };

  const handleBackdropWheel = useCallback((event) => {
    const cardElement = modalCardRef.current;
    const contentElement = modalContentScrollRef.current;
    if (!cardElement || !contentElement) {
      return;
    }

    if (cardElement.contains(event.target)) {
      return;
    }

    if (contentElement.scrollHeight <= contentElement.clientHeight) {
      return;
    }

    contentElement.scrollTop += event.deltaY;
    event.preventDefault();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedPosition(normalizedInitialPosition);
    setSelectedLabel(String(initialLabel || ""));
    setSearchQuery(String(initialSearchText || ""));
    setSearchResults([]);
    setMapHovered(false);
    setCurrentPosition(null);
    setLocationError("");
    if (!String(initialLabel || "").trim()) {
      resolveAddress(normalizedInitialPosition);
    }
  }, [open, normalizedInitialPosition, initialLabel, initialSearchText, resolveAddress]);

  useEffect(() => {
    if (!open || typeof navigator === "undefined" || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      () => {
        // Ignore geolocation errors for passive current-location marker.
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const query = String(searchQuery || "").trim();
    if (query.length < 3) {
      return;
    }

    const debounceId = window.setTimeout(() => {
      performSearch(query);
    }, 350);

    return () => window.clearTimeout(debounceId);
  }, [open, performSearch, searchQuery]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  const modalContent = (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/55 backdrop-blur-md ui-modal-overlay ui-touch-scroll" onWheel={handleBackdropWheel}>
      <div className="flex min-h-full items-start justify-center p-4 sm:items-center">
        <div ref={modalCardRef} className="my-4 w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ui-modal-surface">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 sm:px-6">
            <div>
              <h4 className="text-lg font-bold text-slate-900">Select Location</h4>
              <p className="text-xs text-slate-500">Tap map or drag the pin to set booking location.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 ui-touch-target"
              aria-label="Close location picker"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div ref={modalContentScrollRef} className="max-h-[calc(94vh-74px)] space-y-4 overflow-y-auto overscroll-contain p-4 ui-touch-scroll sm:p-6">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Search Place</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setLocationError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSearch();
                    }
                  }}
                  placeholder={selectedLabel || "Search area, colony, road, city..."}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-70 ui-touch-target"
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Search
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white ui-touch-scroll">
                  {searchResults.map((result) => (
                    <button
                      key={`${result.lat}:${result.lng}:${result.label}`}
                      type="button"
                      onClick={() => handleSelectSearchResult(result)}
                      className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 last:border-b-0 ui-touch-target"
                    >
                      {result.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <MapCanvas
              selectedPosition={selectedPosition}
              currentPosition={currentPosition}
              mapStyle={mapStyle}
              mapHovered={mapHovered}
              onSelect={handleSelectPosition}
              onMapMouseEnter={() => setMapHovered(true)}
              onMapMouseLeave={() => setMapHovered(false)}
            />

            <div className="space-y-3">
              {/* Shortcut locations */}
              <div className="flex flex-wrap gap-2">
                {homeLocation && (
                  <div className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1">
                    <button
                      type="button"
                      onClick={() => handleSelectPosition(homeLocation)}
                      className="text-xs font-medium text-amber-700 hover:text-amber-800"
                    >
                      🏠 Home
                    </button>
                    <button
                      type="button"
                      onClick={handleClearHomeLocation}
                      className="p-0.5 text-amber-600 hover:text-amber-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                {workLocation && (
                  <div className="flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50 px-2 py-1">
                    <button
                      type="button"
                      onClick={() => handleSelectPosition(workLocation)}
                      className="text-xs font-medium text-purple-700 hover:text-purple-800"
                    >
                      💼 Work
                    </button>
                    <button
                      type="button"
                      onClick={handleClearWorkLocation}
                      className="p-0.5 text-purple-600 hover:text-purple-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Map controls and styles */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex rounded-lg border border-slate-300 bg-white p-1">
                  {Object.entries(TILE_STYLES).map(([key, style]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMapStyle(key)}
                      className={`rounded-md px-3 py-1.5 text-xs font-semibold ui-touch-target ${
                        mapStyle === key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full border border-blue-300 bg-blue-500/90" />
                    Current location pin
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-600" />
                    Selected location pin
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={locating}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-70 ui-touch-target"
                >
                  {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
                  <span className="hidden sm:inline">Locate</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyCoordinates}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-gray-50 px-2 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 ui-touch-target"
                >
                  {copiedCoords ? <Check className="h-4 w-4 text-green-600" /> : <MapPin className="h-4 w-4" />}
                  <span className="hidden sm:inline">{copiedCoords ? "Copied" : "Copy"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSetHomeLocation}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 ui-touch-target"
                >
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">Home</span>
                </button>
                <button
                  type="button"
                  onClick={handleSetWorkLocation}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-2 py-2 text-xs font-semibold text-purple-700 hover:bg-purple-100 ui-touch-target"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Work</span>
                </button>
              </div>

              {/* Coordinate display */}
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-semibold text-slate-600">Selected: {toCoordinateLabel(selectedPosition)}</p>
                <p className="text-xs text-slate-400">
                  {mapHovered ? "Mouse wheel zoom active on map." : "Hover map to enable mouse wheel zoom."}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</p>
              <p className="mt-1 text-sm text-slate-700">
                {reverseGeocoding ? "Resolving address..." : selectedLabel || "No address selected yet."}
              </p>
            </div>

            {locationError && (
              <div className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-700 flex align-center justify-between">
                <span>{locationError}</span>
                {locationError.includes("location") && (
                  <button onClick={handleUseCurrentLocation} className="text-amber-900 font-semibold underline">Retry</button>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ui-touch-target"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!hasSelection}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 ui-touch-target"
              >
                <MapPin className="h-4 w-4" />
                Use This Location
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

export default LocationPickerModal;
