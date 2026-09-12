import { useEffect, useState } from 'react';
import { ExternalLink, Check, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import { getVendorTheme, updateVendorTheme, type StoreTheme } from '../../../lib/vendorApi';
import { toast } from 'sonner';

interface ThemeInfo {
  id: StoreTheme;
  name: string;
  description: string;
}

// Both themes are fully live — each is a complete, independent build of
// every storefront route (home, product, cart, checkout, account,
// order tracking) in the storefront/ (Next.js) app, not a preview or a
// mockup. Selecting one here switches what every visitor to this
// vendor's live store actually sees — see StoreTheme in schema.prisma
// and storefront/src/lib/theme.ts, which branches every route on this
// same value.
const THEMES: ThemeInfo[] = [
  {
    id: 'MEDIUM',
    name: 'Medium',
    description:
      'Dense, deal-forward marketplace layout with gallery, variations, category filtering, search, and trust badges — modeled on established e-commerce conventions.',
  },
  {
    id: 'MINIMAL',
    name: 'Minimal',
    description:
      'A spacious, editorial storefront built for speed and a premium, boutique feel — generous whitespace, a quiet monochrome palette, and a fast, distraction-free checkout.',
  },
  {
    id: 'STOREPAL',
    name: 'StorePal',
    description:
      'A full-featured marketplace layout with a scrolling announcement bar, sidebar-navigation account pages, customer coupons, and a Top Selling/category-grid homepage.',
  },
];

/** Small illustrative mockup of each theme's layout — real proportions
 * and structure (header, hero, product grid) rendered as plain divs, not
 * a screenshot, so it never goes stale as either theme evolves. */
function ThemePreview({ id }: { id: StoreTheme }) {
  if (id === 'MINIMAL') {
    return (
      <div className="w-full h-full bg-[#faf9f7] flex flex-col p-3 gap-3">
        <div className="flex items-center justify-between">
          <div className="w-16 h-1.5 rounded-full bg-[#1c1c1a]" />
          <div className="flex gap-1.5">
            <div className="w-6 h-1.5 rounded-full bg-[#d8d5cf]" />
            <div className="w-6 h-1.5 rounded-full bg-[#d8d5cf]" />
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center border border-[#e5e2da] rounded-sm">
          <div className="w-20 h-1.5 rounded-full bg-[#c9c5bb]" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="aspect-[3/4] bg-white border border-[#e5e2da] rounded-sm" />
          ))}
        </div>
      </div>
    );
  }
  if (id === 'STOREPAL') {
    return (
      <div className="w-full h-full bg-[#eef2f7] flex flex-col">
        <div className="h-1.5 bg-[#1a3a5f]" />
        <div className="h-3.5 bg-white border-b border-black/5 flex items-center px-2 gap-1.5">
          <div className="w-10 h-1.5 rounded-full bg-[#1a3a5f]" />
          <div className="flex-1 h-1.5 rounded-full bg-[#eef2f7]" />
          <div className="w-2 h-2 rounded-full bg-[#e91e63]" />
        </div>
        <div className="h-2 bg-white border-b border-black/5 flex items-center gap-1 px-2">
          <div className="w-4 h-0.5 rounded-full bg-black/20" />
          <div className="w-4 h-0.5 rounded-full bg-black/20" />
          <div className="w-4 h-0.5 rounded-full bg-black/20" />
        </div>
        <div className="p-2 grid grid-cols-4 gap-1.5 flex-1">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="bg-white border border-black/5 rounded-sm" />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-full bg-[#f2f3f5] flex flex-col">
      <div className="h-3 bg-white border-b border-black/5 flex items-center px-2 gap-1">
        <div className="w-8 h-1 rounded-full bg-[#e4572e]" />
        <div className="flex-1" />
        <div className="w-4 h-1 rounded-full bg-black/10" />
      </div>
      <div className="h-2.5 bg-[#16181d] flex items-center gap-1 px-2">
        <div className="w-3 h-0.5 rounded-full bg-white/40" />
        <div className="w-3 h-0.5 rounded-full bg-white/40" />
        <div className="w-3 h-0.5 rounded-full bg-white/40" />
      </div>
      <div className="p-2 grid grid-cols-4 gap-1.5 flex-1">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="bg-white border border-black/5 rounded-sm" />
        ))}
      </div>
    </div>
  );
}

export default function Themes() {
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);
  const storeUrl = subdomain ? storefrontStoreUrl(subdomain) : null;

  const [selected, setSelected] = useState<StoreTheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<StoreTheme | null>(null);

  useEffect(() => {
    getVendorTheme()
      .then(setSelected)
      .catch(() => toast.error('Could not load your current theme.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (theme: StoreTheme) => {
    if (theme === selected || switching) return;
    setSwitching(theme);
    try {
      const updated = await updateVendorTheme(theme);
      setSelected(updated);
      toast.success(`${theme === 'MINIMAL' ? 'Minimal' : 'Medium'} is now live on your store.`);
    } catch {
      toast.error('Could not switch themes. Please try again.');
    } finally {
      setSwitching(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Themes</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Choose how your storefront looks to customers. Switching takes effect on your live store immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {THEMES.map((theme) => {
          const isSelected = theme.id === selected;
          const isSwitching = switching === theme.id;
          return (
            <div
              key={theme.id}
              className={`bg-white rounded-2xl border overflow-hidden flex flex-col ${
                isSelected ? 'border-regantify-cta ring-1 ring-regantify-cta' : 'border-black/5'
              }`}
            >
              <div className="aspect-[16/10]">
                <ThemePreview id={theme.id} />
              </div>

              <div className="p-4 flex flex-col flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-semibold text-regantify-text">{theme.name}</h2>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-xs font-medium text-regantify-cta bg-regantify-cta/10 px-2 py-0.5 rounded-full">
                      <Check size={12} />
                      Selected
                    </span>
                  )}
                </div>
                <p className="text-sm text-regantify-text-muted flex-1">{theme.description}</p>

                <div className="mt-4 flex items-center gap-2">
                  <button
                    disabled={loading || isSelected || switching !== null}
                    onClick={() => handleSelect(theme.id)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-regantify-content text-regantify-text-muted cursor-default'
                        : 'bg-regantify-cta hover:bg-regantify-cta-dark text-white disabled:opacity-60 disabled:cursor-not-allowed'
                    }`}
                  >
                    {isSwitching ? <Loader2 size={16} className="animate-spin" /> : isSelected ? <Check size={16} /> : null}
                    {isSwitching ? 'Switching…' : isSelected ? 'Selected' : 'Select'}
                  </button>

                  {storeUrl && (
                    <a
                      href={storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-black/10 hover:bg-regantify-content
                        text-regantify-text text-sm font-medium transition-colors"
                    >
                      <ExternalLink size={16} />
                      View
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
