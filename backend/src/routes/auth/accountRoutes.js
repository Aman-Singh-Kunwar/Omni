import express from "express";
import { sendMail } from "../../utils/mailer.js";
import {
  bcrypt,
  logger,
  requireAuth,
  syncUserFamilyByEmail
} from "./shared.js";

const router = express.Router();

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

router.post("/auth/update-password", requireAuth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      logger.warn("Update password failed: missing fields", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(400).json({ message: "Current password and new password are required." });
    }
    if (newPassword.length < 6) {
      logger.warn("Update password failed: short password", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(400).json({ message: "New password must be at least 6 characters." });
    }
    if (req.authUser.deletedCredentialsAt) {
      logger.warn("Update password failed: credentials deleted", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(403).json({ message: "Account credentials deleted. Please sign up again to regain access." });
    }

    const validCurrentPassword = await bcrypt.compare(currentPassword, req.authUser.passwordHash);
    if (!validCurrentPassword) {
      logger.warn("Update password failed: invalid current password", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(401).json({ message: "Current password is incorrect." });
    }

    const isSamePassword = await bcrypt.compare(newPassword, req.authUser.passwordHash);
    if (isSamePassword) {
      logger.warn("Update password failed: same password", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(409).json({ message: "New password must be different from current password." });
    }

    req.authUser.passwordHash = await bcrypt.hash(newPassword, 10);
    await req.authUser.save();
    await syncUserFamilyByEmail(req.authUser);
    logger.info("Password updated successfully", {
      userId: String(req.authUser._id),
      email: req.authUser.email,
      role: req.authUser.role
    });

    return res.json({ message: "Password updated successfully." });
  } catch (error) {
    logger.error("Update password failed", {
      userId: String(req.authUser?._id || ""),
      role: req.authUser?.role,
      message: error?.message || "Unknown error"
    });
    return next(error);
  }
});

router.post("/auth/delete-account", requireAuth, async (req, res, next) => {
  try {
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "");

    if (!username || !password) {
      logger.warn("Delete account failed: missing fields", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(400).json({ message: "Username and password are required." });
    }

    if (username !== String(req.authUser.name || "").trim()) {
      logger.warn("Delete account failed: username mismatch", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(401).json({ message: "Username does not match this account." });
    }

    const validPassword = await bcrypt.compare(password, req.authUser.passwordHash);
    if (!validPassword) {
      logger.warn("Delete account failed: invalid password", {
        userId: String(req.authUser?._id || ""),
        role: req.authUser?.role
      });
      return res.status(401).json({ message: "Invalid password." });
    }

    const revokedPasswordHash = await bcrypt.hash(`deleted-${String(req.authUser._id)}-${Date.now()}`, 10);

    req.authUser.passwordHash = revokedPasswordHash;
    req.authUser.deletedCredentialsAt = new Date();
    req.authUser.lastLoginAt = null;
    if (req.authUser.role === "worker") {
      if (!req.authUser.workerProfile) {
        req.authUser.workerProfile = {};
      }
      // Deleted workers should not appear in provider lists and counts.
      req.authUser.workerProfile.isAvailable = false;
    }
    await req.authUser.save();

    try {
      const emailContent = buildAccountDeletionEmail(req.authUser.name, req.authUser.role);
      await sendMail({
        to: req.authUser.email,
        subject: emailContent.subject,
        text: emailContent.text,
        html: emailContent.html
      });
    } catch (emailError) {
      logger.warn("Account deletion email failed", {
        userId: String(req.authUser._id),
        email: req.authUser.email,
        role: req.authUser.role,
        message: emailError?.message || "Unknown account deletion email error"
      });
    }

    logger.info("Account credentials deleted", {
      userId: String(req.authUser._id),
      email: req.authUser.email,
      role: req.authUser.role
    });

    return res.json({
      message: "Account credentials deleted. Please sign up again to regain access."
    });
  } catch (error) {
    logger.error("Delete account failed", {
      userId: String(req.authUser?._id || ""),
      role: req.authUser?.role,
      message: error?.message || "Unknown error"
    });
    return next(error);
  }
});

router.post("/auth/logout", requireAuth, async (req, res, next) => {
  try {
    logger.info("Logout successful", {
      userId: String(req.authUser._id),
      email: req.authUser.email,
      role: req.authUser.role
    });
    return res.json({ message: "Logged out successfully." });
  } catch (error) {
    logger.error("Login failed with exception", {
      email: String(req.body?.email || "").trim().toLowerCase(),
      role: String(req.body?.role || "").trim(),
      message: error?.message || "Unknown login error"
    });
    return next(error);
  }
});

export default router;
