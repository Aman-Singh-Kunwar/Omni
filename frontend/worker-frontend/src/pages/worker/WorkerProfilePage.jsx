import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

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

  const toggleService = (service) => {
    const nextServices = selectedServices.includes(service)
      ? selectedServices.filter((selected) => selected !== service)
      : [...selectedServices, service];
    setProfileForm((prev) => ({ ...prev, servicesProvided: nextServices.join(", ") }));
  };

  return (
    <div className="bg-white/80 shadow-sm rounded-xl border">
      <div className="px-4 py-8 sm:p-10">
        <h3 className="text-lg leading-6 font-bold text-gray-900 mb-6">Profile</h3>
        {!authToken ? (
          <p className="text-gray-600">Worker info is hidden in preview mode. Please log in to view profile details.</p>
        ) : (
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
                placeholder="Tell customers about your experience"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Broker Code</label>
              <input
                type="text"
                value={profileForm.brokerCode}
                disabled={profileForm.brokerCodeLocked}
                onChange={(event) =>
                  setProfileForm((prev) => ({
                    ...prev,
                    brokerCode: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white/80 uppercase tracking-widest disabled:bg-gray-100 disabled:text-gray-500"
                placeholder="Enter 6-character broker code"
                maxLength={6}
              />
              <p className="mt-1 text-xs text-gray-500">
                {profileForm.brokerCodeLocked
                  ? "Broker code is locked after linking."
                  : "Use your broker's 6-character code to link your profile."}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white/80 flex items-center justify-between text-left"
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
            {profileStatus.error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{profileStatus.error}</p>}
            {profileStatus.success && <p className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">{profileStatus.success}</p>}
            <button
              onClick={handleProfileSave}
              disabled={profileStatus.loading}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold disabled:opacity-70"
            >
              {profileStatus.loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkerProfilePage;
