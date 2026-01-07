import emailjs from "@emailjs/browser"

// EmailJS send helper
export async function sendContactEmail({ name, email, message }) {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
  console.log("Check:", {serviceId, templateId, publicKey})

  if (!serviceId || !templateId || !publicKey) {
    throw new Error("Missing EmailJS env vars. Check your .env file.")
  }

  // These keys MUST match your EmailJS template variables:
  // {{name}}, {{email}}, {{message}}
  const templateParams = {
    name,
    email,
    message,
  }

  return emailjs.send(serviceId, templateId, templateParams, {
    publicKey,
  })
}
