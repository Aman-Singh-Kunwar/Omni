const LEVEL_WEIGHT = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const METHOD_BY_LEVEL = {
  debug: "log",
  info: "log",
  warn: "warn",
  error: "error"
};

function getActiveLevel() {
  const configuredLevel = String(process.env.LOG_LEVEL || "info").toLowerCase();
  return LEVEL_WEIGHT[configuredLevel] ? configuredLevel : "info";
}

function shouldLog(level) {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[getActiveLevel()];
}

function safeMeta(meta = {}) {
  try {
    return Object.keys(meta).length ? JSON.stringify(meta) : "";
  } catch (_error) {
    return JSON.stringify({ note: "Unable to stringify log metadata." });
  }
}

const emittedKeys = new Set();

function write(level, message, meta = {}, options = {}) {
  if (!shouldLog(level)) {
    return;
  }

  const onceKey = options.onceKey ? `${level}:${options.onceKey}` : "";
  if (onceKey && emittedKeys.has(onceKey)) {
    return;
  }

  const payload = safeMeta(meta);
  const line = payload ? `[${level.toUpperCase()}] ${message} ${payload}` : `[${level.toUpperCase()}] ${message}`;
  const method = METHOD_BY_LEVEL[level] || "log";
  console[method](line);

  if (onceKey) {
    emittedKeys.add(onceKey);
  }
}

const logger = {
  debug(message, meta) {
    write("debug", message, meta);
  },
  info(message, meta) {
    write("info", message, meta);
  },
  warn(message, meta) {
    write("warn", message, meta);
  },
  error(message, meta) {
    write("error", message, meta);
  },
  infoOnce(key, message, meta) {
    write("info", message, meta, { onceKey: key });
  },
  warnOnce(key, message, meta) {
    write("warn", message, meta, { onceKey: key });
  },
  errorOnce(key, message, meta) {
    write("error", message, meta, { onceKey: key });
  }
};

export default logger;
