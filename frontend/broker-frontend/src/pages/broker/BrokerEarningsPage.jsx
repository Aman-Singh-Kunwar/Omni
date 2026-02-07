import React, { useEffect, useState } from "react";
import { DollarSign, CheckCircle2, Calendar } from "lucide-react";
import api from "../../api";

function StatCard({ icon: Icon, title, value }) {
  return (
    <div className="rounded-xl border bg-white/80 p-5 shadow-sm">
      <div className="flex items-center">
        <div className="rounded-lg bg-emerald-100 p-3">
          <Icon className="h-6 w-6 text-emerald-700" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function BrokerEarningsPage({ authToken, stats }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [completedBookings, setCompletedBookings] = useState([]);

  useEffect(() => {
    const loadCompletedBookings = async () => {
      if (!authToken) {
        setCompletedBookings([]);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await api.get("/broker/bookings", {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        setCompletedBookings(Array.isArray(response.data?.bookings) ? response.data.bookings : []);
      } catch (requestError) {
        setCompletedBookings([]);
        setError(requestError.response?.data?.message || "Unable to load completed commission history.");
      } finally {
        setLoading(false);
      }
    };

    loadCompletedBookings();
  }, [authToken]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={DollarSign}
          title="Total Broker Earnings"
          value={`INR ${Number(stats?.totalEarnings || 0).toLocaleString("en-IN")}`}
        />
        <StatCard icon={CheckCircle2} title="Completed Services" value={completedBookings.length} />
        <StatCard icon={Calendar} title="Active Bookings" value={Number(stats?.activeBookings || 0)} />
      </div>

      <div className="rounded-xl border bg-white/80 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Recent Commission Credits (5%)</h3>
        {error && <p className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {loading && <p className="mb-3 text-sm text-gray-600">Loading commission history...</p>}
        <div className="space-y-3">
          {completedBookings.map((booking) => (
            <div key={booking.id} className="flex items-center justify-between rounded-lg border bg-white/70 p-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{booking.service}</p>
                <p className="text-sm text-gray-500">
                  Worker: {booking.workerName || "Worker"} | Customer: {booking.customerName || "Customer"}
                </p>
              </div>
              <p className="text-sm font-bold text-emerald-700">+ INR {Number(booking.brokerCommission || 0).toLocaleString("en-IN")}</p>
            </div>
          ))}
          {!loading && completedBookings.length === 0 && <p className="text-sm text-gray-500">No commission credits yet.</p>}
        </div>
      </div>
    </div>
  );
}

export default BrokerEarningsPage;
