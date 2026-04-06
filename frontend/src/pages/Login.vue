<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
      <!-- Logo / Title -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
          <svg class="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h1 class="text-2xl font-bold text-gray-800">مدیریت حساب‌ها</h1>
        <p class="text-gray-500 mt-1 text-sm">لطفاً وارد حساب کاربری خود شوید</p>
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin" class="space-y-5">
        <!-- Username -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">نام کاربری</label>
          <input
            v-model="form.username"
            type="text"
            placeholder="نام کاربری را وارد کنید"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            :class="{ 'border-red-500': errors.username }"
            autocomplete="username"
          />
          <p v-if="errors.username" class="text-red-500 text-xs mt-1">{{ errors.username }}</p>
        </div>

        <!-- Password -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">رمز عبور</label>
          <input
            v-model="form.password"
            type="password"
            placeholder="رمز عبور را وارد کنید"
            class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            :class="{ 'border-red-500': errors.password }"
            autocomplete="current-password"
          />
          <p v-if="errors.password" class="text-red-500 text-xs mt-1">{{ errors.password }}</p>
        </div>

        <!-- Error message -->
        <div v-if="loginError" class="bg-red-50 border border-red-200 rounded-lg p-3">
          <p class="text-red-600 text-sm text-center">{{ loginError }}</p>
        </div>

        <!-- Submit button -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span v-if="loading" class="flex items-center justify-center gap-2">
            <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            در حال ورود...
          </span>
          <span v-else>ورود به سیستم</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '../stores/authStore';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();

const form = reactive({
  username: '',
  password: ''
});

const errors = reactive({
  username: '',
  password: ''
});

const loading = ref(false);
const loginError = ref('');

function validate() {
  errors.username = '';
  errors.password = '';
  let valid = true;

  if (!form.username.trim()) {
    errors.username = 'نام کاربری الزامی است';
    toast.error("نام کاربری را وارد کنید ");
    valid = false;
  }

  if (!form.password) {
    errors.password = 'رمز عبور الزامی است';
    toast.error("رمز عبور را وارد کنید.")
    valid = false;
  }

  return valid;
}

async function handleLogin() {
  if (!validate()) return;

  loading.value = true;
  loginError.value = '';

  const result = await authStore.login(form.username, form.password);

  loading.value = false;

  if (result.success) {
    toast.success('خوش اومدی رئیس');
    router.push('/home');
  } else {
    toast.error("نام کاربری یا رمز عبور اشتباه است");
    loginError.value = result.message || 'نام کاربری یا رمز عبور اشتباه است';
  }
}
</script>
