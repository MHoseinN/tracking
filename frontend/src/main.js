import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Toast from 'vue-toastification';
import 'vue-toastification/dist/index.css';
import App from './App.vue';
import router from './router';
import './style.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);
app.use(Toast, {
  rtl: true,
  position: 'top-left',
  timeout: 3000,
  closeOnClick: true,
  pauseOnHover: true
});

app.mount('#app');
