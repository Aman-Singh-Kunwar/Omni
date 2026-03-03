/**
 * Shared Loading Screen Component
 * Used during route transitions and app initialization
 */

export function LoadingScreen({ message = "Loading...", appName = "Omni" }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="flex flex-col items-center gap-4">
        {/* Animated spinner with logo */}
        <div className="relative h-16 w-16">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
          <img 
            src="/omni-logo.png" 
            alt={appName} 
            className="absolute inset-0 m-auto h-9 w-9 rounded-full object-contain" 
          />
        </div>

        {/* Loading message */}
        <div className="text-center">
          <p className="text-sm font-medium text-slate-600">{message}</p>
          <p className="mt-1 text-xs text-slate-400">{appName}</p>
        </div>

        {/* Loading dots for visual feedback */}
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default LoadingScreen;
