import React from "react";

function CustomerSettingsPage() {
  return (
    <div className="bg-white/80 p-6 sm:p-8 rounded-xl shadow-sm border">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Settings</h3>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="border rounded-lg p-6 bg-white/60">
          <h4 className="font-semibold text-gray-900 mb-4">Notifications</h4>
          <p className="text-gray-600">Manage your notifications and privacy preferences here.</p>
        </div>
      </div>
    </div>
  );
}

export default CustomerSettingsPage;
