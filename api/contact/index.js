const { Resend } = require("resend");

module.exports = async function (context, req) {
  try {
    const { name, email, message } = req.body || {};

    if (!name || !email || !message) {
      context.res = {
        status: 400,
        jsonBody: { ok: false, message: "Name, email, and message are required." },
      };
      return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: process.env.FROM_EMAIL, // Example: "AddisGo <onboarding@resend.dev>"
      to: process.env.TO_EMAIL,     // Your inbox
      reply_to: email,
      subject: `New message from ${name}`,
      html: `
        <h2>New Contact Message</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b><br/>${String(message).replace(/\n/g, "<br/>")}</p>
      `,
    });

    context.res = {
      status: 200,
      jsonBody: { ok: true, message: "Message sent!" },
    };
  } catch (err) {
    context.log("CONTACT API ERROR:", err);
    context.res = {
      status: 500,
      jsonBody: { ok: false, message: "Server error sending message." },
    };
  }
};

