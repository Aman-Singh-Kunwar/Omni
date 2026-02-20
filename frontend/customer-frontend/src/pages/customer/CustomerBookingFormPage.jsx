import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";

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
  formatInr
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
  const discountPercent = 5;
  const isDiscountApplied = bookingForm.applyDiscount !== false;
  const discountAmount =
    isDiscountApplied && selectedServicePrice > 0 ? Math.round(selectedServicePrice * (discountPercent / 100)) : 0;
  const finalBookingAmount = selectedServicePrice > 0 ? Math.max(0, selectedServicePrice - discountAmount) : 0;
  const [timeParts, setTimeParts] = useState(() => parseTimeParts(bookingForm.time));
  const hourOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => String(i + 1)), []);
  const minuteOptions = useMemo(() => Array.from({ length: 60 }, (_, i) => String(i)), []);

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
              <div className="flex items-center justify-between gap-4">
                <p className="text-gray-600">Total amount</p>
                <p className="font-semibold text-gray-900">
                  {selectedServicePrice > 0 ? formatInr(selectedServicePrice) : "Select service first"}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4">
                <p className="text-gray-600">Discount</p>
                <p className={`font-semibold ${isDiscountApplied ? "text-green-700" : "text-gray-500"}`}>
                  {selectedServicePrice > 0
                    ? isDiscountApplied
                      ? `- ${formatInr(discountAmount)} (${discountPercent}% off)`
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
              <p className="font-semibold text-gray-900">{selectedWorkerDetails?.name || "Worker not found"}</p>
              {selectedWorkerDetails?.phone && <p>Phone: {selectedWorkerDetails.phone}</p>}
              {selectedWorkerDetails?.email && <p>Email: {selectedWorkerDetails.email}</p>}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Choose Service</label>
              <select
                value={bookingForm.service || ""}
                onChange={(event) => onServiceChange(event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                <option value="">Choose service</option>
                {selectedWorkerServices.map((service) => (
                  <option key={service} value={service}>
                    {service}
                  </option>
                ))}
              </select>
              {!selectedWorkerServices.length && <p className="mt-1 text-xs text-red-600">This worker has no listed services right now.</p>}
            </div>
          </>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Preferred Date</label>
          <input
            type="date"
            value={bookingForm.date}
            onChange={(event) => setBookingForm((prev) => ({ ...prev, date: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
            min={new Date().toISOString().split("T")[0]}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Preferred Time</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <select
              value={timeParts.hour}
              onChange={(event) => updateTimePart({ hour: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
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
              onChange={(event) => updateTimePart({ minute: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
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
              onChange={(event) => updateTimePart({ meridiem: event.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2"
            >
              <option value="">AM/PM</option>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Location</label>
          <input
            type="text"
            value={bookingForm.location}
            onChange={(event) => setBookingForm((prev) => ({ ...prev, location: event.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2"
          />
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
        <button
          type="button"
          onClick={handleBookService}
          disabled={bookingStatus.loading || !canSubmitBooking}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {bookingStatus.loading ? "Booking..." : bookingSource === "worker" ? "Book Worker" : "Book Service"}
        </button>
      </div>
    </div>
  );
}

export default CustomerBookingFormPage;
