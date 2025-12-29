import sgMail from "@sendgrid/mail";

export default async function (context, req) {
  // Allow POST only
  if (req.method !== "POST") {
    context.res = {
      status: 405,
      headers: { "Content-Type": "application/json" },
      body: { error: "Method Not Allowed" },
    };
    return;
  }

  // Read body
  const { name, email, subject, message } = req.body || {};

  // Basic validation
  if (!name || !email || !message) {
    context.res = {
      status: 400,
      headers: { "Content-Type": "application/json" },
      body: { error: "Missing required fields: name, email, message" },
    };
    return;
  }

  // Get settings from Azure Environment Variables
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.FROM_EMAIL; // must be a verified sender in SendGrid
  const toEmail = process.env.TO_EMAIL;     // where you want to receive messages

  if (!apiKey || !fromEmail || !toEmail) {
    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: "Server is not configured (missing email settings)." },
    };
    return;
  }

  // Configure SendGrid
  sgMail.setApiKey(apiKey);

  try {
    // Send email
    await sgMail.send({
      to: toEmail,
      from: fromEmail,
      subject: subject ? subject : `New contact message from ${name}`,
      text: `Name: ${name}
Email: ${email}

Message:
${message}
`,
      // Optional: you can also add replyTo so you can reply directly to the sender
      replyTo: email,
    });

    context.res = {
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: { success: true, message: "Message sent successfully" },
    };
  } catch (err) {
    context.log("SendGrid Error:", err);

    context.res = {
      status: 500,
      headers: { "Content-Type": "application/json" },
      body: { error: "Failed to send email" },
    };
  }
}