import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { User, Mail, Lock, Camera, Phone, Store, MapPin, Link as LinkIcon, CreditCard, Truck } from 'lucide-react';
import { authApi } from '../../lib/authApi';
import {
  getVendorSettings,
  updateVendorSettings,
  getVendorDeliveryCharges,
  updateVendorDeliveryCharges,
} from '../../lib/vendorApi';
import { getVendorPlanUsage } from '../../lib/plansApi';
import { courierApi, type CourierAccount, type CourierAccountProvider } from '../../lib/courierApi';
import { CourierSetupModal } from '../../components/courier/CourierSetupModal';
import { PathaoStorePicker } from '../../components/courier/PathaoStorePicker';
import { RedxStorePicker } from '../../components/courier/RedxStorePicker';
import { upgradeToast } from '../../components/ui/UpgradePrompt';
import { storefrontStoreUrl } from '../../lib/storefrontUrl';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
});

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

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;
type StoreFormValues = z.infer<typeof storeSchema>;

export default function VendorSettings() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAuth = useAuthStore((s) => s.setAuth);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);

  const [storeError, setStoreError] = useState<string | null>(null);
  const [storeSuccess, setStoreSuccess] = useState<string | null>(null);
  const [storeSubmitting, setStoreSubmitting] = useState(false);
  const [storeLoading, setStoreLoading] = useState(true);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
    },
  });

  const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

  const storeForm = useForm<StoreFormValues>({
    resolver: zodResolver(storeSchema),
    defaultValues: { storeName: user?.vendor?.storeName ?? '', subdomain: user?.vendor?.subdomain ?? '', address: '' },
  });

  // Store name/URL come from authStore already, but address doesn't
  // live there — fetch all three once on mount anyway so this section
  // has one consistent source of truth (and isn't blank on a reload vs.
  // right after a save, which updates it locally instead, below).
  useEffect(() => {
    let cancelled = false;
    getVendorSettings()
      .then((settings) => {
        if (cancelled) return;
        storeForm.reset({ storeName: settings.storeName, subdomain: settings.subdomain, address: settings.address ?? '' });
      })
      .catch(() => {
        // Falls back to authStore's storeName with a blank address —
        // the vendor can still edit and save either field from there.
      })
      .finally(() => {
        if (!cancelled) setStoreLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAvatarPick = () => avatarInputRef.current?.click();

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Let the same file be re-selected later (e.g. after fixing the crop
    // elsewhere and re-uploading the same filename).
    e.target.value = '';
    if (!file) return;

    setAvatarError(null);

    if (!/^image\/(jpe?g|png|webp|gif)$/.test(file.type)) {
      setAvatarError('Please choose a JPG, PNG, WEBP, or GIF image.');
      return;
    }
    // Server compresses/resizes to max 720px regardless — this is just an
    // early sanity check so an obviously-wrong file doesn't get uploaded
    // and processed for nothing.
    if (file.size > 8 * 1024 * 1024) {
      setAvatarError('Image is too large — please choose a file under 8MB.');
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setAvatarPreview(localPreviewUrl);
    setAvatarUploading(true);
    try {
      const res = await authApi.uploadAvatar(file);
      if (accessToken) {
        setAuth(accessToken, res.user);
      }
    } catch (err: any) {
      setAvatarError(err?.response?.data?.message ?? 'Could not upload image. Please try again.');
    } finally {
      setAvatarUploading(false);
      URL.revokeObjectURL(localPreviewUrl);
      setAvatarPreview(null);
    }
  };

  const onProfileSubmit = async (values: ProfileFormValues) => {
    setProfileError(null);
    setProfileSuccess(null);
    setProfileSubmitting(true);
    try {
      const res = await authApi.updateSettingsProfile({
        fullName: values.fullName.trim(),
        email: values.email?.trim() ? values.email.trim() : undefined,
      });
      if (accessToken) {
        setAuth(accessToken, res.user);
      }
      setProfileSuccess('Profile updated.');
    } catch (err: any) {
      setProfileError(err?.response?.data?.message ?? 'Could not update your profile.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const onStoreSubmit = async (values: StoreFormValues) => {
    setStoreError(null);
    setStoreSuccess(null);
    setStoreSubmitting(true);
    try {
      const updated = await updateVendorSettings({
        storeName: values.storeName.trim(),
        subdomain: values.subdomain.trim(),
        address: values.address?.trim() ?? '',
      });
      storeForm.reset({ storeName: updated.storeName, subdomain: updated.subdomain, address: updated.address ?? '' });
      // Keep the topbar/authStore's own copy of storeName/subdomain in
      // sync too — they're read from user.vendor in a few other places
      // (e.g. the "Visit site" link).
      if (accessToken && user) {
        setAuth(accessToken, {
          ...user,
          vendor: user.vendor ? { ...user.vendor, storeName: updated.storeName, subdomain: updated.subdomain } : user.vendor,
        });
      }
      setStoreSuccess('Store settings updated.');
    } catch (err: any) {
      setStoreError(err?.response?.data?.message ?? 'Could not update store settings.');
    } finally {
      setStoreSubmitting(false);
    }
  };

  const onPasswordSubmit = async (values: PasswordFormValues) => {
    setPasswordError(null);
    setPasswordSuccess(null);
    setPasswordSubmitting(true);
    try {
      await authApi.changePassword(values.currentPassword.trim(), values.newPassword.trim());
      setPasswordSuccess('Password changed.');
      passwordForm.reset();
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message ?? 'Could not change your password.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg space-y-10">
      <div>
        <h1 className="text-2xl font-semibold text-regantify-text">Settings</h1>
        <p className="text-regantify-text-muted mt-1">Manage your profile and password.</p>
      </div>

      {/* Avatar section */}
      <section>
        <h2 className="text-lg font-medium text-regantify-text mb-1">Profile picture</h2>
        <p className="text-sm text-regantify-text-muted mb-4">
          Shown in the top-right corner of your dashboard. Images are automatically resized and
          compressed (max 720px).
        </p>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={handleAvatarPick}
            disabled={avatarUploading}
            className="relative w-20 h-20 rounded-full overflow-hidden bg-regantify-search
              border border-black/5 shrink-0 disabled:opacity-60 group"
            title="Change profile picture"
          >
            {avatarPreview || user?.avatarUrl ? (
              <img
                src={avatarPreview ?? user!.avatarUrl!}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-regantify-text-muted">
                <User size={28} />
              </div>
            )}
            <div
              className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors
                flex items-center justify-center"
            >
              <Camera
                size={18}
                className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </button>
          <div>
            <button
              type="button"
              onClick={handleAvatarPick}
              disabled={avatarUploading}
              className="text-sm font-medium bg-regantify-black text-white py-2 px-4 rounded-xl
                hover:bg-black transition-colors disabled:opacity-60"
            >
              {avatarUploading ? 'Uploading…' : 'Upload photo'}
            </button>
            <p className="text-xs text-regantify-text-muted mt-2">JPG, PNG, WEBP, or GIF · under 8MB</p>
            {avatarError && <p className="text-red-500 text-sm mt-1.5">{avatarError}</p>}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
      </section>

      {/* Profile section */}
      <section>
        <h2 className="text-lg font-medium text-regantify-text mb-1">Profile</h2>
        <p className="text-sm text-regantify-text-muted mb-4">
          Email is optional and doesn't need to be verified.
        </p>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">
              Full name
            </label>
            <div className="relative">
              <User
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
                size={18}
              />
              <input
                type="text"
                placeholder="Your name"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                  placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black"
                {...profileForm.register('fullName')}
              />
            </div>
            {profileForm.formState.errors.fullName && (
              <p className="text-red-500 text-sm mt-1.5">
                {profileForm.formState.errors.fullName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">
              Email <span className="text-regantify-text-muted font-normal">(optional)</span>
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
                size={18}
              />
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                  placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black"
                {...profileForm.register('email')}
              />
            </div>
            {profileForm.formState.errors.email && (
              <p className="text-red-500 text-sm mt-1.5">
                {profileForm.formState.errors.email.message}
              </p>
            )}
            <p className="text-xs text-regantify-text-muted mt-1.5">
              Once added, you can use it to log in with your password instead of your phone
              number.
            </p>
          </div>

          {profileError && <p className="text-red-500 text-sm">{profileError}</p>}
          {profileSuccess && <p className="text-green-600 text-sm">{profileSuccess}</p>}

          <button
            type="submit"
            disabled={profileSubmitting}
            className="bg-regantify-black text-white font-medium py-2.5 px-5 rounded-xl
              hover:bg-black transition-colors disabled:opacity-60"
          >
            {profileSubmitting ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </section>

      {/* Store section */}
      <section>
        <h2 className="text-lg font-medium text-regantify-text mb-1">Store</h2>
        <p className="text-sm text-regantify-text-muted mb-4">
          Your phone number, store name, store URL, and address.
        </p>
        <form onSubmit={storeForm.handleSubmit(onStoreSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">
              Phone number
            </label>
            <div className="relative">
              <Phone
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
                size={18}
              />
              <input
                type="text"
                value={user?.phone ?? ''}
                readOnly
                disabled
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text-muted
                  cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-regantify-text-muted mt-1.5">
              This is how you log in — it can't be changed here.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">
              Store name
            </label>
            <div className="relative">
              <Store
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
                size={18}
              />
              <input
                type="text"
                placeholder="Your store name"
                disabled={storeLoading}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                  placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black
                  disabled:opacity-60"
                {...storeForm.register('storeName')}
              />
            </div>
            {storeForm.formState.errors.storeName && (
              <p className="text-red-500 text-sm mt-1.5">
                {storeForm.formState.errors.storeName.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">
              Store URL
            </label>
            <div className="relative">
              <LinkIcon
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
                size={18}
              />
              <input
                type="text"
                placeholder="your-store-name"
                disabled={storeLoading}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                  placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black
                  disabled:opacity-60"
                {...storeForm.register('subdomain')}
              />
            </div>
            {storeForm.formState.errors.subdomain ? (
              <p className="text-red-500 text-sm mt-1.5">
                {storeForm.formState.errors.subdomain.message}
              </p>
            ) : (
              <p className="text-xs text-regantify-text-muted mt-1.5 break-all">
                {storefrontStoreUrl(storeForm.watch('subdomain') || '…')}
              </p>
            )}
            <p className="text-xs text-amber-600 mt-1">
              Changing this immediately moves your live store — old links to your current URL will stop working.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">
              Address <span className="text-regantify-text-muted font-normal">(optional)</span>
            </label>
            <div className="relative">
              <MapPin
                className="absolute left-3.5 top-3.5 text-regantify-text-muted"
                size={18}
              />
              <textarea
                placeholder="Store or business address"
                rows={3}
                disabled={storeLoading}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                  placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black
                  disabled:opacity-60 resize-none"
                {...storeForm.register('address')}
              />
            </div>
          </div>

          {storeError && <p className="text-red-500 text-sm">{storeError}</p>}
          {storeSuccess && <p className="text-green-600 text-sm">{storeSuccess}</p>}

          <button
            type="submit"
            disabled={storeSubmitting || storeLoading}
            className="bg-regantify-black text-white font-medium py-2.5 px-5 rounded-xl
              hover:bg-black transition-colors disabled:opacity-60"
          >
            {storeSubmitting ? 'Saving…' : 'Save store settings'}
          </button>
        </form>
      </section>

      {/* Payment Gateway section — PLAN.md Step 12. Display + gate only:
          no real payment gateway exists yet (checkout is COD-only), so
          this is a settings toggle/contact-request entry point rather
          than an actual integration flow — see FeeSummary.tsx's own
          comment for the same framing. */}
      <PaymentGatewaySection />

      {/* Courier Integration section — COURIER-PLAN.md §5.1. Real API
          integration (unlike Payment Gateway above): connecting an
          account here is what lets the Orders page's "Book with
          {Provider}" action actually call that courier's API. */}
      <CourierIntegrationSection />

      {/* Password section */}
      <section>
        <h2 className="text-lg font-medium text-regantify-text mb-1">Change password</h2>
        <p className="text-sm text-regantify-text-muted mb-4">
          You'll need your current password to set a new one.
        </p>
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">
              Current password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
                size={18}
              />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                  placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black"
                {...passwordForm.register('currentPassword')}
              />
            </div>
            {passwordForm.formState.errors.currentPassword && (
              <p className="text-red-500 text-sm mt-1.5">
                {passwordForm.formState.errors.currentPassword.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">
              New password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
                size={18}
              />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                  placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black"
                {...passwordForm.register('newPassword')}
              />
            </div>
            {passwordForm.formState.errors.newPassword && (
              <p className="text-red-500 text-sm mt-1.5">
                {passwordForm.formState.errors.newPassword.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-regantify-text mb-1.5">
              Confirm new password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted"
                size={18}
              />
              <input
                type="password"
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-regantify-search text-regantify-text
                  placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black"
                {...passwordForm.register('confirmPassword')}
              />
            </div>
            {passwordForm.formState.errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1.5">
                {passwordForm.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-600 text-sm">{passwordSuccess}</p>}

          <button
            type="submit"
            disabled={passwordSubmitting}
            className="bg-regantify-black text-white font-medium py-2.5 px-5 rounded-xl
              hover:bg-black transition-colors disabled:opacity-60"
          >
            {passwordSubmitting ? 'Saving…' : 'Change password'}
          </button>
        </form>
      </section>
    </div>
  );
}

/**
 * Payment Gateway settings card — PLAN.md Step 12. Every plan includes
 * the free gateway (COD today, see PLAN.md's own note on why no real
 * fee is deducted yet); Custom Payment Gateway is the paid-tier-only
 * "option available" row from the source-of-truth table — gated the
 * same locked/upgrade-prompt way as Domain.tsx (Step 8), not hidden.
 * There's no real gateway integration to configure yet, so "enabling"
 * it here is a contact-request action (see button below), not a form —
 * matches PLAN.md's own framing of this as "a settings toggle/
 * contact-request flow" until a real gateway exists.
 */
function PaymentGatewaySection() {
  const { data: usage, isLoading } = useQuery({
    queryKey: ['vendor-plan-usage'],
    queryFn: getVendorPlanUsage,
  });
  const allowed = usage?.plan.customPaymentGatewayAllowed ?? false;

  return (
    <section>
      <h2 className="text-lg font-medium text-regantify-text mb-1">Payment Gateway</h2>
      <p className="text-sm text-regantify-text-muted mb-4">
        Every plan includes a free payment gateway — see Finance &gt; Fee Summary for the per-transaction fee.
      </p>

      <div className="rounded-xl bg-regantify-search p-4 flex items-start gap-3">
        <CreditCard size={18} className="text-regantify-text-muted mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-regantify-text">Custom Payment Gateway</p>
          <p className="text-sm text-regantify-text-muted mt-0.5">
            {allowed
              ? 'Available on your plan. Contact support to connect your own payment gateway.'
              : "Not available on your plan. Upgrade to use your own payment gateway."}
          </p>
        </div>
        <button
          type="button"
          disabled={isLoading}
          onClick={() =>
            allowed
              ? toast.success('Request sent — our support team will reach out to set up your custom gateway.')
              : upgradeToast('use a custom payment gateway')
          }
          className={`shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-60 ${
            allowed
              ? 'bg-regantify-cta hover:bg-regantify-cta-dark text-white'
              : 'bg-white border border-black/10 text-regantify-text hover:bg-regantify-content'
          }`}
        >
          {allowed ? 'Request Setup' : 'Upgrade to Unlock'}
        </button>
      </div>
    </section>
  );
}

interface CourierProviderCardProps {
  provider: CourierAccountProvider;
  label: string;
  account: CourierAccount | undefined;
  isLoading: boolean;
  /** Extra copy shown under the connected/not-connected line — e.g. Pathao/RedX's pickup-store hint. */
  connectedNote?: string;
  onConnect: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
  /** Store picker or other follow-up UI, shown below the card once connected — e.g. PathaoStorePicker/RedxStorePicker. */
  children?: ReactNode;
}

/**
 * One courier's card in Settings > Courier Integration — extracted since
 * SteadFast/Pathao/RedX are otherwise near-identical blocks (connected/
 * not-connected copy + Connect/Disconnect button), differing only in
 * whether they need a follow-up store picker underneath.
 */
function CourierProviderCard({
  label,
  account,
  isLoading,
  connectedNote,
  onConnect,
  onDisconnect,
  disconnecting,
  children,
}: CourierProviderCardProps) {
  return (
    <div className="rounded-xl bg-regantify-search p-4">
      <div className="flex items-start gap-3">
        <Truck size={18} className="text-regantify-text-muted mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-regantify-text">{label}</p>
          <p className="text-sm text-regantify-text-muted mt-0.5">
            {isLoading ? 'Loading…' : account ? (connectedNote ?? 'Connected.') : 'Not connected yet.'}
          </p>
        </div>
        {!isLoading &&
          (account ? (
            <button
              type="button"
              onClick={onDisconnect}
              disabled={disconnecting}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-white border border-black/10 text-regantify-text hover:bg-regantify-content disabled:opacity-60"
            >
              Disconnect
            </button>
          ) : (
            <button
              type="button"
              onClick={onConnect}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-medium bg-regantify-cta hover:bg-regantify-cta-dark text-white"
            >
              Connect
            </button>
          ))}
      </div>

      {account && children && <div className="mt-4 pt-4 border-t border-black/5">{children}</div>}
    </div>
  );
}

/**
 * Courier Integration — COURIER-PLAN.md §5.1. Unlike Payment Gateway
 * above, this is a REAL integration: connecting an account here is what
 * lets the Orders page's "Book with {Provider}" action actually call
 * that courier's API. "Connect" opens the SAME CourierSetupModal popup
 * the Orders page's setup-popup flow uses (not an inline expanding form)
 * — one popup component, two entry points, per COURIER-PLAN.md §5.2.
 * Pathao and RedX additionally need a pickup store selected
 * (PathaoStorePicker / RedxStorePicker, shown inline once connected)
 * before they can actually book.
 */
function CourierIntegrationSection() {
  const queryClient = useQueryClient();
  const [connectingProvider, setConnectingProvider] = useState<CourierAccountProvider | null>(null);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ['courier-accounts'],
    queryFn: courierApi.getAccounts,
  });

  const disconnectMutation = useMutation({
    mutationFn: (provider: CourierAccountProvider) => courierApi.disconnect(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courier-accounts'] });
      toast.success('Courier account disconnected.');
    },
    onError: () => toast.error('Could not disconnect. Please try again.'),
  });

  const steadfastAccount = accounts.find((a) => a.provider === 'STEADFAST' && a.isActive);
  const pathaoAccount = accounts.find((a) => a.provider === 'PATHAO' && a.isActive);
  const redxAccount = accounts.find((a) => a.provider === 'REDX' && a.isActive);

  return (
    <section>
      <h2 className="text-lg font-medium text-regantify-text mb-1">Courier Integration</h2>
      <p className="text-sm text-regantify-text-muted mb-4">
        Connect your own courier accounts so the Orders page can book real deliveries.
      </p>

      <div className="space-y-3">
        <CourierProviderCard
          provider="STEADFAST"
          label="SteadFast Courier"
          account={steadfastAccount}
          isLoading={isLoading}
          connectedNote="Connected — orders can be booked with SteadFast."
          onConnect={() => setConnectingProvider('STEADFAST')}
          onDisconnect={() => disconnectMutation.mutate('STEADFAST')}
          disconnecting={disconnectMutation.isPending}
        />

        <CourierProviderCard
          provider="PATHAO"
          label="Pathao Courier"
          account={pathaoAccount}
          isLoading={isLoading}
          connectedNote={
            pathaoAccount?.pathaoStoreName
              ? `Connected — booking as "${pathaoAccount.pathaoStoreName}".`
              : 'Connected — select a pickup store below to finish setup.'
          }
          onConnect={() => setConnectingProvider('PATHAO')}
          onDisconnect={() => disconnectMutation.mutate('PATHAO')}
          disconnecting={disconnectMutation.isPending}
        >
          {pathaoAccount && <PathaoStorePicker currentStoreId={pathaoAccount.pathaoStoreId} />}
        </CourierProviderCard>

        <CourierProviderCard
          provider="REDX"
          label="RedX Courier"
          account={redxAccount}
          isLoading={isLoading}
          connectedNote={
            redxAccount?.redxStoreName
              ? `Connected — booking as "${redxAccount.redxStoreName}".`
              : 'Connected — select a pickup store below to finish setup.'
          }
          onConnect={() => setConnectingProvider('REDX')}
          onDisconnect={() => disconnectMutation.mutate('REDX')}
          disconnecting={disconnectMutation.isPending}
        >
          {redxAccount && <RedxStorePicker currentStoreId={redxAccount.redxStoreId} />}
        </CourierProviderCard>
      </div>

      <CourierSetupModal
        provider={connectingProvider}
        onOpenChange={(open) => !open && setConnectingProvider(null)}
        onConnected={() => setConnectingProvider(null)}
      />

      <DeliveryChargeSection />
    </section>
  );
}

const deliveryChargeSchema = z.object({
  insideDhakaCharge: z.coerce.number().min(0, 'Enter a valid amount').max(1000000, 'Amount is too large'),
  outsideDhakaCharge: z.coerce.number().min(0, 'Enter a valid amount').max(1000000, 'Amount is too large'),
  codVatCharge: z.coerce.number().min(0, 'Enter a valid amount').max(1000000, 'Amount is too large'),
});
type DeliveryChargeFormValues = z.infer<typeof deliveryChargeSchema>;

/**
 * Settings > Courier Integration > Delivery Charge — vendor-editable
 * Inside Dhaka / Outside Dhaka shipping charges plus a flat COD VAT fee
 * (see Vendor.insideDhakaCharge etc in schema.prisma). Nested under
 * Courier Integration rather than its own top-level section since it's
 * the "how much do we charge for delivery" counterpart to the courier
 * accounts above it. These are the exact numbers checkout uses to price
 * an order — see OrdersService.create and storefront/src/lib/
 * useCheckout.ts, both of which read the vendor's own saved values
 * instead of a shared constant now.
 */
function DeliveryChargeSection() {
  const queryClient = useQueryClient();
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: charges, isLoading } = useQuery({
    queryKey: ['vendor-delivery-charges'],
    queryFn: getVendorDeliveryCharges,
  });

  const form = useForm<DeliveryChargeFormValues>({
    resolver: zodResolver(deliveryChargeSchema),
    defaultValues: { insideDhakaCharge: 70, outsideDhakaCharge: 130, codVatCharge: 5 },
  });

  useEffect(() => {
    if (charges) {
      form.reset({
        insideDhakaCharge: Number(charges.insideDhakaCharge),
        outsideDhakaCharge: Number(charges.outsideDhakaCharge),
        codVatCharge: Number(charges.codVatCharge),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charges]);

  const saveMutation = useMutation({
    mutationFn: updateVendorDeliveryCharges,
    onSuccess: (updated) => {
      queryClient.setQueryData(['vendor-delivery-charges'], updated);
      setSaveError(null);
      toast.success('Delivery charges saved.');
    },
    onError: () => setSaveError('Could not save delivery charges. Please try again.'),
  });

  const onSubmit = (values: DeliveryChargeFormValues) => {
    setSaveError(null);
    saveMutation.mutate(values);
  };

  return (
    <div className="mt-6 pt-6 border-t border-black/5">
      <h3 className="text-sm font-medium text-regantify-text mb-1">Delivery Charge</h3>
      <p className="text-sm text-regantify-text-muted mb-4">
        Set what shoppers pay for delivery, and a flat VAT charged on Cash on Delivery orders only.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Inside Dhaka (৳)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            disabled={isLoading}
            className="w-full px-4 py-2.5 rounded-xl bg-regantify-search text-regantify-text
              focus:outline-none focus:ring-2 focus:ring-regantify-black"
            {...form.register('insideDhakaCharge')}
          />
          {form.formState.errors.insideDhakaCharge && (
            <p className="text-red-500 text-sm mt-1.5">{form.formState.errors.insideDhakaCharge.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Outside Dhaka (৳)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            disabled={isLoading}
            className="w-full px-4 py-2.5 rounded-xl bg-regantify-search text-regantify-text
              focus:outline-none focus:ring-2 focus:ring-regantify-black"
            {...form.register('outsideDhakaCharge')}
          />
          {form.formState.errors.outsideDhakaCharge && (
            <p className="text-red-500 text-sm mt-1.5">{form.formState.errors.outsideDhakaCharge.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Cash on Delivery VAT (৳)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            disabled={isLoading}
            className="w-full px-4 py-2.5 rounded-xl bg-regantify-search text-regantify-text
              focus:outline-none focus:ring-2 focus:ring-regantify-black"
            {...form.register('codVatCharge')}
          />
          {form.formState.errors.codVatCharge && (
            <p className="text-red-500 text-sm mt-1.5">{form.formState.errors.codVatCharge.message}</p>
          )}
          <p className="text-xs text-regantify-text-muted mt-1.5">
            Added only when a shopper pays Cash on Delivery — never on Online Payment.
          </p>
        </div>

        <div className="sm:col-span-3 flex items-center gap-3">
          {saveError && <p className="text-red-500 text-sm">{saveError}</p>}
          <button
            type="submit"
            disabled={saveMutation.isPending || isLoading}
            className="bg-regantify-black text-white font-medium py-2.5 px-5 rounded-xl
              hover:bg-black transition-colors disabled:opacity-60"
          >
            {saveMutation.isPending ? 'Saving…' : 'Save delivery charges'}
          </button>
        </div>
      </form>
    </div>
  );
}
