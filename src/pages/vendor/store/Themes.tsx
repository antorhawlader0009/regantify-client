import { useEffect, useState } from 'react';
import { ExternalLink, Check, Loader2, Search } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import { getVendorTheme, updateVendorTheme, type StoreTheme } from '../../../lib/vendorApi';
import { LockedBadge } from '../../../components/ui/UpgradePrompt';
import { toast } from 'sonner';

interface ThemeInfo {
  id: StoreTheme;
  name: string;
  description: string;
}

// Both themes are fully live - each is a complete, independent build of
// every storefront route (home, product, cart, checkout, account,
// order tracking) in the storefront/ (Next.js) app, not a preview or a
// mockup. Selecting one here switches what every visitor to this
// vendor's live store actually sees - see StoreTheme in schema.prisma
// and storefront/src/lib/theme.ts, which branches every route on this
// same value.
// Listed in the server's unlock order (plan-limits.service.ts's
// THEME_ORDER) - StorePal first, since it's the one theme Free includes.
const THEMES: ThemeInfo[] = [
  {
    id: 'STOREPAL',
    name: 'StorePal',
    description:
      'A full-featured marketplace layout with a scrolling announcement bar, sidebar-navigation account pages, customer coupons, and a Top Selling/category-grid homepage.',
  },
  // Medium and Minimal are no longer offered (2026-11-03, the owner's rule); their code stays in the storefront.
  {
    id: 'PLAYMATE',
    name: 'PlayMate',
    description:
      'A bright, playful look in purple and yellow: rounded cards, a friendly script logo, a hero slider and a brand strip. Every StorePal feature works the same.',
  },
  {
    id: 'SOLEVO',
    name: 'Solevo',
    description:
      'A clean, premium shoe-store look: black and copper on cream, serif headings, a full-width hero slider, sharp-cornered buttons and a scrolling brand strip. Every StorePal feature works the same.',
  },
  {
    id: 'CHICWOVE',
    name: 'Chicwove',
    description:
      "A warm women's-fashion look: coral on cream, serif headings, rounded white product cards, a peach hero and a coral offer banner over a deep brown footer. Every StorePal feature works the same.",
  },
  {
    id: 'CHRONICS',
    name: 'Chronics',
    description:
      'A bright, playful fashion look: pink on white with a deep indigo ink and a violet top bar, pastel category cards, a lavender hero with dotted accents and white product cards. Every StorePal feature works the same.',
  },
];

/** Templates with a demo store on the storefront (sample products and pictures), opened by "View" while not selected. */
const DEMO_PATHS: Partial<Record<StoreTheme, string>> = {
  PLAYMATE: '/template-demo/playmate',
  SOLEVO: '/template-demo/solevo',
  CHICWOVE: '/template-demo/chicwove',
  CHRONICS: '/template-demo/chronics',
};

/** Small illustrative mockup of each theme's layout - real proportions
 * and structure (header, hero, product grid) rendered as plain divs, not
 * a screenshot, so it never goes stale as either theme evolves. */
