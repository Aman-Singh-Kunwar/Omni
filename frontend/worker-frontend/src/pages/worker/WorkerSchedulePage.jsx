import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Clock } from "lucide-react";

function WorkerSchedulePage({ scheduleJobs }) {
  const navigate = useNavigate();
  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  return (
    <div className="bg-white/80 shadow-sm rounded-xl border">
      <div className="px-4 py-5 sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h3 className="text-lg leading-6 font-bold text-gray-900">Scheduled Jobs</h3>
          <button
            type="button"
            onClick={handleBackClick}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 sm:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        <div className="space-y-4">
          {scheduleJobs.map((job) => (
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
                  <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 capitalize">
                    <Clock className="h-3.5 w-3.5" />
                    {job.status}
                  </span>
                  <p className="text-sm font-semibold text-gray-900 mt-2">INR {job.amount.toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>
          ))}
          {scheduleJobs.length === 0 && <p className="text-sm text-gray-500">No scheduled jobs yet.</p>}
        </div>
      </div>
    </div>
  );
}

export default WorkerSchedulePage;
