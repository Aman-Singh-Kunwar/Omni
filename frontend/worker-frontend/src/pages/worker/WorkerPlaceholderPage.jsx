import React from "react";

function WorkerPlaceholderPage({ title }) {
  return (
    <div className="bg-white/80 shadow-sm rounded-xl border">
      <div className="px-4 py-8 sm:p-10 text-center">
        <h3 className="text-lg leading-6 font-bold text-gray-900 mb-4 capitalize">{title} Management</h3>
        <p className="text-gray-600">Full {title} management functionality will be implemented here.</p>
      </div>
    </div>
  );
}

export default WorkerPlaceholderPage;
