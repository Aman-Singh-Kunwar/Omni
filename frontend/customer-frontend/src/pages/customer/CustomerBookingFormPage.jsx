import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import LocationPickerModal from "../../components/LocationPickerModal";

function toAvatarUrl(name) {
  const encodedName = encodeURIComponent(String(name || "Worker"));
  return `https://ui-avatars.com/api/?name=${encodedName}&background=e5e7eb&color=374151&size=128`;
}

function parseTimeParts(timeValue) {
  const raw = String(timeValue || "").trim();
  if (!raw) {
    return { meridiem: "", hour: "", minute: "" };
  }

  const twelveHourMatch = raw.match(/^(\d{1,2}):(\d{1,2})\s*(AM|PM)$/i);
  if (twelveHourMatch) {
    const hour = String(Number(twelveHourMatch[1]));
    const minute = String(Number(twelveHourMatch[2]));
    const meridiem = String(twelveHourMatch[3] || "").toUpperCase();
    const safeHour = Number(hour) >= 1 && Number(hour) <= 12 ? hour : "";
    const safeMinute = Number(minute) >= 0 && Number(minute) <= 59 ? minute : "";
    const safeMeridiem = meridiem === "AM" || meridiem === "PM" ? meridiem : "";
    return { meridiem: safeMeridiem, hour: safeHour, minute: safeMinute };
  }

  const twentyFourHourMatch = raw.match(/^(\d{2}):(\d{2})$/);
  if (twentyFourHourMatch) {
    const hour24 = Number(twentyFourHourMatch[1]);
    const minute = Number(twentyFourHourMatch[2]);
    if (!Number.isFinite(hour24) || !Number.isFinite(minute)) {
      return { meridiem: "", hour: "", minute: "" };
    }
    const meridiem = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    const safeMinute = minute >= 0 && minute <= 59 ? String(minute) : "";
    return { meridiem, hour: String(hour12), minute: safeMinute };
  }

  return { meridiem: "", hour: "", minute: "" };
}

