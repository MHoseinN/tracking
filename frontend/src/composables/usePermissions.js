import { computed } from 'vue';
import { useAuthStore } from '../stores/authStore';

export function usePermissions() {
  const authStore = useAuthStore();
  const user = computed(() => authStore.user || {});
  const roles = computed(() => {
    const value = user.value.roles || user.value.role || [];
    return Array.isArray(value) ? value : [value].filter(Boolean);
  });
  const permissions = computed(() => {
    const value = user.value.permissions || user.value.permission || [];
    return Array.isArray(value) ? value : [value].filter(Boolean);
  });

  function hasRole(requiredRoles) {
    if (!requiredRoles?.length) return true;
    return requiredRoles.some((role) => roles.value.includes(role));
  }

  function hasPermission(requiredPermissions) {
    if (!requiredPermissions?.length) return true;
    return requiredPermissions.every((permission) => permissions.value.includes(permission));
  }

  function canAccess(routeMeta = {}) {
    return hasRole(routeMeta.roles) && hasPermission(routeMeta.permissions);
  }

  return { roles, permissions, hasRole, hasPermission, canAccess };
}
