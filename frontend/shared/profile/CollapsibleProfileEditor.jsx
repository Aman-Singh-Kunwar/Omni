import React from "react";

function CollapsibleProfileEditor({
  title = "Edit Details",
  openButtonClass,
  isOpen,
  setIsOpen,
  status,
  children
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold ${openButtonClass}`}
        >
          {isOpen ? "Cancel" : "Open"}
        </button>
      </div>

      {!isOpen && status?.success && (
        <p className="mt-3 rounded bg-green-100 px-3 py-2 text-xs text-green-700">{status.success}</p>
      )}
      {!isOpen && status?.error && (
        <p className="mt-3 rounded bg-red-100 px-3 py-2 text-xs text-red-700">{status.error}</p>
      )}

      {isOpen && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  );
}

export default CollapsibleProfileEditor;
