import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, User } from "lucide-react";

function toDateInputValue(date) {
  return date.toISOString().split("T")[0];
}

function WorkerProfilePage({ authToken, profileForm, setProfileForm, profileStatus, handleProfileSave }) {
  const [isServicesDropdownOpen, setIsServicesDropdownOpen] = useState(false);
  const servicesDropdownRef = useRef(null);
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

  const toggleService = (service) => {
    const nextServices = selectedServices.includes(service)
      ? selectedServices.filter((selected) => selected !== service)
      : [...selectedServices, service];
    setProfileForm((prev) => ({ ...prev, servicesProvided: nextServices.join(", ") }));
  };

  const displayName = profileForm.name || "Worker";
  const displayEmail = profileForm.email || "No email set";
  const displayPhone = profileForm.phone || "No phone set";

  return (
    <div className="bg-white/80 p-6 sm:p-8 rounded-xl shadow-sm border">
      <h3 className="text-xl font-bold text-gray-900 mb-6">Profile Settings</h3>
      <div className="max-w-2xl mx-auto">
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
                min={minWorkerDob}
                max={maxWorkerDob}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
              />
              <p className="mt-1 text-xs text-gray-500">Worker age must be between 18 and 60 years.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                rows={3}
                value={profileForm.bio}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, bio: event.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white/80"
                placeholder="Tell customers about your experience"
              />
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

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={profileForm.isAvailable}
                onChange={(event) => setProfileForm((prev) => ({ ...prev, isAvailable: event.target.checked }))}
              />
              Mark me as currently available
            </label>
            {profileStatus.error && <p className="rounded bg-red-100 px-3 py-2 text-sm text-red-700">{profileStatus.error}</p>}
            {profileStatus.success && <p className="rounded bg-green-100 px-3 py-2 text-sm text-green-700">{profileStatus.success}</p>}
            <button
              onClick={handleProfileSave}
              disabled={profileStatus.loading}
              className="w-full sm:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-70"
            >
              {profileStatus.loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkerProfilePage;
