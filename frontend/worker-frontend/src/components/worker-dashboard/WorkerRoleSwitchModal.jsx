import React from "react";
import { Briefcase, User } from "lucide-react";

function WorkerRoleSwitchModal({ open, status, onRoleSwitch, onClose }) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto backdrop-blur-md p-4 ui-modal-overlay ui-touch-scroll sm:items-center">
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full ui-modal-surface">
        <h3 className="text-2xl font-bold text-gray-900 mb-2 text-center">Switch Role</h3>
        <p className="text-gray-600 text-center mb-6">Choose the role you want to switch to</p>

        <div className="space-y-4">
          <button
            onClick={() => onRoleSwitch("customer")}
            disabled={status.loading}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left ui-touch-target"
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Switch to Customer</h4>
                <p className="text-sm text-gray-600">Find and book services</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onRoleSwitch("broker")}
            disabled={status.loading}
            className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left ui-touch-target"
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Switch to Broker</h4>
                <p className="text-sm text-gray-600">Manage network of professionals</p>
              </div>
            </div>
          </button>
        </div>

        {status.error && <p className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{status.error}</p>}

        <div className="mt-6">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold ui-touch-target"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkerRoleSwitchModal;
