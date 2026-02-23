const defaultLandingUrl = import.meta.env.PROD ? "https://omni-landing-page.onrender.com" : "http://localhost:5173";
const landingUrl = import.meta.env.VITE_LANDING_APP_URL || defaultLandingUrl;
const EMPTY_STATS = { totalWorkers: 0, totalEarnings: 0, activeBookings: 0, monthlyGrowth: 0 };

export { EMPTY_STATS, landingUrl };