function ThemePreview({ id }: { id: StoreTheme }) {
  if (id === 'CHRONICS') {
    return (
      <div className="w-full h-full bg-white flex flex-col">
        <div className="h-1.5 bg-[#6A4DBF]" />
        <div className="h-3.5 flex items-center px-2 gap-1.5 border-b border-gray-100">
          <div className="w-2.5 h-2.5 rounded bg-[#F23D7F]" />
          <div className="w-8 h-1.5 rounded bg-[#1B1442]" />
          <div className="flex-1 flex justify-center gap-1">
            <div className="w-3 h-0.5 bg-[#F23D7F]" />
            <div className="w-3 h-0.5 bg-black/30" />
            <div className="w-3 h-0.5 bg-black/30" />
          </div>
        </div>
        <div className="h-9 bg-gradient-to-br from-[#EADFFC] to-[#B9A3F1] flex flex-col justify-center px-2 gap-0.5">
          <div className="w-12 h-1.5 rounded bg-[#1B1442]" />
          <div className="w-9 h-1.5 rounded bg-[#F23D7F]" />
        </div>
        <div className="p-2 grid grid-cols-5 gap-1.5 flex-1">
          {['#FFD3E2', '#C9E2FB', '#FFD9CC', '#FFE79A', '#FFD3E8'].map((bg) => (
            <div key={bg} className="rounded-md" style={{ background: bg }} />
          ))}
        </div>
      </div>
    );
  }
  if (id === 'CHICWOVE') {
    return (
      <div className="w-full h-full bg-[#FDF7F0] flex flex-col">
        <div className="h-3.5 flex items-center px-2 gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#EE4B46]" />
          <div className="w-8 h-1.5 rounded bg-[#1B1B1B]" />
          <div className="flex-1 flex justify-center gap-1">
            <div className="w-3 h-0.5 bg-black/30" />
            <div className="w-3 h-0.5 bg-[#EE4B46]" />
            <div className="w-3 h-0.5 bg-black/30" />
          </div>
        </div>
        <div className="h-9 bg-gradient-to-r from-[#FFEEE2] to-[#FFD2BA] flex flex-col justify-center px-2 gap-0.5">
          <div className="w-12 h-1.5 rounded bg-[#1B1B1B]" />
          <div className="w-9 h-1.5 rounded bg-[#EE4B46]" />
        </div>
        <div className="p-2 grid grid-cols-4 gap-1.5 flex-1">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="bg-white rounded-md shadow-sm" />
          ))}
        </div>
      </div>
    );
  }
  if (id === 'SOLEVO') {
    return (
      <div className="w-full h-full bg-white flex flex-col">
        <div className="h-1.5 bg-[#111111]" />
        <div className="h-3.5 bg-white border-b border-black/5 flex items-center px-2 gap-1.5">
          <div className="w-9 h-1.5 bg-[#111111]" />
          <div className="flex-1 flex justify-center gap-1">
            <div className="w-3 h-0.5 bg-black/30" />
            <div className="w-3 h-0.5 bg-black/30" />
            <div className="w-3 h-0.5 bg-black/30" />
          </div>
          <div className="w-2 h-2 rounded-full bg-[#B87333]" />
        </div>
        <div className="h-9 bg-[#e9ddd2] flex items-center px-2">
          <div className="w-12 h-1.5 bg-[#111111]" />
        </div>
        <div className="p-2 grid grid-cols-4 gap-1.5 flex-1 bg-white">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="bg-[#f4f4f4] rounded-sm border border-black/5" />
          ))}
        </div>
      </div>
    );
  }
  if (id === 'PLAYMATE') {
    return (
      <div className="w-full h-full bg-[#f4f0fb] flex flex-col">
        <div className="h-1.5 bg-[#6c4fc4]" />
        <div className="h-3.5 bg-white flex items-center px-2 gap-1.5">
          <div className="w-10 h-1.5 rounded-full bg-[#6c4fc4]" />
          <div className="flex-1 h-1.5 rounded-full bg-[#ece6f7]" />
          <div className="w-2 h-2 rounded-full bg-[#ffd028]" />
        </div>
        <div className="mx-2 mt-1.5 h-8 rounded-lg bg-gradient-to-r from-[#6c4fc4] to-[#9b7fe6] flex items-center px-2">
          <div className="w-10 h-1.5 rounded-full bg-[#ffd028]" />
        </div>
        <div className="p-2 grid grid-cols-4 gap-1.5 flex-1">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="bg-white rounded-lg border border-[#ece6f7]" />
          ))}
        </div>
      </div>
    );
  }
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

/** The shop types a seller picks from, in the order of the tabs. A template can suit several. */
const CATEGORIES = [
  'Fashion',
  'Watches & Accessories',
  'Grocery & Food',
  'Technology & Gadgets',
  'Furniture & Home',
  'Beauty & Health',
  'Kids & Pets',
  'Stationery & Education',
  'Construction Materials',
  'Others',
] as const;
type Category = (typeof CATEGORIES)[number];

const THEME_CATEGORIES: Partial<Record<StoreTheme, Category[]>> = {
  // StorePal is the all-purpose layout: a store of any kind can start with it.
  STOREPAL: ['Fashion', 'Watches & Accessories', 'Grocery & Food', 'Technology & Gadgets', 'Furniture & Home', 'Beauty & Health', 'Stationery & Education', 'Others'],
  PLAYMATE: ['Kids & Pets'],
  SOLEVO: ['Fashion'],
  CHICWOVE: ['Fashion'],
  CHRONICS: ['Fashion'],
};

