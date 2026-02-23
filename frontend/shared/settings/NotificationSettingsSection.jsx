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
  useAutoDismissStatus(status, setStatus);

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
        <div className="mt-4 space-y-3">
          <ToggleRow
            title="Notifications"
            description="Turn all app notifications on or off."
            checked={settings.notificationsEnabled}
            onChange={() => toggleSetting("notificationsEnabled")}
            accentClass={theme.accentBgClass}
          />

          {settings.notificationsEnabled ? (
            <>
              <ToggleRow
                title="Job Request Notifications"
                description={labels.jobRequests}
                checked={settings.jobRequests}
                onChange={() => toggleSetting("jobRequests")}
                accentClass={theme.accentBgClass}
              />
              <ToggleRow
                title="Payment Notifications"
                description={labels.payments}
                checked={settings.payments}
                onChange={() => toggleSetting("payments")}
                accentClass={theme.accentBgClass}
              />
              <ToggleRow
                title="Job Alerts"
                description={labels.jobAlerts}
                checked={settings.jobAlerts}
                onChange={() => toggleSetting("jobAlerts")}
                accentClass={theme.accentBgClass}
              />
              <ToggleRow
                title="Reminder Notifications"
                description={labels.reminders}
                checked={settings.reminders}
                onChange={() => toggleSetting("reminders")}
                accentClass={theme.accentBgClass}
              />
            </>
          ) : (
            <p className="text-xs text-gray-500 px-1">Turn notifications ON to configure job requests, payments, and alerts.</p>
          )}

          {status.error && <p className="rounded bg-red-100 px-3 py-2 text-xs text-red-700">{status.error}</p>}
          {status.success && <p className="rounded bg-green-100 px-3 py-2 text-xs text-green-700">{status.success}</p>}

          <button
            type="button"
            onClick={onSave}
            disabled={status.loading}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-70 ${theme.primaryButtonClass}`}
          >
            {status.loading ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      )}
    </div>
  );
}

export default NotificationSettingsSection;
