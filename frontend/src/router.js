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
    component: () => import('./components/dashboard/HomeRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'خانه',
      subtitle: 'نمای کلی سیستم، آمار تجمیعی و دسترسی سریع به بخش‌های اصلی را از اینجا ببین'
    }
  },
  {
    path: '/accounts',
    name: 'Accounts',
    component: () => import('./components/dashboard/AccountsRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'حساب‌ها',
      subtitle: 'فهرست حساب‌ها، فیلترها و عملیات روزانه را در این صفحه مستقل مدیریت کن'
    }
  },
  {
    path: '/customer/:id',
    name: 'CustomerDetail',
    component: () => import('./components/customers/CustomerDetailRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'صفحه مشتری',
      subtitle: 'جزئیات مشتری، حساب‌ها و عملیات مرتبط را بدون ترک شِل اصلی مدیریت کن'
    },
    props: true
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('./components/reports/ReportsRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'گزارش',
      subtitle: 'روند درآمد، تعداد فاکتورها و عملکرد مشتری‌ها را در نماهای تحلیلی یکپارچه مرور کن'
    }
  },
  {
    path: '/users',
    name: 'UsersManagement',
    component: () => import('./components/users/UsersManagementRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'مدیریت کاربران',
      subtitle: 'فهرست مشتری‌ها، وضعیت حساب و عملیات سریع مرتبط با کاربران را یکجا مدیریت کن'
    }
  },
  {
    path: '/inventory',
    name: 'InventoryManagement',
    component: () => import('./components/inventory/InventoryManagementRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'مدیریت رزرو',
      subtitle: 'وضعیت موجودی، رزروهای فعال و عملیات روزمره انبار را در یک صفحه مرکزی مدیریت کن'
    }
  },
  {
    path: '/inventory/manage',
    name: 'InventoryProductManagement',
    component: () => import('./components/inventory/InventoryProductManagementRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'مدیریت محصولات',
      subtitle: 'ساختار دسته‌بندی، موجودی و ویرایش محصولات را در همین نمای ثابت انجام بده'
    }
  },
  {
    path: '/inventory/reservations/new',
    name: 'InventoryReservationBuilder',
    component: () => import('./components/inventory/InventoryReservationBuilderRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'سبد رزرو',
      subtitle: 'رزرو تازه را مرحله‌به‌مرحله بساز و بدون خروج از شِل، اقلام را نهایی کن'
    }
  },
  {
    path: '/inventory/reservations/active',
    name: 'InventoryReservedProducts',
    component: () => import('./components/inventory/InventoryReservedProductsRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'رزروهای فعال',
      subtitle: 'رزروهای جاری، آزادسازی و ویرایش را در پنل اصلی دنبال کن'
    }
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
