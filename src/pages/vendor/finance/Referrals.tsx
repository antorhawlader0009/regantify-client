import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Copy, Gift, Loader2 } from 'lucide-react';
import { referralsApi, type ReferralStatus } from '../../../lib/referralsApi';
import { PageHeader } from '../../../components/ui/PageKit';
import { Section } from '../../../components/ui/FormKit';

const tk = (n: number) => `Tk ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const STATUS: Record<ReferralStatus, { label: string; cls: string }> = {
  SIGNED_UP: { label: 'Signed up', cls: 'bg-neutral-100 text-neutral-700' },
  PAID: { label: 'Bought a plan', cls: 'bg-green-50 text-green-700' },
  REJECTED: { label: 'Not counted', cls: 'bg-red-50 text-red-700' },
};

/** Vendor dashboard > Finance > Refer and earn (super-admin-new.md Step 6): the store's own link and what it earned. */
export default function Referrals() {
  const { data, isLoading } = useQuery({ queryKey: ['my-referrals'], queryFn: referralsApi.mine });
  const [copied, setCopied] = useState(false);

  if (isLoading || !data) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-neutral-400" />
      </div>
    );
  }
  if (!data.enabled) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Refer and earn" />
        <Section title="Not open yet" description="Refer and earn is not running right now. Check back soon.">
          <p className="text-sm text-neutral-500">Nothing to do here for now.</p>
        </Section>
      </div>
    );
  }

  const link = `${window.location.origin}/vendor/signup?ref=${data.code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the link stays selectable on the page.
    }
  };
  const offer = data.partner
    ? `You are a partner: you earn ${data.partner.percent}% of every plan payment of the stores you bring, for ${data.partner.months} months from their first payment.`
    : [
        data.reward.amount > 0 ? `${tk(data.reward.amount)} into your wallet` : '',
        data.reward.days > 0 ? `${data.reward.days} free days on your paid plan` : '',
      ]
        .filter(Boolean)
        .join(' and ')
        .replace(/^(.+)$/, 'When a store you bring buys its first plan, you get $1.') || 'Bring other sellers to Regantify with your link.';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Refer and earn" description="Share your link with other sellers. When they open a store with it and buy a plan, you earn." />

      <Section title="Your link" description={offer}>
        <div className="flex flex-wrap items-center gap-2">
          <input readOnly value={link} onFocus={(e) => e.target.select()} className="h-10 min-w-0 flex-1 rounded-lg border border-line bg-neutral-50 px-3 font-mono text-sm" />
          <button type="button" onClick={copy} className="flex h-10 items-center gap-1.5 rounded-lg bg-brand-lime px-4 text-sm font-medium text-regantify-text">
            {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Your code is <span className="font-mono font-medium text-regantify-text">{data.code}</span>. A store you open yourself, or that signs in from your phone or computer, is
          not counted.
        </p>
      </Section>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Signed up with your link', value: String(data.totals.signedUp) },
          { label: 'Bought a plan', value: String(data.totals.paid) },
          { label: 'You earned', value: tk(data.totals.earned) },
        ].map((t) => (
          <div key={t.label} className="rounded-xl border border-line bg-white p-4">
            <p className="text-xs text-neutral-500">{t.label}</p>
            <p className="text-lg font-semibold tabular-nums text-regantify-text">{t.value}</p>
          </div>
        ))}
      </div>

      <Section title="Stores you brought">
        {data.referrals.length === 0 ? (
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <Gift size={18} className="shrink-0 text-neutral-400" /> No store has used your link yet. Share it in seller groups on Facebook and WhatsApp.
          </div>
        ) : (
          <ul className="divide-y divide-line text-sm">
            {data.referrals.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="min-w-0">
                  <span className="font-medium text-regantify-text">{r.storeName}</span>
                  <span className="ml-2 text-xs text-neutral-500">{new Date(r.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' })}</span>
                </span>
                <span className="flex items-center gap-3">
                  {(r.earned > 0 || r.days > 0) && (
                    <span className="text-xs tabular-nums text-regantify-text">
                      {[r.earned > 0 ? tk(r.earned) : '', r.days > 0 ? `${r.days} days` : ''].filter(Boolean).join(' + ')}
                    </span>
                  )}
                  <span className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS[r.status].cls}`}>{STATUS[r.status].label}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
