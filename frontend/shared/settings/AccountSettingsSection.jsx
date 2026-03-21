import React, { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, LogOut, Smartphone } from "lucide-react";
import { useAutoDismissStatus } from "../hooks/useAutoDismissNotice";

// Password strength calculator
const calculatePasswordStrength = (password) => {
  let strength = 0;
  let feedback = [];

  if (password.length >= 8) strength += 1;
  else feedback.push("At least 8 characters");

  if (password.length >= 12) strength += 1;
  else if (password.length > 0) feedback.push("12+ characters for stronger password");

  if (/[a-z]/.test(password)) strength += 1;
  else feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) strength += 1;
  else feedback.push("Add uppercase letters");

  if (/[0-9]/.test(password)) strength += 1;
  else feedback.push("Add numbers");

  if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
  else feedback.push("Add special characters");

  const strengthLevel =
    strength <= 2 ? "weak" : strength <= 4 ? "fair" : "strong";
  const strengthColor =
    strengthLevel === "weak"
      ? "bg-red-500"
      : strengthLevel === "fair"
        ? "bg-yellow-500"
        : "bg-green-500";

  return {
    level: strengthLevel,
    score: strength,
    maxScore: 6,
    color: strengthColor,
    feedback: feedback.slice(0, 2),
  };
};

