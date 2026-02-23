import { useEffect } from "react";

function hasNotice(value) {
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  return Boolean(value);
}

function useAutoDismissStatus(status, setStatus, options = {}) {
  const keys = Array.isArray(options.keys) && options.keys.length ? options.keys : ["error", "success", "info"];
  const delayMs = Number.isFinite(Number(options.delayMs)) ? Number(options.delayMs) : 5000;
  const keySignature = keys.join("|");

  useEffect(() => {
    if (!status || typeof status !== "object" || typeof setStatus !== "function") {
      return;
    }
    if (status.loading) {
      return;
    }

    const shouldDismiss = keys.some((key) => hasNotice(status[key]));
    if (!shouldDismiss) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setStatus((prev) => {
        if (!prev || typeof prev !== "object") {
          return prev;
        }

        let changed = false;
        const next = { ...prev };
        keys.forEach((key) => {
          if (typeof next[key] === "string" && next[key].trim()) {
            next[key] = "";
            changed = true;
          }
        });

        return changed ? next : prev;
      });
    }, delayMs);

    return () => window.clearTimeout(timerId);
  }, [status, setStatus, delayMs, keySignature]);
}

function useAutoDismissValue(value, clearValue, delayMs = 5000) {
  useEffect(() => {
    if (!hasNotice(value) || typeof clearValue !== "function") {
      return;
    }

    const timerId = window.setTimeout(() => {
      clearValue();
    }, delayMs);

    return () => window.clearTimeout(timerId);
  }, [value, clearValue, delayMs]);
}

export { useAutoDismissStatus, useAutoDismissValue };
