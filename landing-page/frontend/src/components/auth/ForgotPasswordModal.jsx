import React from "react";
import { Eye, EyeOff } from "lucide-react";

function ForgotPasswordModal({
  open,
  forgotPasswordStep,
  forgotPasswordRole,
  forgotPasswordForm,
  setForgotPasswordForm,
  forgotPasswordStatus,
  showForgotPassword,
  setShowForgotPassword,
  showForgotConfirmPassword,
  setShowForgotConfirmPassword,
  closeForgotPasswordModal,
  submitForgotPasswordRequest,
  submitForgotPasswordVerification
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto backdrop-blur-md px-4 py-4 ui-modal-overlay ui-touch-scroll sm:items-center">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl ui-modal-surface">
        <h2 className="text-xl font-bold text-slate-900">Reset Password</h2>
        <p className="mt-1 text-sm text-slate-600">
          {forgotPasswordStep === "request"
            ? "Enter your account email to receive a reset code."
            : "Enter the code from email and set your new password."}
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Role: {forgotPasswordRole}</p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
              value={forgotPasswordForm.email}
              disabled={forgotPasswordStep === "verify"}
              onChange={(event) => setForgotPasswordForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>

          {forgotPasswordStep === "verify" && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Verification Code</span>
                <input
                  type="text"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 tracking-[0.3em] focus:ring-2 focus:ring-blue-500"
                  value={forgotPasswordForm.verificationCode}
                  onChange={(event) =>
                    setForgotPasswordForm((prev) => ({
                      ...prev,
                      verificationCode: event.target.value.replace(/[^0-9]/g, "").slice(0, 6)
                    }))
                  }
                  placeholder="123456"
                  maxLength={6}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">New Password</span>
                <div className="relative">
                  <input
                    type={showForgotPassword ? "text" : "password"}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500"
                    value={forgotPasswordForm.newPassword}
                    onChange={(event) => setForgotPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                  />
                  <button
                    type="button"
                    aria-label={showForgotPassword ? "Hide new password" : "Show new password"}
                    onClick={() => setShowForgotPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 hover:text-slate-700"
                  >
                    {showForgotPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Confirm New Password</span>
                <div className="relative">
                  <input
                    type={showForgotConfirmPassword ? "text" : "password"}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500"
                    value={forgotPasswordForm.confirmNewPassword}
                    onChange={(event) => setForgotPasswordForm((prev) => ({ ...prev, confirmNewPassword: event.target.value }))}
                  />
                  <button
                    type="button"
                    aria-label={showForgotConfirmPassword ? "Hide confirm new password" : "Show confirm new password"}
                    onClick={() => setShowForgotConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 hover:text-slate-700"
                  >
                    {showForgotConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </>
          )}
        </div>

        {forgotPasswordStatus.info && <p className="mt-3 rounded bg-emerald-50 p-2 text-sm text-emerald-700">{forgotPasswordStatus.info}</p>}
        {forgotPasswordStatus.error && <p className="mt-3 rounded bg-red-50 p-2 text-sm text-red-700">{forgotPasswordStatus.error}</p>}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={closeForgotPasswordModal}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          {forgotPasswordStep === "verify" && (
            <button
              type="button"
              disabled={forgotPasswordStatus.loading}
              onClick={submitForgotPasswordRequest}
              className="w-full rounded-lg border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-70"
            >
              Resend Code
            </button>
          )}
          <button
            type="button"
            disabled={forgotPasswordStatus.loading}
            onClick={forgotPasswordStep === "request" ? submitForgotPasswordRequest : submitForgotPasswordVerification}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
          >
            {forgotPasswordStatus.loading ? "Please wait..." : forgotPasswordStep === "request" ? "Send Code" : "Reset Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForgotPasswordModal;
