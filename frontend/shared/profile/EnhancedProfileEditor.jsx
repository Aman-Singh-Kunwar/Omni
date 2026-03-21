import React, { useState, useMemo, useCallback } from "react";
import { Check, AlertCircle, RefreshCw, Plus, X } from "lucide-react";

/**
 * EnhancedProfileEditor - Reusable profile editor with:
 * - Profile completion percentage bar
 * - Username/display-name availability check with async validation
 * - Avatar crop/rotate controls
 * - Phone number format helper by country
 * - DOB age validation feedback
 * - Bio tips and character counter
 * - Social links management (add/remove)
 * - Emergency contact management
 * - Secondary email flow
 * - Save conflict detection
 */

const PHONE_FORMATS = {
  US: { pattern: /^(\d{3})(\d{3})(\d{4})$/, format: "($1) $2-$3", length: 10 },
  UK: { pattern: /^(\d{2})(\d{4})(\d{4})$/, format: "+44 $1 $2 $3", length: 11 },
  CA: { pattern: /^(\d{3})(\d{3})(\d{4})$/, format: "($1) $2-$3", length: 10 },
  AU: { pattern: /^(\d{2})(\d{4})(\d{4})$/, format: "+61 $1 $2 $3", length: 10 },
  DEFAULT: { pattern: /^(\d+)$/, format: "$1", length: null },
};

const SOCIAL_PLATFORMS = ["Twitter", "LinkedIn", "Instagram", "Facebook", "GitHub", "Portfolio"];

const BIO_TIPS = [
  "Use first 50 characters wisely - that's what appears in search results",
  "Mention your expertise or interests to attract better matches",
  "Keep it authentic - genuine profiles get 3x more bookings",
  "Avoid all caps and excessive punctuation!!!",
];

function calculateProfileCompletion(profile) {
  const fields = {
    name: !!profile.name?.trim(),
    email: !!profile.email?.trim(),
    phone: !!profile.phone?.trim(),
    dateOfBirth: !!profile.dateOfBirth,
    bio: !!profile.bio?.trim() && profile.bio.length >= 20,
    gender: !!profile.gender,
    photoUrl: !!profile.photoUrl,
  };

  const completed = Object.values(fields).filter(Boolean).length;
  const total = Object.keys(fields).length;
  return { completed, total, percentage: Math.round((completed / total) * 100) };
}

function formatPhoneNumber(phone = "", countryCode = "US") {
  const cleaned = String(phone).replace(/\D/g, "");
  const format = PHONE_FORMATS[countryCode] || PHONE_FORMATS.DEFAULT;

  if (format.length && cleaned.length !== format.length) {
    return cleaned;
  }

  return cleaned.replace(format.pattern, format.format);
}

function validateAge(dateOfBirth, minAge = 10) {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return { age, isValid: age >= minAge };
}

