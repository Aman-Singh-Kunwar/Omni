import React, { useEffect, useState } from "react";
import api from "../../api";

function BrokerWorkersPage({ authToken, refreshSignal = 0 }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [brokerCode, setBrokerCode] = useState("");
  const [workers, setWorkers] = useState([]);

  useEffect(() => {
    const loadWorkers = async () => {
      if (!authToken) {
        setBrokerCode("");
        setWorkers([]);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const response = await api.get("/broker/workers", {
          headers: { Authorization: `Bearer ${authToken}` },
          cache: false
        });
        setBrokerCode(response.data?.brokerCode || "");
        setWorkers(Array.isArray(response.data?.workers) ? response.data.workers : []);
      } catch (requestError) {
        setError(requestError.response?.data?.message || "Unable to load workers.");
        setWorkers([]);
      } finally {
        setLoading(false);
      }
    };

    loadWorkers();
  }, [authToken, refreshSignal]);

  if (!authToken) {
    return (
      <div className="bg-white/80 shadow-sm rounded-xl border">
        <div className="px-4 py-8 sm:p-10">
          <h3 className="text-lg leading-6 font-bold text-gray-900 mb-2">Workers</h3>
          <p className="text-gray-600">Login as broker to view workers linked to your broker code.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/80 shadow-sm rounded-xl border px-4 py-5 sm:px-6">
        <h3 className="text-lg leading-6 font-bold text-gray-900">Linked Workers</h3>
        <p className="mt-1 text-sm text-gray-600">
          Showing workers who used your broker code
          {brokerCode ? <span className="font-semibold uppercase tracking-widest"> {brokerCode}</span> : ""}.
        </p>
      </div>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-gray-600">Loading workers...</p>}

      {!loading && workers.length === 0 && (
        <div className="bg-white/80 shadow-sm rounded-xl border px-4 py-8 sm:p-10">
          <p className="text-gray-600">No workers have linked your broker code yet.</p>
        </div>
      )}

      {!loading && workers.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {workers.map((worker) => (
            <div key={worker.id} className="bg-white/80 shadow-sm rounded-xl border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-gray-900">{worker.name}</p>
                  <p className="text-sm text-gray-600">{worker.email || "No email"}</p>
                  <p className="text-sm text-gray-600">{worker.phone || "No phone"}</p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-semibold ${
                    worker.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {worker.isAvailable ? "Available" : "Unavailable"}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-md bg-gray-50 px-3 py-2">
                  <p className="text-gray-500">Total Jobs</p>
                  <p className="font-semibold text-gray-900">{worker.totalJobs || 0}</p>
                </div>
                <div className="rounded-md bg-gray-50 px-3 py-2">
                  <p className="text-gray-500">Completed</p>
                  <p className="font-semibold text-gray-900">{worker.completedJobs || 0}</p>
                </div>
                <div className="rounded-md bg-gray-50 px-3 py-2">
                  <p className="text-gray-500">Avg Rating</p>
                  <p className="font-semibold text-gray-900">{Number(worker.averageRating || 0)}</p>
                </div>
                <div className="rounded-md bg-gray-50 px-3 py-2">
                  <p className="text-gray-500">Your Earnings</p>
                  <p className="font-semibold text-emerald-700">
                    INR {Number(worker.totalBrokerCommission || 0).toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm text-gray-600">
                Services: {Array.isArray(worker.servicesProvided) && worker.servicesProvided.length ? worker.servicesProvided.join(", ") : "N/A"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BrokerWorkersPage;
