// Azure Static Web Apps (Azure Functions) endpoint:
// POST /api/contact
//
// Env vars you set in Azure Static Web App → Environment variables:
// SENDGRID_API_KEY
// TO_EMAIL=madanmeadow@gmail.com
// FROM_EMAIL=your_verified_sendgrid_sender_email
// TWILIO_ACCOUNT_SID
// TWILIO_AUTH_TOKEN
// TWILIO_FROM_NUMBER=+1218xxxxxxxx   (your Twilio number once bought)
// OWNER_PHONE=+16512637198

const sgMail = require("@sendgrid/mail");
const twilio = require("twilio");

function isEmail(value) {
  return typeof value === "string" && value.includes("@") && value.includes(".");
}

module.exports = async function (context, req) {
  try {
    if (req.method !== "POST") {
      context.res = { status: 405, jsonBody: { message: "Method not allowed" } };
      return;
    }

    const body = req.body || {};
    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const phone = (body.phone || "").trim();
    const subject = (body.subject || "New website inquiry").trim();
    const message = (body.message || "").trim();
    const consentToText = !!body.consentToText;

    if (!name || !message || (!email && !phone)) {
      context.res = {
        status: 400,
        jsonBody: { message: "Please include name, message, and at least email or phone." }
      };
      return;
    }

    // 1) EMAIL (owner) + auto-reply (customer)
    const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
    const TO_EMAIL = process.env.TO_EMAIL;
    const FROM_EMAIL = process.env.FROM_EMAIL;

    if (SENDGRID_API_KEY && TO_EMAIL && FROM_EMAIL) {
      sgMail.setApiKey(SENDGRID_API_KEY);

      // Owner email
      await sgMail.send({
        to: TO_EMAIL,
        from: FROM_EMAIL,
        subject: `AddisGo Lead: ${subject}`,
        text:
`New lead from your website:

Name: ${name}
Email: ${email || "(not provided)"}
Phone: ${phone || "(not provided)"}
Consent to Text: ${consentToText ? "YES" : "NO"}

Message:
${message}`
      });

      // Customer auto-reply (only if email looks valid)
      if (isEmail(email)) {
        await sgMail.send({
          to: email,
          from: FROM_EMAIL,
          subject: "Got your message — AddisGo",
          text:
`Hi ${name},

Thanks for reaching out! I got your message and I’ll reply with a clear plan + next steps soon.

— AddisGo
Phone: (651) 263-7198
Email: madanmeadow@gmail.com`
        });
      }
    }

    // 2) SMS (notify owner) + optional customer confirmation (ONLY if consent)
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
    const OWNER_PHONE = process.env.OWNER_PHONE;

    const canText = TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER;

    if (canText) {
      const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

      // SMS to owner
      if (OWNER_PHONE) {
        await client.messages.create({
          from: TWILIO_FROM_NUMBER,
          to: OWNER_PHONE,
          body: `New AddisGo lead: ${name}. ${phone ? `Phone: ${phone}. ` : ""}${email ? `Email: ${email}. ` : ""}Subject: ${subject}`
        });
      }

      // Optional SMS to customer (ONLY if they consent + provided phone)
      if (consentToText && phone) {
        await client.messages.create({
          from: TWILIO_FROM_NUMBER,
          to: phone,
          body: `Hi ${name} — thanks for contacting AddisGo! I got your message and I’ll reply soon.`
        });
      }
    }

    context.res = { status: 200, jsonBody: { ok: true, message: "Message sent successfully." } };
  } catch (err) {
    context.log("CONTACT API ERROR:", err);
    context.res = {
      status: 500,
      jsonBody: { ok: false, message: "Server error sending message." }
    };
  }
};
