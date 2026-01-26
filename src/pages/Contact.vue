<template>
  <div class="contact">
    <h1>Contact MeDan</h1>

    <form @submit.prevent="sendMessage">
      <input v-model="name" placeholder="Your name" required />
      <input v-model="email" type="email" placeholder="Your email" required />
      <textarea v-model="message" placeholder="Message" required></textarea>

      <button type="submit" :disabled="loading">
        {{ loading ? 'Sending...' : 'Send Message' }}
      </button>
    </form>

    <p v-if="success" class="success">✅ Message sent successfully!</p>
    <p v-if="error" class="error">❌ Failed to send message.</p>
  </div>
</template>

<script>
import { sendContactEmail } from '../services/email';

export default {
  name: 'Contact',
  data() {
return {
name: '',
email: '',
message: '',
loading: false,
success: false,
error: false,
};
},
methods: {
async sendMessage() {
this.loading = true;
this.success = false;
this.error = false;

try {
await sendContactEmail({
name: this.name,
email: this.email,
message: this.message,
});

this.success = true;
this.name = '';
this.email = '';
this.message = '';
} catch (err) {
console.error('EmailJS error:', err);
this.error = true;
} finally {
this.loading = false;
}
},
},
};
</script>

<style scoped>
.contact {
max-width: 500px;
margin: auto;
}
input, textarea {
width: 100%;
margin-bottom: 10px;
}
.success {
color: green;
}
.error {
color: red;
}
</style>