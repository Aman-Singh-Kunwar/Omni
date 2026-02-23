import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAutoDismissStatus } from "../hooks/useAutoDismissNotice";

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
  onDeleteAccount
}) {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);

  useAutoDismissStatus(passwordStatus, setPasswordStatus);
  useAutoDismissStatus(deleteStatus, setDeleteStatus);

  return (
    <div className="mt-6 max-w-2xl rounded-lg border border-gray-200 bg-white/70 p-6">
      <h4 className="font-semibold text-gray-900 mb-2">Account</h4>
      <div className="mt-4 space-y-3">
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
              <p className="text-xs text-red-700 font-medium">Confirm with username and password.</p>
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-red-800">Username</span>
                <input
                  type="text"
                  value={deleteForm.username}
                  onChange={(event) => setDeleteForm((prev) => ({ ...prev, username: event.target.value }))}
                  className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm"
                />
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
                disabled={deleteStatus.loading}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70"
              >
                {deleteStatus.loading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AccountSettingsSection;
