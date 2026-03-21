import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, CheckCircle2, Calendar } from "lucide-react";
import api from "../../api";
import { useAutoDismissValue } from "@shared/hooks/useAutoDismissNotice";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

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

function BrokerEarningsPage({ authToken, stats, refreshSignal = 0 }) {
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
  const [completedBookings, setCompletedBookings] = useState([]);
  const [timeframe, setTimeframe] = useState("daily");
  useAutoDismissValue(error, () => setError(""));

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
          headers: { Authorization: `Bearer ${authToken}` },
          cache: false
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
  }, [authToken, refreshSignal]);

  const chartData = useMemo(() => {
    if (!completedBookings?.length) return [];
    
    const parsedData = completedBookings.map(b => {
      const dateStr = b.date || b.createdAt || new Date().toISOString();
      const d = new Date(dateStr);
      return { 
        date: Number.isNaN(d.getTime()) ? new Date() : d, 
        val: Number(b.brokerCommission || 0) 
      };
    });

    const totals = {};
    parsedData.forEach(item => {
      const d = item.date;
      let key = "";
      if (timeframe === "daily") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else if (timeframe === "weekly") {
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.getFullYear(), d.getMonth(), diff);
        key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
      } else if (timeframe === "monthly") {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
      } else if (timeframe === "yearly") {
        key = `${d.getFullYear()}-01-01`;
      }
      if (!totals[key]) totals[key] = 0;
      totals[key] += item.val;
    });

    const keys = Object.keys(totals);
    if (keys.length === 0) return [];
    
    let minDate, maxDate;
    const timestamps = keys.map(k => {
      const [y, m, d] = k.split('-');
      return new Date(y, m - 1, d).getTime();
    });
    
    minDate = new Date(Math.min(...timestamps));
    maxDate = new Date(Math.max(...timestamps));

    const finalData = [];

    if (timeframe === "daily") {
      if (keys.length === 1 || minDate.getTime() === maxDate.getTime()) {
        minDate.setDate(minDate.getDate() - 4);
        maxDate.setDate(maxDate.getDate() + 4);
      } else {
        minDate.setDate(minDate.getDate() - 1);
        maxDate.setDate(maxDate.getDate() + 1);
      }
      for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        finalData.push({
          name: d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
          commissions: totals[key] || 0,
          sortKey: d.getTime()
        });
      }
    } else if (timeframe === "weekly") {
      if (keys.length === 1 || minDate.getTime() === maxDate.getTime()) {
        minDate.setDate(minDate.getDate() - 7);
        maxDate.setDate(maxDate.getDate() + 7);
      } else {
        minDate.setDate(minDate.getDate() - 7);
        maxDate.setDate(maxDate.getDate() + 7);
      }
      for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 7)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        finalData.push({
          name: `${d.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`,
          commissions: totals[key] || 0,
          sortKey: d.getTime()
        });
      }
    } else if (timeframe === "monthly") {
      if (keys.length === 1 || minDate.getTime() === maxDate.getTime()) {
        minDate.setMonth(minDate.getMonth() - 2);
        maxDate.setMonth(maxDate.getMonth() + 2);
      } else {
        minDate.setMonth(minDate.getMonth() - 1);
        maxDate.setMonth(maxDate.getMonth() + 1);
      }
      minDate.setDate(1); maxDate.setDate(1);
      for (let d = new Date(minDate); d <= maxDate; d.setMonth(d.getMonth() + 1)) {
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        finalData.push({
          name: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
          commissions: totals[key] || 0,
          sortKey: d.getTime()
        });
      }
    } else if (timeframe === "yearly") {
      if (keys.length === 1 || minDate.getTime() === maxDate.getTime()) {
        minDate.setFullYear(minDate.getFullYear() - 1);
        maxDate.setFullYear(maxDate.getFullYear() + 1);
      } else {
        minDate.setFullYear(minDate.getFullYear() - 1);
        maxDate.setFullYear(maxDate.getFullYear() + 1);
      }
      for (let d = new Date(minDate); d <= maxDate; d.setFullYear(d.getFullYear() + 1)) {
        const key = `${d.getFullYear()}-01-01`;
        finalData.push({
          name: String(d.getFullYear()),
          commissions: totals[key] || 0,
          sortKey: d.getTime()
        });
      }
    }

    return finalData;
  }, [completedBookings, timeframe]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-gray-900">Earnings</h3>
        <button
          type="button"
          onClick={handleBackClick}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 sm:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
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
        <div className="mb-6 flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-gray-900">Commission Trend</h3>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="rounded-md border-gray-300 text-sm focus:border-emerald-500 focus:ring-emerald-500 bg-white"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
        <div className="h-64 w-full overflow-x-auto custom-scrollbar">
          {chartData.length > 0 ? (
            <div style={{ minWidth: timeframe === "daily" ? `${Math.max(chartData.length * 60, 600)}px` : "100%", height: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
                  <Tooltip cursor={{ fill: "#F3F4F6" }} contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Bar dataKey="commissions" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">No trend data available.</div>
          )}
        </div>
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
