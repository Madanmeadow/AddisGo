import emailjs from '@emailjs/browser';

/**
 * Send contact email using EmailJS
 */
export async function sendContactEmail({ name, email, message }) {
  // SAFETY CHECK
  if (!name || !email || !message) {
    throw new Error('Missing required fields');
  }

  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

  if (!serviceId || !templateId || !publicKey) {
    throw new Error('Missing EmailJS environment variables');
  }

  const templateParams = {
    from_name: name,
    from_email: email,
    message: message,
  };

  return emailjs.send(serviceId, templateId, templateParams, publicKey);
}
