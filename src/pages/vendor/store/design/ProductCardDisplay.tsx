import { useEffect, useState } from 'react';
import type { DesignSettings } from '../../../../lib/designSettingsApi';
import { DesignLoading, DesignPageHeader, DesignSection, SaveButton, Switch, useDesignSettings } from './designShared';

type CardKey = Extract<keyof DesignSettings, `card${string}`>;

const ITEMS: { key: CardKey; label: string; hint: string }[] = [
  {
    key: 'cardShowSummary',
    label: 'Show Summary',
    hint: "Show the product's summary on product cards. Suits grocery-style stores with the Extended layout.",
  },
  {
    key: 'cardShowDefaultButton',
    label: 'Show Button (Default)',
    hint: 'Show "Add to Cart" for a single product and "View Product" for a product with variations.',
  },
  { key: 'cardShowViewButton', label: 'Show View Button', hint: 'Show the "View Product" button on product cards.' },
  {
    key: 'cardShowBuyNow',
    label: 'Show Buy Now Button',
    hint: 'Show a Buy Now button on product cards. Also shows variation options if applicable.',
  },
  {
    key: 'cardShowAddToCart',
    label: 'Show Add to Cart Button',
    hint: 'Show an Add to Cart button on product cards. Also shows variation options if applicable.',
  },
  { key: 'cardOptionsAsButtons', label: 'Show Options as Button', hint: 'Show variation options as buttons.' },
  { key: 'cardOptionsAsSelect', label: 'Show Options as Select Menu', hint: 'Show variation options as a select menu.' },
  { key: 'cardDisplayAsCard', label: 'Display as Card', hint: 'Show each product inside a bordered card.' },
  { key: 'cardShowVideo', label: 'Show Video', hint: "Play the product's video on hover, if it has one." },
  { key: 'cardShowWishlist', label: 'Show Wishlist Button', hint: 'Show a wishlist (heart) button on product cards.' },
];

/** Store > Design > Product Card Display Options - what each StorePal product card shows. */
export default function ProductCardDisplay() {
  const { settings, isLoading, save } = useDesignSettings();
  const [form, setForm] = useState<Pick<DesignSettings, CardKey> | null>(null);
  const [badgeColor, setBadgeColor] = useState('');
  // Automatic badges (TellMe idea 108).
  const [auto, setAuto] = useState({ autoBadgeNew: false, autoBadgeNewDays: 14, autoBadgeSale: false, autoBadgeBestSeller: false });

  useEffect(() => {
    if (settings) {
      setForm(Object.fromEntries(ITEMS.map(({ key }) => [key, settings[key]])) as Pick<DesignSettings, CardKey>);
      setBadgeColor(settings.productBadgeColor ?? '');
      setAuto({ autoBadgeNew: settings.autoBadgeNew, autoBadgeNewDays: settings.autoBadgeNewDays, autoBadgeSale: settings.autoBadgeSale, autoBadgeBestSeller: settings.autoBadgeBestSeller });
    }
  }, [settings]);

  return (
    <div className="max-w-3xl">
      <DesignPageHeader
        title="Product Card Display Options"
        description="Choose what appears on each product card in your StorePal storefront."
      />
      {isLoading || !form ? (
        <DesignLoading />
      ) : (
        <DesignSection title="Product Card Items">
          <div className="space-y-4">
            {ITEMS.map(({ key, label, hint }) => (
              <div key={key}>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-regantify-text">{label}</span>
                  <Switch
                    label={label}
                    checked={form[key]}
                    onChange={(v) => setForm((f) => (f ? { ...f, [key]: v } : f))}
                  />
                </div>
                <p className="text-xs text-regantify-text-muted mt-1">{hint}</p>
              </div>
            ))}
          </div>
          <div className="mt-6">
            <label className="block text-sm font-medium text-regantify-text mb-1.5">Product badge color</label>
            <div className="flex items-center gap-2 max-w-xs">
              <input
                type="color"
                value={badgeColor || '#E11D48'}
                onChange={(e) => setBadgeColor(e.target.value.toUpperCase())}
                className="w-10 h-10 rounded-full border border-black/10 cursor-pointer p-0.5 bg-white"
              />
              <input
                type="text"
                value={badgeColor}
                onChange={(e) => setBadgeColor(e.target.value)}
                placeholder="Theme accent"
                maxLength={7}
                className="w-full px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors"
              />
            </div>
            <p className="text-xs text-regantify-text-muted mt-1">The colour of the badges you put on products (Add or Edit Product, Badge; or All Products, Set badge). One colour for all.</p>
          </div>
          <div className="mt-6 border-t border-black/5 pt-5">
            <p className="text-sm font-medium text-regantify-text">Automatic badges</p>
            <p className="mt-0.5 text-xs text-regantify-text-muted">
              Badges that put themselves on products, so you never have to remember to remove them. A product gets one badge: your own badge always wins, then Sale, Best Seller, New. Sold-out and coming-soon products get none. Same badge colour as above.
            </p>
            <div className="mt-3 space-y-3">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-regantify-text">“New” badge</span>
                  <Switch label="New badge" checked={auto.autoBadgeNew} onChange={(v) => setAuto((a) => ({ ...a, autoBadgeNew: v }))} />
                </div>
                <p className="mt-1 text-xs text-regantify-text-muted">
                  For the first{' '}
                  <input type="number" min={1} max={90} value={auto.autoBadgeNewDays} onChange={(e) => setAuto((a) => ({ ...a, autoBadgeNewDays: Math.min(90, Math.max(1, Number(e.target.value) || 14)) }))} className="mx-1 h-7 w-16 rounded-lg border border-black/10 px-2 text-xs" />
                  days after a product is added.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-regantify-text">“Sale −20%” badge</span>
                  <Switch label="Sale badge" checked={auto.autoBadgeSale} onChange={(v) => setAuto((a) => ({ ...a, autoBadgeSale: v }))} />
                </div>
                <p className="mt-1 text-xs text-regantify-text-muted">While a product sells below its price (a discount price, a campaign or a flash sale). The percentage is worked out from today’s price.</p>
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-regantify-text">“Best Seller” badge</span>
                  <Switch label="Best seller badge" checked={auto.autoBadgeBestSeller} onChange={(v) => setAuto((a) => ({ ...a, autoBadgeBestSeller: v }))} />
                </div>
                <p className="mt-1 text-xs text-regantify-text-muted">
                  The top tenth of your products by recent buyers (at most 20). It uses the count from Store &gt; Design &gt; Product Display &gt; “Show how many bought”, so turn that on too.
                </p>
              </div>
            </div>
          </div>
          <SaveButton pending={save.isPending} onClick={() => save.mutate({ ...form, ...auto, productBadgeColor: badgeColor.trim() })} />
        </DesignSection>
      )}
    </div>
  );
}
