import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, MapPin, MessageCircle, Navigation } from "lucide-react";
import CustomerLocationModal from "../../components/CustomerLocationModal";
import ChatModal from "@shared/components/ChatModal";

function WorkerSchedulePage({ scheduleJobs, authToken = "", userName = "" }) {
  const navigate = useNavigate();
  const [locationJob, setLocationJob] = useState(null);
  const [chatJob, setChatJob] = useState(null);

  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };

  return (
    <>
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
                    <p className="text-sm font-semibold text-gray-900 mt-1">INR {job.amount.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                    <span className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold bg-blue-100 text-blue-700 capitalize">
                      <Clock className="h-3.5 w-3.5" />
                      {job.status}
                    </span>
                    <div className="flex justify-between sm:flex-col sm:items-end gap-2 w-full sm:w-auto">
                      {(job.locationLat != null || !!job.location) && (
                        <button
                          type="button"
                          onClick={() => setLocationJob(job)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                        >
                          <Navigation className="h-3.5 w-3.5" />
                          View Customer Location
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setChatJob(job)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Chat
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {scheduleJobs.length === 0 && <p className="text-sm text-gray-500">No scheduled jobs yet.</p>}
          </div>
        </div>
      </div>

      <ChatModal
        open={chatJob != null}
        onClose={() => setChatJob(null)}
        bookingId={chatJob?.id}
        senderName={userName}
        senderRole="worker"
        counterpartName={chatJob?.customer}
        authToken={authToken}
        bookingStatus={chatJob?.status}
      />
      <CustomerLocationModal
        open={locationJob != null}
        onClose={() => setLocationJob(null)}
        booking={locationJob}
        authToken={authToken}
      />
    </>
  );
}

export default WorkerSchedulePage;
