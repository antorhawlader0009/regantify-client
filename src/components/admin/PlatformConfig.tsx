import { useEffect, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { platformConfigApi, type ConfigSection, type PlatformConfig, type SignupMode } from '../../lib/platformConfigApi';
import { toast } from '../../lib/toast';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
const CONFIG_KEY = ['admin-platform-config'];

function usePlatformConfig() {
  return useQuery({ queryKey: CONFIG_KEY, queryFn: platformConfigApi.get });
}

/** One card per section: its own Save, so changing the maintenance banner can never overwrite the withdraw fee. */
function Section({ title, hint, section, body, valid = true, children }: { title: string; hint?: string; section: ConfigSection; body: () => Record<string, unknown>; valid?: boolean; children: ReactNode }) {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: () => platformConfigApi.save(section, body()),
    onSuccess: () => {
      toast.success('Saved.');
      qc.invalidateQueries({ queryKey: CONFIG_KEY });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5">
      <h2 className="text-sm font-semibold text-regantify-text">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-regantify-text-muted">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
      <button type="button" disabled={!valid || save.isPending} onClick={() => save.mutate()} className="mt-5 rounded-xl bg-regantify-cta px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
        {save.isPending ? 'Saving…' : 'Save'}
      </button>
    </section>
  );
}

function Label({ text, hint, children }: { text: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-regantify-text">{text}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-regantify-text-muted">{hint}</span>}
    </label>
  );
}

const digits = (v: string) => v.replace(/[^\d.]/g, '');
const toInputDate = (iso: string | null) => {
  if (!iso) return '';
  // datetime-local wants Dhaka wall time without a zone.
  const d = new Date(new Date(iso).getTime() + 6 * 3600_000);
  return d.toISOString().slice(0, 16);
};
const fromInputDate = (v: string) => (v ? `${v}:00+06:00` : '');

export function ContactSection() {
  const { data } = usePlatformConfig();
  const [f, setF] = useState({ supportPhone: '', supportWhatsapp: '', alertPhone: '' });
  useEffect(() => {
    if (data) setF({ supportPhone: data.contact.supportPhone, supportWhatsapp: data.contact.supportWhatsapp, alertPhone: data.contact.alertPhone });
  }, [data]);
  if (!data) return <p className="text-sm text-regantify-text-muted">Loading…</p>;
  return (
    <Section title="Contact" hint="Shown to stores on their Support page, and where the platform's own alerts are texted." section="contact" body={() => f}>
      <Label text="Support phone">
        <input className={field} value={f.supportPhone} onChange={(e) => setF({ ...f, supportPhone: e.target.value })} placeholder="01XXXXXXXXX" maxLength={30} />
      </Label>
      <Label text="Support WhatsApp">
        <input className={field} value={f.supportWhatsapp} onChange={(e) => setF({ ...f, supportWhatsapp: e.target.value })} placeholder="01XXXXXXXXX" maxLength={30} />
      </Label>
      <Label
        text="Alert phone"
        hint={data.contact.alertPhone ? 'Texted when a background job is late, the SMS balance is low, a new admin device signs in or a verification arrives.' : data.contact.alertPhoneFromEnv ? 'Not set here, so the ADMIN_ALERT_PHONE from the server .env is used.' : 'Not set anywhere, so no alert is texted.'}
      >
        <input className={field} value={f.alertPhone} onChange={(e) => setF({ ...f, alertPhone: e.target.value })} placeholder="01XXXXXXXXX" maxLength={30} />
      </Label>
    </Section>
  );
}

const MODES: Array<{ id: SignupMode; label: string; text: string }> = [
  { id: 'OPEN', label: 'Open', text: 'Anyone can sign up and start straight away.' },
  { id: 'APPROVAL', label: 'Approval required', text: 'A new store waits as Pending until you approve it (Stores > Pending Approval).' },
  { id: 'CLOSED', label: 'Closed', text: 'No new store can sign up. Existing stores are not affected.' },
];
const words = (v: string) => v.split(/[\n,]/).map((w) => w.trim()).filter(Boolean);

