import type { ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { addonsApi } from '../../../lib/addonsApi';
import {
  ChevronRight,
  CreditCard,
  HandCoins,
  Mail,
  MessageSquare,
  MessagesSquare,
  Package,
  Percent,
  ShieldCheck,
  Smartphone,
  MessageSquareText,
  Truck,
  Wallet,
  type LucideProps,
} from 'lucide-react';

/**
 * Add-ons: the extra tools a store can connect. Each card is one of three states:
 * - `path`: ready. The card opens the page where it is set up (a gateway's connect form, a courier's page, ...).
 * - `soon`: we have the provider's documentation and it is being built, one at a time.
 * - neither: waiting for the provider's documentation. Greyed out and not clickable; the list of missing documents is
 *   kept in z-others/documentations/missing-documentation.txt.
 * Super Admin can turn any add-on off for every store (Super Admin > Add-ons): it then shows greyed out as turned off.
 * Every card shows a generic icon, never another company's logo (a brand-protection complaint took the server down on 2026-10-20).
 */
interface Addon {
  /** Same key as server/src/addons/addons.ts: Super Admin can turn it off for every store. */
  key: string;
  name: string;
  about: string;
  icon?: ComponentType<LucideProps>;
  /** Ready: the dashboard page that sets it up. */
  path?: string;
  /** Documentation in hand, being built. */
  soon?: boolean;
}

const GROUPS: { title: string; items: Addon[] }[] = [
  {
    title: 'Payments',
    items: [
      { key: 'SSLCOMMERZ', name: 'SSLCommerz Payment Gateway', about: 'Cards, mobile wallets and net banking at checkout', icon: CreditCard, path: '/vendor/store/payment-gateway?connect=sslcommerz' },
      { key: 'SHURJOPAY', name: 'shurjoPay', about: 'Cards and mobile wallets through your own shurjoPay store', icon: CreditCard, path: '/vendor/store/payment-gateway?connect=shurjopay' },
      { key: 'EPS', name: 'EPS - Easy Payment System', about: 'Cards, bKash, Nagad and more through your own EPS merchant account', icon: CreditCard, path: '/vendor/store/payment-gateway?connect=eps' },
      { key: 'PARTIAL_PAYMENT', name: 'Partial Payment', about: 'Take an advance on cash on delivery orders before they ship', icon: Wallet, path: '/vendor/store/cod-guard' },
      { key: 'MANUAL_MOBILE_PAYMENT', name: 'Manual Mobile Payment', about: 'Take payments to personal bKash, Nagad and other accounts', icon: HandCoins, path: '/vendor/store/payment-gateway?connect=manual-mobile' },
      { key: 'AAMARPAY', name: 'aamarPay', about: 'Cards and mobile wallets through your own aamarPay store', icon: CreditCard, path: '/vendor/store/payment-gateway?connect=aamarpay' },
      { key: 'BKASH', name: 'bKash', about: 'Let customers pay with bKash through your merchant account', icon: Smartphone, path: '/vendor/store/payment-gateway?connect=bkash-merchant' },
      { key: 'NAGAD', name: 'Nagad', about: 'Take Nagad payments at checkout', icon: Smartphone },
      { key: 'PORTWALLET', name: 'PortWallet Payment Gateway', about: 'Accept digital payments through your own PortWallet (PortPos) account', icon: CreditCard, path: '/vendor/store/payment-gateway?connect=portwallet' },
      { key: 'PAYSTATION', name: 'PayStation', about: 'Take payments through your own PayStation merchant account', icon: Wallet, path: '/vendor/store/payment-gateway?connect=vendor-paystation' },
    ],
  },
  {
    title: 'Couriers',
    items: [
      { key: 'PATHAO', name: 'Pathao Courier', about: 'Book parcels and follow delivery with Pathao', icon: Truck, path: '/vendor/courier/pathao' },
      { key: 'STEADFAST', name: 'SteadFast Courier', about: 'Book parcels and follow delivery with SteadFast', icon: Truck, path: '/vendor/courier/steadfast' },
      { key: 'REDX', name: 'REDX Courier', about: 'Book parcels and follow delivery with REDX', icon: Truck, path: '/vendor/courier/redx' },
      { key: 'PAPERFLY', name: 'Paperfly Courier', about: 'Book parcels and follow delivery with Paperfly', icon: Truck },
      { key: 'CARRYBEE', name: 'CarryBee Courier', about: 'Book parcels and follow delivery with CarryBee', icon: Truck, path: '/vendor/courier/carrybee' },
      { key: 'MOVEON_DROP', name: 'MoveOn Drop', about: 'Sell MoveOn products and have MoveOn ship them', icon: Package },
      { key: 'MOVEDROP', name: 'MoveDrop', about: 'Dropship from 1688 and Taobao with MoveDrop', icon: Package },
    ],
  },
  {
    title: 'Messages',
    items: [
      { key: 'REGANTIFY_SMS', name: 'Regantify SMS', about: 'Ready-to-use SMS sending for your store, no setup needed', icon: MessageSquare, path: '/vendor/sms' },
      { key: 'CUSTOM_SMS', name: 'Custom SMS', about: 'Your own text for each order status sent to customers', icon: MessageSquareText, path: '/vendor/store/order-tracking' },
      { key: 'ISMSPLUS', name: 'SSL Wireless iSMSplus', about: 'Send texts through the SSL Wireless SMS gateway', icon: MessagesSquare, path: '/vendor/sms?tab=gateway&provider=ISMSPLUS' },
      { key: 'MIM_SMS', name: 'MIM SMS', about: 'Send texts through your own MIM SMS account', icon: MessagesSquare, path: '/vendor/sms?tab=gateway&provider=MIM_SMS' },
      { key: 'SMSGEN', name: 'SMSGen', about: 'Send texts through your own SMSGen account', icon: MessagesSquare },
      { key: 'GENNET_SMS', name: 'Gennet SMS', about: 'Send texts through your own Gennet SMS account', icon: MessagesSquare },
      { key: 'JHOROTEK', name: 'JhoroTek Infobuzzer', about: 'Send texts through the JhoroTek Infobuzzer gateway', icon: MessagesSquare },
      { key: 'REGANTIFY_EMAIL', name: 'Regantify Email', about: 'Ready-to-use email sending for your store', icon: Mail, soon: true },
    ],
  },
  {
    title: 'Store tools',
    items: [
      { key: 'CONDITIONAL_DISCOUNTS', name: 'Conditional Discounts', about: 'Discounts that apply only when your rules match', icon: Percent, path: '/vendor/marketing/discounts' },
      { key: 'CUSTOM_ROLES', name: 'Custom Role Editor', about: 'Choose exactly what each team member can do', icon: ShieldCheck, path: '/vendor/staff' },
      { key: 'PWA', name: 'PWA (Mobile App)', about: 'Let customers add your store to their phone', icon: Smartphone, soon: true },
    ],
  },
];

function AddonCard({ addon, turnedOff }: { addon: Addon; turnedOff: boolean }) {
  const Icon = addon.icon;
  const waiting = turnedOff || (!addon.path && !addon.soon);
  const path = turnedOff ? undefined : addon.path;
  const body = (
    <>
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
        {Icon && <Icon size={24} strokeWidth={1.6} className={waiting ? 'text-neutral-400' : 'text-neutral-500'} aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium leading-snug text-regantify-text">{addon.name}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-regantify-text-muted">{addon.about}</p>
        {!path && (
          <span
            className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
              !turnedOff && addon.soon ? 'bg-amber-50 text-amber-700' : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {turnedOff ? 'Turned off by Regantify' : addon.soon ? 'Coming soon' : 'Not available yet'}
          </span>
        )}
      </div>
      {path && <ChevronRight size={18} className="shrink-0 text-regantify-text-muted" aria-hidden />}
    </>
  );

  if (path) {
    return (
      <li>
        <Link
          to={path}
          className="flex h-full items-center gap-4 rounded-xl border border-line bg-white p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
        >
          {body}
        </Link>
      </li>
    );
  }
  return (
    <li
      aria-disabled="true"
      className={`flex items-center gap-4 rounded-xl border border-line p-4 cursor-not-allowed select-none ${
        waiting ? 'bg-neutral-50 opacity-60' : 'bg-white'
      }`}
    >
      {body}
    </li>
  );
}

export default function Addons() {
  // Add-ons Super Admin turned off for every store; while this loads, every card shows as usual.
  const { data: off = [] } = useQuery({ queryKey: ['addons-off'], queryFn: addonsApi.off });
  return (
    <div className="max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-regantify-text">Add-ons</h1>
        <p className="mt-1 max-w-xl text-sm text-regantify-text-muted">
          Extra tools you can connect to your store. Open one to set it up. Those marked “Coming soon” are being added one by
          one.
        </p>
      </header>

      <div className="space-y-9">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="mb-3 text-base font-semibold text-regantify-text">{g.title}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((a) => (
                <AddonCard key={a.key} addon={a} turnedOff={off.includes(a.key)} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
