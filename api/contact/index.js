// api/contact/index.js
import sgMail from "@sendgrid/mail";

export default async function (context, req) {
  try {
    // ✅ Read env vars (set these in Azure Static Web App → Environment variables)
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const FROM_EMAIL = process.env.FROM_EMAIL; // must be a verified sender in SendGrid
    const TO_EMAIL = process.env.TO_EMAIL;     // where you want to receive the message

    // ✅ Validate env vars
    const missing = [];
    if (!SENDGRID_API_KEY) missing.push("SENDGRID_API_KEY");
    if (!FROM_EMAIL) missing.push("FROM_EMAIL");
    if (!TO_EMAIL) missing.push("TO_EMAIL");

    if (missing.length > 0) {
      context.res = {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: {
          error: "Server is not configured (missing email settings).",
          missing,
        },
      };
      return;
    }

    sgMail.setApiKey(SENDGRID_API_KEY);

    // ✅ Parse body (Static Web Apps usually gives req.body already as object)
    const body = req.body || {};
    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const subject = (body.subject || "").trim();
    const message = (body.message || "").trim();

    // ✅ Validate request
    if (!name || !email || !subject || !message) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: {
          error: "Missing required fields",
          required: ["name", "email", "subject", "message"],
          got: { name: !!name, email: !!email, subject: !!subject, message: !!message },
        },
      };
      return;
    }

    // ✅ Email content
    const text = `New contact form submission:

Name: ${name}
Email: ${email}
Subject: ${subject}

Message:
${message}
`;

    const html = `
      <h2>New contact form submission</h2>
      <p><strong>Name:</strong> ${escapeHtml(name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(email)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
      <p><strong>Message:</strong><br/>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
    `;

    // ✅ Send email (FROM must be verified in SendGrid)
    await sgMail.send({
      to: TO_EMAIL,
      from: FROM_EMAIL,
      replyTo: email, // lets you hit Reply and respond to the user
      subject: `Contact Form: ${subject}`,
      text,
      html,
    });

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { ok: true, message: "Email sent successfully" },
    };
  } catch (err) {
    // Helpful debugging info without exposing secrets
    const statusCode = err?.code || err?.response?.statusCode || 500;

    context.log("SendGrid error:", {
      message: err?.message,
      statusCode,
      responseBody: err?.response?.body,
    });

    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: {
        error: "Failed to send email",
        details: err?.response?.body || err?.message || "Unknown error",
      },
    };
  }
}

// Small helper to avoid HTML injection
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
