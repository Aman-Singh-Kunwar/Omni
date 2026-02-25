import nodemailer from "nodemailer";
import logger from "./logger.js";

let transporterCache = null;

function getSenderEmail() {
  return String(process.env.SENDER_EMAIL || "").trim();
}

function getTransporter() {
  if (transporterCache) {
    return transporterCache;
  }

  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim();

  if (!user || !pass) {
    const error = new Error("Email sender is not configured. Set SMTP_USER and SMTP_PASS.");
    error.statusCode = 500;
    throw error;
  }

  transporterCache = nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    secure: false,
    auth: { user, pass },
    family: 4
  });

  return transporterCache;
}

async function sendMail({ to, subject, text, html }) {
  const recipient = String(to || "").trim().toLowerCase();
  if (!recipient) {
    const error = new Error("Email recipient is required.");
    error.statusCode = 400;
    throw error;
  }

  const transporter = getTransporter();
  const from = getSenderEmail();

  try {
    await transporter.sendMail({
      from,
      to: recipient,
      subject: String(subject || "").trim() || "Omni Notification",
      text: String(text || "").trim(),
      html: String(html || "").trim() || undefined
    });
  } catch (error) {
    logger.error("Email send failed", {
      to: recipient,
      subject: String(subject || ""),
      message: error?.message || "Unknown mail error"
    });
    throw error;
  }
}

export { sendMail };