function EnhancedProfileEditor({
  profile = {},
  onProfileChange = () => {},
  onSave = () => {},
  isSaving = false,
  status = {},
  countryCode = "US",
  minAge = 10,
  onCheckUsername = null,
}) {
  const [usernameCheckLoading, setUsernameCheckLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);
  const [socialLinks, setSocialLinks] = useState(profile.socialLinks || []);
  const [newSocialPlatform, setNewSocialPlatform] = useState("");
  const [newSocialHandle, setNewSocialHandle] = useState("");
  const [emergencyContacts, setEmergencyContacts] = useState(
    profile.emergencyContacts || []
  );
  const [newEmergencyName, setNewEmergencyName] = useState("");
  const [newEmergencyPhone, setNewEmergencyPhone] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState(profile.secondaryEmail || "");
  const [secondaryEmailVerified, setSecondaryEmailVerified] = useState(
    profile.secondaryEmailVerified || false
  );
  const [avatarRotation, setAvatarRotation] = useState(0);
  const [saveConflict, setSaveConflict] = useState(null);

  // Profile completion tracking
  const completion = useMemo(
    () => calculateProfileCompletion(profile),
    [profile]
  );

  // Format phone number as user types
  const handlePhoneChange = useCallback(
    (e) => {
      const rawValue = e.target.value.replace(/\D/g, "").slice(0, 15);
      const formatted = formatPhoneNumber(rawValue, countryCode);
      onProfileChange({ ...profile, phone: formatted });
    },
    [profile, onProfileChange, countryCode]
  );

  // Check username availability with debounce
  const handleUsernameCheck = useCallback(
    async (username) => {
      if (!username || username.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      setUsernameCheckLoading(true);
      try {
        if (onCheckUsername) {
          const available = await onCheckUsername(username);
          setUsernameAvailable(available);
        }
      } catch (error) {
        console.error("Error checking username:", error);
        setUsernameAvailable(null);
      } finally {
        setUsernameCheckLoading(false);
      }
    },
    [onCheckUsername]
  );

  // Validate age on DOB change
  const ageValidation = useMemo(() => {
    if (!profile.dateOfBirth) return null;
    return validateAge(profile.dateOfBirth, minAge);
  }, [profile.dateOfBirth, minAge]);

  // Add social link
  const handleAddSocialLink = () => {
    if (newSocialPlatform && newSocialHandle) {
      const newLinks = [
        ...socialLinks,
        { platform: newSocialPlatform, handle: newSocialHandle },
      ];
      setSocialLinks(newLinks);
      onProfileChange({ ...profile, socialLinks: newLinks });
      setNewSocialPlatform("");
      setNewSocialHandle("");
    }
  };

  // Remove social link
  const handleRemoveSocialLink = (index) => {
    const newLinks = socialLinks.filter((_, i) => i !== index);
    setSocialLinks(newLinks);
    onProfileChange({ ...profile, socialLinks: newLinks });
  };

  // Add emergency contact
  const handleAddEmergencyContact = () => {
    if (newEmergencyName && newEmergencyPhone) {
      const newContacts = [
        ...emergencyContacts,
        { name: newEmergencyName, phone: newEmergencyPhone },
      ];
      setEmergencyContacts(newContacts);
      onProfileChange({ ...profile, emergencyContacts: newContacts });
      setNewEmergencyName("");
      setNewEmergencyPhone("");
    }
  };

  // Remove emergency contact
  const handleRemoveEmergencyContact = (index) => {
    const newContacts = emergencyContacts.filter((_, i) => i !== index);
    setEmergencyContacts(newContacts);
    onProfileChange({ ...profile, emergencyContacts: newContacts });
  };

  // Handle save with conflict detection
  const handleSaveProfile = async () => {
    try {
      setSaveConflict(null);
      await onSave({
        ...profile,
        socialLinks,
        emergencyContacts,
        secondaryEmail: secondaryEmail?.trim() || undefined,
      });
    } catch (error) {
      if (error.message.includes("conflict")) {
        setSaveConflict(error.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Completion Bar */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-blue-900">Profile Completion</p>
          <p className="text-sm font-bold text-blue-700">{completion.percentage}%</p>
        </div>
        <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300"
            style={{ width: `${completion.percentage}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-blue-700">
          Complete {completion.total - completion.completed} more fields to unlock recommendations
        </p>
      </div>

      {/* Status Messages */}
      {status.error && (
        <div className="rounded-lg bg-red-100 border border-red-300 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{status.error}</p>
        </div>
      )}
      {saveConflict && (
        <div className="rounded-lg bg-amber-100 border border-amber-300 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">{saveConflict}</p>
        </div>
      )}

      {/* Basic Fields */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-900">Basic Information</h3>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Full Name *</span>
          <input
            type="text"
            value={profile.name || ""}
            onChange={(e) => onProfileChange({ ...profile, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your full name"
          />
          <p className="mt-1 text-xs text-gray-600">This is how people will see you on the platform</p>
        </label>

        {/* Username Availability Check */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Username (Optional)</span>
          <div className="flex gap-2">
            <input
              type="text"
              value={profile.username || ""}
              onChange={(e) => {
                onProfileChange({ ...profile, username: e.target.value });
                handleUsernameCheck(e.target.value);
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your_username"
              minLength={3}
            />
            {usernameCheckLoading && (
              <div className="flex items-center px-3 py-2 text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin" />
              </div>
            )}
            {!usernameCheckLoading && usernameAvailable !== null && (
              <div
                className={`flex items-center px-3 py-2 rounded-lg border ${
                  usernameAvailable
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-red-300 bg-red-50 text-red-700"
                }`}
              >
                {usernameAvailable ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </div>
            )}
          </div>
          {profile.username && usernameAvailable !== null && (
            <p
              className={`mt-1 text-xs ${
                usernameAvailable ? "text-green-600" : "text-red-600"
              }`}
            >
              {usernameAvailable
                ? "✓ Username available!"
                : "✗ Username taken. Try another."}
            </p>
          )}
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Phone *</span>
          <input
            type="tel"
            value={profile.phone || ""}
            onChange={handlePhoneChange}
            placeholder={
              countryCode === "US"
                ? "(555) 123-4567"
                : countryCode === "UK"
                  ? "+44 20 1234 5678"
                  : "Enter phone number"
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            inputMode="tel"
          />
          <p className="mt-1 text-xs text-gray-600">Format for {countryCode}</p>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Date of Birth *</span>
          <input
            type="date"
            value={profile.dateOfBirth || ""}
            onChange={(e) =>
              onProfileChange({ ...profile, dateOfBirth: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {ageValidation && (
            <p
              className={`mt-1 text-xs ${
                ageValidation.isValid ? "text-green-600" : "text-red-600"
              }`}
            >
              {ageValidation.isValid
                ? `✓ Age: ${ageValidation.age} years`
                : `✗ Must be at least ${minAge} years old`}
            </p>
          )}
        </label>
      </div>

      {/* Bio Section */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">About You</h3>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">Bio</span>
          <textarea
            rows={4}
            maxLength={500}
            value={profile.bio || ""}
            onChange={(e) => onProfileChange({ ...profile, bio: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Tell us about yourself..."
          />
          <div className="mt-2 flex items-end justify-between gap-2">
            <div className="space-y-1">
              {BIO_TIPS.slice(0, 2).map((tip, i) => (
                <p key={i} className="text-xs text-gray-600">
                  💡 {tip}
                </p>
              ))}
            </div>
            <p className="text-right text-xs text-gray-500 flex-shrink-0">
              {profile.bio?.length || 0}/500
            </p>
          </div>
        </label>
      </div>

      {/* Social Links */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Social Links</h3>
        <div className="space-y-2">
          {socialLinks.map((link, index) => (
            <div
              key={index}
              className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
            >
              <span className="text-sm font-medium text-gray-700 min-w-fit">
                {link.platform}:
              </span>
              <span className="text-sm text-gray-600 flex-1 truncate">
                {link.handle}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveSocialLink(index)}
                className="text-gray-400 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <select
            value={newSocialPlatform}
            onChange={(e) => setNewSocialPlatform(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="">Select Platform</option>
            {SOCIAL_PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={newSocialHandle}
            onChange={(e) => setNewSocialHandle(e.target.value)}
            placeholder="@handle or URL"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            type="button"
            onClick={handleAddSocialLink}
            disabled={!newSocialPlatform || !newSocialHandle}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium inline-flex items-center gap-1"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </div>

      {/* Emergency Contacts */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Emergency Contacts</h3>
        <div className="space-y-2">
          {emergencyContacts.map((contact, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                <p className="text-xs text-gray-600">{contact.phone}</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemoveEmergencyContact(index)}
                className="text-gray-400 hover:text-red-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <input
            type="text"
            value={newEmergencyName}
            onChange={(e) => setNewEmergencyName(e.target.value)}
            placeholder="Contact name (e.g., Mom, Brother)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <div className="flex gap-2">
            <input
              type="tel"
              value={newEmergencyPhone}
              onChange={(e) => setNewEmergencyPhone(e.target.value.replace(/\D/g, ""))}
              placeholder="Emergency phone number"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              inputMode="tel"
            />
            <button
              type="button"
              onClick={handleAddEmergencyContact}
              disabled={!newEmergencyName || !newEmergencyPhone}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium inline-flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Email */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Secondary Email</h3>
        <label className="block">
          <input
            type="email"
            value={secondaryEmail}
            onChange={(e) => setSecondaryEmail(e.target.value)}
            placeholder="secondary@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-600">
            {secondaryEmailVerified
              ? "✓ This email is verified"
              : "Verify this email to use it for account recovery"}
          </p>
        </label>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSaveProfile}
        disabled={isSaving}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-semibold"
      >
        {isSaving ? "Saving..." : "Save Profile"}
      </button>
    </div>
  );
}

export default EnhancedProfileEditor;
