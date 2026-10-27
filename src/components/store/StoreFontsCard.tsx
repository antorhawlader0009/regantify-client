import { useEffect, useState } from 'react';
import { STORE_FONTS, isSafeFontName, previewFontsHref } from '../../lib/storeFonts';

const OTHER = '__other';
const DEFAULT = '';

const selectClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-regantify-text focus:outline-none focus:border-regantify-cta transition-colors';

/** One font picker: the theme's own font, a font from the list, or a Google Fonts name typed by hand. */
function FontPicker({ label, hint, value, onChange }: { label: string; hint: string; value: string | null; onChange: (v: string | null) => void }) {
  const listed = !value || STORE_FONTS.some((f) => f.name === value);
  const [other, setOther] = useState(!listed);
  useEffect(() => {
    if (value && !STORE_FONTS.some((f) => f.name === value)) setOther(true);
  }, [value]);
  const typedBad = other && !!value && !isSafeFontName(value);

  return (
    <div>
      <label className="block text-sm font-medium text-regantify-text mb-1.5">{label}</label>
      <select
        value={other ? OTHER : (value ?? DEFAULT)}
        onChange={(e) => {
          if (e.target.value === OTHER) {
            setOther(true);
            return;
          }
          setOther(false);
          onChange(e.target.value || null);
        }}
        className={selectClass}
      >
        <option value={DEFAULT}>The theme&apos;s own font</option>
        <optgroup label="With Bangla letters">
          {STORE_FONTS.filter((f) => f.bangla).map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="English letters (Bangla shows in Noto Sans Bengali)">
          {STORE_FONTS.filter((f) => !f.bangla).map((f) => (
            <option key={f.name} value={f.name}>
              {f.name}
            </option>
          ))}
        </optgroup>
        <option value={OTHER}>Another Google font (type its name)…</option>
      </select>
      {other && (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="e.g. Kalam"
          className={`${selectClass} mt-2`}
        />
      )}
      {typedBad ? (
        <p className="text-xs text-red-600 mt-1.5">Use the name exactly as Google Fonts writes it: letters, digits and spaces only.</p>
      ) : (
        <p className="text-xs text-regantify-text-muted mt-1.5">{hint}</p>
      )}
    </div>
  );
}

/**
 * Store > Branding > Fonts: the heading font (store name and page headings) and the body font (everything else) of the
 * store, with a live preview in both. The storefront always keeps Noto Sans Bengali behind the chosen font, so Bangla
 * text never shows as boxes. Saved with "Update Branding".
 */
export function StoreFontsCard({
  heading,
  body,
  onHeading,
  onBody,
}: {
  heading: string | null;
  body: string | null;
  onHeading: (v: string | null) => void;
  onBody: (v: string | null) => void;
}) {
  const href = previewFontsHref([heading ?? '', body ?? '']);
  // The preview loads the chosen fonts into the dashboard page itself.
  useEffect(() => {
    if (!href) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    return () => link.remove();
  }, [href]);
  const family = (name: string | null) => (name && isSafeFontName(name) ? `"${name.trim()}", "Noto Sans Bengali", sans-serif` : undefined);

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5 sm:p-6 space-y-4 mt-6">
      <div>
        <h2 className="text-sm font-semibold text-regantify-text">Fonts</h2>
        <p className="text-xs text-regantify-text-muted mt-1">Pick the letters your store is written in. Bangla text always shows correctly, whichever font you pick.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <FontPicker label="Heading font" hint="Your store name and page headings." value={heading} onChange={onHeading} />
        <FontPicker label="Body font" hint="Everything else: product names, prices, buttons." value={body} onChange={onBody} />
      </div>
      <div className="rounded-xl border border-black/5 bg-regantify-search p-4">
        <p className="text-[11px] uppercase tracking-wide text-regantify-text-muted mb-2">Preview</p>
        <p className="text-xl font-bold text-regantify-text" style={{ fontFamily: family(heading) }}>
          আমাদের নতুন কালেকশন · New Collection
        </p>
        <p className="mt-1.5 text-sm text-regantify-text" style={{ fontFamily: family(body) }}>
          সুতি পাঞ্জাবি, সব সাইজ পাওয়া যাচ্ছে। Cotton Panjabi, all sizes in stock. ৳1,250
        </p>
      </div>
    </div>
  );
}
