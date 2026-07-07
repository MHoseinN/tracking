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
    component: () => import('./pages/Home.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/accounts',
    name: 'Accounts',
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
    path: '/reports',
    name: 'Reports',
    component: () => import('./pages/Reports.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/users',
    name: 'UsersManagement',
    component: () => import('./pages/UsersManagement.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory',
    name: 'InventoryManagement',
    component: () => import('./pages/InventoryManagement.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory/manage',
    name: 'InventoryProductManagement',
    component: () => import('./pages/InventoryProductManagement.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory/reservations/new',
    name: 'InventoryReservationBuilder',
    component: () => import('./pages/InventoryReservationBuilder.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory/reservations/active',
    name: 'InventoryReservedProducts',
    component: () => import('./pages/InventoryReservedProducts.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/inventory/layout-lab',
    name: 'InventoryLayoutLab',
    component: () => import('./pages/InventoryLayoutLab.vue'),
    meta: { requiresAuth: true }
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
