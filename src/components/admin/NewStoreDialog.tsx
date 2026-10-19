import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { adminApi } from '../../lib/adminApi';
import { apiErrorMessage } from '../../lib/api';
import { normalizeBdPhone, toLatinDigits } from '../../lib/bdPhone';
import { storefrontStoreUrl } from '../../lib/storefrontUrl';
import { toast } from '../../lib/toast';

// No 0/O, 1/l/I: the password may be read out over the phone.
const PASSWORD_CHARS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makePassword(length = 10): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => PASSWORD_CHARS[b % PASSWORD_CHARS.length]).join('');
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

type Created = { vendorId: string; storeName: string; subdomain: string; phone: string; password: string; smsSent: boolean; smsAsked: boolean };

/**
 * Super Admin > All stores > "New store": open a store for an owner with their phone and a password, with no OTP and no email
 * check (POST /v1/admin/vendors, AuthService.adminCreateVendor). The owner then signs in at the normal vendor login. After
 * saving, the sign-in details are shown once to copy (the password is never shown again anywhere).
 */
export function NewStoreDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(true);
  const [storeName, setStoreName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [email, setEmail] = useState('');
  const [sendSms, setSendSms] = useState(false);
  const [tried, setTried] = useState(false);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  const normalizedPhone = normalizeBdPhone(phone);
  const errors = {
    ownerName: ownerName.trim().length < 2 ? 'Enter the owner’s name.' : null,
    phone: !normalizedPhone ? 'Enter a valid Bangladeshi mobile number, e.g. 017XXXXXXXX.' : null,
    password: password.length < 6 ? 'At least 6 characters.' : null,
    storeName: storeName.trim().length < 2 ? 'Enter the store name.' : null,
    email: email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'Enter a valid email or leave it empty.' : null,
  };
  const valid = Object.values(errors).every((e) => !e);
  const urlPart = slug(subdomain) || slug(storeName);

  const reset = () => {
    setOwnerName('');
    setPhone('');
    setPassword('');
    setShowPassword(true);
    setStoreName('');
    setSubdomain('');
    setEmail('');
    setSendSms(false);
    setTried(false);
    setCreated(null);
    setCopied(false);
  };
  const close = () => {
    reset();
    onClose();
  };

  const create = useMutation({
    mutationFn: () =>
      adminApi.createVendor({
        ownerName: ownerName.trim(),
        phone: normalizedPhone!,
        password,
        storeName: storeName.trim(),
        subdomain: slug(subdomain) || undefined,
        email: email.trim() || undefined,
        sendSms,
      }),
    onSuccess: (r) => {
      setCreated({ ...r, password, smsAsked: sendSms });
      queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });
      toast.success(`${r.storeName} is ready.`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'The store could not be created.')),
  });

  const field = 'w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';
  const label = 'mb-1 block text-sm font-medium text-regantify-text';
  const err = (e: string | null) => (tried && e ? <p className="mt-1 text-xs text-red-600">{e}</p> : null);

  if (created) {
    const storeUrl = storefrontStoreUrl(created.subdomain);
    const details = `Store: ${created.storeName}\nStore link: ${storeUrl}\nSign in: ${window.location.origin}/vendor/login\nPhone: ${created.phone}\nPassword: ${created.password}`;
    return (
      <Dialog open={open} onOpenChange={(o) => !o && close()} maxWidth="max-w-md" title="Store created">
        <div className="space-y-4 p-6 pt-4">
          <p className="text-sm text-regantify-text-muted">
            The owner can sign in now with this phone and password. This is the only time the password is shown, so copy it.
          </p>
          <pre className="whitespace-pre-wrap rounded-xl bg-neutral-50 p-3.5 text-[13px] leading-relaxed text-regantify-text">{details}</pre>
          {created.smsAsked && (
            <p className={`text-xs ${created.smsSent ? 'text-emerald-700' : 'text-red-700'}`}>
              {created.smsSent ? 'The sign-in details were texted to the owner.' : 'The SMS could not be sent. Share the details another way.'}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(details).then(() => setCopied(true));
              }}
              className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 px-3.5 py-2 text-sm font-medium text-regantify-text hover:bg-neutral-50"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy details'}
            </button>
            <Link to={`/admin/vendors/${created.vendorId}`} onClick={close} className="inline-flex items-center rounded-xl bg-regantify-cta px-3.5 py-2 text-sm font-medium text-white">
              Open the store page
            </Link>
            <button type="button" onClick={reset} className="ml-auto text-sm text-regantify-text-muted hover:text-regantify-text">
              Create another
            </button>
          </div>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()} maxWidth="max-w-md" title="New store">
      <form
        noValidate
        className="space-y-4 p-6 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (valid) create.mutate();
        }}
      >
        <p className="text-sm text-regantify-text-muted">
          Open a store for an owner. No OTP or email check: they sign in with this phone and password. The store starts on the Free plan.
        </p>

        <div>
          <label className={label} htmlFor="ns-owner">Owner’s name</label>
          <input id="ns-owner" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} maxLength={80} className={field} autoComplete="off" />
          {err(errors.ownerName)}
        </div>

        <div>
          <label className={label} htmlFor="ns-phone">Owner’s phone</label>
          <input
            id="ns-phone"
            value={phone}
            onChange={(e) => setPhone(toLatinDigits(e.target.value))}
            inputMode="tel"
            placeholder="017XXXXXXXX"
            className={field}
            autoComplete="off"
          />
          {err(errors.phone)}
        </div>

        <div>
          <label className={label} htmlFor="ns-password">Password</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                id="ns-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                maxLength={72}
                className={`${field} pr-10`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-regantify-text-muted hover:text-regantify-text"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setPassword(makePassword());
                setShowPassword(true);
              }}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-black/10 px-3 text-sm text-regantify-text hover:bg-neutral-50"
            >
              <RefreshCw size={14} /> Generate
            </button>
          </div>
          {err(errors.password)}
        </div>

        <div>
          <label className={label} htmlFor="ns-store">Store name</label>
          <input id="ns-store" value={storeName} onChange={(e) => setStoreName(e.target.value)} maxLength={60} className={field} autoComplete="off" />
          {err(errors.storeName)}
        </div>

        <div>
          <label className={label} htmlFor="ns-url">
            Store URL <span className="font-normal text-regantify-text-muted">(optional)</span>
          </label>
          <input id="ns-url" value={subdomain} onChange={(e) => setSubdomain(e.target.value)} maxLength={40} placeholder={slug(storeName) || 'my-shop'} className={field} autoComplete="off" />
          {urlPart && <p className="mt-1 break-all text-xs text-regantify-text-muted">{storefrontStoreUrl(urlPart)}{slug(subdomain) ? '' : ' (a number is added if it is taken)'}</p>}
        </div>

        <div>
          <label className={label} htmlFor="ns-email">
            Email <span className="font-normal text-regantify-text-muted">(optional)</span>
          </label>
          <input id="ns-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} className={field} autoComplete="off" />
          {err(errors.email)}
        </div>

        <label className="flex items-start gap-2.5 text-sm text-regantify-text">
          <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand" />
          <span>
            Text the sign-in details to the owner
            <span className="block text-xs text-regantify-text-muted">Platform SMS, includes the password.</span>
          </span>
        </label>

        <button type="submit" disabled={create.isPending} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {create.isPending ? 'Creating…' : 'Create store'}
        </button>
      </form>
    </Dialog>
  );
}
