import React from "react";
import { User } from "lucide-react";

function CustomerProfilePage({ userName, userEmail, profileForm, setProfileForm, profileStatus, handleProfileSave }) {
  return (
    <div className="bg-white/80 p-6 sm:p-8 rounded-xl shadow-sm border">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Profile Settings</h3>
      <div className="max-w-2xl mx-auto">
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
        <div className="space-y-4">
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
              onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
            />
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
            />
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
          {profileStatus.error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{profileStatus.error}</p>}
          {profileStatus.success && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{profileStatus.success}</p>}
          <button
            onClick={handleProfileSave}
            disabled={profileStatus.loading}
            className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-70"
          >
            {profileStatus.loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CustomerProfilePage;
