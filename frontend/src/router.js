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
      subtitle: 'نمای کلی فعالیت مجموعه و دسترسی سریع به بخش‌های اصلی'
    }
  },
  {
    path: '/accounts',
    name: 'Accounts',
    component: () => import('./components/dashboard/AccountsRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'حساب‌های قدیمی',
      subtitle: 'فاکتورهای مستقل ثبت‌شده در نسخه قبلی سیستم'
    }
  },
  {
    path: '/customer/:id',
    name: 'CustomerDetail',
    component: () => import('./components/customers/CustomerDetailRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'جزئیات مشتری',
      subtitle: 'اطلاعات مشتری و سابقه لیست‌ها و حساب‌های مرتبط'
    },
    props: true
  },
  {
    path: '/reports',
    name: 'Reports',
    component: () => import('./components/reports/ReportsRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'گزارش‌ها و آمار',
      subtitle: 'مرور روند درآمد، فاکتورها و عملکرد مشتریان'
    }
  },
  {
    path: '/users',
    name: 'UsersManagement',
    component: () => import('./components/users/UsersManagementRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'مشتریان',
      subtitle: 'فهرست، جست‌وجو و مدیریت اطلاعات مشتریان'
    }
  },
  {
    path: '/products',
    name: 'ProductsManagement',
    component: () => import('./components/products/ProductsManagementRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'محصولات',
      subtitle: 'نام، دسته‌بندی و قیمت روزانه محصولات'
    }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('./components/profile/ProfileRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'پروفایل من',
      subtitle: 'مدیریت مشخصات، رمز عبور و مشاهده عملکرد شخصی'
    }
  },
  {
    path: '/lists',
    name: 'DeliveryListDrafts',
    component: () => import('./components/delivery-lists/DeliveryListDraftsRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'مدیریت لیست‌ها',
      subtitle: 'پیگیری یکپارچه پیش‌نویس، تحویل، برگشت، فاکتور و تسویه'
    }
  },
  {
    path: '/lists/:id/edit',
    name: 'DeliveryListDraftEditor',
    component: () => import('./components/delivery-lists/DeliveryListDraftEditorRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'ایجاد و ویرایش لیست',
      subtitle: 'مشخصات مشتری، زمان تحویل و اقلام به‌صورت خودکار ذخیره می‌شوند'
    }
  },
  {
    path: '/lists/:id',
    name: 'DeliveryListDetail',
    component: () => import('./components/delivery-lists/DeliveryListDetailRoute.vue'),
    meta: {
      requiresAuth: true,
      title: 'جزئیات لیست',
      subtitle: 'مدیریت اقلام، برگشت، فاکتور، ارسال و وضعیت تسویه'
    }
  },
  {
    path: '/admins',
    name: 'AdminsManagement',
    component: () => import('./components/admins/AdminsManagementRoute.vue'),
    meta: {
      requiresAuth: true,
      roles: ['MANAGER'],
      title: 'ادمین‌ها',
      subtitle: 'مدیریت حساب‌های ادمین و وضعیت دسترسی آن‌ها'
    }
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('./components/settings/SettingsRoute.vue'),
    meta: {
      requiresAuth: true,
      roles: ['MANAGER'],
      title: 'تنظیمات',
      subtitle: 'ساعت مرزی محاسبه روز و تنظیمات عمومی مجموعه'
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
