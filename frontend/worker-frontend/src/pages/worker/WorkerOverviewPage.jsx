import React from "react";
import { DollarSign, CheckCircle, Star, Clock } from "lucide-react";

function StatCard({ icon: Icon, title, value }) {
  return (
    <div className="bg-white/80 p-5 shadow-sm rounded-xl border">
      <div className="flex items-center">
        <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
          <Icon className="h-6 w-6 text-blue-600" />
        </div>
        <div className="ml-4 w-0 flex-1">
          <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
          <dd className="flex items-baseline">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
          </dd>
        </div>
      </div>
    </div>
  );
}

function WorkerOverviewPage({ stats, jobRequests, recentJobs, setActiveTab, handleJobAction, processingJobId, jobActionError }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} title="Total Earnings" value={`INR ${stats.totalEarnings.toLocaleString("en-IN")}`} />
        <StatCard icon={CheckCircle} title="Completed Jobs" value={stats.completedJobs} />
        <StatCard icon={Star} title="Average Rating" value={stats.averageRating} />
        <StatCard icon={Clock} title="Pending Requests" value={stats.pendingRequests} />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="bg-white/80 shadow-sm rounded-xl border">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-bold text-gray-900">New Job Requests</h3>
              <button onClick={() => setActiveTab("job-requests")} className="text-sm font-medium text-purple-600 hover:text-purple-800">
                View All
              </button>
            </div>
            <div className="space-y-3">
              {jobRequests.slice(0, 2).map((job) => (
                <div key={job.id} className="p-3 bg-gray-50/80 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{job.service}</p>
                      <p className="text-sm text-gray-500 mt-1">
                        {job.date} at {job.time}
                      </p>
                    </div>
                    <p className="text-sm font-bold text-gray-900">INR {job.amount.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <button
                      onClick={() => handleJobAction(job.id, "accept")}
                      disabled={processingJobId === job.id}
                      className="flex-1 px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 font-semibold disabled:opacity-60"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleJobAction(job.id, "reject")}
                      disabled={processingJobId === job.id}
                      className="flex-1 px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 font-semibold disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
              {jobRequests.length === 0 && <p className="text-sm text-gray-500">No pending job requests right now.</p>}
              {jobActionError && <p className="text-sm text-red-600">{jobActionError}</p>}
            </div>
          </div>
        </div>

        <div className="bg-white/80 shadow-sm rounded-xl border">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">Recent Completed Jobs</h3>
            <div className="space-y-3">
              {recentJobs.map((job) => (
                <div key={job.id} className="flex flex-col gap-3 rounded-lg bg-gray-50/80 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{job.customer}</p>
                    <p className="text-sm text-gray-500">{job.service}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-medium text-gray-900">INR {job.amount.toLocaleString("en-IN")}</p>
                    <div className="flex items-center justify-end text-sm text-gray-500">
                      <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                      <span>{job.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
              {recentJobs.length === 0 && <p className="text-sm text-gray-500">No completed jobs yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkerOverviewPage;
