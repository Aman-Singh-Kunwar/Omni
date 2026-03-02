import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Search } from "lucide-react";
import omniLogo from "../assets/images/omni-logo.png";

function DetailsHeader({ searchQuery = "", onSearchChange, placeholder = "Search services..." }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <img src={omniLogo} alt="Omni logo" className="h-8 w-auto object-contain" />
          <span className="text-base font-semibold text-gray-900 sm:text-lg">Omni</span>
        </Link>

        <div className="mx-3 w-full max-w-xl sm:mx-8">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => onSearchChange?.(event.target.value)}
              placeholder={placeholder}
              className="w-full rounded-full bg-gray-100 py-2.5 pl-10 pr-4 text-sm text-gray-800 outline-none ring-2 ring-transparent transition focus:ring-indigo-500"
            />
          </label>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full p-2 transition-all duration-200 hover:bg-gray-100"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 text-gray-700 sm:h-5 sm:w-5" />
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="rounded-full p-2 transition-all duration-200 hover:bg-gray-100"
            aria-label="Go to home"
          >
            <Home className="h-4 w-4 text-gray-700 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

export default DetailsHeader;
