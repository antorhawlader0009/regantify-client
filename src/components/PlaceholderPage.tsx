import { Link } from 'react-router-dom';
import { Hammer } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { PageSection, primaryBtn } from './ui/PageKit';

interface PlaceholderPageProps {
  title: string;
}

/** Every nav entry whose page isn't built yet (theme-update-plan.md Step 14 decides the vendor ones). */
export function PlaceholderPage({ title }: PlaceholderPageProps) {
  const isAdmin = useAuthStore((s) => s.user?.role === 'SUPER_ADMIN');
  return (
    <PageSection>
      <h1 className="text-[15px] font-semibold text-regantify-text">{title}</h1>
      <div className="flex flex-col items-center px-4 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-lime/60 text-brand">
          <Hammer size={20} strokeWidth={1.8} aria-hidden />
        </span>
        <p className="mt-3 text-sm font-medium text-regantify-text">{title} is coming soon</p>
        <p className="mt-1 max-w-sm text-xs text-neutral-500">
          This part of your dashboard is still being built. Everything else in the menu is ready to use.
        </p>
        <Link to={isAdmin ? '/admin/dashboard' : '/vendor/dashboard'} className={`${primaryBtn} mt-5`}>
          Back to Dashboard
        </Link>
      </div>
    </PageSection>
  );
}
