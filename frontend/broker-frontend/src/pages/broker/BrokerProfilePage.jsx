import React from "react";

function BrokerProfilePage({ profileForm, setProfileForm, profileStatus, handleProfileSave }) {
  return (
    <div className="bg-white/80 shadow-sm rounded-xl border">
      <div className="px-4 py-8 sm:p-10">
        <h3 className="text-lg leading-6 font-bold text-gray-900 mb-6">Profile</h3>
        <div className="space-y-4 max-w-2xl">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              value={profileForm.name}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white/80"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={profileForm.email}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, email: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white/80"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={profileForm.phone}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white/80"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={profileForm.gender}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, gender: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white/80"
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
            <input
              type="date"
              value={profileForm.dateOfBirth}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white/80"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
            <textarea
              rows={3}
              value={profileForm.bio}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white/80"
              placeholder="Tell us about your experience as a broker"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Broker Code</label>
            <input
              type="text"
              value={profileForm.brokerCode || ""}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-700 uppercase tracking-widest"
            />
            <p className="mt-1 text-xs text-gray-500">Share this code with workers to link them to your network.</p>
          </div>
          {profileStatus.error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{profileStatus.error}</p>}
          {profileStatus.success && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{profileStatus.success}</p>}
          <button
            onClick={handleProfileSave}
            disabled={profileStatus.loading}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-semibold disabled:opacity-70"
          >
            {profileStatus.loading ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BrokerProfilePage;
