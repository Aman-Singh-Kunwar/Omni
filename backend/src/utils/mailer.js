import logger from "./logger.js";

function getSenderEmail() {
  return String(process.env.SENDER_EMAIL || "").trim();
}

function getBrevoApiKey() {
  return String(process.env.BREVO_API_KEY || "").trim();
}

async function sendMail({ to, subject, text, html }) {
  const recipient = String(to || "").trim().toLowerCase();
  if (!recipient) {
    const error = new Error("Email recipient is required.");
    error.statusCode = 400;
    throw error;
  }

  const apiKey = getBrevoApiKey();
  if (!apiKey) {
    const error = new Error("Email sender is not configured. Set BREVO_API_KEY.");
    error.statusCode = 500;
    throw error;
  }

  const from = getSenderEmail();
  const normalizedText = String(text || "").trim();
  const normalizedHtml = String(html || "").trim();

  if (!normalizedText && !normalizedHtml) {
    const error = new Error("Email content is required. Provide text or html.");
    error.statusCode = 400;
    throw error;
  }

  const payload = {
    sender: { email: from },
    to: [{ email: recipient }],
    subject: String(subject || "").trim() || "Omni Notification"
  };

  if (normalizedHtml) {
    payload.htmlContent = normalizedHtml;
  }
  if (normalizedText) {
    payload.textContent = normalizedText;
  }

  let response;
  try {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "api-key": apiKey,
        "content-type": "application/json"
      },
      body: JSON.stringify(payload)
    });
  } catch (fetchError) {
    logger.error("Email send failed", {
      to: recipient,
      subject: String(subject || ""),
      message: fetchError?.message || "Network error reaching Brevo API"
    });
    throw fetchError;
  }

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = data.message || `Brevo API error: ${response.status}`;
    logger.error("Email send failed", {
      to: recipient,
      subject: String(subject || ""),
      message
    });
    const error = new Error(message);
    throw error;
  }
}

export { sendMail };
