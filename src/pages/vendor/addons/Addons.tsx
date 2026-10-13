import type { ComponentType } from 'react';
import { HandCoins, Mail, MessageSquare, MessagesSquare, Percent, ShieldCheck, Smartphone, MessageSquareText, Truck, Wallet, type LucideProps } from 'lucide-react';

/**
 * Add-ons: the extra tools a store can connect. For now this is the catalogue only; the cards do nothing
 * and each add-on gets its own setup later. Logos live in /public/addons; an add-on with no logo shows an icon.
 */
interface Addon {
  name: string;
  about: string;
  /** File in /public/addons. */
  logo?: string;
  icon?: ComponentType<LucideProps>;
}

const GROUPS: { title: string; items: Addon[] }[] = [
  {
    title: 'Payments',
    items: [
      { name: 'SSLCommerz Payment Gateway', about: 'Cards, mobile wallets and net banking at checkout', logo: 'sslcommerz.svg' },
      { name: 'bKash Payments', about: 'Take bKash payments straight at checkout', logo: 'bkash.png' },
      { name: 'bKash', about: 'Let customers pay to your own bKash number', logo: 'bkash.png' },
      { name: 'bKash (URL Checkout)', about: 'Send customers to the bKash page to pay', logo: 'bkash.png' },
      { name: 'PortWallet Payment Gateway', about: 'Accept digital payments through PortWallet', logo: 'portwallet.png' },
      { name: 'Manual Mobile Payment', about: 'Take payments to personal bKash, Nagad and other accounts', icon: HandCoins },
      { name: 'Partial Payment', about: 'Take part of the payment up front on cash on delivery orders', icon: Wallet },
      { name: 'Nagad', about: 'Take Nagad payments at checkout', logo: 'nagad.png' },
      { name: 'Shurjopay', about: 'Cards and mobile wallets through Shurjopay', logo: 'shurjopay.png' },
      { name: 'Aamarpay', about: 'Cards and mobile wallets through Aamarpay', logo: 'aamarpay.png' },
    ],
  },
  {
    title: 'Couriers',
    items: [
      { name: 'Pathao Courier', about: 'Book parcels and follow delivery with Pathao', logo: 'pathao.png' },
      { name: 'SteadFast Courier', about: 'Book parcels and follow delivery with SteadFast', logo: 'steadfast.png' },
      { name: 'REDX Courier', about: 'Book parcels and follow delivery with REDX', logo: 'redx.svg' },
      { name: 'MoveOn Drop', about: 'Send parcels with MoveOn Drop', icon: Truck },
    ],
  },
  {
    title: 'Messages',
    items: [
      { name: 'Custom SMS', about: 'Send texts through your own SMS provider', icon: MessageSquareText },
      { name: 'JhoroTek Infobuzzer', about: 'Send texts through the JhoroTek Infobuzzer gateway', icon: MessagesSquare },
      { name: 'SSL Wireless iSMSplus', about: 'Send texts through the SSL Wireless SMS gateway', logo: 'sslwireless.png' },
      { name: 'Regantify Email', about: 'Ready-to-use email sending for your store', icon: Mail },
      { name: 'Regantify SMS', about: 'Ready-to-use SMS sending for your store, no setup needed', icon: MessageSquare },
    ],
  },
  {
    title: 'Store tools',
    items: [
      { name: 'Conditional Discounts', about: 'Discounts that apply only when your rules match', icon: Percent },
      { name: 'Custom Role Editor', about: 'Choose exactly what each team member can do', icon: ShieldCheck },
      { name: 'PWA (Mobile App)', about: 'Let customers add your store to their phone', icon: Smartphone },
    ],
  },
];

function AddonCard({ addon }: { addon: Addon }) {
  const Icon = addon.icon;
  return (
    <li className="flex items-center gap-4 rounded-xl border border-line bg-white p-4">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-line bg-white">
        {addon.logo ? (
          <img src={`/addons/${addon.logo}`} alt="" className="h-full w-full object-contain p-1.5" loading="lazy" />
        ) : (
          Icon && <Icon size={24} strokeWidth={1.6} className="text-neutral-500" aria-hidden />
        )}
      </span>
      <div className="min-w-0">
        <p className="text-[15px] font-medium leading-snug text-regantify-text">{addon.name}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-regantify-text-muted">{addon.about}</p>
      </div>
    </li>
  );
}

export default function Addons() {
  return (
    <div className="max-w-6xl">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-regantify-text">Add-ons</h1>
        <p className="mt-1 max-w-xl text-sm text-regantify-text-muted">
          Extra tools you can connect to your store. We are setting these up one by one, so they can’t be turned on yet.
        </p>
      </header>

      <div className="space-y-9">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="mb-3 text-base font-semibold text-regantify-text">{g.title}</h2>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {g.items.map((a) => (
                <AddonCard key={a.name} addon={a} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
