import React from "react";
import ToggleRow from "./ToggleRow";
import { useAutoDismissStatus } from "../hooks/useAutoDismissNotice";

function NotificationSettingsSection({
  theme,
  showForm,
  setShowForm,
  settings,
  toggleSetting,
  status,
  setStatus,
  onSave,
  labels
}) {
  const [quietHoursStart, setQuietHoursStart] = React.useState(settings.quietHoursStart || "22:00");
  const [quietHoursEnd, setQuietHoursEnd] = React.useState(settings.quietHoursEnd || "08:00");
  const [pushEnabled, setPushEnabled] = React.useState(settings.pushEnabled !== false);
  const [emailEnabled, setEmailEnabled] = React.useState(settings.emailEnabled !== false);
  const [smsEnabled, setSmsEnabled] = React.useState(settings.smsEnabled !== false);
  const [criticalAlertOverride, setCriticalAlertOverride] = React.useState(settings.criticalAlertOverride !== false);
  const [weekendOnlyReminders, setWeekendOnlyReminders] = React.useState(settings.weekendOnlyReminders === true);
  
  useAutoDismissStatus(status, setStatus);

  const handleSaveEnhanced = async () => {
    const enhancedSettings = {
      ...settings,
      quietHoursStart,
      quietHoursEnd,
      pushEnabled,
      emailEnabled,
      smsEnabled,
      criticalAlertOverride,
      weekendOnlyReminders
    };
    onSave?.(enhancedSettings);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-900">Notification Preferences</p>
        <button
          type="button"
          onClick={() => {
            setShowForm((prev) => !prev);
            setStatus({ loading: false, error: "", success: "" });
          }}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold ${theme.openButtonClass}`}
        >
          {showForm ? "Cancel" : "Open"}
        </button>
      </div>

      {!showForm && status.success && (
        <p className="mt-3 rounded bg-green-100 px-3 py-2 text-xs text-green-700">{status.success}</p>
      )}
      {!showForm && status.error && (
        <p className="mt-3 rounded bg-red-100 px-3 py-2 text-xs text-red-700">{status.error}</p>
      )}

      {showForm && (
        <div className="mt-4 space-y-4">
          {/* Master notification toggle */}
          <ToggleRow
            title="Notifications"
            description="Turn all app notifications on or off."
            checked={settings.notificationsEnabled}
            onChange={() => toggleSetting("notificationsEnabled")}
            accentClass={theme.accentBgClass}
          />

          {settings.notificationsEnabled ? (
            <>
              {/* Notification types */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Notification Categories</p>
                <ToggleRow
                  title={labels.jobRequests?.title || "Job Request Notifications"}
                  description={labels.jobRequests?.description || labels.jobRequests}
                  checked={settings.jobRequests}
                  onChange={() => toggleSetting("jobRequests")}
                  accentClass={theme.accentBgClass}
                />
                <ToggleRow
                  title={labels.payments?.title || "Payment Notifications"}
                  description={labels.payments?.description || labels.payments}
                  checked={settings.payments}
                  onChange={() => toggleSetting("payments")}
                  accentClass={theme.accentBgClass}
                />
                <ToggleRow
                  title={labels.jobAlerts?.title || "Job Alerts"}
                  description={labels.jobAlerts?.description || labels.jobAlerts}
                  checked={settings.jobAlerts}
                  onChange={() => toggleSetting("jobAlerts")}
                  accentClass={theme.accentBgClass}
                />
                <ToggleRow
                  title={labels.reminders?.title || "Reminder Notifications"}
                  description={labels.reminders?.description || labels.reminders}
                  checked={settings.reminders}
                  onChange={() => toggleSetting("reminders")}
                  accentClass={theme.accentBgClass}
                />
              </div>

              {/* Notification channels */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Notification Channels</p>
                <ToggleRow
                  title="Push Notifications"
                  description="Receive push notifications on your device."
                  checked={pushEnabled}
                  onChange={() => setPushEnabled(!pushEnabled)}
                  accentClass={theme.accentBgClass}
                />
                <ToggleRow
                  title="Email Notifications"
                  description="Receive email notifications to your account email."
                  checked={emailEnabled}
                  onChange={() => setEmailEnabled(!emailEnabled)}
                  accentClass={theme.accentBgClass}
                />
                <ToggleRow
                  title="SMS Notifications"
                  description="Receive SMS notifications on your phone."
                  checked={smsEnabled}
                  onChange={() => setSmsEnabled(!smsEnabled)}
                  accentClass={theme.accentBgClass}
                />
              </div>

              {/* Advanced options */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Advanced Options</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900">Quiet Hours</p>
                      <p className="text-xs text-gray-600">No notifications between these times</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="time"
                        value={quietHoursStart}
                        onChange={(e) => setQuietHoursStart(e.target.value)}
                        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                      <span className="text-xs text-gray-500">to</span>
                      <input
                        type="time"
                        value={quietHoursEnd}
                        onChange={(e) => setQuietHoursEnd(e.target.value)}
                        className="w-20 px-2 py-1 text-xs border border-gray-300 rounded"
                      />
                    </div>
                  </div>
                  
                  <ToggleRow
                    title="Weekend-Only Reminders"
                    description="Only send reminders on weekends."
                    checked={weekendOnlyReminders}
                    onChange={() => setWeekendOnlyReminders(!weekendOnlyReminders)}
                    accentClass={theme.accentBgClass}
                  />
                  
                  <ToggleRow
                    title="Critical Alerts Override"
                    description="Critical alerts bypass quiet hours."
                    checked={criticalAlertOverride}
                    onChange={() => setCriticalAlertOverride(!criticalAlertOverride)}
                    accentClass={theme.accentBgClass}
                  />
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-500 px-1">Turn notifications ON to configure job requests, payments, and alerts.</p>
          )}

          {status.error && <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700">{status.error}</p>}
          {status.success && <p className="rounded bg-green-100 px-3 py-2 text-xs text-green-700">{status.success}</p>}

          <button
            type="button"
            onClick={handleSaveEnhanced}
            disabled={status.loading}
            className={`w-full rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-70 ${theme.primaryButtonClass}`}
          >
            {status.loading ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationSettingsSection;
