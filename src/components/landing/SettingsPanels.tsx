import { ImageField } from './ImageField';
import { Field, Select, TextArea, TextInput, Toggle } from './fields';
import type { LandingPage, LandingPagePayload } from '../../lib/landingPagesApi';

/**
 * The non-section configuration panels in the builder's left rail —
 * Page Display, Chat Button, Fonts, and Advanced (SEO/meta, cover image,
 * custom CSS, tracking pixels). Each takes the whole page and a patch
 * callback, matching how the section forms work.
 */
interface PanelProps {
  page: LandingPage;
  onChange: (patch: LandingPagePayload) => void;
}

export function PageDisplayPanel({ page, onChange }: PanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Page URL" hint='Enter "/" to make this your storefront homepage.'>
        <TextInput
          value={page.slug ?? ''}
          onChange={(slug) => onChange({ slug })}
          placeholder="my-offer"
        />
      </Field>

      <Field
        label="Layout"
        hint={
          page.displayMode === 'WITH_STORE_CHROME'
            ? "Shows your store's normal header and footer."
            : 'A focused page with nothing to click away to — best for ad traffic.'
        }
      >
        <Select
          value={page.displayMode ?? 'FULL_PAGE'}
          onChange={(displayMode) => onChange({ displayMode })}
          options={[
            { value: 'FULL_PAGE', label: 'Full page — no header/footer' },
            { value: 'WITH_STORE_CHROME', label: 'With store header & footer' },
          ]}
        />
      </Field>
    </div>
  );
}

export function ChatButtonPanel({ page, onChange }: PanelProps) {
  const enabled = page.chatButtonEnabled ?? false;

  return (
    <div className="flex flex-col gap-3">
      <Toggle
        label="Show a chat button"
        hint="A floating button in the corner of the page."
        checked={enabled}
        onChange={(chatButtonEnabled) => onChange({ chatButtonEnabled })}
      />

      {enabled && (
        <>
          <Field label="Link" hint="Your WhatsApp or Messenger link.">
            <TextInput
              value={page.chatButtonLink ?? ''}
              onChange={(chatButtonLink) => onChange({ chatButtonLink })}
              placeholder="https://wa.me/8801XXXXXXXXX"
            />
          </Field>
          <ImageField
            label="Button image"
            value={page.chatButtonImageUrl ?? ''}
            onChange={(chatButtonImageUrl) => onChange({ chatButtonImageUrl })}
          />
        </>
      )}
    </div>
  );
}

// A short list of fonts that render Bangla and Latin well — the vendor
// base here is Bangladeshi, so a font that can't render Bangla is a
// broken page, not a style choice. Free-text is still allowed for anyone
// who wants a specific Google Font.
const FONT_SUGGESTIONS = ['Hind Siliguri', 'Noto Sans Bengali', 'Baloo Da 2', 'Inter', 'Poppins'];

export function FontsPanel({ page, onChange }: PanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <Field label="Heading font">
        <TextInput
          value={page.headingFont ?? ''}
          onChange={(headingFont) => onChange({ headingFont })}
          placeholder="Hind Siliguri"
        />
      </Field>
      <Field label="Body font">
        <TextInput
          value={page.bodyFont ?? ''}
          onChange={(bodyFont) => onChange({ bodyFont })}
          placeholder="Hind Siliguri"
        />
      </Field>

      <div>
        <span className="mb-1.5 block text-[11px] font-medium text-slate-400">Suggestions</span>
        <div className="flex flex-wrap gap-1.5">
          {FONT_SUGGESTIONS.map((font) => (
            <button
              key={font}
              onClick={() => onChange({ headingFont: font, bodyFont: font })}
              className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-400
                transition-colors hover:border-white/25 hover:text-slate-200"
            >
              {font}
            </button>
          ))}
        </div>
        <span className="mt-1.5 block text-[10.5px] leading-relaxed text-slate-600">
          These all render Bangla text correctly.
        </span>
      </div>
    </div>
  );
}

export function AdvancedPanel({ page, onChange }: PanelProps) {
  const metaTitle = page.metaTitle ?? '';
  const metaDescription = page.metaDescription ?? '';

  return (
    <div className="flex flex-col gap-3">
      <ImageField
        label="Cover image"
        value={page.coverImageUrl ?? ''}
        onChange={(coverImageUrl) => onChange({ coverImageUrl })}
      />

      <Field
        label="Page title (SEO)"
        hint={`${metaTitle.length}/70 — shown as the headline in Google results.`}
      >
        <TextInput value={metaTitle} onChange={(v) => onChange({ metaTitle: v })} />
      </Field>

      <Field
        label="Meta description"
        hint={`${metaDescription.length}/160 — the grey text under the headline in Google results.`}
      >
        <TextArea value={metaDescription} onChange={(v) => onChange({ metaDescription: v })} rows={3} />
      </Field>

      <Field label="Keywords">
        <TextInput
          value={page.metaKeywords ?? ''}
          onChange={(metaKeywords) => onChange({ metaKeywords })}
          placeholder="t-shirt, combo offer"
        />
      </Field>

      <div className="border-t border-white/10 pt-3">
        <span className="mb-2 block text-[10.5px] font-medium uppercase tracking-wide text-slate-500">
          Tracking
        </span>
        <div className="flex flex-col gap-3">
          <Field label="Meta (Facebook) Pixel ID" hint="Leave blank to use your store's default.">
            <TextInput value={page.metaPixelId ?? ''} onChange={(metaPixelId) => onChange({ metaPixelId })} />
          </Field>
          <Field label="TikTok Pixel ID" hint="Leave blank to use your store's default.">
            <TextInput
              value={page.tiktokPixelId ?? ''}
              onChange={(tiktokPixelId) => onChange({ tiktokPixelId })}
            />
          </Field>
        </div>
      </div>

      <div className="border-t border-white/10 pt-3">
        <Field label="Custom CSS" hint="Applies to this page only. Leave blank unless you know CSS.">
          <TextArea
            value={page.customCss ?? ''}
            onChange={(customCss) => onChange({ customCss })}
            rows={6}
            placeholder=".my-class { color: red; }"
          />
        </Field>
      </div>
    </div>
  );
}
