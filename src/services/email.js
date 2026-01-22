import emailjs from '@emailjs/browser';

export function sendContactEmail({ name, email, message}) {
  return emailjs.send(
    'service_wn78sgc',        // ✅ your Service ID
    'template_gxz5kzl',       // ✅ your Template ID
    {
      from_name: name,
      reply_to: email,
      message: message,
    },
    'tDY5BR8IN9QpXqeBM'       // ✅ your PUBLIC KEY ONLY
  );
}
