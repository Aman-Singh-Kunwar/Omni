import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, DollarSign, Star } from "lucide-react";

function StatCard({ icon: Icon, title, value }) {
  return (
    <div className="rounded-xl border bg-white/80 p-5 shadow-sm">
      <div className="flex items-center">
        <div className="rounded-lg bg-purple-100 p-3">
          <Icon className="h-6 w-6 text-purple-700" />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function WorkerEarningsPage({ stats, recentJobs }) {
  const navigate = useNavigate();
  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

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
        <StatCard icon={DollarSign} title="Total Earnings" value={`INR ${Number(stats.totalEarnings || 0).toLocaleString("en-IN")}`} />
        <StatCard icon={CheckCircle2} title="Completed Jobs" value={Number(stats.completedJobs || 0)} />
        <StatCard icon={Star} title="Average Rating" value={Number(stats.averageRating || 0)} />
      </div>

      <div className="rounded-xl border bg-white/80 p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Recent Paid Jobs</h3>
        <div className="space-y-3">
          {recentJobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between rounded-lg border bg-white/70 p-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">{job.service}</p>
                <p className="text-sm text-gray-500">Customer: {job.customer}</p>
                {Number(job.brokerCommissionAmount || 0) > 0 && (
                  <p className="text-xs text-gray-500">Broker commission: INR {Number(job.brokerCommissionAmount).toLocaleString("en-IN")}</p>
                )}
              </div>
              <p className="text-sm font-bold text-emerald-700">+ INR {Number(job.amount || 0).toLocaleString("en-IN")}</p>
            </div>
          ))}
          {recentJobs.length === 0 && <p className="text-sm text-gray-500">No paid jobs yet.</p>}
        </div>
      </div>
    </div>
  );
}

export default WorkerEarningsPage;
