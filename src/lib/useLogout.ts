import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from './authApi';
import { pausePushOnSignOut } from './pushNotifications';

/** Logs out and sends the user to their own login page. Used by the sidebar and the avatar menu. */
export function useLogout() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const user = useAuthStore((s) => s.user);

  return async () => {
    try {
      // This phone must stop getting the store's news once the person has signed out (a short wait at most).
      await Promise.race([pausePushOnSignOut(), new Promise((resolve) => setTimeout(resolve, 1500))]);
      await authApi.logout();
    } catch {
      // even if the network call fails, clear local state and send them to login
    } finally {
      clearAuth();
      navigate(user?.role === 'SUPER_ADMIN' ? '/admin/login' : '/vendor/login', { replace: true });
    }
  };
}
