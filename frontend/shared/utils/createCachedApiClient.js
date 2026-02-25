import axios from "axios";

const CACHE_PREFIX = "omni:api-cache:v1";
const MAX_CACHE_ENTRIES = 200;

function hashString(value) {
  const input = String(value || "");
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.sessionStorage;
  } catch (_error) {
    return null;
  }
}

function normalizeHeaders(headers = {}) {
  if (!headers || typeof headers !== "object") {
    return {};
  }
  return Object.fromEntries(
    Object.entries(headers).filter(([key, value]) => typeof key === "string" && value !== undefined)
  );
}

function buildCacheKey(config = {}) {
  const method = String(config.method || "get").toUpperCase();
  const baseURL = String(config.baseURL || "");
  const url = String(config.url || "");
  const paramsSignature = stableStringify(config.params || {});
  const authHeader = String(config.headers?.Authorization || config.headers?.authorization || "");
  const identitySignature = authHeader ? hashString(authHeader) : "public";

  return `${CACHE_PREFIX}:${method}:${hashString(`${baseURL}${url}`)}:${hashString(paramsSignature)}:${identitySignature}`;
}

export function createCachedApiClient(apiBase, options = {}) {
  const defaultCacheTtlMs = Number(options.defaultCacheTtlMs || 30000);
  const memoryCache = new Map();
  // Track every storage key we write so clearAllCache never has to iterate
  // all of sessionStorage — O(m cache entries) instead of O(n total storage).
  const storageKeySet = new Set();
  const storage = getStorage();
  const api = axios.create({
    baseURL: apiBase,
    timeout: 60000
  });
  const fallbackAdapter = axios.getAdapter(api.defaults.adapter || axios.defaults.adapter);

  const pruneMemoryCache = () => {
    while (memoryCache.size > MAX_CACHE_ENTRIES) {
      const oldestKey = memoryCache.keys().next().value;
      if (!oldestKey) {
        break;
      }
      memoryCache.delete(oldestKey);
    }
  };

  const readEntry = (cacheKey) => {
    const now = Date.now();
    const inMemory = memoryCache.get(cacheKey);
    if (inMemory && inMemory.expiresAt > now) {
      return inMemory;
    }
    if (inMemory) {
      memoryCache.delete(cacheKey);
    }

    if (!storage) {
      return null;
    }

    try {
      const raw = storage.getItem(cacheKey);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw);
      if (!parsed || Number(parsed.expiresAt || 0) <= now) {
        storage.removeItem(cacheKey);
        return null;
      }
      memoryCache.set(cacheKey, parsed);
      pruneMemoryCache();
      return parsed;
    } catch (_error) {
      return null;
    }
  };

  const writeEntry = (cacheKey, response, ttlMs) => {
    const ttl = Number(ttlMs);
    if (!Number.isFinite(ttl) || ttl <= 0) {
      return;
    }

    const payload = {
      expiresAt: Date.now() + ttl,
      status: Number(response.status || 200),
      statusText: String(response.statusText || "OK"),
      headers: normalizeHeaders(response.headers),
      data: response.data
    };

    memoryCache.set(cacheKey, payload);
    pruneMemoryCache();

    if (!storage) {
      return;
    }

    try {
      storage.setItem(cacheKey, JSON.stringify(payload));
      storageKeySet.add(cacheKey);
    } catch (_error) {
      // Ignore storage quota or private mode failures.
    }
  };

  const clearAllCache = () => {
    memoryCache.clear();
    if (!storage) {
      return;
    }
    storageKeySet.forEach((key) => {
      try {
        storage.removeItem(key);
      } catch (_error) {
        // Ignore storage removal failures.
      }
    });
    storageKeySet.clear();
  };

  api.defaults.adapter = async (config) => {
    const method = String(config?.method || "get").toLowerCase();
    const allowCache = method === "get" && config?.cache !== false;
    const cacheTtlMs = Number(config?.cacheTtlMs ?? defaultCacheTtlMs);

    if (allowCache && Number.isFinite(cacheTtlMs) && cacheTtlMs > 0) {
      const cacheKey = buildCacheKey(config);
      const cachedEntry = readEntry(cacheKey);
      if (cachedEntry) {
        return {
          config,
          data: cachedEntry.data,
          headers: { ...cachedEntry.headers, "x-omni-cache": "HIT" },
          status: cachedEntry.status,
          statusText: cachedEntry.statusText,
          request: null
        };
      }

      const response = await fallbackAdapter(config);
      if (response?.status >= 200 && response?.status < 300) {
        writeEntry(cacheKey, response, cacheTtlMs);
      }
      return response;
    }

    return fallbackAdapter(config);
  };

  api.interceptors.response.use(
    (response) => {
      const method = String(response.config?.method || "get").toLowerCase();
      if (method !== "get" && method !== "head" && Number(response.status || 0) < 400) {
        clearAllCache();
      }
      return response;
    },
    (error) => Promise.reject(error)
  );

  api.clearApiCache = clearAllCache;

  return api;
}

export default createCachedApiClient;
