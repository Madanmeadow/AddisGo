import emailjs from '@emailjs/browser';

export function sendContactEmail(formData) {
  return emailjs.send(
    'service_wn78sgc',        // your service ID
    'template_gxz5kzl',       // your template ID
    {
      from_name: formData.name,
      reply_to: formData.email,
      message: formData.message,
    },
    'tDY5BR8lN9QpXqeBM'     // 👈 THIS MUST MATCH DASHBOARD
  );
}
