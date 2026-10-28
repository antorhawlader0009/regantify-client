import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  ImageIcon,
  MessageCircle,
  Package,
  Rocket,
  Share2,
  ShoppingBag,
  Truck,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { DashboardSummary } from '../../lib/dashboardApi';
import { SETUP_ILLUSTRATIONS } from './SetupIllustrations';

type Setup = DashboardSummary['setup'];

type Action = { kind: 'link'; to: string; label: string } | { kind: 'external'; href: string; label: string } | { kind: 'button'; onClick: () => void; label: string };

interface Item {
  key: keyof Setup;
  title: string;
  description: string;
  icon: LucideIcon;
  action: Action;
  /** Shown with an "Optional" tag and left out of the count: the store already works without it. */
  optional?: boolean;
}

const HIDE_KEY = 'regantify.setupChecklistHidden';

function readHidden(storeKey: string): boolean {
  try {
    return localStorage.getItem(`${HIDE_KEY}.${storeKey}`) === '1';
  } catch {
    return false;
  }
}

function writeHidden(storeKey: string) {
  try {
    localStorage.setItem(`${HIDE_KEY}.${storeKey}`, '1');
  } catch {
    // storage blocked: the checklist just shows again next time
  }
}

/** The steps that keep the setup dialog coming back (the optional delivery-charge step never does). */
export function setupRequiredDone(setup: Setup): boolean {
  return setup.hasProduct && setup.hasLogo && setup.courierConnected && setup.storeVisited && setup.hasOrder;
}

/**
 * The store's setup steps (dashboard-plan.md Step 3). Each step is ticked from real data (`setup` in the dashboard
 * summary), never by the vendor. Since 2026-10-28 it is shown in SetupDialog (opened on every page load until the
 * required steps are done) rather than on the Dashboard; without `onClose` it can still be hidden per browser and store.
 */
