import emailjs from "@emailjs/browser";
emailjs.init(import.meta.env.VITE_EMAILJS_PUBLIC_KEY);

export default function Contact() {
  const send = async (e) => {
   e.preventDefault();

   try {
    await emailjs.send(
     import.meta.env.VITE_EMAILJS_SERVICE_ID,
     import.meta.env.VITE_EMAILJS_TEMPLATE_ID,
     {
      from_name: e.target.name.value,
      from_email: e.target.email.value,
      message: e.target.message.value,
     }
    );
    alert("Message sent!");
   } catch (err) {
     console.error(err);
     alert("Failed to send");
  }
 };

return (
  <form onSubmit={send}>
    <input name="name" required />
    <input name="email" type="email" required />
    <textarea name="message" required />
    <button>Send</button>
  </form>
);
}