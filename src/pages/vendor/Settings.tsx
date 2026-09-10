import { useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Mail, Lock, Camera } from 'lucide-react';
import { authApi } from '../../lib/authApi';
import { useAuthStore } from '../../store/authStore';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
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

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName ?? '',
      email: user?.email ?? '',
    },
  });

  const passwordForm = useForm<PasswordFormValues>({ resolver: zodResolver(passwordSchema) });

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
