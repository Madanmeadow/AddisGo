import emailjs from '@emailjs/browser';

const SERVICE_ID = 'service_wn78sgc';
const TEMPLATE_ID = 'template_gxz5kzi';
const PUBLIC_KEY = 'o5zsuJHJD5BVKUS36';

export function sendContactEmail({ name, email, message }) {
	return emailjs.send(
		SERVICE_ID,
		TEMPLATE_ID,
		{
			from_name: name,
			reply_to: email,
			message: message,
		},
		PUBLIC_KEY
	);
}