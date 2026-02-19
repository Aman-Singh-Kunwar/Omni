import React from "react";

function ToggleRow({ title, description, checked, onChange, accentClass }) {
  return (
    <div
      className={`group flex items-center justify-between gap-4 rounded-xl border p-4 cursor-pointer transition-all ${
        checked ? "border-gray-300 bg-white shadow-sm" : "border-gray-200 bg-white/80 hover:border-gray-300"
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-600 mt-1">{description}</p>
      </div>

      <div className="ml-3 shrink-0">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={title}
          onClick={onChange}
          className={`relative inline-flex items-center rounded-full border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${
            checked ? `${accentClass} border-transparent shadow-inner` : "bg-gray-300 border-gray-400"
          }`}
          style={{ width: "4rem", minWidth: "4rem", height: "2rem" }}
        >
          <span
            className="absolute inline-flex rounded-full border border-gray-300 bg-white shadow-sm transition-transform duration-200 ease-out"
            style={{
              width: "1.5rem",
              height: "1.5rem",
              left: "0.25rem",
              top: "50%",
              transform: `translate(${checked ? "2rem" : "0rem"}, -50%)`
            }}
          />
        </button>
      </div>
    </div>
  );
}

export default ToggleRow;
