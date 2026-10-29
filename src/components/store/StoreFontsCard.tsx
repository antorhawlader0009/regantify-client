import { useEffect, useState } from 'react';
import { STORE_FONTS, DEFAULT_BANGLA_FONT, isSafeFontName, previewFontsHref, type StoreFontChoice } from '../../lib/storeFonts';

const OTHER = '__other';
const DEFAULT = '';

const selectClass =
  'w-full px-3.5 py-2.5 rounded-xl border border-black/10 bg-white text-sm text-regantify-text focus:outline-none focus:border-regantify-cta transition-colors';

const ENGLISH_FONTS = STORE_FONTS.filter((f) => !f.bangla);
// The default (Hind Siliguri) is the empty choice, so it isn't listed twice.
const BANGLA_FONTS = STORE_FONTS.filter((f) => f.bangla && f.name !== DEFAULT_BANGLA_FONT);

/** One font picker: the default, a font from the list, or a Google Fonts name typed by hand. */
function FontPicker({
  label,
  hint,
  value,
  onChange,
  choices,
  defaultLabel,
  placeholder,
}: {
  label: string;
  hint: string;
  value: string | null;
  onChange: (v: string | null) => void;
  choices: StoreFontChoice[];
  defaultLabel: string;
  placeholder: string;
}) {
  const listed = !value || choices.some((f) => f.name === value);
  const [other, setOther] = useState(!listed);
  useEffect(() => {
    if (value && !choices.some((f) => f.name === value)) setOther(true);
  }, [value, choices]);
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
        <option value={DEFAULT}>{defaultLabel}</option>
        {choices.map((f) => (
          <option key={f.name} value={f.name}>
            {f.name}
          </option>
        ))}
        <option value={OTHER}>Another Google font (type its name)…</option>
      </select>
      {other && (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={placeholder}
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
 * Store > Branding > Fonts (2026-10-29: English and Bangla chosen apart): the English heading font (store name and page
 * headings), the English body font (everything else), and the font for Bangla letters (default Hind Siliguri). A browser takes
 * each letter from the first font that has it, so English text uses the English font and Bangla text the Bangla font, with a
 * live preview of both. Saved with "Update Branding".
 */
export function StoreFontsCard({
  heading,
  body,
  bangla,
  onHeading,
  onBody,
  onBangla,
}: {
  heading: string | null;
  body: string | null;
  bangla: string | null;
  onHeading: (v: string | null) => void;
  onBody: (v: string | null) => void;
  onBangla: (v: string | null) => void;
}) {
  const banglaName = bangla && isSafeFontName(bangla) ? bangla.trim() : DEFAULT_BANGLA_FONT;
  const href = previewFontsHref([heading ?? '', body ?? '', banglaName]);
  // The preview loads the chosen fonts into the dashboard page itself.
  useEffect(() => {
    if (!href) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    return () => link.remove();
  }, [href]);
  const family = (english: string | null) =>
    english && isSafeFontName(english) ? `"${english.trim()}", "${banglaName}", sans-serif` : `"${banglaName}", sans-serif`;

  return (
    <div className="bg-white rounded-2xl border border-black/5 p-5 sm:p-6 space-y-4 mt-6">
      <div>
        <h2 className="text-sm font-semibold text-regantify-text">Fonts</h2>
        <p className="text-xs text-regantify-text-muted mt-1">
          Pick one font for English letters and one for Bangla letters. Each language is written in its own font, on every page of your store.
        </p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <FontPicker
          label="English heading font"
          hint="Your store name and page headings."
          value={heading}
          onChange={onHeading}
          choices={ENGLISH_FONTS}
          defaultLabel="The theme's own font"
          placeholder="e.g. Kalam"
        />
        <FontPicker
          label="English body font"
          hint="Product names, prices, buttons."
          value={body}
          onChange={onBody}
          choices={ENGLISH_FONTS}
          defaultLabel="The theme's own font"
          placeholder="e.g. Kalam"
        />
        <FontPicker
          label="Bangla font"
          hint="Every Bangla letter on your store."
          value={bangla}
          onChange={onBangla}
          choices={BANGLA_FONTS}
          defaultLabel={`${DEFAULT_BANGLA_FONT} (default)`}
          placeholder="e.g. Hind Siliguri"
        />
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
