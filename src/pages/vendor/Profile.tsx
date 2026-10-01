import { useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Camera, Mail, User } from 'lucide-react';
import { authApi } from '../../lib/authApi';
import { useAuthStore } from '../../store/authStore';
import { Field, IconInput, SaveButton, SavedNote, Section, flashFor } from '../../components/ui/FormKit';

const profileSchema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  email: z.string().email('Enter a valid email address').optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

/**
 * The vendor's own profile: photo, name and email. Opened from the avatar
 * menu. Store and account security live on the Settings page instead.
 */
export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setAuth = useAuthStore((s) => s.setAuth);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarSaved, setAvatarSaved] = useState<string | null>(null);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState<string | null>(null);
  const [profileSubmitting, setProfileSubmitting] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName: user?.fullName ?? '', email: user?.email ?? '' },
  });

  const handleAvatarPick = () => avatarInputRef.current?.click();

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Let the same file be picked again later.
    e.target.value = '';
    if (!file) return;

    setAvatarError(null);
    if (!/^image\/(jpe?g|png|webp|gif)$/.test(file.type)) {
      setAvatarError('Please choose a JPG, PNG, WEBP, or GIF image.');
      return;
    }
    // The server resizes to max 720px anyway; this just stops an obviously
    // wrong file from being uploaded for nothing.
    if (file.size > 8 * 1024 * 1024) {
      setAvatarError('Image is too large — please choose a file under 8MB.');
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setAvatarPreview(localPreviewUrl);
    setAvatarUploading(true);
    try {
      const res = await authApi.uploadAvatar(file);
      if (accessToken) setAuth(accessToken, res.user);
      flashFor(setAvatarSaved, 'Photo updated');
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
    setProfileSubmitting(true);
    try {
      const res = await authApi.updateSettingsProfile({
        fullName: values.fullName.trim(),
        email: values.email?.trim() ? values.email.trim() : undefined,
      });
      if (accessToken) setAuth(accessToken, res.user);
      profileForm.reset({ fullName: res.user.fullName ?? '', email: res.user.email ?? '' });
      flashFor(setProfileSaved, 'Saved');
    } catch (err: any) {
      setProfileError(err?.response?.data?.message ?? 'Could not update your profile.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  const avatarSrc = avatarPreview ?? user?.avatarUrl ?? null;
  const { errors, isDirty } = profileForm.formState;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="mb-1">
        <h1 className="text-xl font-semibold text-regantify-text">Profile</h1>
        <p className="text-sm text-neutral-500">Your photo, name and email.</p>
      </div>

      {/* Summary card */}
      <section className="flex items-center gap-4 overflow-hidden rounded-xl border border-line bg-white p-5">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-amber-200 to-amber-500">
          {avatarSrc ? (
            <img src={avatarSrc} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white">
              <User size={26} />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-regantify-text">{user?.fullName || 'Your name'}</p>
          <p className="truncate text-sm text-neutral-500">{user?.email || user?.phone || ''}</p>
          {user?.vendor?.storeName && (
            <span className="mt-1.5 inline-flex items-center rounded-full bg-brand-lime px-2 py-0.5 text-xs font-medium text-brand">
              Owner · {user.vendor.storeName}
            </span>
          )}
        </div>
      </section>

      <Section
        title="Profile picture"
        description="Shown in the top-right corner of your dashboard. Images are automatically resized and compressed (max 720px)."
      >
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleAvatarPick}
            disabled={avatarUploading}
            title="Change profile picture"
            className="group relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-amber-200 to-amber-500 disabled:opacity-60"
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-white">
                <User size={26} />
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
              <Camera size={18} className="text-white opacity-0 transition-opacity group-hover:opacity-100" />
            </span>
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleAvatarPick}
                disabled={avatarUploading}
                className="h-10 rounded-lg bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-dark active:scale-95 disabled:opacity-60"
              >
                {avatarUploading ? 'Uploading…' : 'Upload photo'}
              </button>
              {avatarSaved && <SavedNote text={avatarSaved} />}
            </div>
            <p className="mt-1.5 text-xs text-neutral-500">JPG, PNG, WEBP, or GIF · under 8MB</p>
            {avatarError && <p className="mt-1 text-xs text-red-600">{avatarError}</p>}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
      </Section>

      <Section title="Personal information" description="Email is optional and doesn't need to be verified.">
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
          <Field label="Full name" error={errors.fullName?.message}>
            <IconInput icon={User} type="text" placeholder="Your name" {...profileForm.register('fullName')} />
          </Field>
          <Field
            label="Email"
            optional
            error={errors.email?.message}
            hint="Once added, you can use it to log in with your password instead of your phone number."
          >
            <IconInput icon={Mail} type="email" placeholder="you@example.com" {...profileForm.register('email')} />
          </Field>
          <SaveButton busy={profileSubmitting} disabled={!isDirty} saved={profileSaved} error={profileError}>
            Save profile
          </SaveButton>
        </form>
      </Section>
    </div>
  );
}
