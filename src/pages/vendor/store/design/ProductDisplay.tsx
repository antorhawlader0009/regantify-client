import { useEffect, useState, type ReactNode } from 'react';
import type { ProductGalleryStyle, ProductImageShape } from '../../../../lib/designSettingsApi';
import { AdvancedPanel } from '../../../../components/ui/AdvancedToggle';
import {
  DesignLoading,
  DesignPageHeader,
  DesignSection,
  RadioGroup,
  SaveButton,
  Switch,
  inputClass,
  useDesignSettings,
} from './designShared';

// What StorePal shows when a message is left blank (keep in sync with
// storefront's themes/storepal/lib/designSettings.ts).
const DEFAULT_IN_STOCK = '##stock units in stock';
const DEFAULT_OUT_OF_STOCK = 'Out of stock';
const DEFAULT_PRE_ORDER = 'Available for pre-order';

/** Store > Design > Product Display Options — product photo shape, gallery layout and stock wording. */
export default function ProductDisplay() {
  const { settings, isLoading, save } = useDesignSettings();
  const [shape, setShape] = useState<ProductImageShape>('SQUARE');
  const [gallery, setGallery] = useState<ProductGalleryStyle>('BOTTOM');
  const [share, setShare] = useState(true);
  const [ratingsOn, setRatingsOn] = useState(true);
  const [compareOn, setCompareOn] = useState(false);
  const [proofDays, setProofDays] = useState<0 | 7 | 30>(0);
  const [wishAlerts, setWishAlerts] = useState(false);
  // "Someone bought" popup (TellMe idea 123).
  const [buyersOn, setBuyersOn] = useState(false);
  const [buyersPos, setBuyersPos] = useState<'LEFT' | 'RIGHT'>('LEFT');
  const [buyersSeconds, setBuyersSeconds] = useState('20');
  const [messages, setMessages] = useState({ inStockMessage: '', outOfStockMessage: '', preOrderMessage: '' });

  useEffect(() => {
    if (!settings) return;
    setShape(settings.productImageShape);
    setGallery(settings.galleryStyle);
    setShare(settings.productShareEnabled);
    setRatingsOn(settings.showRatings ?? true);
    setCompareOn(settings.compareEnabled ?? false);
    setProofDays((settings.socialProofDays as 0 | 7 | 30) ?? 0);
    setWishAlerts(settings.wishlistAlertsEnabled);
    setBuyersOn(settings.recentBuyersEnabled ?? false);
    setBuyersPos(settings.recentBuyersPosition ?? 'LEFT');
    setBuyersSeconds(String(settings.recentBuyersSeconds ?? 20));
    setMessages({
      inStockMessage: settings.inStockMessage ?? '',
      outOfStockMessage: settings.outOfStockMessage ?? '',
      preOrderMessage: settings.preOrderMessage ?? '',
    });
  }, [settings]);

  const advancedInUse = [proofDays > 0, wishAlerts, compareOn, buyersOn, Boolean(messages.inStockMessage || messages.outOfStockMessage || messages.preOrderMessage)].filter(Boolean).length;

  return (
    <div className="max-w-3xl">
      <DesignPageHeader
        title="Product Display Options"
        description="How product photos and stock messages look on your StorePal storefront."
      />
      {isLoading || !settings ? (
        <DesignLoading />
      ) : (
        <div className="space-y-8">
          <DesignSection title="Product Display">
            <RadioGroup
              label="Product Image"
              value={shape}
              onChange={setShape}
              options={[
                { value: 'SQUARE', label: 'Square' },
                { value: 'PORTRAIT', label: 'Portrait' },
              ]}
              hint="Portrait images will have more height."
            />
            <RadioGroup
              label="Gallery Style"
              value={gallery}
              onChange={setGallery}
              options={[
                { value: 'LEFT', label: 'Left' },
                { value: 'BOTTOM', label: 'Bottom' },
                { value: 'RIGHT', label: 'Right' },
              ]}
              hint="Where the small photos sit on the product page."
            />
            <SaveButton
              pending={save.isPending}
              onClick={() => save.mutate({ productImageShape: shape, galleryStyle: gallery })}
            />
          </DesignSection>

          <AdvancedPanel id="design-product-display" what="Share button, N bought in the last days, wishlist alerts, compare products, someone-bought popup, stock messages" inUse={advancedInUse} spaced>
          <DesignSection title="Share, sales and wishlist (StorePal)">
            <div className="flex items-center gap-3">
              <Switch checked={share} onChange={setShare} label="Share button" />
              <span className="text-sm text-regantify-text">Show a Share button on the product page (WhatsApp, Messenger, copy link)</span>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={ratingsOn} onChange={setRatingsOn} label="Star rating" />
              <span className="text-sm text-regantify-text">Show the average star rating under the product name, on product cards and in Google results</span>
            </div>
            <p className="text-xs text-regantify-text-muted">Only reviews you approved count, and a product shows stars only once it has at least 3 of them.</p>
            <RadioGroup
              label="“N bought in the last days” on products"
              value={String(proofDays) as '0' | '7' | '30'}
              onChange={(v) => setProofDays(Number(v) as 0 | 7 | 30)}
              options={[
                { value: '0', label: 'Off' },
                { value: '7', label: 'Last 7 days' },
                { value: '30', label: 'Last 30 days' },
              ]}
              hint="Real sales only (cancelled, returned and unpaid orders left out), counted every night. Shown only from 5 buyers up. It also decides the Top Selling row."
            />
            <div className="flex items-center gap-3">
              <Switch checked={wishAlerts} onChange={setWishAlerts} label="Wishlist alerts" />
              <span className="text-sm text-regantify-text">Let logged-in shoppers ask for an SMS when a wishlist product gets cheaper or is back in stock</span>
            </div>
            <p className="text-xs text-regantify-text-muted">Alert texts come from your SMS credits, at most one a day per product, never at night.</p>
            <div className="flex items-center gap-3">
              <Switch checked={compareOn} onChange={setCompareOn} label="Compare products" />
              <span className="text-sm text-regantify-text">Show a “Compare” tick box on product cards (up to 3 products side by side)</span>
            </div>
            <p className="text-xs text-regantify-text-muted">Useful for gadgets and electronics, where shoppers compare specs. Most clothing, cosmetics and jewellery stores can leave it off.</p>
            <SaveButton
              pending={save.isPending}
              onClick={() => save.mutate({ productShareEnabled: share, showRatings: ratingsOn, socialProofDays: proofDays, wishlistAlertsEnabled: wishAlerts, compareEnabled: compareOn })}
            />
          </DesignSection>

          <DesignSection title="“Someone bought” messages (StorePal)">
            <div className="flex items-center gap-3">
              <Switch checked={buyersOn} onChange={setBuyersOn} label="Recent buyers popup" />
              <span className="text-sm text-regantify-text">Show a small card now and then: “Someone from Dhaka bought … 2 hours ago”</span>
            </div>
            <p className="text-xs text-regantify-text-muted">
              Only real orders of the last 48 hours (cancelled, unpaid and returned ones left out). No names: just the district (or “Bangladesh” when fewer than 2 orders share it), the product and how long ago. Nothing shows until you have at least 5 such orders, and nothing is ever made up. Not shown on cart, checkout and payment pages. A shopper can close it.
            </p>
            {buyersOn && (
              <div className="flex flex-wrap gap-4">
                <label className="text-xs text-regantify-text-muted">
                  Corner
                  <select value={buyersPos} onChange={(e) => setBuyersPos(e.target.value as 'LEFT' | 'RIGHT')} className={`${inputClass} mt-1 w-40`}>
                    <option value="LEFT">Bottom left</option>
                    <option value="RIGHT">Bottom right</option>
                  </select>
                </label>
                <label className="text-xs text-regantify-text-muted">
                  Seconds between messages (10 to 120)
                  <input type="number" min={10} max={120} value={buyersSeconds} onChange={(e) => setBuyersSeconds(e.target.value)} className={`${inputClass} mt-1 w-40`} />
                </label>
              </div>
            )}
            <SaveButton
              pending={save.isPending}
              onClick={() =>
                save.mutate({ recentBuyersEnabled: buyersOn, recentBuyersPosition: buyersPos, recentBuyersSeconds: Math.min(120, Math.max(10, Number(buyersSeconds) || 20)) })
              }
            />
          </DesignSection>

          <DesignSection title="Stock Message">
            <MessageField
              label="In Stock Message"
              value={messages.inStockMessage}
              placeholder={DEFAULT_IN_STOCK}
              onChange={(v) => setMessages((m) => ({ ...m, inStockMessage: v }))}
              hint={
                <>
                  Use <strong>##stock</strong> to show remaining stock count.
                </>
              }
            />
            <MessageField
              label="Out of Stock Message"
              value={messages.outOfStockMessage}
              placeholder={DEFAULT_OUT_OF_STOCK}
              onChange={(v) => setMessages((m) => ({ ...m, outOfStockMessage: v }))}
            />
            <MessageField
              label="Pre Order Item Message"
              value={messages.preOrderMessage}
              placeholder={DEFAULT_PRE_ORDER}
              onChange={(v) => setMessages((m) => ({ ...m, preOrderMessage: v }))}
            />
            <p className="text-xs text-regantify-text-muted">Leave a message empty to use the default shown in grey.</p>
            <SaveButton pending={save.isPending} onClick={() => save.mutate(messages)} />
          </DesignSection>
          </AdvancedPanel>
        </div>
      )}
    </div>
  );
}

function MessageField({
  label,
  value,
  placeholder,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-regantify-text mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={120}
        className={inputClass}
      />
      {hint && <p className="text-xs text-regantify-text-muted mt-1">{hint}</p>}
    </div>
  );
}