export function SignupSection() {
  const { data } = usePlatformConfig();
  const [mode, setMode] = useState<SignupMode>('OPEN');
  const [reserved, setReserved] = useState('');
  const [blocked, setBlocked] = useState('');
  useEffect(() => {
    if (!data) return;
    setMode(data.signup.mode);
    setReserved(data.signup.reservedSubdomains.join('\n'));
    setBlocked(data.signup.blockedStoreWords.join('\n'));
  }, [data]);
  if (!data) return <p className="text-sm text-regantify-text-muted">Loading…</p>;
  return (
    <Section title="Sign-up" section="signup" body={() => ({ mode, reservedSubdomains: words(reserved), blockedStoreWords: words(blocked) })}>
      <div className="space-y-2">
        {MODES.map((m) => (
          <label key={m.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 ${mode === m.id ? 'border-regantify-cta bg-regantify-cta/5' : 'border-black/10'}`}>
            <input type="radio" name="signup-mode" checked={mode === m.id} onChange={() => setMode(m.id)} className="mt-1" />
            <span>
              <span className="block text-sm font-medium text-regantify-text">{m.label}</span>
              <span className="block text-xs text-regantify-text-muted">{m.text}</span>
            </span>
          </label>
        ))}
      </div>
      <Label text="Reserved store addresses" hint={`One per line. These can't be used as a store URL, on top of the built-in ones (${data.signup.builtInReserved.slice(0, 8).join(', ')}…).`}>
        <textarea className={field} rows={4} value={reserved} onChange={(e) => setReserved(e.target.value)} placeholder="payments&#10;official" />
      </Label>
      <Label text="Blocked words in store names" hint="One per line. A store name containing any of these is refused (not case sensitive).">
        <textarea className={field} rows={4} value={blocked} onChange={(e) => setBlocked(e.target.value)} />
      </Label>
    </Section>
  );
}

export function MoneySection() {
  const { data } = usePlatformConfig();
  const [f, setF] = useState({ minWithdraw: '100', fee: '0', feePct: '0', grace: '3', smsLow: '500', trialPlan: '', trialDays: '14', walletPurchases: false });
  useEffect(() => {
    if (!data) return;
    const m = data.money;
    setF({ minWithdraw: String(m.minWithdraw), fee: String(m.withdrawFeeFlat), feePct: String(m.withdrawFeePercent), grace: String(m.planGraceDays), smsLow: String(m.smsLowBalance), trialPlan: m.trialPlanCode, trialDays: String(m.trialDays), walletPurchases: m.walletPurchases });
  }, [data]);
  if (!data) return <p className="text-sm text-regantify-text-muted">Loading…</p>;
  const n = (v: string) => Number(v);
  const valid = n(f.minWithdraw) >= 1 && n(f.fee) >= 0 && n(f.feePct) >= 0 && n(f.feePct) <= 30 && Number.isInteger(n(f.grace)) && n(f.grace) <= 14 && Number.isInteger(n(f.smsLow)) && (f.trialPlan === '' || (Number.isInteger(n(f.trialDays)) && n(f.trialDays) >= 1 && n(f.trialDays) <= 90));
  return (
    <Section
      title="Money"
      hint="Changes apply to the next request, renewal or sign-up; nothing already done is touched."
      section="money"
      valid={valid}
      body={() => ({ minWithdraw: n(f.minWithdraw), withdrawFeeFlat: n(f.fee), withdrawFeePercent: n(f.feePct), planGraceDays: n(f.grace), smsLowBalance: n(f.smsLow), trialPlanCode: f.trialPlan, ...(f.trialPlan && { trialDays: n(f.trialDays) }), walletPurchases: f.walletPurchases })}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Label text="Smallest withdrawal (৳)">
          <input className={field} inputMode="decimal" value={f.minWithdraw} onChange={(e) => setF({ ...f, minWithdraw: digits(e.target.value) })} />
        </Label>
        <Label text="Withdraw fee, flat (৳)">
          <input className={field} inputMode="decimal" value={f.fee} onChange={(e) => setF({ ...f, fee: digits(e.target.value) })} />
        </Label>
        <Label text="Withdraw fee (%)">
          <input className={field} inputMode="decimal" value={f.feePct} onChange={(e) => setF({ ...f, feePct: digits(e.target.value) })} />
        </Label>
      </div>
      <p className="-mt-2 text-xs text-regantify-text-muted">The fee is kept from each payout (flat plus percent of the amount); the store sees it before asking and is paid the rest. A rejected request gives back the whole amount.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label text="Plan grace days (0 to 14)" hint="A paid plan keeps working this long after it ends.">
          <input className={field} inputMode="numeric" value={f.grace} onChange={(e) => setF({ ...f, grace: digits(e.target.value) })} />
        </Label>
        <Label text="SMS low-balance alert (৳)" hint="You are texted when the platform SMS balance falls under this.">
          <input className={field} inputMode="numeric" value={f.smsLow} onChange={(e) => setF({ ...f, smsLow: digits(e.target.value) })} />
        </Label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label text="Free trial for new stores" hint="A new store starts on this plan for the days below, once per phone number. Off by default.">
          <select className={field} value={f.trialPlan} onChange={(e) => setF({ ...f, trialPlan: e.target.value })}>
            <option value="">No trial</option>
            {data.money.plans.map((p) => (
              <option key={p.code} value={p.code}>
                {p.name}
              </option>
            ))}
          </select>
        </Label>
        {f.trialPlan && (
          <Label text="Trial days (1 to 90)">
            <input className={field} inputMode="numeric" value={f.trialDays} onChange={(e) => setF({ ...f, trialDays: digits(e.target.value) })} />
          </Label>
        )}
      </div>
      <label className="flex items-start gap-2 text-sm text-regantify-text">
        <input type="checkbox" checked={f.walletPurchases} onChange={(e) => setF({ ...f, walletPurchases: e.target.checked })} className="mt-0.5 h-4 w-4 accent-regantify-cta" />
        <span>
          Stores may pay from their wallet balance
          <span className="block text-xs text-regantify-text-muted">For plans, SMS packs and AI Credit packs, next to the online payment. Same price and promo codes; the money leaves the wallet at once. Off by default.</span>
        </span>
      </label>
    </Section>
  );
}

const FLAG_TEXT: Record<string, string> = { MISSING: 'not created yet (off)', OFF: 'off', LIST: 'on for listed stores', PERCENT: 'on for a share of stores', PLANS: 'on for some plans', ALL: 'on for every store' };

/** Reseller system (RESELLER-plan.md Step 1): the verification rule, the platform's share and the limits. Who is invited is the two feature flags. */
export function ResaleSection() {
  const { data } = usePlatformConfig();
  const [f, setF] = useState({ verifiedSuppliers: true, verifiedResellers: false, fee: '5', hold: '0', maxListings: '500', autoCancel: '7', pauseRate: '40', onlinePayment: false });
  useEffect(() => {
    if (!data) return;
    const r = data.resale;
    setF({ verifiedSuppliers: r.verifiedSuppliers, verifiedResellers: r.verifiedResellers, fee: String(r.feePercent), hold: String(r.holdDays), maxListings: String(r.maxListings), autoCancel: String(r.autoCancelDays), pauseRate: String(r.returnPauseRate), onlinePayment: r.onlinePayment });
  }, [data]);
  if (!data) return <p className="text-sm text-regantify-text-muted">Loading…</p>;
  const n = (v: string) => Number(v);
  const int = (v: string, min: number, max: number) => v !== '' && Number.isInteger(n(v)) && n(v) >= min && n(v) <= max;
  const valid = f.fee !== '' && n(f.fee) >= 0 && n(f.fee) <= 50 && int(f.hold, 0, 30) && int(f.maxListings, 1, 10_000) && int(f.autoCancel, 2, 10) && int(f.pauseRate, 10, 100);
  return (
    <Section
      title="Reseller system"
      hint="Stores selling each other’s products. Off for every store until you switch on the feature flags below."
      section="resale"
      valid={valid}
      body={() => ({
        resaleVerifiedSuppliers: f.verifiedSuppliers,
        resaleVerifiedResellers: f.verifiedResellers,
        resaleFeePercent: n(f.fee),
        resaleHoldDays: n(f.hold),
        resaleMaxListings: n(f.maxListings),
        resaleAutoCancelDays: n(f.autoCancel),
        resaleReturnPauseRate: n(f.pauseRate),
        resaleOnlinePayment: f.onlinePayment,
      })}
    >
      <div className="rounded-xl bg-regantify-search px-4 py-3 text-sm text-regantify-text">
        <p>
          Supply (RESALE_SUPPLY): <b>{FLAG_TEXT[data.resale.flags.supply] ?? data.resale.flags.supply}</b>
        </p>
        <p>
          Resell (RESALE_SELL): <b>{FLAG_TEXT[data.resale.flags.sell] ?? data.resale.flags.sell}</b>
        </p>
        <p className="mt-1 text-xs text-regantify-text-muted">
          Turn these on for every store, chosen stores or chosen plans in{' '}
          <Link to="/admin/feature-flags" className="text-regantify-cta hover:underline">
            Feature flags
          </Link>
          . One store can be blocked or given its own share on its page.
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm text-regantify-text">
        <input type="checkbox" checked={f.verifiedSuppliers} onChange={(e) => setF({ ...f, verifiedSuppliers: e.target.checked })} className="mt-0.5 h-4 w-4 accent-regantify-cta" />
        <span>
          Only verified stores can supply
          <span className="block text-xs text-regantify-text-muted">A supplier ships other stores’ orders, so it should have finished Verification. On by default.</span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-regantify-text">
        <input type="checkbox" checked={f.verifiedResellers} onChange={(e) => setF({ ...f, verifiedResellers: e.target.checked })} className="mt-0.5 h-4 w-4 accent-regantify-cta" />
        <span>
          Only verified stores can resell
          <span className="block text-xs text-regantify-text-muted">Off by default, so any invited store can start reselling.</span>
        </span>
      </label>
      <label className="flex items-start gap-2 text-sm text-regantify-text">
        <input type="checkbox" checked={f.onlinePayment} onChange={(e) => setF({ ...f, onlinePayment: e.target.checked })} className="mt-0.5 h-4 w-4 accent-regantify-cta" />
        <span>
          Shoppers may pay reseller orders online
          <span className="block text-xs text-regantify-text-muted">
            Full payment or the supplier’s COD advance, through the platform’s PayStation. The money stays with the platform until the parcel is delivered, then goes to the supplier. Check the escrow rules before turning it on. Off by default.
          </span>
        </span>
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label text="Platform share of reseller earnings (%)" hint="Taken from the reseller’s commission when it is paid. 5 by default.">
          <input className={field} inputMode="decimal" value={f.fee} onChange={(e) => setF({ ...f, fee: digits(e.target.value) })} />
        </Label>
        <Label text="Days before an earning can be spent (0 to 30)" hint="0 = at once when the order is completed.">
          <input className={field} inputMode="numeric" value={f.hold} onChange={(e) => setF({ ...f, hold: digits(e.target.value) })} />
        </Label>
        <Label text="Products one reseller store may add" hint="Separate from the plan’s product limit.">
          <input className={field} inputMode="numeric" value={f.maxListings} onChange={(e) => setF({ ...f, maxListings: digits(e.target.value) })} />
        </Label>
        <Label text="Cancel an unshipped reseller order after (2 to 10 days)" hint="Inside the 5 / 10 day delivery rule.">
          <input className={field} inputMode="numeric" value={f.autoCancel} onChange={(e) => setF({ ...f, autoCancel: digits(e.target.value) })} />
        </Label>
        <Label text="Pause a reseller at this return rate (%)" hint="Counted from 20 orders on.">
          <input className={field} inputMode="numeric" value={f.pauseRate} onChange={(e) => setF({ ...f, pauseRate: digits(e.target.value) })} />
        </Label>
      </div>
    </Section>
  );
}

export function TermsSection() {
  const { data } = usePlatformConfig();
  const qc = useQueryClient();
  const [terms, setTerms] = useState('');
  const [privacy, setPrivacy] = useState('');
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!data) return;
    setTerms(data.terms.termsText);
    setPrivacy(data.terms.privacyText);
  }, [data]);
  const publish = useMutation({
    mutationFn: () => platformConfigApi.save('terms', { termsText: terms, privacyText: privacy, publish: true }),
    onSuccess: () => {
      toast.success('Published. Every owner is asked to accept it on their next visit.');
      setConfirm(false);
      qc.invalidateQueries({ queryKey: CONFIG_KEY });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work. Please try again.')),
  });
  if (!data) return <p className="text-sm text-regantify-text-muted">Loading…</p>;
  const t = data.terms;
  return (
    <Section title="Terms and privacy" hint="Plain text for store owners. “Save draft” keeps your wording; “Publish new version” asks every owner to accept it on their next visit." section="terms" body={() => ({ termsText: terms, privacyText: privacy })}>
      <p className="rounded-xl bg-regantify-search px-4 py-2.5 text-sm text-regantify-text">
        {t.version === 0 ? 'Nothing published yet, so no one is asked to accept anything.' : `Version ${t.version}${t.updatedAt ? `, published ${formatDhakaDateTime(t.updatedAt)}` : ''}. ${t.acceptedCurrent} of ${t.owners} owners have accepted it.`}
      </p>
      <Label text="Terms of use">
        <textarea className={field} rows={9} value={terms} onChange={(e) => setTerms(e.target.value)} maxLength={60000} />
      </Label>
      <Label text="Privacy policy">
        <textarea className={field} rows={9} value={privacy} onChange={(e) => setPrivacy(e.target.value)} maxLength={60000} />
      </Label>
      {confirm ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Every store owner will be asked to accept this before using the dashboard.
          <button type="button" disabled={publish.isPending || terms.trim().length < 50} onClick={() => publish.mutate()} className="rounded-lg bg-regantify-cta px-3 py-1.5 font-medium text-white disabled:opacity-50">
            {publish.isPending ? 'Publishing…' : `Publish version ${t.version + 1}`}
          </button>
          <button type="button" onClick={() => setConfirm(false)} className="rounded-lg border border-black/10 px-3 py-1.5">
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} className="rounded-xl border border-black/10 px-4 py-2 text-sm font-medium text-regantify-text">
          Publish new version…
        </button>
      )}
    </Section>
  );
}