export default function Themes() {
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);
  const storeUrl = subdomain ? storefrontStoreUrl(subdomain) : null;

  const [selected, setSelected] = useState<StoreTheme | null>(null);
  // null while loading = "don't know yet", never used to mean "nothing
  // unlocked" - every real plan (including Free) unlocks at least 1
  // theme, so an empty array only ever reflects a load-in-progress/error
  // state, not a real entitlement of zero.
  const [allowedThemes, setAllowedThemes] = useState<StoreTheme[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState<StoreTheme | null>(null);
  const [tab, setTab] = useState<Category | 'ALL'>('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    getVendorTheme()
      .then((info) => {
        setSelected(info.theme);
        setAllowedThemes(info.allowedThemes);
      })
      .catch(() => toast.error('Could not load your current theme.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = async (theme: StoreTheme) => {
    if (theme === selected || switching) return;
    setSwitching(theme);
    try {
      const updated = await updateVendorTheme(theme);
      setSelected(updated);
      toast.success(`${THEMES.find((t) => t.id === theme)?.name ?? theme} is now live on your store.`);
    } catch (err: unknown) {
      // A locked theme surfaces the server's own upgrade-prompt message here.
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not switch templates. Please try again.';
      toast.error(message);
    } finally {
      setSwitching(null);
    }
  };

  const needle = query.trim().toLowerCase();
  const matches = (t: ThemeInfo) =>
    !needle || `${t.name} ${t.description} ${(THEME_CATEGORIES[t.id] ?? []).join(' ')}`.toLowerCase().includes(needle);
  const inTab = (t: ThemeInfo, c: Category | 'ALL') => c === 'ALL' || (THEME_CATEGORIES[t.id] ?? ['Others']).includes(c);
  const countFor = (c: Category | 'ALL') => THEMES.filter((t) => inTab(t, c) && matches(t)).length;
  const shown = THEMES.filter((t) => inTab(t, tab) && matches(t));
  const tabLabel = tab === 'ALL' ? 'All templates' : tab;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight text-regantify-text sm:text-[32px]">Browse templates</h1>
          <p className="mt-1 text-sm text-regantify-text-muted">Pick a design for your store. Look at the live demo before you use it; the switch is instant.</p>
        </div>
        <label className="flex w-full items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2.5 sm:w-64">
          <Search size={16} className="shrink-0 text-regantify-text-muted" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search templates"
            aria-label="Search templates"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-regantify-text-muted"
          />
        </label>
      </div>

      {/* Category tabs with how many templates each has (a template can be in several). */}
      <div className="mt-6 -mx-1 overflow-x-auto border-b border-black/10">
        <div className="flex min-w-max gap-6 px-1">
          {(['ALL', ...CATEGORIES] as const).map((c) => {
            const on = tab === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => setTab(c)}
                aria-pressed={on}
                className={`-mb-px whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors ${
                  on ? 'border-regantify-cta text-regantify-cta' : 'border-transparent text-regantify-text-muted hover:text-regantify-text'
                }`}
              >
                {c === 'ALL' ? 'All' : c} <span className="ml-0.5 text-xs opacity-70">{countFor(c)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex items-baseline gap-2 border-b border-black/5 pb-3">
        <h2 className="text-xl font-semibold text-regantify-text">{tabLabel}</h2>
        <span className="text-sm text-regantify-text-muted">{shown.length}</span>
      </div>

      {shown.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-black/10 bg-white px-6 py-14 text-center">
          <p className="text-sm font-medium text-regantify-text">No templates here yet.</p>
          <p className="mt-1 text-sm text-regantify-text-muted">New designs are added regularly. StorePal works for every kind of shop in the meantime.</p>
          {tab !== 'ALL' && (
            <button type="button" onClick={() => setTab('ALL')} className="mt-4 text-sm font-medium text-regantify-cta hover:underline">
              See all templates
            </button>
          )}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((theme) => {
            const isSelected = theme.id === selected;
            const isSwitching = switching === theme.id;
            // Locked = this plan doesn't include it; nothing counts as locked while the plan is still loading.
            const isLocked = allowedThemes !== null && !allowedThemes.includes(theme.id);
            return (
              <div
                key={theme.id}
                className={`bg-white rounded-2xl border overflow-hidden flex flex-col ${
                  isSelected ? 'border-regantify-cta ring-1 ring-regantify-cta' : 'border-black/5'
                }`}
              >
                <div className="aspect-[16/9] relative">
                  <ThemePreview id={theme.id} />
                  {isLocked && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="flex items-center gap-1.5 text-xs font-medium text-white bg-black/50 px-3 py-1.5 rounded-full">
                        <LockedBadge size={12} className="text-white" />
                        Locked
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3 flex flex-col flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-regantify-text">{theme.name}</h3>
                    {isSelected && (
                      <span className="flex items-center gap-1 text-xs font-medium text-regantify-cta bg-regantify-cta/10 px-2 py-0.5 rounded-full">
                        <Check size={12} />
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed text-regantify-text-muted flex-1 line-clamp-3" title={theme.description}>
                    {theme.description}
                  </p>

                  <div className="mt-3 flex items-center gap-2">
                    <button
                      disabled={loading || isSelected || switching !== null}
                      onClick={() => handleSelect(theme.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-regantify-content text-regantify-text-muted cursor-default'
                          : isLocked
                            ? 'bg-regantify-content text-regantify-text hover:bg-regantify-content/70 disabled:opacity-60 disabled:cursor-not-allowed'
                            : 'bg-regantify-cta hover:bg-regantify-cta-dark text-white disabled:opacity-60 disabled:cursor-not-allowed'
                      }`}
                    >
                      {isSwitching ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : isSelected ? (
                        <Check size={16} />
                      ) : isLocked ? (
                        <LockedBadge size={14} className="text-regantify-text" />
                      ) : null}
                      {isSwitching ? 'Switching…' : isSelected ? 'Selected' : isLocked ? 'Upgrade to unlock' : 'Select'}
                    </button>

                    {storeUrl && (
                      <a
                        // A template the store isn't using opens its demo store (sample products and pictures, every plan);
                        // the selected one opens the store itself.
                        href={!isSelected && DEMO_PATHS[theme.id] ? `${storeUrl.replace(/\/$/, '')}${DEMO_PATHS[theme.id]}` : storeUrl}
                        title={!isSelected && DEMO_PATHS[theme.id] ? `See a sample store in ${theme.name}` : undefined}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 hover:bg-regantify-content text-regantify-text text-sm font-medium transition-colors"
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
      )}
    </div>
  );
}
