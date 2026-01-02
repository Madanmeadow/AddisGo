import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

module.exports = async function (context, req) {
  try {
    const { name, email, message } = req.body

    await resend.emails.send({
      from: process.env.FROM_EMAIL,
      to: process.env.TO_EMAIL,
      subject: "New Contact Form Message",
      html: `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    })

    context.res = {
      status: 200,
      jsonBody: {
        ok: true,
        message: "Message sent successfully",
      },
    }
  } catch (err) {
    context.log("CONTACT API ERROR:", err)

    context.res = {
      status: 500,
      jsonBody: {
        ok: false,
        message: "Server error sending message",
      },
    }
  }
}