export function MaintenanceSection() {
  const { data } = usePlatformConfig();
  const [text, setText] = useState('');
  const [from, setFrom] = useState('');
  const [until, setUntil] = useState('');
  useEffect(() => {
    if (!data) return;
    setText(data.maintenance.text);
    setFrom(toInputDate(data.maintenance.from));
    setUntil(toInputDate(data.maintenance.until));
  }, [data]);
  if (!data) return <p className="text-sm text-regantify-text-muted">Loading…</p>;
  return (
    <Section
      title="Maintenance banner"
      hint="A yellow bar at the top of every store's dashboard. Leave the dates empty to show it right now until you clear it. Times are Dhaka time."
      section="maintenance"
      valid={!from || !until || until > from}
      body={() => ({ maintenanceText: text, maintenanceFrom: fromInputDate(from), maintenanceUntil: fromInputDate(until) })}
    >
      {data.maintenance.showingNow && <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900">The banner is showing to stores right now.</p>}
      <Label text="Message (empty = no banner)">
        <textarea className={field} rows={2} maxLength={300} value={text} onChange={(e) => setText(e.target.value)} placeholder="Regantify will be down for about 30 minutes tonight at 2 AM for an update." />
      </Label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Label text="Show from">
          <input type="datetime-local" className={field} value={from} onChange={(e) => setFrom(e.target.value)} />
        </Label>
        <Label text="Show until">
          <input type="datetime-local" className={field} value={until} onChange={(e) => setUntil(e.target.value)} />
        </Label>
      </div>
    </Section>
  );
}

export function KeysSection() {
  const { data } = usePlatformConfig();
  if (!data) return <p className="text-sm text-regantify-text-muted">Loading…</p>;
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5">
      <h2 className="text-sm font-semibold text-regantify-text">Platform keys</h2>
      <p className="mt-0.5 text-xs text-regantify-text-muted">Whether the server has each key. The values are never shown; they are set in the server's .env.</p>
      <ul className="mt-3 divide-y divide-black/5">
        {data.keys.map((k) => (
          <li key={k.label} className="flex items-center justify-between gap-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm text-regantify-text">{k.label}</p>
              <p className="truncate text-xs text-regantify-text-muted">{k.note}</p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${k.set ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
              {k.set ? <Check size={12} /> : <X size={12} />}
              {k.set ? 'Set' : 'Not set'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export type { PlatformConfig };
