import React from "react";
import { MapPin, Calendar } from "lucide-react";

function WorkerJobRequestsPage({ jobRequests, handleJobAction, processingJobId, jobActionError }) {
  return (
    <div className="bg-white/80 shadow-sm rounded-xl border">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-bold text-gray-900 mb-6">All Job Requests</h3>
        <div className="space-y-4">
          {jobRequests.map((job) => (
            <div key={job.id} className="border border-gray-200 rounded-lg p-4 bg-white/60">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{job.service}</h4>
                  <p className="text-sm text-gray-600 mt-1">Customer: {job.customer}</p>
                  <div className="flex items-center text-sm text-gray-500 mt-2">
                    <MapPin className="h-4 w-4 mr-1.5" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <Calendar className="h-4 w-4 mr-1.5" />
                    <span>
                      {job.date} at {job.time}
                    </span>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <p className="text-xl font-bold text-gray-900">INR {job.amount.toLocaleString("en-IN")}</p>
                  <div className="flex space-x-3 mt-3">
                    <button
                      onClick={() => handleJobAction(job.id, "accept")}
                      disabled={processingJobId === job.id}
                      className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 font-semibold transition-colors disabled:opacity-60"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleJobAction(job.id, "reject")}
                      disabled={processingJobId === job.id}
                      className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 font-semibold transition-colors disabled:opacity-60"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {jobRequests.length === 0 && <p className="text-sm text-gray-500">No job requests found.</p>}
          {jobActionError && <p className="text-sm text-red-600">{jobActionError}</p>}
        </div>
      </div>
    </div>
  );
}

export default WorkerJobRequestsPage;
