const defaultLandingUrl = import.meta.env.PROD ? "https://omni-landing-page.onrender.com" : "http://localhost:5173";
const landingUrl = import.meta.env.VITE_LANDING_APP_URL || defaultLandingUrl;

export { landingUrl };
