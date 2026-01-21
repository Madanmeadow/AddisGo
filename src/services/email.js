import emailjs from '@emailjs/browser'

export async function sendContactEmail({ name, email, message }) {
  return emailjs.send(
    import.meta.env.VITE_EMAILJS_SERVICE_ID,
    import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
    {
      from_name: name,
      reply_to: email,
      message: message,
    },
    import.meta.env.VITE_EMAILJS_PUBLIC_KEY
  )
}
