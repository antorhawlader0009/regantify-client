import { useAuthStore } from '../../store/authStore';

export default function VendorDashboard() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-regantify-text">
        Welcome, {user?.fullName ?? user?.vendor?.storeName ?? 'Vendor'}
      </h1>
      <p className="text-regantify-text-muted mt-1">
        {user?.vendor?.storeName && `${user.vendor.storeName} · `}
        Here's your store at a glance — real stats coming in a later phase.
      </p>
    </div>
  );
}
