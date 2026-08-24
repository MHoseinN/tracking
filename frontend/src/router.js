import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from './stores/authStore';
import { usePermissions } from './composables/usePermissions';
import Login from './pages/Login.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
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
      title: 'آمار',
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
    path: '/products',
    name: 'ProductsManagement',
    component: () => import('./components/products/ProductsManagementRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'مدیریت محصولات',
      subtitle: 'نام، دسته‌بندی، قیمت روزانه و وضعیت محصولات را مدیریت کنید'
    }
  },
  {
    path: '/lists',
    name: 'DeliveryListDrafts',
    component: () => import('./components/delivery-lists/DeliveryListDraftsRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'لیست‌های تحویل',
      subtitle: 'پیش‌نویس‌های مستقل را ایجاد کنید و بعداً بدون از دست رفتن تغییرات ادامه دهید'
    }
  },
  {
    path: '/lists/:id/edit',
    name: 'DeliveryListDraftEditor',
    component: () => import('./components/delivery-lists/DeliveryListDraftEditorRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'ویرایش پیش‌نویس لیست',
      subtitle: 'مشخصات مشتری، زمان تحویل و اقلام به‌صورت خودکار ذخیره می‌شوند'
    }
  },
  {
    path: '/lists/:id',
    name: 'DeliveryListDetail',
    component: () => import('./components/delivery-lists/DeliveryListDetailRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'جزئیات لیست تحویل',
      subtitle: 'وضعیت لیست، اقلام تحویل‌شده و پیش‌فاکتور متصل را مشاهده کنید'
    }
  },
  {
    path: '/admins',
    name: 'AdminsManagement',
    component: () => import('./components/admins/AdminsManagementRoute.vue'),
    meta: {
      requiresAuth: true,
      roles: ['MANAGER'],
      title: 'مدیریت ادمین‌ها',
      subtitle: 'حساب‌های ادمین مجموعه و وضعیت دسترسی آن‌ها را مدیریت کنید'
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('./components/settings/SettingsRoute.vue'),
    meta: {
      requiresAuth: true,
      roles: ['MANAGER'],
      title: 'تنظیمات سیستم',
      subtitle: 'ساعت مرزی محاسبه روز و تنظیمات عمومی مجموعه را مدیریت کنید'
    }
  },
  {
    path: '/inventory/:pathMatch(.*)*',
    redirect: '/products',
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
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  authStore.checkAuth();

  if (authStore.isAuthenticated && !authStore.sessionValidated) {
    await authStore.refreshCurrentUser();
  }

  const { canAccess } = usePermissions();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (to.name === 'Login' && authStore.isAuthenticated) {
    next('/home');
  } else if (!canAccess(to.meta)) {
    next({ name: 'Home' });
  } else {
    next();
  }
});

export default router;
