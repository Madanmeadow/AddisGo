module.exports = async function (context, req) {
  try {
    // Body can be string or object depending on runtime
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body

    const name = (body?.name || "").trim()
    const email = (body?.email || "").trim()
    const message = (body?.message || "").trim()

    if (!name || !email || !message) {
      context.res = {
        status: 400,
        headers: { "Content-Type": "application/json" },
        body: { ok: false, message: "Missing name, email, or message." }
      }
      return
    }

    const RESEND_API_KEY = process.env.RESEND_API_KEY
    const FROM_EMAIL = process.env.FROM_EMAIL
    const CONTACT_EMAIL = process.env.CONTACT_EMAIL

    if (!RESEND_API_KEY || !FROM_EMAIL || !CONTACT_EMAIL) {
      context.res = {
        status: 500,
        headers: { "Content-Type": "application/json" },
        body: { ok: false, message: "Server env vars missing." }
      }
      return
    }

    // Resend v4 is ESM; dynamic import works in Azure Functions
    const { Resend } = await import("resend")
    const resend = new Resend(RESEND_API_KEY)

    await resend.emails.send({
      from: FROM_EMAIL,          // ex: "AddisGo <onboarding@resend.dev>" or your verified sender
      to: CONTACT_EMAIL,         // your email to receive messages
      subject: `New message from ${name} (AddisGo Contact Form)`,
      reply_to: email,
      html: `
        <h2>New Contact Form Message</h2>
        <p><b>Name:</b> ${escapeHtml(name)}</p>
        <p><b>Email:</b> ${escapeHtml(email)}</p>
        <p><b>Message:</b><br/>${escapeHtml(message).replace(/\n/g, "<br/>")}</p>
      `
    })

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { ok: true, message: "Message sent successfully." }
    }
  } catch (err) {
    context.log("CONTACT API ERROR:", err)
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { ok: false, message: "Server error sending message." }
    }
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}
