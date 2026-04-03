import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/authStore';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('./pages/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('./pages/MainDashboard.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/customer/:id',
    name: 'CustomerDetail',
    component: () => import('./pages/CustomerDetail.vue'),
    meta: { requiresAuth: true },
    props: true
  },
  {
    path: '/',
    redirect: '/home'
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/home'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard: protect authenticated routes
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    next('/home');
  } else {
    next();
  }
});

export default router;
