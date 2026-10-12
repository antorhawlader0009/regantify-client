import type { ReactElement } from 'react';

/**
 * Drawn illustrations for the dashboard's "Set up your store" cards (one per step key). Original artwork in the brand colours, so there is
 * nothing to license and nothing to download. Each is a 240 x 140 scene: soft tilted cards behind, one clear subject in front.
 */
const Frame = ({ children }: { children: React.ReactNode }) => (
  <svg viewBox="0 0 240 140" className="h-full w-full" role="img" aria-hidden>
    <defs>
      <filter id="si-shadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#1e1b4b" floodOpacity="0.14" />
      </filter>
    </defs>
    {children}
  </svg>
);

const card = 'fill-white stroke-neutral-200';

/** A product card: a T-shirt on a tilted tile, a price tag and a dashed "+" photo slot. */
function Product() {
  return (
    <Frame>
      <rect x="22" y="26" width="82" height="92" rx="12" transform="rotate(-7 63 72)" className="fill-brand-lime/60" />
      <g filter="url(#si-shadow)">
        <rect x="70" y="14" width="100" height="112" rx="14" className={card} />
      </g>
      <path d="M96 40l14-8c3 6 17 6 20 0l14 8-8 14-8-4v38H112V50l-8 4z" className="fill-brand" />
      <rect x="84" y="102" width="46" height="8" rx="4" className="fill-neutral-200" />
      <rect x="84" y="114" width="28" height="6" rx="3" className="fill-neutral-100" />
      <g transform="rotate(8 190 66)">
        <rect x="150" y="34" width="62" height="64" rx="12" className="fill-white stroke-neutral-300" strokeDasharray="4 4" />
        <path d="M181 55v22M170 66h22" className="stroke-brand" strokeWidth="3" strokeLinecap="round" />
      </g>
    </Frame>
  );
}

/** A browser header with the logo slot filled, next to a picture frame. */
function Logo() {
  return (
    <Frame>
      <g filter="url(#si-shadow)">
        <rect x="28" y="22" width="184" height="96" rx="14" className={card} />
      </g>
      <path d="M28 36a14 14 0 0 1 14-14h156a14 14 0 0 1 14 14v10H28z" className="fill-neutral-100" />
      <circle cx="42" cy="34" r="3" className="fill-neutral-300" />
      <circle cx="52" cy="34" r="3" className="fill-neutral-300" />
      <circle cx="62" cy="34" r="3" className="fill-neutral-300" />
      <circle cx="62" cy="76" r="22" className="fill-brand" />
      <path d="M52 84l8-20 10 14 6-8 8 14z" className="fill-white/90" />
      <rect x="94" y="64" width="70" height="9" rx="4.5" className="fill-neutral-800" />
      <rect x="94" y="80" width="96" height="6" rx="3" className="fill-neutral-200" />
      <rect x="94" y="92" width="76" height="6" rx="3" className="fill-neutral-100" />
      <circle cx="196" cy="30" r="12" className="fill-brand-lime" transform="translate(0 -2)" />
      <path d="M191 28l4 4 6-8" className="stroke-brand" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  );
}

/** A price tag with a taka sign, and two zones joined by a dotted route. */
function Delivery() {
  return (
    <Frame>
      <rect x="150" y="22" width="68" height="78" rx="12" transform="rotate(7 184 61)" className="fill-brand-lime/60" />
      <g filter="url(#si-shadow)" transform="rotate(-6 100 70)">
        <path d="M44 36a10 10 0 0 1 10-10h72l38 40-40 42a10 10 0 0 1-14 0L48 80a10 10 0 0 1-4-8z" className={card} />
      </g>
      <g transform="rotate(-6 100 70)">
        <circle cx="62" cy="44" r="6" className="fill-neutral-200" />
        <text x="96" y="82" textAnchor="middle" className="fill-brand" fontSize="44" fontWeight="700" fontFamily="system-ui, sans-serif">৳</text>
      </g>
      <path d="M172 112c10-18 24-4 34-22" className="stroke-brand" strokeWidth="2.5" strokeDasharray="1 6" strokeLinecap="round" fill="none" />
      <circle cx="172" cy="112" r="6" className="fill-brand" />
      <circle cx="206" cy="90" r="6" className="fill-white stroke-brand" strokeWidth="3" />
    </Frame>
  );
}

