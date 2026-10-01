import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowUpRight,
  BadgeCheck,
  ChevronRight,
  CreditCard,
  Globe,
  Link as LinkIcon,
  Lock,
  MapPin,
  Package,
  Phone,
  Plug,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Store,
  Truck,
  UsersRound,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { authApi } from '../../lib/authApi';
import { getVendorSettings, updateVendorSettings } from '../../lib/vendorApi';
import { storefrontStoreUrl } from '../../lib/storefrontUrl';
import { useAuthStore } from '../../store/authStore';
import { Field, IconInput, IconTextarea, SaveButton, Section, flashFor } from '../../components/ui/FormKit';

const subdomainRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const storeSchema = z.object({
  storeName: z.string().min(1, 'Enter your store name'),
  subdomain: z
    .string()
    .min(1, 'Enter your store URL')
    .regex(subdomainRegex, 'Only lowercase letters, numbers, and dashes are allowed'),
  address: z.string().optional().or(z.literal('')),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type StoreFormValues = z.infer<typeof storeSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

type TabKey = 'general' | 'security' | 'more';

const TABS: { key: TabKey; label: string; icon: LucideIcon }[] = [
  { key: 'general', label: 'General', icon: Store },
  { key: 'security', label: 'Security', icon: ShieldCheck },
  { key: 'more', label: 'More settings', icon: SlidersHorizontal },
];

/** Store settings that have their own pages, listed on the "More settings" tab. */
const MORE_SETTINGS: { label: string; description: string; path: string; icon: LucideIcon }[] = [
  { label: 'Delivery Charge', description: 'Inside/outside Dhaka charge and VAT', path: '/vendor/store/delivery-charge', icon: Truck },
  { label: 'Payment Gateway', description: 'COD, online payment and SSLCommerz', path: '/vendor/store/payment-gateway', icon: CreditCard },
  { label: 'Domain', description: 'Connect your own domain', path: '/vendor/store/domain', icon: Globe },
  { label: 'SEO', description: 'Search titles, descriptions and sharing', path: '/vendor/store/seo', icon: Search },
  { label: 'Social', description: 'Facebook, Instagram and other links', path: '/vendor/store/social', icon: Share2 },
  { label: 'Stock Settings', description: 'Backorders and when stock is reduced', path: '/vendor/store/stock-settings', icon: Package },
  { label: 'COD Guard', description: 'Blacklist and SMS check for COD orders', path: '/vendor/store/cod-guard', icon: BadgeCheck },
  { label: 'Integrations', description: 'Pixels, analytics and webhooks', path: '/vendor/store/integrations', icon: Plug },
  { label: 'Staff', description: 'Team members and their access', path: '/vendor/staff', icon: UsersRound },
  { label: 'Billing', description: 'Your plan, usage and upgrades', path: '/vendor/billing', icon: Wallet },
];

const isTab = (v: string | null): v is TabKey => v === 'general' || v === 'security' || v === 'more';

export default function VendorSettings() {
  const [params, setParams] = useSearchParams();
  const tab: TabKey = isTab(params.get('tab')) ? (params.get('tab') as TabKey) : 'general';
  const selectTab = (key: TabKey) => setParams(key === 'general' ? {} : { tab: key }, { replace: true });

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="mb-1">
        <h1 className="text-xl font-semibold text-regantify-text">Settings</h1>
        <p className="text-sm text-neutral-500">Manage your store details and account security.</p>
      </div>

      <div role="tablist" aria-label="Settings sections" className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-white p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={active}
              onClick={() => selectTab(t.key)}
              className={`flex h-9 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm transition-colors ${
                active ? 'bg-brand-lime font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-100'
              }`}
            >
              <Icon size={15} strokeWidth={1.8} />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'general' && <GeneralTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'more' && <MoreTab />}
    </div>
  );
}

