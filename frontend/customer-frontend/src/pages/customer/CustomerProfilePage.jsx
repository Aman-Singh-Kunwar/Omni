import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, User } from "lucide-react";

const PHONE_REGEX = /^\d{10,13}$/;

function toDateInputValue(date) {
  return date.toISOString().split("T")[0];
}

function normalizeProfileState(value = {}) {
  return {
    name: String(value.name || ""),
    email: String(value.email || ""),
    bio: String(value.bio || ""),
    gender: String(value.gender || ""),
    dateOfBirth: String(value.dateOfBirth || ""),
    phone: String(value.phone || "")
  };
}

function CustomerProfilePage({ userName, userEmail, profileForm, profileInitialForm, setProfileForm, profileStatus, handleProfileSave }) {
  const navigate = useNavigate();
  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };
  const maxCustomerDob = (() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 10);
    date.setDate(date.getDate() - 1);
    return toDateInputValue(date);
  })();
  const isProfileChanged = useMemo(() => {
    const current = normalizeProfileState(profileForm);
    const initial = normalizeProfileState(profileInitialForm);
    return Object.keys(current).some((key) => current[key] !== initial[key]);
  }, [profileForm, profileInitialForm]);
  const normalizedPhone = String(profileForm.phone || "").trim();
  const isPhoneValid = !normalizedPhone || PHONE_REGEX.test(normalizedPhone);

  return (
    <div className="bg-white/80 p-6 sm:p-8 rounded-xl shadow-sm border">
      <div className="mx-auto max-w-2xl">
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
            <h4 className="text-xl font-semibold text-gray-900">{profileForm.name || userName}</h4>
            <p className="text-gray-600">{profileForm.email || userEmail || "No email set"}</p>
            <p className="text-gray-600">{profileForm.phone || "No phone set"}</p>
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
              max={maxCustomerDob}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
            />
            <p className="mt-1 text-xs text-gray-500">Customer age must be more than 10 years.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              rows={3}
              value={profileForm.bio}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
              placeholder="Tell us about yourself"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
            />
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
    </div>
  );
}

export default CustomerProfilePage;
