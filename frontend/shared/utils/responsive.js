/**
 * Responsive utilities for mobile-first design
 * Helps with consistent breakpoint usage across the application
 */

/**
 * Breakpoints for responsive design
 * Mobile-first approach: define base styles for mobile, then add media queries
 */
export const BREAKPOINTS = {
  xs: 0,      // Extra small (phones, < 480px)
  sm: 480,    // Small (landscape phones, >= 480px)
  md: 768,    // Medium (tablets, >= 768px)
  lg: 1024,   // Large (desktops, >= 1024px)
  xl: 1280,   // Extra large (large desktops, >= 1280px)
  "2xl": 1536 // 2X large (very large desktops, >= 1536px)
};

/**
 * Responsive utility hook for checking screen size
 * Usage: const isMobile = useBreakpoint('md')
 */
export function useBreakpoint(breakpoint) {
  const [isBreakpoint, setIsBreakpoint] = React.useState(false);

  React.useEffect(() => {
    const width = BREAKPOINTS[breakpoint];
    const mediaQuery = window.matchMedia(`(min-width: ${width}px)`);

    const handleChange = (e) => setIsBreakpoint(e.matches);
    setIsBreakpoint(mediaQuery.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [breakpoint]);

  return isBreakpoint;
}

/**
 * Get Tailwind classes for responsive grid
 * Usage: <div className={getResponsiveGridClass(1, 2, 3, 4)}>
 * Will be 1 col on mobile, 2 on tablets, 3 on desktop, 4 on large screens
 */
export function getResponsiveGridClass(xs = 1, sm = 2, md = 3, lg = 4, xl = 4) {
  const cols = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6"
  };

  return [
    cols[xs],
    `sm:${cols[sm]}`,
    `md:${cols[md]}`,
    `lg:${cols[lg]}`,
    `xl:${cols[xl]}`
  ].join(" ");
}

/**
 * Responsive padding utilities
 * Usage: <div className={getResponsivePadding('4', '6', '8')}>
 * Mobile: p-4, Tablet: md:p-6, Desktop: lg:p-8
 */
export function getResponsivePadding(mobile = "4", tablet = "6", desktop = "8") {
  return `p-${mobile} md:p-${tablet} lg:p-${desktop}`;
}

/**
 * Responsive gap utilities for flex/grid
 * Usage: <div className={`flex gap-${getResponsiveGap(2, 3, 4)}`}>
 */
export function getResponsiveGap(mobile = 2, tablet = 3, desktop = 4) {
  return `gap-${mobile} md:gap-${tablet} lg:gap-${desktop}`;
}

/**
 * Common responsive patterns
 */
export const ResponsivePatterns = {
  containerMax: "w-full max-w-screen-xl mx-auto",

  heroImage: "w-full h-auto md:h-96 lg:h-screen",

  buttonSmall: "px-3 py-2 text-sm md:px-4 md:py-2.5",
  buttonBase: "px-4 py-2.5 text-base md:px-6 md:py-3",
  buttonLarge: "px-6 py-3 text-lg md:px-8 md:py-4",

  headingLarge: "text-2xl md:text-3xl lg:text-4xl",
  headingMedium: "text-xl md:text-2xl lg:text-3xl",
  headingSmall: "text-lg md:text-xl lg:text-2xl",
  bodyText: "text-sm md:text-base lg:text-lg",
  smallText: "text-xs md:text-sm lg:text-base",

  stackSmall: "space-y-2 md:space-y-3 lg:space-y-4",
  stackMedium: "space-y-4 md:space-y-6 lg:space-y-8",
  stackLarge: "space-y-6 md:space-y-8 lg:space-y-12",

  twoColumn: "grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8",

  threeColumn: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8",

  touchTarget: "p-2 md:p-3",

  safeArea: "px-4 sm:px-6 md:px-8 lg:px-12"
};

export default {
  BREAKPOINTS,
  useBreakpoint,
  getResponsiveGridClass,
  getResponsivePadding,
  getResponsiveGap,
  ResponsivePatterns
};
