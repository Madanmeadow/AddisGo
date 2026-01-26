import emailjs from '@emailjs/browser';

// ✅ INIT WITH NEW PUBLIC KEY
emailjs.init('o5zsuJHJD5BVKUS36');

export function sendContactEmail({ name, email, message }) {
  return emailjs.send(
    'service_wn78sgc',        // Service ID
    'template_gxz5kzl',       // Template ID
    {
      from_name: name,
      reply_to: email,
      message: message,
    }
  );
}
