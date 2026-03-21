import React from "react";

/**
 * Skeleton Loader Components - Reusable loading placeholders
 * for different content types (cards, lists, profiles, etc.)
 */

export function SkeletonCard({ className = "" }) {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white animate-pulse p-4 space-y-4 ${className}`}>
      {/* Image skeleton */}
      <div className="w-full h-40 bg-gray-200 rounded-lg" />

      {/* Content skeleton */}
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>

      {/* Button skeleton */}
      <div className="h-10 bg-gray-200 rounded-lg" />
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="animate-pulse flex gap-4 p-4 border border-gray-200 rounded-lg">
          <div className="h-12 w-12 bg-gray-200 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/4" />
            <div className="h-3 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonProfile() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Cover/Avatar */}
      <div className="h-32 bg-gray-200 rounded-lg" />

      {/* Name and details */}
      <div className="space-y-3 px-4">
        <div className="h-6 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
      </div>

      {/* action buttons */}
      <div className="flex gap-2 px-4">
        <div className="flex-1 h-10 bg-gray-200 rounded" />
        <div className="flex-1 h-10 bg-gray-200 rounded" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-2 animate-pulse">
      {/* Header */}
      <div className="flex gap-3 p-3 border-b border-gray-200">
        {[...Array(columns)].map((_, i) => (
          <div key={i} className="flex-1 h-4 bg-gray-200 rounded" />
        ))}
      </div>

      {/* Rows */}
      {[...Array(rows)].map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-3 p-3 border-b border-gray-100">
          {[...Array(columns)].map((_, colIdx) => (
            <div
              key={colIdx}
              className={`h-4 bg-gray-200 rounded ${
                colIdx === 0 ? "flex-1" : `flex-1`
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChatMessage() {
  return (
    <div className="space-y-4 p-4">
      {/* Message 1 - other user */}
      <div className="flex justify-start animate-pulse">
        <div className="max-w-xs">
          <div className="h-10 bg-gray-200 rounded-2xl rounded-bl-none" />
        </div>
      </div>

      {/* Message 2 - current user */}
      <div className="flex justify-end animate-pulse">
        <div className="max-w-xs">
          <div className="h-10 bg-blue-200 rounded-2xl rounded-br-none" />
        </div>
      </div>

      {/* Message 3 - other user */}
      <div className="flex justify-start animate-pulse">
        <div className="max-w-xs">
          <div className="h-16 bg-gray-200 rounded-2xl rounded-bl-none" />
        </div>
      </div>
    </div>
  );
}

/**
 * Progress Bar Component - Visual progress indicator
 */
export function ProgressBar({
  percentage = 0,
  variant = "primary", // primary, success, warning, error
  label = "",
  showLabel = false,
  animated = true,
  striped = false,
}) {
  const variants = {
    primary: "bg-blue-600",
    success: "bg-green-600",
    warning: "bg-amber-600",
    error: "bg-red-600",
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        {label && <p className="text-sm font-medium text-gray-700">{label}</p>}
        {showLabel && (
          <p className="text-sm font-semibold text-gray-200">{percentage}%</p>
        )}
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${variants[variant]} transition-all duration-300 ${
            striped ? "bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[size:1rem] animate-pulse" : ""
          } ${animated ? "animate-pulse" : ""}`}
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Circular Progress Component - Donut/radial progress
 */
export function CircularProgress({
  percentage = 0,
  size = "md", // sm, md, lg
  variant = "primary",
  label = "",
  animated = true,
}) {
  const sizes = {
    sm: { outer: 60, inner: 50, strokeWidth: 4 },
    md: { outer: 100, inner: 85, strokeWidth: 5 },
    lg: { outer: 140, inner: 120, strokeWidth: 6 },
  };

  const size_config = sizes[size];
  const circumference = 2 * Math.PI * (size_config.inner / 2);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const colors = {
    primary: "#2563eb",
    success: "#16a34a",
    warning: "#d97706",
    error: "#dc2626",
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size_config.outer, height: size_config.outer }}>
        <svg
          width={size_config.outer}
          height={size_config.outer}
          className={animated ? "animate-spin" : ""}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Background circle */}
          <circle
            cx={size_config.outer / 2}
            cy={size_config.outer / 2}
            r={size_config.inner / 2}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={size_config.strokeWidth}
          />

          {/* Progress circle */}
          <circle
            cx={size_config.outer / 2}
            cy={size_config.outer / 2}
            r={size_config.inner / 2}
            fill="none"
            stroke={colors[variant]}
            strokeWidth={size_config.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.5s ease" }}
          />
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{percentage}%</p>
            {label && <p className="text-xs text-gray-600">{label}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Linear Progress Component - Indeterminate loading bar
 */
export function LinearProgress({ variant = "primary" }) {
  const variants = {
    primary: "bg-blue-600",
    success: "bg-green-600",
    warning: "bg-amber-600",
    error: "bg-red-600",
  };

  return (
    <div className="w-full h-1 bg-gray-200 overflow-hidden rounded-full">
      <div
        className={`${variants[variant]} h-full animate-pulse`}
        style={{
          animation: "indeterminate 2s infinite",
          backgroundImage: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), rgba(255,255,255,0.5), transparent)`,
          backgroundSize: "200px 100%",
        }}
      />
      <style>{`
        @keyframes indeterminate {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}

/**
 * Pulse Component - Gentle pulsing animation for emphasis
 */
export function Pulse({ children, delay = 0 }) {
  return (
    <div
      className="animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * LoadingSpinner Component - Centered spinner with optional message
 */
export function LoadingSpinner({
  size = "md", // sm, md, lg
  message = "",
  fullScreen = false,
}) {
  const sizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const spinner = (
    <div className="flex flex-col items-center gap-4">
      {/* Animated spinner */}
      <div className="relative">
        <div className={`${sizes[size]} rounded-full border-2 border-gray-200 border-t-blue-600 animate-spin`} />
      </div>
      {message && <p className="text-sm text-gray-600">{message}</p>}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 z-50">
        {spinner}
      </div>
    );
  }

  return spinner;
}

/**
 * Skeleton Pulse Styles - CSS animations for skeleton components
 */
export const skeletonStyles = `
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.7;
    }
  }

  .animate-pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;
