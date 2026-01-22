<template>
  <div>
    <h2>Contact MeDan</h2>

    <input v-model="name" placeholder="Your name" />
    <input v-model="email" placeholder="Your email" />
    <textarea v-model="message" placeholder="Your message"></textarea>

    <button @click.prevent="handleSubmit">Send Message</button>

    <p v-if="success" style="color: green;">Message sent successfully!</p>
    <p v-if="error" style="color: red;">Something went wrong. Try again.</p>
  </div>
</template>

<script>
import { sendContactEmail } from '@/services/email';

export default {
  data() {
    return {
      name: '',
      email: '',
      message: '',
      success: false,
      error: false,
    };
  },
  methods: {
    async handleSubmit() {
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
        console.error(err);
        this.error = true;
      }
    },
  },
};
</script>
