const { Resend } = require("resend")
const twilio = require("twilio")

module.exports = async function (context, req) {
  try {
    const { name, email, message } = req.body || {}

    if (!name || !email || !message) {
      context.res = {
        status: 400,
        jsonBody: { ok: false, message: "Missing name, email, or message." },
      }
      return
    }

    // 1) Email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: process.env.FROM_EMAIL, // example: "AddisGo <onboarding@resend.dev>" OR your verified sender
      to: process.env.TO_EMAIL,     // your inbox email
      subject: `New Contact Form Message from ${name}`,
      html: `
        <h3>New message</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b><br/>${message.replace(/\n/g, "<br/>")}</p>
      `,
    })

    // 2) Optional SMS via Twilio (only if env vars exist)
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    ) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)

      await client.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: process.env.TO_PHONE_NUMBER || process.env.TO_SMS || process.env.TO_MOBILE || "", // optional
        body: `AddisGo: New message from ${name} (${email})`,
      }).catch(() => {})
    }

    context.res = {
      status: 200,
      jsonBody: { ok: true, message: "Message sent successfully." },
    }
  } catch (err) {
    context.log("CONTACT API ERROR:", err)
    context.res = {
      status: 500,
      jsonBody: { ok: false, message: "Server error sending message." },
    }
  }
}
