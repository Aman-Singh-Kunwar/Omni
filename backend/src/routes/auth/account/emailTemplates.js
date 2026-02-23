function getRoleLabel(role) {
  if (role === "customer") {
    return "Customer";
  }
  if (role === "broker") {
    return "Broker";
  }
  if (role === "worker") {
    return "Worker";
  }
  return "User";
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildAccountDeletionEmail(name, role) {
  const safeName = String(name || "User").trim() || "User";
  const roleLabel = getRoleLabel(role);
  const subject = `Your Omni ${roleLabel} account has been deleted`;
  const text = `Hello ${safeName},

This is a confirmation that your Omni ${roleLabel} account credentials were deleted successfully.

If you did not perform this action, contact support immediately.

You can create a new account again with the same email whenever needed.

Omni Team`;

  const html = `
    <div style="background:#f8fafc;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <div style="background:#2563eb;padding:18px 24px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;line-height:1.3;font-weight:700;">Omni</h1>
        </div>
        <div style="padding:24px;">
          <h2 style="margin:0 0 12px;color:#0f172a;font-size:22px;line-height:1.3;">Account Deletion Confirmed</h2>
          <p style="margin:0 0 14px;color:#0f172a;font-size:15px;line-height:1.6;">Hello ${escapeHtml(safeName)},</p>
          <p style="margin:0 0 14px;color:#0f172a;font-size:15px;line-height:1.7;">
            Your Omni <strong>${escapeHtml(roleLabel)}</strong> account credentials were deleted successfully.
          </p>
          <p style="margin:0 0 10px;color:#475569;font-size:13px;line-height:1.7;">
            If this action was not performed by you, contact support immediately.
          </p>
          <p style="margin:0;color:#475569;font-size:13px;line-height:1.7;">
            You can sign up again using the same email at any time.
          </p>
        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
}

export { buildAccountDeletionEmail };
