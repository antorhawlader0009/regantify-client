import { useAuthStore } from '../../store/authStore';

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-regantify-text">
        Welcome, {user?.fullName ?? 'Super Admin'}
      </h1>
      <p className="text-regantify-text-muted mt-1">
        Platform-wide overview — real metrics coming in a later phase.
      </p>
    </div>
  );
}
