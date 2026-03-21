import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle, ChevronDown, ShieldAlert } from "lucide-react";
import ProfileImagePicker from "@shared/components/ProfileImagePicker";

const PHONE_REGEX = /^\d{10,13}$/;
const TAKEN_USERNAMES = new Set(["admin", "support", "worker", "help", "root"]);

function toDateInputValue(date) {
  return date.toISOString().split("T")[0];
}

function normalizeWorkerProfileState(value = {}) {
  return {
    name: String(value.name || ""),
    email: String(value.email || ""),
    bio: String(value.bio || ""),
    gender: String(value.gender || ""),
    dateOfBirth: String(value.dateOfBirth || ""),
    phone: String(value.phone || ""),
    secondaryEmail: String(value.secondaryEmail || ""),
    twoFactorEnabled: Boolean(value.twoFactorEnabled),
    photoUrl: String(value.photoUrl || ""),
    servicesProvided: String(value.servicesProvided || ""),
    isAvailable: Boolean(value.isAvailable)
  };
}

function normalizeUsername(str) {
  return String(str || "").toLowerCase().trim().replace(/[^a-z0-9_-]/g, "").slice(0, 30);
}
function WorkerProfilePage({
  authToken,
  profileForm,
  profileInitialForm,
  setProfileForm,
  profileStatus,
  handleProfileSave,
  emailVerification,
  setEmailVerification,
  onRequestEmailVerification,
  onVerifyEmailChange
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
  const servicesDropdownRef = useRef(null);
  const emailInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const bioInputRef = useRef(null);
  const serviceOptions = [
    "Plumber",
    "Electrician",
    "Carpenter",
    "Painter",
    "AC Repair",
    "House Cleaning",
    "Hair Stylist",
    "Car Service"
  ];
  const selectedServices = useMemo(
    () =>
      profileForm.servicesProvided
        .split(",")
        .map((service) => service.trim())
        .filter(Boolean),
    [profileForm.servicesProvided]
  );
  const minWorkerDob = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 60);
    return toDateInputValue(date);
  }, []);
  const maxWorkerDob = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return toDateInputValue(date);
  }, []);
  const isProfileChanged = useMemo(() => {
    const current = normalizeWorkerProfileState(profileForm);
    const initial = normalizeWorkerProfileState(profileInitialForm);
    return Object.keys(current).some((key) => current[key] !== initial[key]);
  }, [profileForm, profileInitialForm]);
  const normalizedPhone = String(profileForm.phone || "").trim();
  const isPhoneValid = !normalizedPhone || PHONE_REGEX.test(normalizedPhone);
  const emailVerified = profileForm.emailVerified !== false;

  const [usernameStatus, setUsernameStatus] = useState({ checking: false, available: null, error: null });
  const usernameCheckRef = useRef(null);
  const profileCompletion = useMemo(() => {
    const fields = [
      { key: "name", weight: 15 },
      { key: "email", weight: 15 },
      { key: "phone", weight: 15 },
      { key: "photoUrl", weight: 15 },
      { key: "bio", weight: 15 },
      { key: "servicesProvided", weight: 15 },
      { key: "gender", weight: 5 },
      { key: "dateOfBirth", weight: 5 }
    ];
    const totalWeight = fields.reduce((sum, f) => sum + f.weight, 0);
    const completedWeight = fields.filter(f => profileForm[f.key]).reduce((sum, f) => sum + f.weight, 0);
    return Math.round((completedWeight / totalWeight) * 100);
  }, [profileForm]);
  useEffect(() => {
    const section = String(new URLSearchParams(location.search).get("section") || "").toLowerCase();
    if (!section) return;

    const sectionRef = section === "phone" ? phoneInputRef : section === "bio" ? bioInputRef : emailInputRef;
    window.setTimeout(() => {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      sectionRef.current?.focus();
    }, 120);
  }, [location.search]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (servicesDropdownRef.current && !servicesDropdownRef.current.contains(event.target)) {
        setIsServicesDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (profileStatus.success) {
      setIsServicesDropdownOpen(false);
    }
  }, [profileStatus.success]);

  useEffect(() => {
    const username = normalizeUsername(profileForm.name);
    if (!username || username.length < 3) {
      setUsernameStatus({ checking: false, available: null, error: null });
      return;
    }

    setUsernameStatus({ checking: true, available: null, error: null });
    if (usernameCheckRef.current) {
      clearTimeout(usernameCheckRef.current);
    }

    usernameCheckRef.current = setTimeout(() => {
      const isAvailable = !TAKEN_USERNAMES.has(username);
      setUsernameStatus({ checking: false, available: isAvailable, error: null });
    }, 700);

    return () => {
      if (usernameCheckRef.current) {
        clearTimeout(usernameCheckRef.current);
      }
    };
  }, [profileForm.name]);
  const toggleService = (service) => {
    const nextServices = selectedServices.includes(service)
      ? selectedServices.filter((selected) => selected !== service)
      : [...selectedServices, service];
    setProfileForm((prev) => ({ ...prev, servicesProvided: nextServices.join(", ") }));
  };

  const displayName = profileForm.name || "Worker";
  const displayEmail = profileForm.email || "No email set";
  const displayPhone = profileForm.phone || "No phone set";
  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
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
          <ProfileImagePicker
            progress={profileCompletion || 0}
            progressColorTheme="emerald"
                value={profileForm.photoUrl}
                displayName={displayName}
                onChange={(photoUrl) => setProfileForm((prev) => ({ ...prev, photoUrl }))}
              />
          <div>
            <h4 className="text-xl font-semibold text-gray-900">{displayName}</h4>
            <p className="text-sm font-medium text-emerald-600 mb-1">@{normalizeUsername(displayName || "worker")}</p>
            <p className="text-gray-600">{displayEmail}</p>
            <p className="text-gray-600">{displayPhone}</p>
            <div
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                emailVerified ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {emailVerified ? <CheckCircle className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
              {emailVerified ? "Verified by Email OTP" : "Email Not Verified"}
            </div>
          </div>
        </div>

        {!authToken ? (
          <div className="rounded-lg border border-gray-200 bg-white/80 p-4">
            <p className="text-gray-600">Worker info is hidden in preview mode. Please log in to view profile details.</p>
          </div>
        ) : (
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
                <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={normalizeUsername(profileForm.name)}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
              />
              <div className="mt-1 flex items-center gap-2 text-xs">
                {usernameStatus.checking && (
                  <>
                    <div className="w-3 h-3 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                    <span className="text-emerald-600">Checking availability...</span>
                  </>
                )}
                {usernameStatus.available === true && (
                  <>
                    <span className="w-3 h-3 bg-green-600 rounded-full flex-shrink-0" />
                    <span className="text-green-600 font-medium">Available!</span>
                  </>
                )}
                {usernameStatus.available === false && (
                  <>
                    <span className="w-3 h-3 bg-red-600 rounded-full flex-shrink-0" />
                    <span className="text-red-600 font-medium">Already taken</span>
                  </>
                )}
              </div>
            </div>
        </div>
            <div>
              <div className="mb-1 flex items-center justify-between gap-2">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <button
                  type="button"
                  onClick={() => onRequestEmailVerification?.(profileForm.email)}
                  disabled={
                    emailVerification.requesting ||
                    !profileForm.email ||
                    (profileForm.email === profileInitialForm.email && profileForm.emailVerified !== false)
                  }
                  className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {emailVerification.requesting ? "Sending..." : "Verify New Email"}
                </button>
              </div>
              <input
                ref={emailInputRef}
                type="email"
                value={profileForm.email}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
              />
              <p className="mt-1 text-xs text-gray-500">Changing email requires OTP verification to the new address.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                ref={phoneInputRef}
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
                min={minWorkerDob}
                max={maxWorkerDob}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
              />
              <p className="mt-1 text-xs text-gray-500">Worker age must be between 18 and 60 years.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                ref={bioInputRef}
                rows={3}
                maxLength={500}
                value={profileForm.bio}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
                placeholder="Tell customers about your experience"
              />
              <p className="mt-1 text-right text-xs text-gray-500">{profileForm.bio.length}/500 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Broker Code</label>
              <input
                type="text"
                value={profileForm.brokerCode}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 uppercase tracking-widest"
                placeholder="Added during signup if referral code is used"
                maxLength={6}
              />
              <p className="mt-1 text-xs text-gray-500">
                Broker code can only be set during worker signup using referral code.
              </p>
              {profileForm.brokerName && (
                <p className="mt-1 text-xs text-gray-600">
                  Linked broker: <span className="font-semibold">{profileForm.brokerName}</span>
                </p>
              )}
              <p className="mt-1 text-xs text-gray-600">
                Broker commission usage: <span className="font-semibold">{profileForm.brokerCommissionUsage || "0/10"}</span>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Services You Provide</label>
              <div className="relative" ref={servicesDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsServicesDropdownOpen((prev) => !prev)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white/80 flex items-center justify-between text-left focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <span className={selectedServices.length ? "text-gray-900" : "text-gray-500"}>
                    {selectedServices.length ? selectedServices.join(", ") : "Select services"}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-500 transition-transform ${isServicesDropdownOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {isServicesDropdownOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-300 bg-white shadow-lg p-2 max-h-56 overflow-auto">
                    {serviceOptions.map((service) => (
                      <label key={service} className="flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedServices.includes(service)}
                          onChange={() => toggleService(service)}
                        />
                        <span className="text-sm text-gray-800">{service}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 mb-4">
              <input
                type="checkbox"
                checked={profileForm.isAvailable}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, isAvailable: event.target.checked }))}
              />
              Mark me as currently available
            </label>

            {emailVerification.info && <p className="rounded bg-blue-100 px-3 py-2 text-sm text-blue-700">{emailVerification.info}</p>}
            {emailVerification.error && <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{emailVerification.error}</p>}
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
        )}
      </div>

      {emailVerification.open && createPortal(
        <div className="fixed inset-0 z-50 !m-0 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h4 className="text-lg font-bold text-slate-900">Verify New Email</h4>
            <p className="mt-1 text-sm text-slate-600">
              Enter the 6-digit OTP sent to <span className="font-semibold">{emailVerification.pendingEmail || profileForm.email}</span>.
            </p>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={emailVerification.code}
              onChange={(event) =>
                setEmailVerification((prev) => ({
                  ...prev,
                  code: String(event.target.value || "").replace(/\D/g, "").slice(0, 6)
                }))
              }
              className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tracking-[0.3em]"
              placeholder="000000"
            />
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEmailVerification((prev) => ({ ...prev, open: false, code: "" }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => onRequestEmailVerification?.(emailVerification.pendingEmail || profileForm.email)}
                disabled={emailVerification.requesting}
                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-60"
              >
                {emailVerification.requesting ? "Sending..." : "Resend OTP"}
              </button>
              <button
                type="button"
                onClick={() => onVerifyEmailChange?.(emailVerification.pendingEmail || profileForm.email, emailVerification.code)}
                disabled={emailVerification.verifying || String(emailVerification.code || "").length !== 6}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {emailVerification.verifying ? "Verifying..." : "Verify Email"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default WorkerProfilePage;
