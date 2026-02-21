import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Copy, Share2, User, X } from "lucide-react";

const PHONE_REGEX = /^\d{10,13}$/;

function toDateInputValue(date) {
  return date.toISOString().split("T")[0];
}

function normalizeBrokerProfileState(value = {}) {
  return {
    name: String(value.name || ""),
    email: String(value.email || ""),
    bio: String(value.bio || ""),
    gender: String(value.gender || ""),
    dateOfBirth: String(value.dateOfBirth || ""),
    phone: String(value.phone || "")
  };
}

function BrokerProfilePage({ profileForm, profileInitialForm, setProfileForm, profileStatus, handleProfileSave, stats = {} }) {
  const navigate = useNavigate();
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState("idle");
  const minBrokerDob = (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 60);
    return toDateInputValue(date);
  })();
  const maxBrokerDob = (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return toDateInputValue(date);
  })();
  const displayName = profileForm.name || "Broker";
  const displayEmail = profileForm.email || "No email set";
  const displayPhone = profileForm.phone || "No phone set";
  const isProfileChanged = useMemo(() => {
    const current = normalizeBrokerProfileState(profileForm);
    const initial = normalizeBrokerProfileState(profileInitialForm);
    return Object.keys(current).some((key) => current[key] !== initial[key]);
  }, [profileForm, profileInitialForm]);
  const brokerCode = String(profileForm.brokerCode || "").trim().toUpperCase();
  const totalWorkers = Number(stats.totalWorkers || 0);
  const activeBookings = Number(stats.activeBookings || 0);
  const totalCommissions = Number(stats.totalEarnings || 0);
  const normalizedPhone = String(profileForm.phone || "").trim();
  const isPhoneValid = !normalizedPhone || PHONE_REGEX.test(normalizedPhone);
  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };
  const handleShareModalOpen = () => {
    setCopyStatus("idle");
    setShareModalOpen(true);
  };
  const handleCopyCode = async () => {
    if (!brokerCode) {
      return;
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(brokerCode);
      } else {
        const input = document.createElement("input");
        input.value = brokerCode;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
      }
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    } catch (_error) {
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 2200);
    }
  };

  return (
    <div className="bg-white/80 p-6 sm:p-8 rounded-xl shadow-sm border">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-gray-900">Profile Settings</h3>
          <button
            type="button"
            onClick={handleBackClick}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 sm:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
          <div className="w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
            <User className="w-12 h-12 text-white" />
          </div>
          <div>
            <h4 className="text-xl font-semibold text-gray-900">{displayName}</h4>
            <p className="text-gray-600">{displayEmail}</p>
            <p className="text-gray-600">{displayPhone}</p>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white/80 p-4 space-y-4">
          <p className="text-sm font-semibold text-gray-900">Edit Profile Details</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(event) =>
                setProfileForm((prev) => ({ ...prev, phone: String(event.target.value || "").replace(/\D/g, "").slice(0, 13) }))
              }
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={13}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
            />
            {normalizedPhone && !isPhoneValid && (
              <p className="mt-1 text-xs text-red-600">Phone number must be 10 to 13 digits.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={profileForm.gender}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, gender: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={profileForm.dateOfBirth}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
              min={minBrokerDob}
              max={maxBrokerDob}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
            />
            <p className="mt-1 text-xs text-gray-500">Broker age must be between 18 and 60 years.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              rows={3}
              value={profileForm.bio}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
              placeholder="Tell us about your experience as a broker"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="block text-sm font-medium text-gray-700">Broker Code</label>
              <button
                type="button"
                onClick={handleShareModalOpen}
                disabled={!brokerCode}
                className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            </div>
            <input
              type="text"
              value={profileForm.brokerCode || ""}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 uppercase tracking-widest"
            />
            <p className="mt-1 text-xs text-gray-500">Share this code with workers to link them to your network.</p>
          </div>
          {profileStatus.error && <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{profileStatus.error}</p>}
          {profileStatus.success && <p className="rounded bg-green-100 px-3 py-2 text-sm text-green-700">{profileStatus.success}</p>}
          <button
            onClick={handleProfileSave}
            disabled={profileStatus.loading || !isProfileChanged || !isPhoneValid}
            className={`w-full sm:w-auto px-6 py-2.5 rounded-lg transition-colors font-medium ${
              profileStatus.loading || !isProfileChanged || !isPhoneValid
                ? "bg-blue-200 text-blue-700 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {profileStatus.loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {shareModalOpen && (
        <div className="fixed inset-0 z-50 !m-0 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-bold text-slate-900">Share Broker Code</h4>
                <p className="mt-1 text-xs text-slate-600">Send this to workers so they can join your broker network.</p>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                aria-label="Close share popup"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Broker Code</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold tracking-[0.2em] text-slate-900">
                    {brokerCode || "N/A"}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    disabled={!brokerCode}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Copy broker code"
                  >
                    {copyStatus === "copied" ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                {copyStatus === "copied" && <p className="mt-2 text-xs font-medium text-emerald-700">Code copied to clipboard.</p>}
                {copyStatus === "error" && <p className="mt-2 text-xs font-medium text-red-700">Unable to copy right now.</p>}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Workers</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{totalWorkers}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Active Jobs</p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{activeBookings}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-center">
                  <p className="text-[10px] uppercase tracking-wide text-slate-500">Commission</p>
                  <p className="mt-1 text-sm font-bold text-emerald-700">INR {totalCommissions.toLocaleString("en-IN")}</p>
                </div>
              </div>

              <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Rules</p>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
                  <li>Workers must enter this code during signup to link with your network.</li>
                  <li>Commission is credited when eligible linked-worker bookings are completed.</li>
                  <li>Share this code only with trusted workers.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BrokerProfilePage;
