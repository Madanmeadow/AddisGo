import emailjs from '@emailjs/browser';

export function sendContactEmail({ name, email, message }) {
  return emailjs.send(
    'service_wn78sgc',
    'template_gxz5kzl',
    {
      from_name: name,
      reply_to: email,
      message: message,
    },
    'o5zsuJHJD5BVKUS36' // <-- replace with NEW public key
  );
}
