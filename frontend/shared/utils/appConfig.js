const isProduction = import.meta.env.PROD;

const DEFAULT_URLS = {
  landing: isProduction ? "https://omni-landing-page.onrender.com" : "http://localhost:5173",
  customer: isProduction ? "https://omni-customer.onrender.com" : "http://localhost:5174",
  broker: isProduction ? "https://omni-broker.onrender.com" : "http://localhost:5175",
  worker: isProduction ? "https://omni-worker.onrender.com" : "http://localhost:5176",
  api: isProduction ? "https://omni-backend-4t7s.onrender.com/api" : "http://localhost:5000/api"
};

function getAppUrl(appName) {
  const envVar = `VITE_${appName.toUpperCase()}_APP_URL`;
  return import.meta.env[envVar] || DEFAULT_URLS[appName] || DEFAULT_URLS.landing;
}

function getApiUrl() {
  return import.meta.env.VITE_API_URL || DEFAULT_URLS.api;
}

function getCacheTtl() {
  return Number(import.meta.env.VITE_PAGE_CACHE_TTL_MS || 30000);
}

export const AppConfig = {
  urls: {
    landing: getAppUrl("landing"),
    customer: getAppUrl("customer"),
    broker: getAppUrl("broker"),
    worker: getAppUrl("worker"),
    api: getApiUrl()
  },

  features: {
    realtime: true,
    mapTracking: true,
    notifications: true
  },

  cache: {
    ttlMs: getCacheTtl()
  },

  env: {
    isDev: !isProduction,
    isProd: isProduction,
    nodeEnv: import.meta.env.MODE
  }
};

export default AppConfig;
