import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css' // 👈 THIS LINE MUST EXIST

createApp(App).use(router).mount('#app')
