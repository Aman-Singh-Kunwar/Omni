import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../api";

const role = "broker";

function BrokerAuthPage({ mode = "login", onSuccess }) {
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
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState({ loading: false, error: "" });

  const submit = async () => {
    if (!form.email || !form.password || (mode === "signup" && !form.name)) {
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
          ? { name: form.name, email: form.email, password: form.password, role }
          : { email: form.email, password: form.password, role };

      const response = await api.post(endpoint, payload);
      onSuccess({ user: response.data.user, token: response.data.token || "" });
      navigate(redirectPath, { replace: true });
    } catch (error) {
      setStatus({ loading: false, error: error.response?.data?.message || "Authentication failed." });
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
    <div className="min-h-screen bg-emerald-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border">
        <button
          type="button"
          onClick={handleBack}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to preview
        </button>

        <h1 className="text-center text-2xl font-bold text-slate-900">Broker {mode === "login" ? "Login" : "Sign Up"}</h1>
        <p className="mt-1 text-center text-sm text-slate-500">
          {mode === "login" ? "Login to access your dashboard." : "Create a broker account to continue."}
        </p>

        <div className="mt-6 space-y-4">
          {mode === "signup" && (
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
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Password</span>
            <input
              type={showPassword ? "text" : "password"}
              className="w-full rounded-lg border px-3 py-2"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={showPassword} onChange={(event) => setShowPassword(event.target.checked)} />
            Show password
          </label>
          {mode === "signup" && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-slate-700">Confirm Password</span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="w-full rounded-lg border px-3 py-2"
                  value={form.confirmPassword}
                  onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-600">
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
          onClick={submit}
          disabled={status.loading}
          className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
        >
          {status.loading ? "Please wait..." : mode === "login" ? "Login" : "Sign Up"}
        </button>

        <p className="mt-4 text-center text-sm text-slate-500">
          {switchText}
          <Link to={`${switchPath}?redirect=${encodeURIComponent(redirectPath)}`} className="ml-1 font-semibold text-emerald-600 hover:underline">
            {switchLabel}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default BrokerAuthPage;
