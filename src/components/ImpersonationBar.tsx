import { Eye, PencilLine } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

/**
 * The fixed red bar shown in a Super Admin's "Login as Vendor" tab (super-admin-plan.md Step 2). It says who is looking, whether changes are
 * allowed, and ends the session. The session lives only in this tab, so ending it just forgets it here.
 */
export function ImpersonationBar() {
  const info = useAuthStore((s) => s.impersonation);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  if (!info) return null;

  const end = () => {
    clearAuth();
    window.close();
    // A tab the browser won't close on its own is sent to the sign-in page instead.
    window.location.replace('/');
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-red-600 px-4 py-2 text-sm text-white" role="status">
      {info.readOnly ? <Eye size={16} className="shrink-0" aria-hidden /> : <PencilLine size={16} className="shrink-0" aria-hidden />}
      <p className="min-w-0 flex-1">
        <strong>Super Admin {info.adminName}</strong> is {info.readOnly ? 'viewing' : 'working in'} this store · {info.readOnly ? 'View only' : 'Changes allowed'}
        {info.reason ? ` · ${info.reason}` : ''}
      </p>
      <button type="button" onClick={end} className="shrink-0 rounded-lg bg-white/15 px-3 py-1 font-medium hover:bg-white/25">
        End session
      </button>
    </div>
  );
}