function CustomerBookingFormPage({
  bookingSource,
  selectedService,
  selectedPlanName,
  selectedAddOnNames,
  selectedOfferTitle,
  selectedOfferDiscount = 0,
  selectedWorkerDetails,
  selectedWorkerServices,
  workersForSelectedService,
  bookingForm,
  setBookingForm,
  bookingStatus,
  canSubmitBooking,
  handleBookService,
  onServiceChange,
  onBack,
  formatInr,
  discountPercent = 5
}) {
  if (bookingSource === "service" && !selectedService) {
    return (
      <div className="rounded-xl border bg-white/80 p-6 shadow-sm">
        <h3 className="text-2xl font-bold text-gray-900">Book Service</h3>
        <p className="mt-2 text-gray-600">Select a service from dashboard or available workers to continue.</p>
        <button
          type="button"
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    );
  }
  const selectedServicePrice = Number(selectedService?.price || 0);
  const appliedOfferDiscount = bookingSource === "service" ? Math.max(0, Number(selectedOfferDiscount || 0)) : 0;
  const priceBeforeOffer = selectedServicePrice > 0 ? selectedServicePrice + appliedOfferDiscount : 0;
  const isDiscountApplied = bookingForm.applyDiscount !== false;
  const platformDiscountAmount =
    isDiscountApplied && selectedServicePrice > 0 ? Math.round(selectedServicePrice * (discountPercent / 100)) : 0;
  const finalBookingAmount = selectedServicePrice > 0 ? Math.max(0, selectedServicePrice - platformDiscountAmount) : 0;
  const normalizedAddOnNames = Array.isArray(selectedAddOnNames)
    ? selectedAddOnNames.map((item) => String(item || "").trim()).filter(Boolean)
    : [];
  const [timeParts, setTimeParts] = useState(() => parseTimeParts(bookingForm.time));
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [draftSaved, setDraftSaved] = useState(false);
  const [recentLocations, setRecentLocations] = useState([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [autocompleteCache, setAutocompleteCache] = useState({});
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const hourOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1)), []);
  const minuteOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i)), []);
  
  // Load recent locations on mount
  useEffect(() => {
    const stored = localStorage.getItem('recentBookingLocations');
    if (stored) {
      try {
        setRecentLocations(JSON.parse(stored).slice(0, 5));
      } catch { }
    }
    // Load autocomplete cache
    const cachedAutocomplete = localStorage.getItem('locationAutocompleteCache');
    if (cachedAutocomplete) {
      try {
        setAutocompleteCache(JSON.parse(cachedAutocomplete));
      } catch { }
    }
  }, []);
  
  // Save location to recent when selected
  const saveLocToRecent = (location) => {
    if (!location) return;
    const stored = JSON.parse(localStorage.getItem('recentBookingLocations') || '[]');
    const filtered = stored.filter(l => l !== location);
    const updated = [location, ...filtered].slice(0, 5);
    localStorage.setItem('recentBookingLocations', JSON.stringify(updated));
    setRecentLocations(updated);
  };
  
  // Get time options for today (disable past times)
  const getAvailableHours = () => {
    const isToday = bookingForm.date === new Date().toISOString().split('T')[0];
    if (!isToday) return hourOptions;
    const currentHour = new Date().getHours() % 12 || 12;
    return hourOptions.filter(h => Number(h) >= currentHour);
  };
  
  // Clear all form
  const handleClearForm = () => {
    setBookingForm({
      date: '', time: '', location: '', locationLat: '', locationLng: '', 
      service: '', description: '', applyDiscount: true
    });
    setTimeParts({ meridiem: "", hour: "", minute: "" });
    setFormErrors({});
    setShowClearConfirm(false);
  };
  
  // Quick time chip options
  const getQuickTimeChips = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeekend = new Date(now);
    while (nextWeekend.getDay() !== 6 && nextWeekend.getDay() !== 0) {
      nextWeekend.setDate(nextWeekend.getDate() + 1);
    }
    return [
      { label: "Now +1h", date: now.toISOString().split("T")[0], time: `${(now.getHours() % 12 || 12)}:${String(now.getMinutes()).padStart(2, "0")} ${now.getHours() >= 12 ? "PM" : "AM"}` },
      { label: "Tomorrow 9am", date: tomorrow.toISOString().split("T")[0], time: "9:00 AM" },
      { label: "This Weekend", date: nextWeekend.toISOString().split("T")[0], time: "10:00 AM" }
    ];
  };
  
  // Validation logic
  const validateForm = () => {
    const errors = {};
    if (!bookingForm.date) errors.date = "Date is required";
    if (!bookingForm.time) errors.time = "Time is required";
    if (!bookingForm.location || !bookingForm.locationLat) errors.location = "Location is required";
    if (bookingSource === "worker" && !bookingForm.service) errors.service = "Service selection is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Debounced autocomplete search with caching
  useEffect(() => {
    if (!bookingForm.location || bookingForm.location.length < 2) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }
    
    const query = bookingForm.location.toLowerCase();
    // Check cache first
    if (autocompleteCache[query]) {
      setAutocompleteResults(autocompleteCache[query]);
      setShowAutocomplete(true);
      return;
    }
    
    // Simulate API call with debounce
    const timer = setTimeout(async () => {
      setAutocompleteLoading(true);
      try {
        // Mock autocomplete results (in real app, call geocoding API)
        const results = [
          bookingForm.location + ", New Delhi",
          bookingForm.location + ", Mumbai",
          bookingForm.location + ", Bangalore",
        ].filter(r => r.toLowerCase().includes(query));
        
        // Update cache
        const newCache = { ...autocompleteCache, [query]: results };
        setAutocompleteCache(newCache);
        localStorage.setItem('locationAutocompleteCache', JSON.stringify(newCache));
        
        setAutocompleteResults(results);
        setShowAutocomplete(true);
      } finally {
        setAutocompleteLoading(false);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [bookingForm.location, autocompleteCache]);
  
  // Draft persistence
  useEffect(() => {
    const draftKey = `booking_draft_${bookingSource}_${selectedService?.id || selectedWorkerDetails?.id}`;
    localStorage.setItem(draftKey, JSON.stringify(bookingForm));
    setDraftSaved(true);
    const timer = setTimeout(() => setDraftSaved(false), 2000);
    return () => clearTimeout(timer);
  }, [bookingForm, bookingSource, selectedService?.id, selectedWorkerDetails?.id]);
  
  // Keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        handleBookService?.();
      }
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [handleBookService]);
  const locationPickerInitialPosition = useMemo(() => {
    const rawLat = bookingForm.locationLat;
    const rawLng = bookingForm.locationLng;
    if (rawLat === "" || rawLat === null || rawLat === undefined || rawLng === "" || rawLng === null || rawLng === undefined) {
      return null;
    }
    const lat = Number(rawLat);
    const lng = Number(rawLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return { lat, lng };
  }, [bookingForm.locationLat, bookingForm.locationLng]);

  useEffect(() => {
    const parsed = parseTimeParts(bookingForm.time);
    setTimeParts((prev) => {
      if (prev.meridiem === parsed.meridiem && prev.hour === parsed.hour && prev.minute === parsed.minute) {
        return prev;
      }
      return parsed;
    });
  }, [bookingForm.time]);

  const updateTimePart = (nextPatch) => {
    const next = { ...timeParts, ...nextPatch };
    setTimeParts(next);

    if (next.meridiem && next.hour && next.minute) {
      const minutePadded = String(Number(next.minute)).padStart(2, "0");
      setBookingForm((prev) => ({ ...prev, time: `${next.hour}:${minutePadded} ${next.meridiem}` }));
      return;
    }

    setBookingForm((prev) => ({ ...prev, time: "" }));
  };

  return (
    <div className="rounded-xl border bg-white/80 p-6 sm:p-8 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">{bookingSource === "service" ? `Book ${selectedService.name}` : "Book Worker"}</h3>
          <p className="text-gray-600">
            {bookingSource === "service"
              ? "Worker will be assigned automatically from available workers."
              : "Review worker details and choose one of their services."}
          </p>
            <div className="mt-4 max-w-2xl rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment Receipt</p>
                  <p className="mt-1 text-sm text-gray-600">Review amount before booking.</p>
                  {bookingSource === "service" && (
                    <div className="mt-2 space-y-1 text-xs text-gray-700">
                      {selectedPlanName && <p>+ Plan: {selectedPlanName}</p>}
                      {normalizedAddOnNames.length > 0 ? (
                        <p>+ Add-ons: {normalizedAddOnNames.join(", ")}</p>
                      ) : (
                        <p>+ No add-ons selected</p>
                      )}
                      {selectedOfferTitle && (
                        <p className="text-indigo-700">
                          + Offer: {selectedOfferTitle}
                          {appliedOfferDiscount > 0 ? ` (-${formatInr(appliedOfferDiscount)})` : ""}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                  <input
                  type="checkbox"
                  checked={isDiscountApplied}
                  onChange={(event) => setBookingForm((prev) => ({ ...prev, applyDiscount: event.target.checked }))}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Apply {discountPercent}% discount
              </label>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              {bookingSource === "service" && appliedOfferDiscount > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-gray-600">Price before offer</p>
                  <p className="font-semibold text-gray-900">
                    {priceBeforeOffer > 0 ? formatInr(priceBeforeOffer) : "Select service first"}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <p className="text-gray-600">{bookingSource === "service" ? "Amount after offer" : "Total amount"}</p>
                <p className="font-semibold text-gray-900">
                  {selectedServicePrice > 0 ? formatInr(selectedServicePrice) : "Select service first"}
                </p>
              </div>
              {bookingSource === "service" && selectedOfferTitle && (
                <div className="flex items-center justify-between gap-4">
                  <p className="text-gray-600">Offer discount</p>
                  <p className="font-semibold text-indigo-700">
                    {appliedOfferDiscount > 0 ? `- ${formatInr(appliedOfferDiscount)}` : "Applied"}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between gap-4">
                <p className="text-gray-600">Platform discount</p>
                <p className={`font-semibold ${isDiscountApplied ? "text-green-700" : "text-gray-500"}`}>
                  {selectedServicePrice > 0
                    ? isDiscountApplied
                      ? `- ${formatInr(platformDiscountAmount)} (${discountPercent}% off)`
                      : "Not applied"
                    : "Select service first"}
                </p>
              </div>
              <div className="border-t border-gray-200 pt-2">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-gray-800">Booking amount</p>
                  <p className="text-lg font-bold text-blue-700">
                    {selectedServicePrice > 0 ? formatInr(finalBookingAmount) : "Select service first"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="space-y-4">
        {bookingSource === "service" ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
            {workersForSelectedService.length
              ? `${workersForSelectedService.length} workers are available for this service.`
              : "No worker is currently available for this service."}
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <div className="flex items-center gap-3">
                <img
                  src={selectedWorkerDetails?.photoUrl || toAvatarUrl(selectedWorkerDetails?.name)}
                  alt={selectedWorkerDetails?.name || "Worker"}
                  className="h-12 w-12 rounded-full border border-gray-200 bg-white object-cover"
                />
                <div>
                  <p className="font-semibold text-gray-900">{selectedWorkerDetails?.name || "Worker not found"}</p>
                  {selectedWorkerDetails?.phone && <p>Phone: {selectedWorkerDetails.phone}</p>}
                  {selectedWorkerDetails?.email && <p>Email: {selectedWorkerDetails.email}</p>}
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Choose Service <span className="text-red-500">*</span>
              </label>
              <select
                value={bookingForm.service || ""}
                onChange={(event) => onServiceChange(event.target.value)}
                className={`w-full rounded-lg border px-3 py-2 ${formErrors.service ? "border-red-400 bg-red-50" : "border-gray-300"}`}
              >
                <option value="">Choose service</option>
                {selectedWorkerServices.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
              {formErrors.service && <p className="mt-1 text-xs text-red-600">● {formErrors.service}</p>}
              {!selectedWorkerServices.length && <p className="mt-1 text-xs text-red-600">This worker has no listed services right now.</p>}
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Preferred Date <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={bookingForm.date}
            onChange={(event) => {
              setFormErrors(prev => ({ ...prev, date: "" }));
              setBookingForm((prev) => ({ ...prev, date: event.target.value }));
            }}
            className={`w-full rounded-lg border px-3 py-2 ${formErrors.date ? "border-red-400 bg-red-50" : "border-gray-300"}`}
            min={new Date().toISOString().split("T")[0]}
          />
          {formErrors.date && <p className="mt-1 text-xs text-red-600">● {formErrors.date}</p>}
          <p className="mt-1 text-xs text-gray-500">Past dates are unavailable</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Preferred Time <span className="text-red-500">*</span>
          </label>
          <div className="mb-3 flex flex-wrap gap-2">
            {getQuickTimeChips().map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  setBookingForm(prev => ({ ...prev, date: chip.date, time: chip.time }));
                  setFormErrors(prev => ({ ...prev, date: "", time: "" }));
                }}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
              >
                {chip.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              value={timeParts.hour}
              onChange={(event) => {
                setFormErrors(prev => ({ ...prev, time: "" }));
                updateTimePart({ hour: event.target.value });
              }}
              className={`w-full rounded-lg border px-3 py-2 ${formErrors.time ? "border-red-400 bg-red-50" : "border-gray-300"}`}
            >
              <option value="">Hour</option>
              {hourOptions.map((hour) => (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
            <select
              value={timeParts.minute}
              onChange={(event) => {
                setFormErrors(prev => ({ ...prev, time: "" }));
                updateTimePart({ minute: event.target.value });
              }}
              className={`w-full rounded-lg border px-3 py-2 ${formErrors.time ? "border-red-400 bg-red-50" : "border-gray-300"}`}
            >
              <option value="">Minute</option>
              {minuteOptions.map((minute) => (
                <option key={minute} value={minute}>
                  {String(Number(minute)).padStart(2, "0")}
                </option>
              ))}
            </select>
            <select
              value={timeParts.meridiem}
              onChange={(event) => {
                setFormErrors(prev => ({ ...prev, time: "" }));
                updateTimePart({ meridiem: event.target.value });
              }}
              className={`w-full rounded-lg border px-3 py-2 ${formErrors.time ? "border-red-400 bg-red-50" : "border-gray-300"}`}
            >
              <option value="">AM/PM</option>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
          {formErrors.time && <p className="mt-1 text-xs text-red-600">● {formErrors.time}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Location <span className="text-red-500">*</span>
          </label>
          {recentLocations.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {recentLocations.map((loc, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setBookingForm(prev => ({ ...prev, location: loc }));
                    saveLocToRecent(loc);
                    setShowAutocomplete(false);
                  }}
                  className="rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs hover:bg-gray-100"
                >
                  {loc.substring(0, 20)}…
                </button>
              ))}
            </div>
          )}
          <div className="relative flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <input
                type="text"
                value={bookingForm.location}
                onChange={(event) => {
                  setBookingForm((prev) => ({
                    ...prev,
                    location: event.target.value,
                    locationLat: "",
                    locationLng: ""
                  }));
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setShowAutocomplete(false);
                    if (bookingForm.location) saveLocToRecent(bookingForm.location);
                  }, 200);
                }}
                onFocus={() => bookingForm.location.length >= 2 && setShowAutocomplete(true)}
                className={`w-full rounded-lg border px-3 py-2 ${formErrors.location ? "border-red-400 bg-red-50" : "border-gray-300"}`}
                placeholder="Enter location or select from map"
              />
              {showAutocomplete && autocompleteResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg z-10">
                  {autocompleteLoading && (
                    <div className="px-3 py-2 text-xs text-gray-500">Searching...</div>
                  )}
                  {autocompleteResults.map((result, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setBookingForm(prev => ({ ...prev, location: result }));
                        setShowAutocomplete(false);
                        saveLocToRecent(result);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      {result}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setLocationPickerOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
            >
              <MapPin className="h-4 w-4" />
              Map
            </button>
          </div>
          {formErrors.location && <p className="mt-1 text-xs text-red-600">● {formErrors.location}</p>}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea
            rows={3}
            value={bookingForm.description}
            onChange={(event) => setBookingForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Describe your requirements..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
        </div>

        {bookingStatus.error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{bookingStatus.error}</p>}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        {showClearConfirm ? (
          <div className="flex-1 flex gap-2">
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 text-sm"
            >
              Keep Form
            </button>
            <button
              type="button"
              onClick={handleClearForm}
              className="flex-1 rounded-lg bg-red-100 px-4 py-2.5 font-medium text-red-700 hover:bg-red-200 text-sm"
            >
              Clear All
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            className="rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50"
          >
            Clear Form
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            if (validateForm()) {
              handleBookService?.();
            }
          }}
          disabled={bookingStatus.loading || !canSubmitBooking}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {bookingStatus.loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />}
          {bookingStatus.loading ? "Booking..." : bookingSource === "worker" ? "Book Worker" : "Book Service"}
        </button>
      </div>
      
      {draftSaved && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
          ✓ Booking draft auto-saved
        </div>
      )}

      <LocationPickerModal
        open={locationPickerOpen}
        initialLabel={bookingForm.location}
        initialPosition={locationPickerInitialPosition}
        initialSearchText={locationPickerInitialPosition ? "" : bookingForm.location}
        onClose={() => setLocationPickerOpen(false)}
        onConfirm={({ location, lat, lng }) => {
          setBookingForm((prev) => ({
            ...prev,
            location,
            locationLat: lat,
            locationLng: lng
          }));
          setLocationPickerOpen(false);
        }}
      />
    </div>
  );
}

export default CustomerBookingFormPage;
