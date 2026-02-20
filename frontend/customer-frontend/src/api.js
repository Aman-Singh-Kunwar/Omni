import { createCachedApiClient } from "@shared/utils/createCachedApiClient";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const cacheTtlMs = Number(import.meta.env.VITE_PAGE_CACHE_TTL_MS || 30000);

const api = createCachedApiClient(apiBase, { defaultCacheTtlMs: cacheTtlMs });

export default api;
