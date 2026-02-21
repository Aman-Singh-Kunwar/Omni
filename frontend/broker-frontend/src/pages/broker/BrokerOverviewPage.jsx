import React from "react";
import { Users, Calendar, Star, DollarSign } from "lucide-react";

function StatCard({ icon: Icon, title, value }) {
  return (
    <div className="bg-white/80 p-5 shadow-sm rounded-xl border">
      <div className="flex items-center">
        <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
          <Icon className="h-6 w-6 text-green-600" />
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

function BrokerOverviewPage({ stats, topWorkers }) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard icon={Users} title="Total Workers" value={stats.totalWorkers} />
        <StatCard icon={Calendar} title="Active Bookings" value={stats.activeBookings} />
        <StatCard icon={DollarSign} title="Broker Earnings" value={`INR ${Number(stats.totalEarnings || 0).toLocaleString("en-IN")}`} />
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white/80 shadow-sm rounded-xl border">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4">Top Performing Workers</h3>
            <div className="space-y-3">
              {topWorkers.map((worker) => (
                <div key={worker.id} className="flex items-start justify-between gap-3 rounded-lg bg-gray-50/80 p-3">
                  <div className="flex min-w-0 flex-1 items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">{worker.name.charAt(0)}</span>
                    </div>
                    <div className="ml-3 min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">{worker.name}</p>
                      <p className="truncate text-sm text-gray-500">{worker.service}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-emerald-700">
                      INR {Number(worker.brokerCommission || 0).toLocaleString("en-IN")}
                    </p>
                    <p className="flex items-center justify-end text-sm font-medium text-gray-900">
                      <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" /> {worker.rating}
                    </p>
                    <p className="whitespace-nowrap text-sm text-gray-500">{worker.jobs} jobs</p>
                  </div>
                </div>
              ))}
              {topWorkers.length === 0 && <p className="text-sm text-gray-500">No workers available yet.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BrokerOverviewPage;
