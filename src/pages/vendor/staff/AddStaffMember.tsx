import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronLeft, Copy, Shuffle } from 'lucide-react';
import { SectionCard, Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { SaveBar, Segmented, useUnsavedChangesWarning } from '../../../components/product/ProductFormKit';
import { outlineBtn } from '../../../components/ui/PageKit';
import { staffApi } from '../../../lib/staffApi';
import { BD_PHONE_HINT, normalizeBdPhone, toLatinDigits } from '../../../lib/bdPhone';
import { toast } from '../../../lib/toast';
import { StaffAccessNote } from './StaffAccess';

const ROLE_OPTIONS = ['Admin', 'Shop Manager', 'Customer Support'] as const;
type RoleOption = (typeof ROLE_OPTIONS)[number];

const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
function generateSuggestedPassword(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (n) => PASSWORD_ALPHABET[n % PASSWORD_ALPHABET.length]).join('');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// IPv4, or IPv6 written with colons.
const IP_RE = /^(\d{1,3}(\.\d{1,3}){3}|[0-9a-fA-F:]{2,39})$/;

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error('Couldn’t copy. Select the text and copy it yourself.');
  }
}

/**
 * Staff > "Add staff" — owner-only (see StaffController). The password is
 * pre-filled with a random suggestion the owner can change or remake —
 * there's no email service to deliver it (see StaffService.create), so
 * after adding, the owner sees the sign-in details once more to pass on.
 */
export default function AddStaffMember() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(() => generateSuggestedPassword());
  const [role, setRole] = useState<RoleOption>('Customer Support');
  const [allowedIp, setAllowedIp] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; phone: string; password: string } | null>(null);

  useUnsavedChangesWarning(!created && Boolean(name || phone || email || allowedIp));

  const normalizedPhone = normalizeBdPhone(phone);
  const errors = {
    name: !name.trim() ? 'Enter their name.' : null,
    phone: !phone.trim() ? 'Enter their phone number. They sign in with it.' : !normalizedPhone ? BD_PHONE_HINT : null,
    email: email.trim() && !EMAIL_RE.test(email.trim()) ? 'This email doesn’t look right. Check the @ and the dot.' : null,
    password: password.trim().length < 6 ? 'Use at least 6 characters.' : null,
    allowedIp: allowedIp.trim() && !IP_RE.test(allowedIp.trim()) ? 'Enter an IP like 103.112.54.10, or leave it empty.' : null,
  };
  const shown = (k: keyof typeof errors) => (submitted ? errors[k] : null);
  const valid = Object.values(errors).every((e) => !e);

  const createMutation = useMutation({
    mutationFn: () =>
      staffApi.create({
        name: name.trim(),
        phone: normalizedPhone ?? phone.trim(),
        email: email.trim() || undefined,
        role,
        password: password.trim() || undefined,
        allowedIp: allowedIp.trim() || undefined,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-plan-usage'] });
      setCreated({ name: result.name, phone: result.phone ?? normalizedPhone ?? phone, password: result.temporaryPassword });
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      setFormError((Array.isArray(message) ? message[0] : message) ?? 'Couldn’t add this staff member. Check your connection and try again.');
    },
  });

  if (created) {
    const details = `Phone: ${created.phone}\nPassword: ${created.password}`;
    return (
      <section className="mx-auto max-w-xl rounded-xl border border-line bg-white p-5">
        <CheckCircle2 className="text-emerald-600" size={28} aria-hidden />
        <h1 className="mt-2 text-[15px] font-semibold text-regantify-text">{created.name} is on your team</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Send them these sign-in details yourself (by message or in person). This is the only time the password is shown.
        </p>
        <dl className="mt-4 space-y-2 rounded-lg border border-line bg-neutral-50 p-3 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-500">Phone</dt>
            <dd className="font-mono tabular-nums">{created.phone}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-neutral-500">Password</dt>
            <dd className="font-mono">{created.password}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => copy(details, 'Sign-in details')} className={`${outlineBtn} h-10`}>
            <Copy size={14} aria-hidden />
            Copy sign-in details
          </button>
          <button
            type="button"
            onClick={() => navigate('/vendor/staff')}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            Done
          </button>
        </div>
      </section>
    );
  }

  return (
    <form
      className="mx-auto max-w-3xl"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        setSubmitted(true);
        if (valid) createMutation.mutate();
      }}
    >
      <div className="mb-4">
        <Link to="/vendor/staff" className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-regantify-text">
          <ChevronLeft size={16} aria-hidden />
          Staff
        </Link>
        <h1 className="text-[15px] font-semibold text-regantify-text">Add staff</h1>
        <p className="mt-0.5 text-sm text-neutral-500">They get their own sign-in to your store’s dashboard.</p>
      </div>

      <div className="space-y-4">
        <SectionCard title="Who they are">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required error={shown('name')}>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahim" className={productInputClass} />
            </Field>
            <Field label="Phone" required error={shown('phone')} hint="They sign in with this number.">
              <input
                type="text"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(toLatinDigits(e.target.value))}
                placeholder="01XXXXXXXXX"
                className={productInputClass}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Email" error={shown('email')}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" className={productInputClass} />
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Sign-in">
          <div className="space-y-4">
            <Field label="Password" required error={shown('password')} hint="You’ll see it again after adding, to send to them.">
              <div className="flex gap-2">
                <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className={`${productInputClass} font-mono`} />
                <button type="button" onClick={() => setPassword(generateSuggestedPassword())} className={`${outlineBtn} h-[42px] shrink-0`}>
                  <Shuffle size={14} aria-hidden />
                  New
                </button>
              </div>
            </Field>
            <Field label="Allowed IP address" error={shown('allowedIp')} hint="Optional. They can sign in only from this internet connection, e.g. your shop’s.">
              <input type="text" value={allowedIp} onChange={(e) => setAllowedIp(e.target.value.trim())} placeholder="e.g. 103.112.54.10" className={productInputClass} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Role" description="A name for their job on your team.">
          <Segmented<RoleOption> ariaLabel="Role" value={role} onChange={setRole} options={ROLE_OPTIONS.map((r) => ({ id: r, label: r }))} />
          <div className="mt-4">
            <StaffAccessNote />
          </div>
        </SectionCard>
      </div>

      <SaveBar message={formError ? <span className="text-red-600">{formError}</span> : submitted && !valid ? <span className="text-red-600">Fix the fields marked in red.</span> : undefined}>
        <Link to="/vendor/staff" className={`${outlineBtn} h-10`}>
          Cancel
        </Link>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {createMutation.isPending ? 'Adding…' : 'Add staff'}
        </button>
      </SaveBar>
    </form>
  );
}
