import { useEffect, useState } from 'react';
import type { ReputationSettings } from '../../../../lib/designSettingsApi';
import { DesignLoading, DesignPageHeader, DesignSection, SaveButton, Switch, useDesignSettings } from './designShared';

const BLANK: ReputationSettings = { enabled: false, orders: true, rating: true, reviews: true, since: true };

const ROWS: { key: 'orders' | 'rating' | 'reviews' | 'since'; label: string; hint: string }[] = [
  { key: 'orders', label: 'Orders delivered', hint: 'Like “1,200+ orders delivered”. Shown from 50 completed orders.' },
  { key: 'rating', label: 'Delivery rating', hint: 'The average of the stars customers gave the delivery. Shown from 20 ratings.' },
  { key: 'reviews', label: 'Share of good reviews', hint: 'How many approved reviews are 4 or 5 stars. Shown from 20 reviews.' },
  { key: 'since', label: 'Year you started', hint: 'Like “Serving since 2025”, from the day your store was created.' },
];

/**
 * Store > Design > Store reputation (TellMe idea 147): a small row at the top of the footer with TRUE figures about the store. You only choose which to
 * show; the numbers are counted by the system from your real orders, ratings and reviews, rounded down, and a figure with too little behind it stays
 * hidden until there is enough. Nothing can be typed in, so nobody can say it is made up. Off until you turn it on; StorePal only.
 */
export default function ReputationPage() {
  const { settings, isLoading, save } = useDesignSettings();
  const [rep, setRep] = useState<ReputationSettings>(BLANK);

  useEffect(() => {
    if (settings?.reputation) setRep(settings.reputation);
  }, [settings]);

  return (
    <div className="max-w-3xl">
      <DesignPageHeader title="Store reputation" description="Real numbers about your store, counted by the system, that help a new shopper trust you." />
      {isLoading || !settings ? (
        <DesignLoading />
      ) : (
        <div className="space-y-8">
          <DesignSection title="Show the numbers" hint="Only on the StorePal store, at the top of the footer. Off until you turn it on.">
            <div className="flex items-center gap-3">
              <Switch checked={rep.enabled} onChange={(enabled) => setRep((r) => ({ ...r, enabled }))} label="Show store reputation" />
              <span className="text-sm">{rep.enabled ? 'On' : 'Off'}</span>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              {ROWS.map((row) => (
                <label key={row.key} className="flex items-start gap-2">
                  <input type="checkbox" checked={rep[row.key]} onChange={(e) => setRep((r) => ({ ...r, [row.key]: e.target.checked }))} className="mt-0.5 h-4 w-4 accent-brand" />
                  <span>
                    <span className="font-medium">{row.label}</span>
                    <span className="block text-xs text-regantify-text-muted">{row.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-4 text-xs text-regantify-text-muted">
              The numbers are rounded down (1,243 orders show as “1,200+”) and refreshed a few times a day. Counter (POS) sales are not counted as delivered orders.
            </p>
            <SaveButton pending={save.isPending} onClick={() => save.mutate({ reputation: rep })} />
          </DesignSection>
        </div>
      )}
    </div>
  );
}
