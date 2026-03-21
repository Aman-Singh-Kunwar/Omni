import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Download } from "lucide-react";
import api from "../../api";
import { useAutoDismissValue } from "@shared/hooks/useAutoDismissNotice";

function formatDateForUi(value) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  return parsed.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit"
  });
}

function formatDateTimeForCsv(value) {
  if (!value) {
    return "";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }
  const datePart = parsed.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const timePart = parsed.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  return `${datePart} ${timePart}`;
}

function escapeCsvValue(value) {
  const normalized = String(value ?? "");
  const escaped = normalized.replace(/"/g, '""');
  return `"${escaped}"`;
}

function toExcelTextCell(value) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return "";
  }
  return `="${normalized.replace(/"/g, '""')}"`;
}

function BrokerBookingsPage({ authToken, refreshSignal = 0 }) {
  const navigate = useNavigate();
  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [brokerCode, setBrokerCode] = useState("");
  const [bookings, setBookings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  useAutoDismissValue(error, () => setError(""));

  const filteredBookings = useMemo(() => {
    if (!searchQuery.trim()) return bookings;
    const q = searchQuery.toLowerCase();
    return bookings.filter((b) =>
      (b.customerName || "").toLowerCase().includes(q) ||
      (b.workerName || "").toLowerCase().includes(q) ||
      (b.service || "").toLowerCase().includes(q) ||
      (b.date || "").toLowerCase().includes(q)
    );
  }, [bookings, searchQuery]);

  const handleExportCSV = () => {
    if (filteredBookings.length === 0) return;

    const normalizedBrokerCode = String(brokerCode || "").trim().toUpperCase();
    const exportRows = normalizedBrokerCode
      ? filteredBookings.filter((booking) => String(booking.brokerCode || "").trim().toUpperCase() === normalizedBrokerCode)
      : filteredBookings;

    if (exportRows.length === 0) {
      setError("No bookings available for your broker code in current filter.");
      return;
    }

    const headers = [
      "Booking ID",
      "Customer",
      "Worker",
      "Service",
      "Status",
      "Scheduled At",
      "Completed At",
      "Amount (INR)",
      "Broker Commission (INR)",
      "Broker Code"
    ];

    const rows = exportRows.map((booking) => {
      const scheduledDate = booking.date || formatDateForUi(booking.createdAt) || "";
      const scheduledTime = booking.time || "";
      const scheduledAt = [scheduledDate, scheduledTime].filter(Boolean).join(" ");
      return [
        escapeCsvValue(booking.id || ""),
        escapeCsvValue(booking.customerName || ""),
        escapeCsvValue(booking.workerName || ""),
        escapeCsvValue(booking.service || ""),
        escapeCsvValue(booking.status || ""),
        toExcelTextCell(scheduledAt),
        toExcelTextCell(formatDateTimeForCsv(booking.completedAt)),
        Number(booking.amount || 0).toFixed(2),
        Number(booking.brokerCommission || 0).toFixed(2),
        escapeCsvValue(normalizedBrokerCode || booking.brokerCode || "")
      ];
    });

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([`\uFEFF${csvContent}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `broker_payouts_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const loadBookings = async () => {
      if (!authToken) {
        setBrokerCode("");
        setBookings([]);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await api.get("/broker/bookings", {
          headers: { Authorization: `Bearer ${authToken}` },
          cache: false
        });
        setBrokerCode(response.data?.brokerCode || "");
        setBookings(Array.isArray(response.data?.bookings) ? response.data.bookings : []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load bookings.");
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [authToken, refreshSignal]);

  if (!authToken) {
    return (
      <div className="bg-white/80 shadow-sm rounded-xl border">
        <div className="px-4 py-8 sm:p-10">
          <h3 className="text-lg leading-6 font-bold text-gray-900 mb-2">Bookings History</h3>
          <p className="text-gray-600">Login as broker to view completed booking history of your linked workers.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/80 shadow-sm rounded-xl border px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg leading-6 font-bold text-gray-900">Completed Bookings History</h3>
          <button
            type="button"
            onClick={handleBackClick}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 sm:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Showing only completed jobs from workers linked via your broker code
          {brokerCode ? <span className="font-semibold uppercase tracking-widest"> {brokerCode}</span> : ""}.
        </p>
      </div>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-gray-600">Loading bookings...</p>}

      {!loading && bookings.length === 0 && (
        <div className="bg-white/80 shadow-sm rounded-xl border px-4 py-8 sm:p-10">
          <p className="text-gray-600">No completed bookings found yet.</p>
        </div>
      )}

      {!loading && bookings.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search bookings by customer, worker, service or date..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>
            <button
              onClick={handleExportCSV}
              disabled={filteredBookings.length === 0}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-2 text-sm font-semibold text-emerald-800 shadow-sm transition hover:from-emerald-100 hover:to-teal-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {`Export CSV (${filteredBookings.length})`}
            </button>
          </div>
          
          <div className="overflow-hidden rounded-xl border bg-white/80 shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50/80">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Worker</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Service</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date & Time</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Your 5%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white/50">
                  {filteredBookings.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-sm text-gray-500">
                        No bookings match your search.
                      </td>
                    </tr>
                  ) : (
                    filteredBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="px-4 py-3 text-sm text-gray-800">{booking.customerName}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">{booking.workerName}</td>
                        <td className="px-4 py-3 text-sm text-gray-800">{booking.service}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {booking.date || "-"} {booking.time ? `| ${booking.time}` : ""}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          INR {Number(booking.amount || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-emerald-700">
                          INR {Number(booking.brokerCommission || 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BrokerBookingsPage;