export function SetupChecklist({
  setup,
  storeKey,
  storeUrl,
  onShareStore,
  onClose,
  whatsappPhone,
  onUseWhatsApp,
}: {
  /** The owner's own mobile (01XXXXXXXXX), offered for the WhatsApp step; saved only when they tap the button. */
  whatsappPhone?: string | null;
  onUseWhatsApp?: () => void;
  setup: Setup;
  /** Keeps "Hide" per store on a shared browser (the subdomain). */
  storeKey: string;
  storeUrl: string | null;
  onShareStore: () => void;
  /** Dialog mode (SetupDialog): X closes it for this visit only, and there is no collapse or permanent hide. */
  onClose?: () => void;
}) {
  const [hidden, setHidden] = useState(() => (onClose ? false : readHidden(storeKey)));
  const [collapsed, setCollapsed] = useState(false);

  const items: Item[] = [
    {
      key: 'hasProduct',
      title: 'Add your first product',
      description: 'Photos, price and stock. Shoppers can buy as soon as it’s public.',
      icon: Package,
      action: { kind: 'link', to: '/vendor/product/add', label: 'Add product' },
    },
    {
      key: 'hasLogo',
      title: 'Add your logo',
      description: 'Shown in your store’s header, invoices and shared links.',
      icon: ImageIcon,
      action: { kind: 'link', to: '/vendor/store/branding', label: 'Add logo' },
    },
    {
      key: 'deliveryChargeSet',
      title: 'Check your delivery charge and time',
      description:
        'New stores start with ৳60 inside Dhaka and ৳120 outside, and about 2 days inside Dhaka, 3 around and 4 outside. Shoppers see these on every product. You can change them if you like.',
      icon: Wallet,
      action: { kind: 'link', to: '/vendor/store/delivery-charge', label: 'Change charge' },
      optional: true,
    },
    {
      key: 'chatButtonReady',
      title: 'Add a WhatsApp chat button',
      description: whatsappPhone
        ? `Shoppers can message you from every page of your store. One tap uses your number ${whatsappPhone}.`
        : 'Shoppers can message you from every page of your store. Add your WhatsApp number in Store > Social.',
      icon: MessageCircle,
      action:
        whatsappPhone && onUseWhatsApp
          ? { kind: 'button', onClick: onUseWhatsApp, label: `Use ${whatsappPhone}` }
          : { kind: 'link', to: '/vendor/store/social', label: 'Add WhatsApp' },
      optional: true,
    },
    {
      key: 'courierConnected',
      title: 'Connect a courier',
      description: 'Book parcels with SteadFast, Pathao or RedX straight from your orders.',
      icon: Truck,
      action: { kind: 'link', to: '/vendor/courier', label: 'Connect' },
    },
    {
      key: 'storeVisited',
      title: 'Visit your store',
      description: 'See it the way your shoppers do.',
      icon: ExternalLink,
      action: storeUrl
        ? { kind: 'external', href: storeUrl, label: 'Open store' }
        : { kind: 'link', to: '/vendor/store/themes', label: 'Open themes' },
    },
    {
      key: 'hasOrder',
      title: 'Get your first order',
      description: 'Share your store link on Facebook, Instagram or WhatsApp.',
      icon: ShoppingBag,
      action: { kind: 'button', onClick: onShareStore, label: 'Copy store link' },
    },
  ];

  // Optional steps never hold the card open and don't count in "N of M done".
  const required = items.filter((i) => !i.optional);
  const doneCount = required.filter((i) => setup[i.key]).length;
  const allDone = doneCount === required.length;
  if (allDone || hidden) return null;

  // The first required step not done yet gets the green button; the rest (optional ones last) stay quiet.
  const todo = [...required, ...items.filter((i) => i.optional)].filter((i) => !setup[i.key]);
  const nextKey = todo.find((i) => !i.optional)?.key;
  const pct = Math.round((doneCount / required.length) * 100);

  return (
    <section className="rounded-xl border border-line bg-white" aria-labelledby="setup-title">
      <div className="flex items-start gap-3 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
          <Rocket size={18} strokeWidth={1.8} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="setup-title" className="text-[15px] font-semibold text-regantify-text">
            Set up your store
          </h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            {doneCount} of {required.length} done. Finish these to start getting orders.
          </p>
          <div
            className="mt-2.5 h-2 w-full max-w-md overflow-hidden rounded-full bg-neutral-100"
            role="progressbar"
            aria-valuenow={doneCount}
            aria-valuemin={0}
            aria-valuemax={required.length}
            aria-label="Setup progress"
          >
            <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!onClose && (
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-expanded={!collapsed}
              aria-controls="setup-steps"
              title={collapsed ? 'Show steps' : 'Hide steps'}
              className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-regantify-text"
            >
              <ChevronDown size={16} className={`transition-transform ${collapsed ? '' : 'rotate-180'}`} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (onClose) return onClose();
              writeHidden(storeKey);
              setHidden(true);
            }}
            title={onClose ? 'Close (it opens again next time until setup is done)' : 'Hide this checklist'}
            aria-label={onClose ? 'Close' : 'Hide this checklist'}
            className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-regantify-text"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!collapsed && (
        // Finished steps leave the list; the count and the bar above still show them.
        <ol id="setup-steps" className={`grid gap-4 border-t border-line p-4 sm:grid-cols-2 ${todo.length >= 3 ? 'lg:grid-cols-3' : ''}`}>
          {todo.map((item) => {
            const done = setup[item.key];
            const isNext = item.key === nextKey;
            return (
              <li
                key={item.key}
                className={`relative flex flex-col rounded-2xl border bg-white p-5 ${
                  isNext ? 'border-brand/40' : 'border-line'
                }`}
              >
                {done && (
                  <span className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-brand text-white" aria-label="Done">
                    <Check size={14} strokeWidth={2.5} />
                  </span>
                )}
                <div className={done ? 'opacity-50' : ''}>
                  <p className="pr-8 text-[15px] font-semibold text-regantify-text">
                    {item.title}
                    {item.optional && (
                      <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 align-middle text-[11px] font-medium text-neutral-500">Optional</span>
                    )}
                  </p>
                  <p className="mt-1 text-sm leading-snug text-neutral-500">{item.description}</p>
                </div>
                <Illustration id={item.key} muted={done} />
                <div className="mt-auto">
                  {done ? <span className="text-xs font-medium text-neutral-400">Done</span> : <StepAction action={item.action} primary={isNext} />}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/** The step's drawn scene (SetupIllustrations), dimmed once the step is done. */
function Illustration({ id, muted }: { id: string; muted: boolean }) {
  const Scene = SETUP_ILLUSTRATIONS[id];
  return (
    <div className={`my-3 h-36 ${muted ? 'opacity-40 grayscale' : ''}`} aria-hidden>
      {Scene ? <Scene /> : null}
    </div>
  );
}

function StepAction({ action, primary }: { action: Action; primary: boolean }) {
  const cls = `inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm transition-colors ${
    primary ? 'bg-brand text-white hover:bg-brand-dark' : 'border border-line bg-white text-regantify-text hover:bg-neutral-50'
  }`;
  const icon =
    action.kind === 'external' ? <ExternalLink size={13} aria-hidden /> : action.kind === 'button' ? <Share2 size={13} aria-hidden /> : <ChevronRight size={14} aria-hidden />;

  if (action.kind === 'link') {
    return (
      <Link to={action.to} className={cls}>
        {action.label}
        {icon}
      </Link>
    );
  }
  if (action.kind === 'external') {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" className={cls}>
        {action.label}
        {icon}
      </a>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={cls}>
      {icon}
      {action.label}
    </button>
  );
}