function GeneralTab() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: { storeName: user?.vendor?.storeName ?? '', subdomain: user?.vendor?.subdomain ?? '', address: '' },
  });

  // Store name/URL are on the auth user already, but the address isn't, so
  // load all three once from the server as the one source of truth.
  useEffect(() => {
    let cancelled = false;
    getVendorSettings()
      .then((s) => {
        if (!cancelled) form.reset({ storeName: s.storeName, subdomain: s.subdomain, address: s.address ?? '' });
      })
      .catch(() => {
        // Falls back to the auth user's store name with a blank address; still editable.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: StoreFormValues) => {
    setError(null);
    setSubmitting(true);
    try {
      const updated = await updateVendorSettings({
        storeName: values.storeName.trim(),
        subdomain: values.subdomain.trim(),
        address: values.address?.trim() ?? '',
      });
      form.reset({ storeName: updated.storeName, subdomain: updated.subdomain, address: updated.address ?? '' });
      // Keep the auth user's copy in sync (the topbar's Visit Shop link reads it).
      if (accessToken && user) {
        setAuth(accessToken, {
          ...user,
          vendor: user.vendor ? { ...user.vendor, storeName: updated.storeName, subdomain: updated.subdomain } : user.vendor,
        });
      }
      flashFor(setSaved, 'Saved');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not update store settings.');
    } finally {
      setSubmitting(false);
    }
  };

  const { errors, isDirty } = form.formState;
  const subdomain = form.watch('subdomain');
  const subdomainChanged = !!user?.vendor?.subdomain && subdomain !== user.vendor.subdomain;
  const liveUrl = user?.vendor?.subdomain ? storefrontStoreUrl(user.vendor.subdomain) : null;

  return (
    <>
      <Section
        title="Store details"
        description="Your store's name, web address and business address."
        action={
          liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-xs text-neutral-700 transition hover:border-neutral-300 hover:shadow-sm"
            >
              View store
              <ArrowUpRight size={13} className="text-neutral-400" />
            </a>
          )
        }
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Store name" error={errors.storeName?.message}>
            <IconInput icon={Store} type="text" placeholder="Your store name" disabled={loading} {...form.register('storeName')} />
          </Field>

          <Field
            label="Store URL"
            error={errors.subdomain?.message}
            hint={
              <>
                <p className="break-all">{storefrontStoreUrl(subdomain || '…')}</p>
                {subdomainChanged && (
                  <p className="mt-1 text-amber-600">
                    Changing this immediately moves your live store — old links to your current URL will stop working.
                  </p>
                )}
              </>
            }
          >
            <IconInput icon={LinkIcon} type="text" placeholder="your-store-name" disabled={loading} {...form.register('subdomain')} />
          </Field>

          <Field label="Address" optional>
            <IconTextarea icon={MapPin} placeholder="Store or business address" rows={3} disabled={loading} {...form.register('address')} />
          </Field>

          <SaveButton busy={submitting} disabled={loading || !isDirty} saved={saved} error={error}>
            Save store details
          </SaveButton>
        </form>
      </Section>
    </>
  );
}

function SecurityTab() {
  const user = useAuthStore((s) => s.user);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const form = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });
  const { errors } = form.formState;

  const onSubmit = async (values: PasswordFormValues) => {
    setError(null);
    setSubmitting(true);
    try {
      await authApi.changePassword(values.currentPassword.trim(), values.newPassword.trim());
      form.reset();
      flashFor(setSaved, 'Password changed');
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Could not change your password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Section title="Login" description="The phone number you sign in with.">
        <Field label="Phone number" hint="This is how you log in — it can't be changed here.">
          <IconInput icon={Phone} type="text" value={user?.phone ?? ''} readOnly disabled />
        </Field>
      </Section>

      <Section title="Change password" description="You'll need your current password to set a new one.">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Current password" error={errors.currentPassword?.message}>
            <IconInput icon={Lock} type="password" placeholder="••••••••" autoComplete="current-password" {...form.register('currentPassword')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="New password" error={errors.newPassword?.message} hint="At least 6 characters.">
              <IconInput icon={Lock} type="password" placeholder="••••••••" autoComplete="new-password" {...form.register('newPassword')} />
            </Field>
            <Field label="Confirm new password" error={errors.confirmPassword?.message}>
              <IconInput icon={Lock} type="password" placeholder="••••••••" autoComplete="new-password" {...form.register('confirmPassword')} />
            </Field>
          </div>
          <SaveButton busy={submitting} saved={saved} error={error}>
            Change password
          </SaveButton>
        </form>
      </Section>
    </>
  );
}

function MoreTab() {
  return (
    <Section title="Store settings" description="Everything else about how your store works has its own page.">
      <div className="grid gap-3 sm:grid-cols-2">
        {MORE_SETTINGS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.path}
              to={s.path}
              className="group flex items-center gap-3 rounded-lg border border-line p-3 transition hover:border-neutral-300 hover:bg-neutral-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-lime/60 text-brand">
                <Icon size={17} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-regantify-text">{s.label}</span>
                <span className="block truncate text-xs text-neutral-500">{s.description}</span>
              </span>
              <ChevronRight size={16} className="shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5" />
            </Link>
          );
        })}
      </div>
    </Section>
  );
}
