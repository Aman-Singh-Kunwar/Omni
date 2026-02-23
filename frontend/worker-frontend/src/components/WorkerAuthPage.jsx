import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import api from "../api";
import { useAutoDismissStatus } from "@shared/hooks/useAutoDismissNotice";

const role = "worker";

function WorkerAuthPage({ mode = "login", onSuccess }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = useMemo(() => {
    const raw = searchParams.get("redirect") || "/";
    return raw.startsWith("/") ? raw : "/";
  }, [searchParams]);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    brokerCode: "",
    verificationCode: ""
  });
  const [showReferralCodeField, setShowReferralCodeField] = useState(false);
  const [verification, setVerification] = useState({
    pending: false,
    email: "",
    role
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: "", info: "" });
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState("request");
  const [forgotPasswordForm, setForgotPasswordForm] = useState({
    email: "",
    verificationCode: "",
    newPassword: "",
    confirmNewPassword: ""
  });
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState({ loading: false, error: "", info: "" });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);
  useAutoDismissStatus(status, setStatus);
  useAutoDismissStatus(forgotPasswordStatus, setForgotPasswordStatus);

  useEffect(() => {
    setStatus({ loading: false, error: "", info: "" });
    setForgotPasswordStatus({ loading: false, error: "", info: "" });
    setForgotPasswordOpen(false);
  }, [mode]);

  const normalizeEmail = () => String(form.email || "").trim().toLowerCase();
  const normalizeBrokerCode = () =>
    String(form.brokerCode || "")
      .trim()
      .toUpperCase();

  const buildSignupPayload = () => {
    const normalizedBrokerCode = normalizeBrokerCode();
    return {
      name: form.name,
      email: form.email,
      password: form.password,
      role,
      ...(showReferralCodeField && normalizedBrokerCode ? { brokerCode: normalizedBrokerCode } : {})
    };
  };

  const submitSignupRequest = async () => {
    const payload = buildSignupPayload();
    const response = await api.post("/auth/signup", payload);

    if (response.data?.pendingVerification) {
      setVerification({
        pending: true,
        email: normalizeEmail(),
        role
      });
      setStatus({
        loading: false,
        error: "",
        info: response.data?.message || "Verification code sent to your email."
      });
      return;
    }

    onSuccess({ user: response.data.user, token: response.data.token || "", rememberMe });
    navigate(redirectPath, { replace: true });
  };

  const submitSignupVerification = async () => {
    const verificationCode = String(form.verificationCode || "")
      .replace(/\s+/g, "")
      .trim();
    if (!verificationCode) {
      setStatus({ loading: false, error: "Please enter the verification code.", info: "" });
      return;
    }

    const response = await api.post("/auth/signup/verify", {
      email: verification.email,
      role: verification.role,
      verificationCode
    });

    onSuccess({ user: response.data.user, token: response.data.token || "", rememberMe });
    navigate(redirectPath, { replace: true });
  };

  const resendVerificationCode = async () => {
    if (status.loading) {
      return;
    }

    setStatus({ loading: true, error: "", info: "" });
    try {
      await submitSignupRequest();
    } catch (error) {
      setStatus({ loading: false, error: error.response?.data?.message || "Unable to resend verification code.", info: "" });
    }
  };

  const openForgotPasswordModal = () => {
    setForgotPasswordOpen(true);
    setForgotPasswordStep("request");
    setForgotPasswordForm({
      email: normalizeEmail(),
      verificationCode: "",
      newPassword: "",
      confirmNewPassword: ""
    });
    setForgotPasswordStatus({ loading: false, error: "", info: "" });
    setShowForgotPassword(false);
    setShowForgotConfirmPassword(false);
  };

  const closeForgotPasswordModal = () => {
    setForgotPasswordOpen(false);
    setForgotPasswordStep("request");
    setForgotPasswordStatus({ loading: false, error: "", info: "" });
  };

  const submitForgotPasswordRequest = async () => {
    const email = String(forgotPasswordForm.email || "").trim().toLowerCase();
    if (!email) {
      setForgotPasswordStatus({ loading: false, error: "Please enter your email.", info: "" });
      return;
    }

    setForgotPasswordStatus({ loading: true, error: "", info: "" });
    try {
      const response = await api.post("/auth/forgot-password/request", { email, role });
      setForgotPasswordStep("verify");
      setForgotPasswordForm((prev) => ({ ...prev, email }));
      setForgotPasswordStatus({
        loading: false,
        error: "",
        info: response.data?.message || "If the account exists, a reset code has been sent."
      });
    } catch (error) {
      setForgotPasswordStatus({
        loading: false,
        error: error.response?.data?.message || "Unable to send reset code.",
        info: ""
      });
    }
  };

  const submitForgotPasswordVerification = async () => {
    const email = String(forgotPasswordForm.email || "").trim().toLowerCase();
    const verificationCode = String(forgotPasswordForm.verificationCode || "")
      .replace(/\s+/g, "")
      .trim();
    const newPassword = String(forgotPasswordForm.newPassword || "");
    const confirmNewPassword = String(forgotPasswordForm.confirmNewPassword || "");

    if (!email || !verificationCode || !newPassword || !confirmNewPassword) {
      setForgotPasswordStatus({ loading: false, error: "Please fill all fields.", info: "" });
      return;
    }
    if (!/^\d{6}$/.test(verificationCode)) {
      setForgotPasswordStatus({ loading: false, error: "Verification code must be 6 digits.", info: "" });
      return;
    }
    if (newPassword.length < 6) {
      setForgotPasswordStatus({ loading: false, error: "New password must be at least 6 characters.", info: "" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setForgotPasswordStatus({ loading: false, error: "Passwords do not match.", info: "" });
      return;
    }

    setForgotPasswordStatus({ loading: true, error: "", info: "" });
    try {
      const response = await api.post("/auth/forgot-password/verify", {
        email,
        role,
        verificationCode,
        newPassword
      });
      closeForgotPasswordModal();
      setStatus({
        loading: false,
        error: "",
        info: response.data?.message || "Password reset successful. You can now log in."
      });
    } catch (error) {
      setForgotPasswordStatus({
        loading: false,
        error: error.response?.data?.message || "Unable to reset password.",
        info: ""
      });
    }
  };

  const submit = async () => {
    if (!form.email || !form.password || (mode === "signup" && !verification.pending && !form.name)) {
      setStatus({ loading: false, error: "Please fill all required fields.", info: "" });
      return;
    }
    if (mode === "signup" && !verification.pending && form.password !== form.confirmPassword) {
      setStatus({ loading: false, error: "Passwords do not match.", info: "" });
      return;
    }
    if (mode === "signup" && !verification.pending && showReferralCodeField) {
      const normalizedBrokerCode = normalizeBrokerCode();
      if (!normalizedBrokerCode) {
        setStatus({ loading: false, error: "Please enter referral code or remove referral option.", info: "" });
        return;
      }
      if (!/^[A-Z0-9]{6}$/.test(normalizedBrokerCode)) {
        setStatus({ loading: false, error: "Referral code must be exactly 6 letters/numbers.", info: "" });
        return;
      }
    }

    setStatus({ loading: true, error: "", info: "" });
    try {
      if (mode === "signup") {
        if (verification.pending) {
          await submitSignupVerification();
        } else {
          await submitSignupRequest();
        }
        return;
      }

      const response = await api.post("/auth/login", { email: form.email, password: form.password, role });
      onSuccess({ user: response.data.user, token: response.data.token || "", rememberMe });
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setStatus({ loading: false, error: error.response?.data?.message || "Authentication failed.", info: "" });
    }
  };

  const switchPath = mode === "login" ? "/signup" : "/login";
  const switchLabel = mode === "login" ? "Sign Up" : "Login";
  const switchText = mode === "login" ? "Need account?" : "Already have an account?";
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(redirectPath, { replace: true });
  };

  return (
    <div className="min-h-screen bg-purple-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-sm border sm:p-8">
        <button
          type="button"
          onClick={handleBack}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to preview
        </button>

        <h1 className="text-center text-2xl font-bold text-slate-900">Worker {mode === "login" ? "Login" : "Sign Up"}</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          {mode === "login" ? "Login to access your dashboard." : "Create a worker account to continue."}
        </p>

        <div className="mt-6 space-y-4">
          {mode === "signup" && !verification.pending && (
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Name</span>
              <input
                className="w-full rounded-lg border px-3 py-2"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </label>
          )}
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              className="w-full rounded-lg border px-3 py-2"
              disabled={mode === "signup" && verification.pending}
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-lg border px-3 py-2 pr-10"
                disabled={mode === "signup" && verification.pending}
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={mode === "signup" && verification.pending}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 hover:text-slate-700 disabled:opacity-50"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          {mode === "signup" && !verification.pending && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Confirm Password</span>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full rounded-lg border px-3 py-2 pr-10"
                    value={form.confirmPassword}
                    onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 inline-flex items-center px-3 text-slate-500 hover:text-slate-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <button
                type="button"
                onClick={() => {
                  setShowReferralCodeField((prev) => !prev);
                  if (showReferralCodeField) {
                    setForm((prev) => ({ ...prev, brokerCode: "" }));
                  }
                }}
                className="text-left text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                {showReferralCodeField ? "Remove referral code" : "Add referral code"}
              </button>
              {showReferralCodeField && (
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Referral Code</span>
                  <input
                    type="text"
                    className="w-full rounded-lg border px-3 py-2 uppercase tracking-widest"
                    value={form.brokerCode}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        brokerCode: event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)
                      }))
                    }
                    placeholder="Enter 6-character code"
                    maxLength={6}
                  />
                </label>
              )}
            </>
          )}
          {mode === "signup" && verification.pending && (
            <>
              <p className="rounded bg-purple-50 px-3 py-2 text-sm text-purple-700">
                Verification code sent to <strong>{verification.email}</strong>. Enter the 6-digit code to finish signup.
              </p>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Verification Code</span>
                <input
                  type="text"
                  className="w-full rounded-lg border px-3 py-2 tracking-[0.3em]"
                  value={form.verificationCode}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      verificationCode: event.target.value.replace(/[^0-9]/g, "").slice(0, 6)
                    }))
                  }
                  maxLength={6}
                  placeholder="123456"
                />
              </label>
              <div className="flex flex-col items-start gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={resendVerificationCode} className="font-medium text-purple-600 hover:text-purple-700">
                  Send code again
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVerification({ pending: false, email: "", role });
                    setForm((prev) => ({ ...prev, verificationCode: "" }));
                    setShowReferralCodeField(false);
                    setStatus({ loading: false, error: "", info: "" });
                  }}
                  className="font-medium text-slate-500 hover:text-slate-700"
                >
                  Use different details
                </button>
              </div>
            </>
          )}
        </div>

        <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm text-slate-600 select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(event) => setRememberMe(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
          />
          Remember me
        </label>

        {status.info && <p className="mt-4 rounded bg-emerald-50 p-2 text-sm text-emerald-700">{status.info}</p>}
        {status.error && <p className="mt-4 rounded bg-red-50 p-2 text-sm text-red-700">{status.error}</p>}

        <button
          onClick={submit}
          disabled={status.loading}
          className="mt-6 w-full rounded-lg bg-purple-600 px-4 py-2 font-semibold text-white hover:bg-purple-700 disabled:opacity-70"
        >
          {status.loading ? "Please wait..." : mode === "login" ? "Login" : verification.pending ? "Verify & Sign Up" : "Sign Up"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          {switchText}
          <Link to={`${switchPath}?redirect=${encodeURIComponent(redirectPath)}`} className="ml-1 font-semibold text-purple-600 hover:underline">
            {switchLabel}
          </Link>
        </p>
        {mode === "login" && (
          <p className="mt-3 text-center text-sm">
            <button type="button" onClick={openForgotPasswordModal} className="font-semibold text-purple-600 hover:text-purple-700">
              Forgot password?
            </button>
          </p>
        )}
      </div>

      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto backdrop-blur-md px-4 py-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">Reset Password</h2>
            <p className="mt-1 text-sm text-slate-600">
              {forgotPasswordStep === "request"
                ? "Enter your account email to receive a reset code."
                : "Enter the code from email and set your new password."}
            </p>

            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
                <input
                  type="email"
                  className="w-full rounded-lg border px-3 py-2"
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
                      className="w-full rounded-lg border px-3 py-2 tracking-[0.3em]"
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
                        className="w-full rounded-lg border px-3 py-2 pr-10"
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
                        className="w-full rounded-lg border px-3 py-2 pr-10"
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
                  className="w-full rounded-lg border border-purple-300 px-4 py-2 text-sm font-semibold text-purple-700 hover:bg-purple-50 disabled:opacity-70"
                >
                  Resend Code
                </button>
              )}
              <button
                type="button"
                disabled={forgotPasswordStatus.loading}
                onClick={forgotPasswordStep === "request" ? submitForgotPasswordRequest : submitForgotPasswordVerification}
                className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-70"
              >
                {forgotPasswordStatus.loading ? "Please wait..." : forgotPasswordStep === "request" ? "Send Code" : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkerAuthPage;

