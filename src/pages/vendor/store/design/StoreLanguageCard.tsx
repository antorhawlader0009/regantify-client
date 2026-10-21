import { useEffect, useState } from 'react';
import { RadioGroup, SaveButton, useDesignSettings } from './designShared';

/**
 * Store language on the Branding page, for Simple view (SIMPLE-VIEW-plan.md Step 3): many everyday sellers want the
 * Bangla store labels, but the setting lives on Layout Settings, which is a Full view page. This card edits the same
 * `storeLanguage` design setting, nothing else.
 */
export function StoreLanguageCard() {
  const { settings, save } = useDesignSettings();
  const [storeLanguage, setStoreLanguage] = useState<'en' | 'bn'>('en');

  useEffect(() => {
    if (settings) setStoreLanguage(settings.storeLanguage ?? 'en');
  }, [settings]);

  if (!settings) return null;
  return (
    <div className="mt-6 bg-white rounded-2xl border border-black/5 p-5 sm:p-6 space-y-4">
      <h2 className="text-sm font-semibold text-regantify-text">Store language</h2>
      <RadioGroup
        label="Buttons and labels"
        value={storeLanguage}
        onChange={setStoreLanguage}
        options={[
          { value: 'en', label: 'English' },
          { value: 'bn', label: 'বাংলা (Bangla)' },
        ]}
      />
      <p className="text-xs text-regantify-text-muted -mt-3">
        Shows your store's buttons and labels (Add to Cart, Buy Now, Cart, Search...) in the chosen language. Your product names
        and descriptions stay exactly as you wrote them.
      </p>
      <SaveButton pending={save.isPending} onClick={() => save.mutate({ storeLanguage })} />
    </div>
  );
}
