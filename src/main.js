import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(createPinia());   // 👈 THIS LINE IS REQUIRED
app.use(router);

app.mount('#app');
