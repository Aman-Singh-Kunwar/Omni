import nodemailer from "nodemailer";
import logger from "./logger.js";

let transporterCache = null;
let cacheKey = "";

function getMailUser() {
  return String(process.env.MAIL_USER || "").trim();
}

function getMailAppPassword() {
  return String(process.env.MAIL_APP_PASSWORD || "")
    .replace(/\s+/g, "")
    .trim();
}

function getFromAddress() {
  const configured = String(process.env.MAIL_FROM || "").trim();
  return configured || getMailUser();
}

function getTransportCacheKey(user, password) {
  return `${user}:${password ? "configured" : "missing"}`;
}

function getTransporter() {
  const user = getMailUser();
  const pass = getMailAppPassword();
  const nextCacheKey = getTransportCacheKey(user, pass);

  if (transporterCache && cacheKey === nextCacheKey) {
    return transporterCache;
  }

  if (!user || !pass) {
    const error = new Error("Email sender is not configured. Set MAIL_USER and MAIL_APP_PASSWORD.");
    error.statusCode = 500;
    throw error;
  }

  transporterCache = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    family: 4
  });
  cacheKey = nextCacheKey;

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
  try {
    await transporter.sendMail({
      from: getFromAddress(),
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
