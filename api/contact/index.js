// api/contact/index.js
const sgMail = require("@sendgrid/mail");

module.exports = async function (context, req) {
  try {
    const { name, email, subject, message } = req.body || {};

    if (!name || !email || !subject || !message) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: { error: "Missing required fields." }
      };
      return;
    }

    // environment variables (set in Azure Static Web App Configuration)
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const TO_EMAIL = process.env.CONTACT_TO_EMAIL;     // where you receive messages
    const FROM_EMAIL = process.env.CONTACT_FROM_EMAIL; // verified sender in SendGrid

    if (!SENDGRID_API_KEY || !TO_EMAIL || !FROM_EMAIL) {
      context.res = {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: { error: "Server is not configured (missing email settings)." }
      };
      return;
    }

    sgMail.setApiKey(SENDGRID_API_KEY);

    await sgMail.send({
      to: TO_EMAIL,
      from: FROM_EMAIL,
      replyTo: email, // so you can reply directly to the user
      subject: `AddisGo Contact: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
      html: `
        <h2>AddisGo Contact Form</h2>
        <p><b>Name:</b> ${escapeHtml(name)}</p>
        <p><b>Email:</b> ${escapeHtml(email)}</p>
        <p><b>Subject:</b> ${escapeHtml(subject)}</p>
        <p><b>Message:</b><br/>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      `
    });

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { ok: true }
    };
  } catch (err) {
    context.log("Contact function error:", err);
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: "Failed to send message." }
    };
  }
};

function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
