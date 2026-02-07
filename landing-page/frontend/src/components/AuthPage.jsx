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
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: "" });

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

  const updateRoleQuery = (role) => {
    const params = new URLSearchParams(location.search);
    params.set("role", role);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const submitAuth = async () => {
    if (!selectedRole) {
      return;
    }

    if (!form.email || !form.password || (mode === "signup" && (!form.name || !form.confirmPassword))) {
      setStatus({ loading: false, error: "Please fill all required fields." });
      return;
    }
    if (mode === "signup" && form.password !== form.confirmPassword) {
      setStatus({ loading: false, error: "Passwords do not match." });
      return;
    }

    setStatus({ loading: true, error: "" });
    try {
      const endpoint = mode === "signup" ? "/auth/signup" : "/auth/login";
      const payload =
        mode === "signup"
          ? {
              name: form.name,
              email: form.email,
              password: form.password,
              role: selectedRole
            }
          : {
              email: form.email,
              password: form.password,
              role: selectedRole
            };

      const response = await fetch(`${apiBase}${endpoint}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Authentication failed.");
      }

      const role = data.user?.role || selectedRole;
      const token = data.token;
      const target = getRoleUrl(role);
      if (!target || !token) {
        throw new Error("Unable to continue login.");
      }

      window.location.href = `${target}/?authToken=${encodeURIComponent(token)}`;
    } catch (error) {
      setStatus({ loading: false, error: error.message });
    }
  };

  const roleCards = roleList.map((role) => ({
    id: role,
    ...roleMeta[role]
  }));

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="mx-auto max-w-5xl">
        <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <div className="grid gap-8 lg:grid-cols-5">
          <section className="rounded-2xl border bg-white p-8 shadow-sm lg:col-span-2">
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
              {mode === "signup" && (
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
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your password"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
                Show password
              </label>
              {mode === "signup" && (
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
            </div>

            {status.error && <p className="mt-4 rounded bg-red-50 p-2 text-sm text-red-700">{status.error}</p>}

            <button
              type="button"
              disabled={status.loading}
              onClick={submitAuth}
              className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
            >
              {status.loading ? "Please wait..." : mode === "login" ? "Login" : "Sign Up"}
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
          </section>

          <section className="rounded-2xl border bg-white p-8 shadow-sm lg:col-span-3">
            <h3 className="text-lg font-bold text-slate-900">Choose Role</h3>
            <p className="mt-1 text-sm text-slate-500">This sets your account type and destination frontend.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {roleCards.map((role) => {
                const Icon = role.icon;
                const selected = selectedRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(role.id);
                      updateRoleQuery(role.id);
                    }}
                    className={`rounded-xl border p-4 text-left transition-all ${
                      selected ? "border-blue-500 bg-blue-50 shadow-sm" : "border-slate-200 hover:border-slate-300"
                    }`}
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
    </div>
  );
}

export default AuthPage;
