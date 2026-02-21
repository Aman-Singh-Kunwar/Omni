import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api from "../../api";
import { toBooleanOrDefault, toShortErrorMessage } from "@shared/utils/common";
import NotificationSettingsSection from "@shared/settings/NotificationSettingsSection";
import AccountSettingsSection from "@shared/settings/AccountSettingsSection";

const NOTIFICATION_STORAGE_KEY = "omni:settings:worker:notifications";
const DEFAULT_NOTIFICATION_SETTINGS = {
  notificationsEnabled: true,
  jobRequests: true,
  payments: true,
  jobAlerts: true,
  reminders: false
};

const WORKER_THEME = {
  openButtonClass: "border-blue-200 text-blue-700 hover:bg-blue-50",
  accentBgClass: "bg-blue-600",
  primaryButtonClass: "bg-blue-600 hover:bg-blue-700"
};

function normalizeSettings(value) {
  const input = value && typeof value === "object" ? value : {};
  return {
    notificationsEnabled: toBooleanOrDefault(input.notificationsEnabled, DEFAULT_NOTIFICATION_SETTINGS.notificationsEnabled),
    jobRequests: toBooleanOrDefault(input.jobRequests, DEFAULT_NOTIFICATION_SETTINGS.jobRequests),
    payments: toBooleanOrDefault(input.payments, DEFAULT_NOTIFICATION_SETTINGS.payments),
    jobAlerts: toBooleanOrDefault(input.jobAlerts, DEFAULT_NOTIFICATION_SETTINGS.jobAlerts),
    reminders: toBooleanOrDefault(input.reminders, DEFAULT_NOTIFICATION_SETTINGS.reminders)
  };
}

function WorkerSettingsPage({ onLogout, authToken, userName = "" }) {
  const navigate = useNavigate();
  const handleBackClick = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
  };
  const [settings, setSettings] = useState(DEFAULT_NOTIFICATION_SETTINGS);
  const [showNotificationsForm, setShowNotificationsForm] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState({ loading: false, error: "", success: "" });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordStatus, setPasswordStatus] = useState({ loading: false, error: "", success: "" });
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deleteForm, setDeleteForm] = useState({ username: userName || "", password: "" });
  const [deleteStatus, setDeleteStatus] = useState({ loading: false, error: "", success: "" });

  useEffect(() => {
    try {
      const rawSettings = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
      const parsedSettings = rawSettings ? JSON.parse(rawSettings) : null;
      setSettings(normalizeSettings(parsedSettings));
    } catch (_error) {
      setSettings(DEFAULT_NOTIFICATION_SETTINGS);
    }
  }, []);

  const toggleSetting = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
    setNotificationStatus((prev) => ({ ...prev, error: "", success: "" }));
  };
  const toggleNotificationsForm = (update) => {
    setShowNotificationsForm((prev) => {
      const next = typeof update === "function" ? update(prev) : Boolean(update);
      if (next) {
        setShowPasswordForm(false);
        setShowDeleteForm(false);
      }
      return next;
    });
  };

  useEffect(() => {
    setDeleteForm((prev) => ({ ...prev, username: userName || prev.username || "" }));
  }, [userName]);

  const handleLogoutClick = async () => {
    if (typeof onLogout === "function") {
      await onLogout();
    }
  };

  const handleSaveNotificationSettings = async () => {
    setNotificationStatus({ loading: true, error: "", success: "" });
    try {
      localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(settings));
      if (authToken) {
        await api.put(
          "/profile/notifications",
          settings,
          {
            headers: { Authorization: `Bearer ${authToken}` }
          }
        );
      }
      setNotificationStatus({ loading: false, error: "", success: "Notification settings saved." });
      setShowNotificationsForm(false);
    } catch (error) {
      setNotificationStatus({
        loading: false,
        error: toShortErrorMessage(error.response?.data?.message, "Unable to save notification settings."),
        success: ""
      });
    }
  };

  const handleUpdatePassword = async () => {
    if (!authToken) {
      setPasswordStatus({ loading: false, error: "Please log in to update password.", success: "" });
      return;
    }

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordStatus({ loading: false, error: "All password fields are required.", success: "" });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ loading: false, error: "New password and confirm password do not match.", success: "" });
      return;
    }

    setPasswordStatus({ loading: true, error: "", success: "" });
    try {
      await api.post(
        "/auth/update-password",
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      setPasswordStatus({ loading: false, error: "", success: "Password updated successfully." });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setShowPasswordForm(false);
    } catch (error) {
      setPasswordStatus({
        loading: false,
        error: toShortErrorMessage(error.response?.data?.message, "Unable to update password."),
        success: ""
      });
    }
  };

  const handleDeleteAccount = async () => {
    if (!authToken) {
      setDeleteStatus({ loading: false, error: "Please log in to delete account.", success: "" });
      return;
    }

    if (!deleteForm.username || !deleteForm.password) {
      setDeleteStatus({ loading: false, error: "Username and password are required.", success: "" });
      return;
    }

    setDeleteStatus({ loading: true, error: "", success: "" });
    try {
      await api.post(
        "/auth/delete-account",
        {
          username: deleteForm.username,
          password: deleteForm.password
        },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      setDeleteStatus({ loading: false, error: "", success: "Account credentials deleted. Logging out..." });
      if (typeof onLogout === "function") {
        await onLogout();
      }
    } catch (error) {
      setDeleteStatus({
        loading: false,
        error: toShortErrorMessage(error.response?.data?.message, "Unable to delete account."),
        success: ""
      });
    }
  };

  return (
    <div className="bg-white/80 p-6 sm:p-8 rounded-xl shadow-sm border">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h3 className="text-xl font-bold text-gray-900">Settings</h3>
          <button
            type="button"
            onClick={handleBackClick}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 sm:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
        </div>
        <div className="space-y-6">
        <div className="border rounded-lg p-6 bg-white/60">
          <h4 className="font-semibold text-gray-900 mb-4">Notifications</h4>
          <NotificationSettingsSection
            theme={WORKER_THEME}
            showForm={showNotificationsForm}
            setShowForm={toggleNotificationsForm}
            settings={settings}
            toggleSetting={toggleSetting}
            status={notificationStatus}
            setStatus={setNotificationStatus}
            onSave={handleSaveNotificationSettings}
            labels={{
              jobRequests: "Get notified for new job requests from customers.",
              payments: "Get alerts when payment is credited for completed jobs.",
              jobAlerts: "Receive schedule alerts for upcoming and active jobs.",
              reminders: "Get reminders for profile and pending actions."
            }}
          />
        </div>

        <AccountSettingsSection
          theme={WORKER_THEME}
          onLogout={handleLogoutClick}
          showPasswordForm={showPasswordForm}
          setShowPasswordForm={setShowPasswordForm}
          passwordForm={passwordForm}
          setPasswordForm={setPasswordForm}
          passwordStatus={passwordStatus}
          setPasswordStatus={setPasswordStatus}
          onUpdatePassword={handleUpdatePassword}
          showDeleteForm={showDeleteForm}
          setShowDeleteForm={setShowDeleteForm}
          deleteForm={deleteForm}
          setDeleteForm={setDeleteForm}
          deleteStatus={deleteStatus}
          setDeleteStatus={setDeleteStatus}
          onDeleteAccount={handleDeleteAccount}
        />
      </div>
      </div>
    </div>
  );
}

export default WorkerSettingsPage;
