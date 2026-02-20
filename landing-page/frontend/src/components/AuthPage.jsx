import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import omniLogo from "../assets/images/omni-logo.png";
import { roleList, roleMeta } from "../constants/roles";

function AuthPage({ mode = "login", apiBase, customerUrl, workerUrl, brokerUrl }) {
  const navigate = useNavigate();
  const location = useLocation();
  const roleFromUrl = useMemo(() => {
    const role = new URLSearchParams(location.search).get("role");
    return roleList.includes(role) ? role : "customer";
  }, [location.search]);
  const [selectedRole, setSelectedRole] = useState(roleFromUrl);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    verificationCode: ""
  });
  const [verification, setVerification] = useState({
    pending: false,
    email: "",
    role: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: "", info: "" });
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState("request");
  const [forgotPasswordRole, setForgotPasswordRole] = useState("customer");
  const [forgotPasswordForm, setForgotPasswordForm] = useState({
    email: "",
    verificationCode: "",
    newPassword: "",
    confirmNewPassword: ""
  });
  const [forgotPasswordStatus, setForgotPasswordStatus] = useState({ loading: false, error: "", info: "" });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState(false);

  useEffect(() => {
    setSelectedRole(roleFromUrl);
  }, [roleFromUrl]);

  const getRoleUrl = (role) => {
    if (role === "customer") {
      return customerUrl;
    }
    if (role === "broker") {
      return brokerUrl;
    }
    return workerUrl;
  };

  const normalizeEmail = () => String(form.email || "").trim().toLowerCase();

  const updateRoleQuery = (role) => {
    const params = new URLSearchParams(location.search);
    params.set("role", role);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const redirectToRoleApp = (user, token) => {
    const resolvedRole = user?.role || verification.role || selectedRole;
    const target = getRoleUrl(resolvedRole);
    if (!target || !token) {
      throw new Error("Unable to continue login.");
    }
    window.location.href = `${target}/?authToken=${encodeURIComponent(token)}`;
  };

  const submitSignupRequest = async () => {
    const payload = {
      name: form.name,
      email: form.email,
      password: form.password,
      role: selectedRole
    };

    const response = await fetch(`${apiBase}/auth/signup`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Signup failed.");
    }

    if (data.pendingVerification) {
      setVerification({
        pending: true,
        email: normalizeEmail(),
        role: selectedRole
      });
      setStatus({
        loading: false,
        error: "",
        info: data.message || "Verification code sent to your email."
      });
      return;
    }

    redirectToRoleApp(data.user, data.token);
  };

  const submitSignupVerification = async () => {
    const verificationCode = String(form.verificationCode || "")
      .replace(/\s+/g, "")
      .trim();
    if (!verificationCode) {
      setStatus({ loading: false, error: "Please enter the verification code.", info: "" });
      return;
    }

    const response = await fetch(`${apiBase}/auth/signup/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: verification.email,
        role: verification.role,
        verificationCode
      })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Verification failed.");
    }

    redirectToRoleApp(data.user, data.token);
  };

  const resendVerificationCode = async () => {
    if (status.loading) {
      return;
    }

    setStatus({ loading: true, error: "", info: "" });
    try {
      await submitSignupRequest();
    } catch (error) {
      setStatus({ loading: false, error: error.message || "Unable to resend verification code.", info: "" });
    }
  };

  const openForgotPasswordModal = () => {
    setForgotPasswordOpen(true);
    setForgotPasswordStep("request");
    setForgotPasswordRole(selectedRole);
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
      const response = await fetch(`${apiBase}/auth/forgot-password/request`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, role: forgotPasswordRole })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to send reset code.");
      }

      setForgotPasswordStep("verify");
      setForgotPasswordForm((prev) => ({ ...prev, email }));
      setForgotPasswordStatus({
        loading: false,
        error: "",
        info: data.message || "If the account exists, a reset code has been sent."
      });
    } catch (error) {
      setForgotPasswordStatus({ loading: false, error: error.message || "Unable to send reset code.", info: "" });
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
      const response = await fetch(`${apiBase}/auth/forgot-password/verify`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          role: forgotPasswordRole,
          verificationCode,
          newPassword
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Unable to reset password.");
      }
      closeForgotPasswordModal();
      setStatus({
        loading: false,
        error: "",
        info: data.message || "Password reset successful. You can now log in."
      });
    } catch (error) {
      setForgotPasswordStatus({ loading: false, error: error.message || "Unable to reset password.", info: "" });
    }
  };

  const submitAuth = async () => {
    if (!selectedRole) {
      return;
    }

    if (!form.email || !form.password || (mode === "signup" && !verification.pending && (!form.name || !form.confirmPassword))) {
      setStatus({ loading: false, error: "Please fill all required fields.", info: "" });
      return;
    }
    if (mode === "signup" && !verification.pending && form.password !== form.confirmPassword) {
      setStatus({ loading: false, error: "Passwords do not match.", info: "" });
      return;
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

      const response = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          role: selectedRole
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Authentication failed.");
      }

      redirectToRoleApp(data.user, data.token);
    } catch (error) {
      setStatus({ loading: false, error: error.message, info: "" });
    }
  };

  const roleCards = roleList.map((role) => ({
    id: role,
    ...roleMeta[role]
  }));

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="grid gap-8 lg:grid-cols-5">
          <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8 lg:col-span-2">
            <div className="mb-6 flex items-center space-x-2">
              <img src={omniLogo} alt="Omni Logo" className="h-8 w-8" />
              <h1 className="text-2xl font-bold text-gray-900">Omni</h1>
            </div>

            <h2 className="text-2xl font-bold text-slate-900">{mode === "login" ? "Login" : "Create Account"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "login"
                ? "Login to continue to your dashboard."
                : "Sign up with your role to get started."}
            </p>

            <div className="mt-6 space-y-4">
              {mode === "signup" && !verification.pending && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                  <input
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  disabled={mode === "signup" && verification.pending}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  disabled={mode === "signup" && verification.pending}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your password"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={showPassword}
                  disabled={mode === "signup" && verification.pending}
                  onChange={(event) => setShowPassword(event.target.checked)}
                />
                Show password
              </label>
              {mode === "signup" && !verification.pending && (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Confirm Password</label>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={form.confirmPassword}
                      onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      placeholder="Type password again"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={showConfirmPassword}
                      onChange={(event) => setShowConfirmPassword(event.target.checked)}
                    />
                    Show confirm password
                  </label>
                </>
              )}
              {mode === "signup" && verification.pending && (
                <>
                  <p className="rounded bg-blue-50 p-2 text-sm text-blue-700">
                    Verification code sent to <strong>{verification.email}</strong>. Enter it below to complete signup.
                  </p>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Verification Code</label>
                    <input
                      type="text"
                      value={form.verificationCode}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          verificationCode: event.target.value.replace(/[^0-9]/g, "").slice(0, 6)
                        }))
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 tracking-[0.3em]"
                      placeholder="123456"
                      maxLength={6}
                    />
                  </div>
                  <div className="flex flex-col items-start gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <button type="button" onClick={resendVerificationCode} className="font-semibold text-blue-600 hover:text-blue-700">
                      Send code again
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setVerification({ pending: false, email: "", role: "" });
                        setForm((prev) => ({ ...prev, verificationCode: "" }));
                        setStatus({ loading: false, error: "", info: "" });
                      }}
                      className="font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Use different details
                    </button>
                  </div>
                </>
              )}
            </div>

            {status.info && <p className="mt-4 rounded bg-emerald-50 p-2 text-sm text-emerald-700">{status.info}</p>}
            {status.error && <p className="mt-4 rounded bg-red-50 p-2 text-sm text-red-700">{status.error}</p>}

            <button
              type="button"
              disabled={status.loading}
              onClick={submitAuth}
              className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {status.loading ? "Please wait..." : mode === "login" ? "Login" : verification.pending ? "Verify & Sign Up" : "Sign Up"}
            </button>

            <p className="mt-4 text-center text-sm text-slate-500">
              {mode === "login" ? "Need account?" : "Already have an account?"}
              <Link
                to={`/${mode === "login" ? "signup" : "login"}?role=${selectedRole}`}
                className="ml-1 font-semibold text-blue-600 hover:underline"
              >
                {mode === "login" ? "Sign Up" : "Login"}
              </Link>
            </p>
            {mode === "login" && (
              <p className="mt-3 text-center text-sm">
                <button type="button" onClick={openForgotPasswordModal} className="font-semibold text-blue-600 hover:text-blue-700">
                  Forgot password?
                </button>
              </p>
            )}
          </section>

          <section className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8 lg:col-span-3">
            <h3 className="text-lg font-bold text-slate-900">Choose Role</h3>
            <p className="mt-1 text-sm text-slate-500">This sets your account type and destination frontend.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {roleCards.map((role) => {
                const Icon = role.icon;
                const selected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    disabled={verification.pending}
                    onClick={() => {
                      setSelectedRole(role.id);
                      updateRoleQuery(role.id);
                    }}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      selected ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 hover:border-slate-300"
                    } disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-r ${role.color}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h4 className="font-semibold text-slate-900">{role.title}</h4>
                    <p className="mt-1 text-xs text-slate-600">{role.description}</p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
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
                    <input
                      type={showForgotPassword ? "text" : "password"}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      value={forgotPasswordForm.newPassword}
                      onChange={(event) => setForgotPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={showForgotPassword}
                      onChange={(event) => setShowForgotPassword(event.target.checked)}
                    />
                    Show new password
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">Confirm New Password</span>
                    <input
                      type={showForgotConfirmPassword ? "text" : "password"}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                      value={forgotPasswordForm.confirmNewPassword}
                      onChange={(event) => setForgotPasswordForm((prev) => ({ ...prev, confirmNewPassword: event.target.value }))}
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={showForgotConfirmPassword}
                      onChange={(event) => setShowForgotConfirmPassword(event.target.checked)}
                    />
                    Show confirm password
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
      )}
    </div>
  );
}

export default AuthPage;
