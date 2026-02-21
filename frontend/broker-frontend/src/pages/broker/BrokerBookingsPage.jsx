import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../../api";

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
                {bookings.map((booking) => (
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default BrokerBookingsPage;
