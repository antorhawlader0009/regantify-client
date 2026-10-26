import { useEffect, useState } from 'react';
import { RadioGroup, SaveButton, useDesignSettings } from './designShared';

/**
 * Store language on the Branding page, for Simple mode (SIMPLE-VIEW-plan.md Step 3): many everyday sellers want the
 * Bangla store labels, but the setting lives on Layout Settings, which is a Full mode page. This card edits the same
 * `storeLanguage` design setting, nothing else.
 */
export function StoreLanguageCard() {
  const { settings, save } = useDesignSettings();
  const [storeLanguage, setStoreLanguage] = useState<'en' | 'bn'>('en');
  const [banglaDigits, setBanglaDigits] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setStoreLanguage(settings.storeLanguage ?? 'en');
    setBanglaDigits(settings.storeBanglaDigits ?? false);
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
      {storeLanguage === 'bn' && <BanglaDigitsCheckbox checked={banglaDigits} onChange={setBanglaDigits} />}
      <SaveButton pending={save.isPending} onClick={() => save.mutate({ storeLanguage, storeBanglaDigits: banglaDigits })} />
    </div>
  );
}

/** Prices in Bangla digits (IDEA-7); only offered while the store language is Bangla. Shared by this card and Layout Settings. */
export function BanglaDigitsCheckbox({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-2.5 text-sm text-regantify-text cursor-pointer">
      <input type="checkbox" className="mt-0.5" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        Show prices in Bangla digits
        <span className="block text-xs text-regantify-text-muted">৳১,২৫০ instead of ৳1,250. Phone numbers and order numbers stay in English digits.</span>
      </span>
    </label>
  );
}
