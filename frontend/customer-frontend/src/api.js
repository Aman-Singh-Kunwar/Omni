import { createCachedApiClient } from "@shared/utils/createCachedApiClient";

const defaultApiBase = import.meta.env.PROD ? "https://omni-backend-4t7s.onrender.com/api" : "http://localhost:5000/api";
const apiBase = import.meta.env.VITE_API_URL || defaultApiBase;
const cacheTtlMs = Number(import.meta.env.VITE_PAGE_CACHE_TTL_MS || 30000);

const api = createCachedApiClient(apiBase, { defaultCacheTtlMs: cacheTtlMs });

export default api;