/** A delivery van carrying parcels, with speed lines. */
function Courier() {
  return (
    <Frame>
      <ellipse cx="120" cy="120" rx="86" ry="7" className="fill-neutral-200/70" />
      <g filter="url(#si-shadow)">
        <rect x="48" y="44" width="92" height="62" rx="10" className="fill-brand" />
        <path d="M140 60h30l18 22v24h-48z" className="fill-brand" />
        <path d="M148 66h18l12 16h-30z" className="fill-white/85" />
      </g>
      <rect x="62" y="56" width="30" height="26" rx="4" className="fill-white" />
      <path d="M62 66h30M77 56v10" className="stroke-brand-lime" strokeWidth="3" />
      <rect x="98" y="62" width="30" height="20" rx="4" className="fill-brand-lime" />
      <circle cx="82" cy="108" r="12" className="fill-neutral-800" />
      <circle cx="82" cy="108" r="5" className="fill-neutral-200" />
      <circle cx="164" cy="108" r="12" className="fill-neutral-800" />
      <circle cx="164" cy="108" r="5" className="fill-neutral-200" />
      <path d="M18 60h22M10 74h30M22 88h18" className="stroke-neutral-300" strokeWidth="3" strokeLinecap="round" />
    </Frame>
  );
}

/** A storefront with a striped awning and an "open" sign. */
function Storefront() {
  return (
    <Frame>
      <rect x="170" y="38" width="48" height="60" rx="10" transform="rotate(7 194 68)" className="fill-brand-lime/60" />
      <g filter="url(#si-shadow)">
        <rect x="48" y="52" width="144" height="70" rx="6" className={card} />
      </g>
      <path d="M40 52l10-30h140l10 30z" className="fill-brand" />
      <path d="M64 22l-6 30M92 22l-2 30M120 22v30M148 22l2 30M176 22l6 30" className="stroke-white/35" strokeWidth="10" />
      <path d="M40 52c0 8 7 12 15 12s15-4 15-12c0 8 7 12 15 12s15-4 15-12c0 8 7 12 15 12s15-4 15-12c0 8 7 12 15 12s15-4 15-12c0 8 7 12 15 12 8 0 15-4 15-12z" className="fill-brand" />
      <rect x="64" y="78" width="40" height="44" rx="4" className="fill-neutral-100" />
      <rect x="116" y="78" width="60" height="30" rx="4" className="fill-brand-lime/70" />
      <circle cx="96" cy="102" r="2.5" className="fill-neutral-400" />
      <rect x="124" y="86" width="44" height="6" rx="3" className="fill-white/90" />
      <rect x="124" y="97" width="28" height="5" rx="2.5" className="fill-white/60" />
    </Frame>
  );
}

/** A phone showing a new order, with share bubbles around it. */
function Order() {
  return (
    <Frame>
      <g filter="url(#si-shadow)">
        <rect x="88" y="10" width="64" height="120" rx="12" className="fill-neutral-800" />
      </g>
      <rect x="93" y="18" width="54" height="104" rx="8" className="fill-white" />
      <rect x="99" y="26" width="42" height="10" rx="5" className="fill-neutral-100" />
      <rect x="99" y="44" width="42" height="26" rx="6" className="fill-brand-lime/70" />
      <circle cx="110" cy="57" r="6" className="fill-brand" />
      <path d="M107 57l2.5 2.5 4.5-5" className="stroke-white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="120" y="52" width="16" height="4" rx="2" className="fill-brand/60" />
      <rect x="120" y="59" width="10" height="4" rx="2" className="fill-brand/30" />
      <rect x="99" y="76" width="42" height="8" rx="4" className="fill-neutral-100" />
      <rect x="99" y="90" width="42" height="22" rx="6" className="fill-brand" />
      <rect x="108" y="98" width="24" height="6" rx="3" className="fill-white" />
      <g filter="url(#si-shadow)">
        <rect x="26" y="30" width="52" height="30" rx="14" className="fill-white" />
        <path d="M60 58l8 8 2-10z" className="fill-white" />
      </g>
      <circle cx="42" cy="45" r="5" className="fill-brand" />
      <rect x="52" y="41" width="18" height="4" rx="2" className="fill-neutral-200" />
      <rect x="52" y="48" width="12" height="4" rx="2" className="fill-neutral-100" />
      <g filter="url(#si-shadow)">
        <rect x="162" y="74" width="54" height="30" rx="14" className="fill-brand-lime" />
      </g>
      <circle cx="198" cy="89" r="5" className="fill-brand" />
      <rect x="172" y="85" width="18" height="4" rx="2" className="fill-brand/50" />
      <rect x="172" y="92" width="12" height="4" rx="2" className="fill-brand/30" />
    </Frame>
  );
}

export const SETUP_ILLUSTRATIONS: Record<string, () => ReactElement> = {
  hasProduct: Product,
  hasLogo: Logo,
  deliveryChargeSet: Delivery,
  courierConnected: Courier,
  storeVisited: Storefront,
  hasOrder: Order,
};