function AccountSettingsSection({
  theme,
  onLogout,
  showPasswordForm,
  setShowPasswordForm,
  passwordForm,
  setPasswordForm,
  passwordStatus,
  setPasswordStatus,
  onUpdatePassword,
  showDeleteForm,
  setShowDeleteForm,
  deleteForm,
  setDeleteForm,
  deleteStatus,
  setDeleteStatus,
  onDeleteAccount,
  userEmail = "user@example.com",
  sessionConfig = {},
  api,
  authToken = ""
}) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAStatus, setTwoFAStatus] = useState({ error: "", success: "" });
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);

  useAutoDismissStatus(passwordStatus, setPasswordStatus);
  useAutoDismissStatus(deleteStatus, setDeleteStatus);
  useAutoDismissStatus(twoFAStatus, setTwoFAStatus);

  // Calculate password strength
  const passwordStrength = useMemo(
    () => calculatePasswordStrength(passwordForm.newPassword),
    [passwordForm.newPassword]
  );

  const roleLabelByKey = {
    omni_customer_session: "Customer",
    omni_broker_session: "Broker",
    omni_worker_session: "Worker"
  };

  const currentRole = String(sessionConfig.currentRole || "").toLowerCase();
  const defaultCurrentSessionKey = currentRole ? `omni_${currentRole}_session` : "";
  const sessionKeys = Array.isArray(sessionConfig.sessionKeys) && sessionConfig.sessionKeys.length
    ? sessionConfig.sessionKeys
    : ["omni_customer_session", "omni_broker_session", "omni_worker_session"];
  const currentSessionKey = String(sessionConfig.currentSessionKey || defaultCurrentSessionKey || sessionKeys[0] || "");

  const readStoredSession = (storage, key) => {
    try {
      const raw = storage?.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const token = String(parsed?.token || "").trim();
      if (!parsed?.user || !token) return null;
      return parsed;
    } catch (_error) {
      return null;
    }
  };

  const detectDevice = () => {
    if (typeof navigator === "undefined") return "Unknown device";
    const platform = navigator.platform || "Web";
    const ua = navigator.userAgent || "Browser";
    if (/edg/i.test(ua)) return `${platform} Edge`;
    if (/chrome/i.test(ua) && !/edg/i.test(ua)) return `${platform} Chrome`;
    if (/safari/i.test(ua) && !/chrome|chromium|edg/i.test(ua)) return `${platform} Safari`;
    if (/firefox/i.test(ua)) return `${platform} Firefox`;
    return `${platform} Browser`;
  };

  const loadActiveSessions = () => {
    if (typeof window === "undefined") {
      setActiveSessions([]);
      return;
    }

    const foundSessions = [];
    for (const key of sessionKeys) {
      const fromSessionStorage = readStoredSession(window.sessionStorage, key);
      const fromLocalStorage = readStoredSession(window.localStorage, key);

      if (fromSessionStorage) {
        foundSessions.push({
          id: `session:${key}`,
          storageType: "session",
          sessionKey: key,
          appName: roleLabelByKey[key] || "Omni",
          device: detectDevice(),
          lastActive: "Current tab",
          isCurrent: key === currentSessionKey
        });
      }

      if (fromLocalStorage) {
        foundSessions.push({
          id: `local:${key}`,
          storageType: "local",
          sessionKey: key,
          appName: roleLabelByKey[key] || "Omni",
          device: detectDevice(),
          lastActive: "Remembered on this browser",
          isCurrent: key === currentSessionKey && !fromSessionStorage
        });
      }
    }

    setActiveSessions(foundSessions);
  };

  useEffect(() => {
    loadActiveSessions();
  }, [currentSessionKey]);

  // Load 2FA status
  useEffect(() => {
    const load2FAStatus = async () => {
      try {
        if (!api || !authToken) return;
        const response = await api.get("/auth/two-factor-auth/status", {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        setTwoFAEnabled(response.data?.twoFactorAuthEnabled || false);
      } catch (_error) {
        // Silently fail if endpoint doesn't exist yet
      }
    };
    load2FAStatus();
  }, [api, authToken]);

  const handle2FAToggle = async () => {
    if (!api || !authToken) {
      setTwoFAStatus({ error: "Missing auth token. Please log in again.", success: "" });
      return;
    }

    setTwoFALoading(true);
    setTwoFAStatus({ error: "", success: "" });

    try {
      const newValue = !twoFAEnabled;
      const response = await api.put(
        "/auth/two-factor-auth",
        { enable: newValue },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      setTwoFAEnabled(newValue);
      setTwoFAStatus({
        error: "",
        success: response.data?.message || `Two-factor authentication ${newValue ? "enabled" : "disabled"}`
      });
    } catch (error) {
      setTwoFAStatus({
        error: error.response?.data?.message || "Failed to update 2FA setting",
        success: ""
      });
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleLogoutSession = (session) => {
    if (typeof window === "undefined") return;

    const storage = session.storageType === "local" ? window.localStorage : window.sessionStorage;
    storage.removeItem(session.sessionKey);

    if (session.isCurrent) {
      onLogout?.();
      return;
    }

    loadActiveSessions();
  };

  return (
    <div className="mt-6 max-w-2xl rounded-lg border border-gray-200 bg-white/70 p-6">
      <h4 className="font-semibold text-gray-900 mb-2">Account</h4>
      <div className="mt-4 space-y-3">
        {/* Password Update Section */}
        <div className="rounded-lg border border-gray-200 bg-white/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-gray-900">Update Password</p>
            <button
              type="button"
              onClick={() => {
                setShowPasswordForm((prev) => {
                  const next = !prev;
                  if (next) {
                    setShowDeleteForm(false);
                  }
                  return next;
                });
                setPasswordStatus({ loading: false, error: "", success: "" });
              }}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${theme.openButtonClass}`}
            >
              {showPasswordForm ? "Cancel" : "Open"}
            </button>
          </div>
          {!showPasswordForm && passwordStatus.success && (
            <p className="mt-3 rounded bg-green-100 px-3 py-2 text-xs text-green-700">{passwordStatus.success}</p>
          )}

          {showPasswordForm && (
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-700">Current Password</span>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                    onClick={() => setShowCurrentPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-gray-500 hover:text-gray-700"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-700">New Password</span>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-gray-500 hover:text-gray-700"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                {/* Password Strength Meter */}
                {passwordForm.newPassword && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${passwordStrength.color} transition-all`}
                          style={{
                            width: `${(passwordStrength.score / passwordStrength.maxScore) * 100}%`,
                          }}
                        />
                      </div>
                      <span
                        className={`text-xs font-semibold capitalize ${
                          passwordStrength.level === "weak"
                            ? "text-red-600"
                            : passwordStrength.level === "fair"
                              ? "text-yellow-600"
                              : "text-green-600"
                        }`}
                      >
                        {passwordStrength.level}
                      </span>
                    </div>
                    {passwordStrength.feedback.length > 0 && (
                      <p className="text-xs text-gray-600">
                        💡 {passwordStrength.feedback.join(", ")}
                      </p>
                    )}
                  </div>
                )}

              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-gray-700">Confirm New Password</span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(event) => setPasswordForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              {passwordStatus.error && <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700">{passwordStatus.error}</p>}
              {passwordStatus.success && <p className="rounded bg-green-100 px-3 py-2 text-xs text-green-700">{passwordStatus.success}</p>}
              <button
                type="button"
                onClick={onUpdatePassword}
                disabled={passwordStatus.loading}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-70 ${theme.primaryButtonClass}`}
              >
                {passwordStatus.loading ? "Updating..." : "Update Password"}
              </button>
            </div>
          )}
        </div>

        {/* 2FA Toggle Section */}
        <div className="rounded-lg border border-gray-200 bg-white/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">Two-Factor Authentication</p>
              <p className="text-xs text-gray-600 mt-1">
                {twoFAEnabled ? "✓ Enabled - Your account is more secure" : "Add an extra layer of security to your account"}
              </p>
            </div>
            <button
              type="button"
              onClick={handle2FAToggle}
              disabled={twoFALoading}
              className={`px-4 py-2 text-sm font-semibold rounded-lg border transition-colors disabled:opacity-50 ${
                twoFAEnabled
                  ? "bg-green-100 border-green-300 text-green-700 hover:bg-green-200"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {twoFALoading ? "Updating..." : twoFAEnabled ? "Disable" : "Enable"}
            </button>
          </div>
          {twoFAStatus.error && (
            <p className="mt-3 rounded bg-red-100 px-3 py-2 text-xs text-red-700">{twoFAStatus.error}</p>
          )}
          {twoFAStatus.success && (
            <p className="mt-3 rounded bg-green-100 px-3 py-2 text-xs text-green-700">{twoFAStatus.success}</p>
          )}
        </div>

        {/* Session Manager Section */}
        <div className="rounded-lg border border-gray-200 bg-white/80 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <p className="text-sm font-semibold text-gray-900">Active Sessions</p>
            <button
              type="button"
              onClick={() => setShowSessionManager((prev) => !prev)}
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${theme.openButtonClass}`}
            >
              {showSessionManager ? "Hide" : "Manage"}
            </button>
          </div>

          {showSessionManager && (
            <div className="mt-4 space-y-2">
              {activeSessions.length === 0 ? (
                <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  No active sessions found in this browser.
                </p>
              ) : (
                activeSessions.map((session) => (
                  <div
                    key={session.id}
                    className={`rounded-lg border p-3 flex items-center justify-between ${
                      session.isCurrent
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Smartphone className={`h-4 w-4 flex-shrink-0 ${
                        session.isCurrent ? "text-blue-600" : "text-gray-500"
                      }`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {session.appName} - {session.device}
                          {session.isCurrent && (
                            <span className="ml-2 text-xs font-semibold text-blue-600">
                              Current
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-600">{session.lastActive}</p>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleLogoutSession(session)}
                        className="ml-2 flex-shrink-0 inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 rounded-lg border border-red-300"
                      >
                        <LogOut className="h-3 w-3" />
                        Logout
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Logout Button */}
        <div className="rounded-lg border border-gray-200 bg-white/80 p-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-gray-900">Logout</p>
          <button
            type="button"
            onClick={onLogout}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${theme.primaryButtonClass}`}
          >
            Logout
          </button>
        </div>

        {/* Delete Account Section */}
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-red-800">Delete Account</p>
            <button
              type="button"
              onClick={() => {
                setShowDeleteForm((prev) => {
                  const next = !prev;
                  if (next) {
                    setShowPasswordForm(false);
                  }
                  return next;
                });
                setDeleteStatus({ loading: false, error: "", success: "" });
              }}
              className="rounded-lg border border-red-600 bg-white px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-100"
            >
              {showDeleteForm ? "Cancel Delete" : "Delete Account"}
            </button>
          </div>
          {showDeleteForm && (
            <div className="mt-4 rounded-lg border border-red-300 bg-red-100/70 p-4 space-y-3">
              <div className="rounded-lg border border-red-400 bg-red-200/50 px-3 py-2">
                <p className="text-xs text-red-900 font-semibold">⚠️ Danger Zone</p>
                <p className="text-xs text-red-800 mt-1">
                  This action is permanent. All your data will be deleted from our servers.
                </p>
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-red-800">Type your email to confirm</span>
                <input
                  type="text"
                  placeholder={userEmail}
                  value={deleteForm.username}
                  onChange={(event) => setDeleteForm((prev) => ({ ...prev, username: event.target.value }))}
                  className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
                />
                {deleteForm.username && deleteForm.username !== userEmail && (
                  <p className="text-xs text-red-600 mt-1">Email does not match</p>
                )}
                {deleteForm.username === userEmail && (
                  <p className="text-xs text-green-600 mt-1">✓ Email matches</p>
                )}
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-red-800">Password</span>
                <div className="relative">
                  <input
                    type={showDeletePassword ? "text" : "password"}
                    value={deleteForm.password}
                    onChange={(event) => setDeleteForm((prev) => ({ ...prev, password: event.target.value }))}
                    className="w-full rounded-lg border border-red-200 px-3 py-2 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    aria-label={showDeletePassword ? "Hide delete password" : "Show delete password"}
                    onClick={() => setShowDeletePassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-red-500 hover:text-red-700"
                  >
                    {showDeletePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {deleteStatus.error && <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700">{deleteStatus.error}</p>}
              {deleteStatus.success && <p className="rounded bg-green-100 px-3 py-2 text-xs text-green-700">{deleteStatus.success}</p>}

              <button
                type="button"
                onClick={onDeleteAccount}
                disabled={
                  deleteStatus.loading ||
                  deleteForm.username !== userEmail ||
                  !deleteForm.password
                }
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteStatus.loading ? "Deleting..." : "Permanently Delete Account"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AccountSettingsSection;
