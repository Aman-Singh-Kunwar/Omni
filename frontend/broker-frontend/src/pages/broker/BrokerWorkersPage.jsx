import React, { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Copy, Share2, X, Search, Filter } from "lucide-react";
import api from "../../api";
import { useAutoDismissValue } from "@shared/hooks/useAutoDismissNotice";

function toAvatarUrl(name) {
  const encodedName = encodeURIComponent(String(name || "Worker"));
  return `https://ui-avatars.com/api/?name=${encodedName}&background=065f46&color=ffffff&size=240`;
}

function BrokerWorkersPage({ authToken, refreshSignal = 0, stats = {}, onViewWorkerProfile }) {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [workers, setWorkers] = useState([]);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("idle");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'inactive'
  const [commissionRange, setCommissionRange] = useState("all"); // 'all', '0-500', '500-2000', '2000+'
  const [sortByJoin, setSortByJoin] = useState("newest"); // 'newest', 'oldest'

  useAutoDismissValue(error, () => setError(""));

  const totalWorkers = workers.length || Number(stats.totalWorkers || 0);
  const activeBookings = Number(stats.activeBookings || 0);
  const totalCommissions = Number(stats.totalEarnings || 0);

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

  const handleShareModalOpen = () => {
    setCopyStatus("idle");
    setShareModalOpen(true);
  };

  const handleCopyCode = async () => {
    if (!brokerCode) {
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(brokerCode);
      } else {
        const input = document.createElement("input");
        input.value = brokerCode;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch (_error) {
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 2200);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search || "");
    const chatbotAction = String(params.get("chatbotAction") || "").trim().toLowerCase();
    if (!chatbotAction) return;

    if (chatbotAction === "share") {
      handleShareModalOpen();
      navigate("/workers", { replace: true });
      return;
    }

    if (chatbotAction === "copy") {
      if (!brokerCode) return;
      handleShareModalOpen();
      void handleCopyCode();
      navigate("/workers", { replace: true });
    }
  }, [brokerCode, location.search, navigate]);

  const filteredWorkers = useMemo(() => {
    let result = [...workers];
    
    // Quick search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(w => 
        (w.name || "").toLowerCase().includes(q) || 
        (w.email || "").toLowerCase().includes(q) ||
        (w.phone || "").toLowerCase().includes(q) ||
        (Array.isArray(w.servicesProvided) && w.servicesProvided.join(" ").toLowerCase().includes(q))
      );
    }
    
    // Status filter
    if (statusFilter === "active") result = result.filter(w => w.isAvailable);
    if (statusFilter === "inactive") result = result.filter(w => !w.isAvailable);
    
    // Commission range filter
    if (commissionRange !== "all") {
      result = result.filter(w => {
        const comm = Number(w.totalBrokerCommission || 0);
        if (commissionRange === "0-500") return comm >= 0 && comm <= 500;
        if (commissionRange === "500-2000") return comm > 500 && comm <= 2000;
        if (commissionRange === "2000+") return comm > 2000;
        return true;
      });
    }

    // Join date sort (fallback to ID if date not present)
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt || a._id || null).getTime();
      const dateB = new Date(b.createdAt || b._id || null).getTime();
      if (sortByJoin === "newest") return dateB - dateA;
      return dateA - dateB;
    });

    return result;
  }, [workers, searchQuery, statusFilter, commissionRange, sortByJoin]);

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
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg leading-6 font-bold text-gray-900">Linked Workers</h3>
            <p className="mt-1 text-sm text-gray-600">
              Showing workers who used your broker code
              {brokerCode ? <span className="font-semibold uppercase tracking-widest"> {brokerCode}</span> : ""}.
            </p>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={handleShareModalOpen}
              disabled={!brokerCode}
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-4 sm:hidden">
            <button
              type="button"
              onClick={handleBackClick}
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={handleShareModalOpen}
              disabled={!brokerCode}
              className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share
            </button>
          </div>
        </div>
      </div>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {loading && <p className="text-sm text-gray-600">Loading workers...</p>}

      {!loading && workers.length === 0 && (
        <div className="bg-white/80 shadow-sm rounded-xl border px-4 py-8 sm:p-10">
          <p className="text-gray-600">No workers have linked your broker code yet.</p>
        </div>
      )}

      {!loading && workers.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search worker by name, email, phone or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-sm border-gray-300 rounded-md focus:ring-emerald-500 bg-white min-w-[120px]"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={commissionRange}
                onChange={(e) => setCommissionRange(e.target.value)}
                className="text-sm border-gray-300 rounded-md focus:ring-emerald-500 bg-white min-w-[140px]"
              >
                <option value="all">Any Commission</option>
                <option value="0-500">₹0 - ₹500</option>
                <option value="500-2000">₹500 - ₹2,000</option>
                <option value="2000+">₹2,000+</option>
              </select>
              <select
                value={sortByJoin}
                onChange={(e) => setSortByJoin(e.target.value)}
                className="text-sm border-gray-300 rounded-md focus:ring-emerald-500 bg-white min-w-[130px]"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
          </div>
          
          {filteredWorkers.length === 0 ? (
            <div className="bg-white shadow-sm border rounded-xl py-10 px-4 text-center text-gray-500 text-sm">
              <p>No workers match the current filters.</p>
              <button 
                type="button" 
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("all");
                  setCommissionRange("all");
                  setSortByJoin("newest");
                }}
                className="mt-2 text-emerald-600 hover:text-emerald-800 font-medium text-xs"
              >
                Clear all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredWorkers.map((worker) => (
                <div key={worker.id} className="bg-white/80 shadow-sm rounded-xl border p-5">
                  <div className="flex items-start gap-4">
                <img
                  src={worker.photoUrl || toAvatarUrl(worker.name)}
                  alt={worker.name}
                  className="h-16 w-16 rounded-full border-2 border-emerald-100 bg-gray-100 object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onViewWorkerProfile?.(worker)}
                        className="text-left text-base font-semibold text-gray-900 hover:text-emerald-700 truncate block"
                      >
                        {worker.name}
                      </button>
                      <p className="text-sm text-gray-600 truncate">{worker.email || "No email"}</p>
                      <p className="text-sm text-gray-600">{worker.phone || "No phone"}</p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap ${worker.isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"
                        }`}
                    >
                      {worker.isAvailable ? "Available" : "Unavailable"}
                    </span>
                  </div>
                </div>
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
              <button
                type="button"
                onClick={() => onViewWorkerProfile?.(worker)}
                className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                View Job Profile
              </button>
            </div>
          ))}
        </div>
        )}
        </div>
      )}

      {shareModalOpen && (
        <div className="fixed inset-0 z-50 !m-0 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm" onClick={() => setShareModalOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-bold text-slate-900">Share Broker Code</h4>
                <p className="mt-1 text-xs text-slate-600">Send this to workers so they can join your broker network.</p>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Close share popup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Broker Code</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold tracking-[0.2em] text-slate-900">
                    {brokerCode || "N/A"}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    disabled={!brokerCode}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Copy broker code"
                  >
                    {copyStatus === "copied" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                {copyStatus === "copied" && <p className="mt-2 text-xs font-medium text-emerald-700">Code copied to clipboard.</p>}
                {copyStatus === "error" && <p className="mt-2 text-xs font-medium text-red-700">Unable to copy right now.</p>}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Workers</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{totalWorkers}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Active Jobs</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{activeBookings}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Commission</p>
                  <p className="mt-1 text-sm font-bold text-emerald-700">INR {totalCommissions.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Rules</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
                  <li>Workers must enter this code during signup to link with your network.</li>
                  <li>Commission is credited when eligible linked-worker bookings are completed.</li>
                  <li>Share this code only with trusted workers.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BrokerWorkersPage;
