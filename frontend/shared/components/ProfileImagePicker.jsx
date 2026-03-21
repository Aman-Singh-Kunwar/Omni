import React, { useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, Trash2, Upload, X, RotateCw } from "lucide-react";

const PREVIEW_SIZE = 220;
const OUTPUT_SIZE = 360;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 350 * 1024;

function toInitials(name) {
  return String(name || "")
    .split(/\s+/)
    .map((chunk) => chunk[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });
}

function estimateDataUrlBytes(dataUrl = "") {
  const base64Part = String(dataUrl || "").split(",")[1] || "";
  const normalized = base64Part.replace(/\s+/g, "");
  if (!normalized) {
    return 0;
  }
  const padding = normalized.endsWith("==") ? 2 : normalized.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - padding);
}

function loadImageMeta(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight, image });
    image.onerror = () => reject(new Error("Unable to process image."));
    image.src = src;
  });
}

function ProfileImagePicker({ value = "", displayName = "", disabled = false, progress = undefined, progressColorTheme = "blue", onChange }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editorState, setEditorState] = useState({
    open: false,
    src: "",
    width: 0,
    height: 0,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    rotate: 0
  });

  const initials = useMemo(() => toInitials(displayName) || "U", [displayName]);
  const canUsePortal = typeof window !== "undefined" && typeof document !== "undefined";
  const hasImage = String(value || "").trim().length > 0;
  const coverScale = editorState.width && editorState.height ? Math.max(PREVIEW_SIZE / editorState.width, PREVIEW_SIZE / editorState.height) : 1;
  const renderedWidth = editorState.width * coverScale * editorState.zoom;
  const renderedHeight = editorState.height * coverScale * editorState.zoom;
  const renderedLeft = (PREVIEW_SIZE - renderedWidth) / 2 + editorState.offsetX;
  const renderedTop = (PREVIEW_SIZE - renderedHeight) / 2 + editorState.offsetY;

  const triggerFileDialog = () => {
    if (disabled) {
      return;
    }
    inputRef.current?.click();
  };

  const openPicker = () => {
    if (disabled) {
      return;
    }
    setPickerOpen(true);
  };

  const closePicker = () => {
    setPickerOpen(false);
  };

  const handleUploadFromDevice = () => {
    closePicker();
    window.setTimeout(() => {
      triggerFileDialog();
    }, 0);
  };

  const handleRemoveImage = () => {
    if (typeof onChange === "function") {
      onChange("");
    }
    closePicker();
    setStatus("Profile image removed. Click Save Changes.");
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    if (!String(file.type || "").startsWith("image/")) {
      setStatus("Please choose an image file.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setStatus("Image must be 5MB or less.");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const meta = await loadImageMeta(dataUrl);
      setEditorState({
        open: true,
        src: dataUrl,
        width: meta.width,
        height: meta.height,
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        rotate: 0
      });
      setStatus("");
    } catch (_error) {
      setStatus("Unable to load image right now.");
    }
  };

  const applyCrop = async () => {
    if (!editorState.src || !editorState.width || !editorState.height) {
      return;
    }

    try {
      const meta = await loadImageMeta(editorState.src);
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const context = canvas.getContext("2d");
      if (!context) {
        setStatus("Unable to crop image right now.");
        return;
      }

      const outputCoverScale = Math.max(OUTPUT_SIZE / meta.width, OUTPUT_SIZE / meta.height);
      const outputWidth = meta.width * outputCoverScale * editorState.zoom;
      const outputHeight = meta.height * outputCoverScale * editorState.zoom;
      const ratio = OUTPUT_SIZE / PREVIEW_SIZE;
      const outputLeft = (OUTPUT_SIZE - outputWidth) / 2 + editorState.offsetX * ratio;
      const outputTop = (OUTPUT_SIZE - outputHeight) / 2 + editorState.offsetY * ratio;

      context.save();
      context.beginPath();
      context.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
      context.closePath();
      context.clip();
      const cx = outputLeft + outputWidth / 2;
      const cy = outputTop + outputHeight / 2;
      context.translate(cx, cy);
      context.rotate((editorState.rotate || 0) * Math.PI / 180);
      context.drawImage(meta.image, -outputWidth / 2, -outputHeight / 2, outputWidth, outputHeight);
      context.restore();

      let quality = 0.88;
      let croppedDataUrl = canvas.toDataURL("image/jpeg", quality);
      while (estimateDataUrlBytes(croppedDataUrl) > MAX_OUTPUT_BYTES && quality > 0.45) {
        quality -= 0.08;
        croppedDataUrl = canvas.toDataURL("image/jpeg", quality);
      }

      if (estimateDataUrlBytes(croppedDataUrl) > MAX_OUTPUT_BYTES) {
        setStatus("Image is too large after compression. Try a different image.");
        return;
      }

      if (typeof onChange === "function") {
        onChange(croppedDataUrl);
      }
      setEditorState((prev) => ({ ...prev, open: false, src: "" }));
      setStatus("Profile image ready. Click Save Changes.");
    } catch (_error) {
      setStatus("Unable to crop image right now.");
    }
  };

  const closeEditor = () => {
    setEditorState((prev) => ({ ...prev, open: false, src: "" }));
  };

  return (
    <>
      <div className="flex flex-col items-center gap-2">
        <div className="relative flex items-center justify-center" style={{ width: 128, height: 128 }}>
          {progress !== undefined && (
            <svg 
              className="absolute inset-0 pointer-events-none z-0" 
              viewBox="0 0 128 128"
            >
              <circle cx="64" cy="64" r="60" fill="none" stroke="#e5e7eb" strokeWidth="4" />
              <circle
                cx="64"
                cy="64"
                r="60"
                fill="none"
                stroke={`url(#progressGradient-${progressColorTheme})`}
                strokeWidth="4"
                strokeDasharray={`${(progress / 100) * 376.991} 376.991`}
                strokeLinecap="round"
                transform="rotate(-270 64 64)"
                className="transition-all duration-500 relative z-10"
              />
              <defs>
                <linearGradient id={`progressGradient-blue`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#1e40af" />
                </linearGradient>
                <linearGradient id={`progressGradient-emerald`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#047857" />
                </linearGradient>
                <linearGradient id={`progressGradient-orange`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="100%" stopColor="#ea580c" />
                </linearGradient>
              </defs>
            </svg>
          )}
          <div className="h-[114px] w-[114px] overflow-hidden rounded-full border-[3px] border-white bg-slate-100 shadow-sm relative z-10">
            {hasImage ? (
              <img src={value} alt={displayName || "Profile"} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500 text-2xl font-bold text-white">
                {initials}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={openPicker}
            disabled={disabled}
            className="absolute z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border-4 border-white bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300 shadow-sm"
            style={{ 
              bottom: "-4px", 
              left: "50%", 
              transform: "translateX(-50%)" 
            }}
            aria-label="Upload profile image"
          >
            <Camera className="h-4 w-4" />
          </button>
        </div>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleFileChange} className="hidden" />
        {status && <p className="text-xs text-gray-600">{status}</p>}
      </div>

      {pickerOpen &&
        canUsePortal &&
        createPortal(
          <div className="fixed inset-0 z-[9999] !m-0 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h4 className="text-lg font-bold text-slate-900">Change profile picture</h4>
                <button
                  type="button"
                  onClick={closePicker}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label="Close image options"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-5 flex justify-center">
                <div className="h-40 w-40 overflow-hidden rounded-full border-4 border-slate-100 bg-slate-100 shadow-sm">
                  {hasImage ? (
                    <img src={value} alt={displayName || "Profile"} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500 text-4xl font-bold text-white">
                      {initials}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleUploadFromDevice}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <Upload className="h-4 w-4" />
                  Upload from device
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={!hasImage}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove image
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {editorState.open &&
        (canUsePortal
          ? createPortal(
              <div className="fixed inset-0 z-[9999] !m-0 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
                <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">Adjust Profile Image</h4>
                      <p className="mt-1 text-xs text-slate-600">Preview below matches the circular avatar output.</p>
                    </div>
                    <button
                      type="button"
                      onClick={closeEditor}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                      aria-label="Close image editor"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mx-auto mb-4 h-[220px] w-[220px] overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-inner">
                    {editorState.src && (
                      <img
                        src={editorState.src}
                        alt="Crop preview"
                        className="pointer-events-none select-none"
                        style={{
                          position: "relative",
                          width: `${renderedWidth}px`,
                          height: `${renderedHeight}px`,
                          left: `${renderedLeft}px`,
                          top: `${renderedTop}px`,
                          maxWidth: "none",
                          transform: `rotate(${editorState.rotate || 0}deg)`
                        }}
                      />
                    )}
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Zoom
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.01"
                        value={editorState.zoom}
                        onChange={(event) => setEditorState((prev) => ({ ...prev, zoom: Number(event.target.value) }))}
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Horizontal
                      <input
                        type="range"
                        min="-120"
                        max="120"
                        step="1"
                        value={editorState.offsetX}
                        onChange={(event) => setEditorState((prev) => ({ ...prev, offsetX: Number(event.target.value) }))}
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Vertical
                      <input
                        type="range"
                        min="-120"
                        max="120"
                        step="1"
                        value={editorState.offsetY}
                        onChange={(event) => setEditorState((prev) => ({ ...prev, offsetY: Number(event.target.value) }))}
                        className="mt-1 w-full"
                      />
                    </label>
                    <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Rotate
                      <div className="flex items-center gap-2">
                        <input type="range" min="0" max="360" step="1" value={editorState.rotate || 0} onChange={(event) => setEditorState((prev) => ({ ...prev, rotate: Number(event.target.value) }))} className="mt-1 w-full" />
                        <button type="button" onClick={() => setEditorState((prev) => ({ ...prev, rotate: ((prev.rotate || 0) + 90) % 360 }))} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Rotate 90 degrees">
                          <RotateCw className="h-4 w-4" />
                        </button>
                      </div>
                    </label>
                  </div>

                  <div className="mt-5 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeEditor}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={applyCrop}
                      className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                    >
                      Apply Crop
                    </button>
                  </div>
                </div>
              </div>,
              document.body
            )
          : null)}
    </>
  );
}

export default ProfileImagePicker;
