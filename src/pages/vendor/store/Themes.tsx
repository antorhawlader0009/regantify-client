import { ExternalLink, Check } from 'lucide-react';
import { useAuthStore } from '../../../store/authStore';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';

interface ThemeInfo {
  id: 'medium' | 'simple';
  name: string;
  description: string;
}

// Only "Medium" is actually wired up as the live storefront theme right
// now — rendered by the separate storefront/ (Next.js) app, server-
// rendered for speed/SEO, at storefrontStoreUrl(). It's the default
// every vendor store uses. "Simple" exists in the original Vite-based
// storefront code as a lighter alternative for later but hasn't been
// ported to the new Next.js app yet, so it's shown as a coming-soon
// card rather than a real option.
const THEMES: ThemeInfo[] = [
  {
    id: 'medium',
    name: 'Medium',
    description:
      'Full-featured storefront with gallery, variations, category filtering, search, and trust badges. The default theme for every store.',
  },
  {
    id: 'simple',
    name: 'Simple',
    description: 'A minimal storefront with just a header and a plain product grid.',
  },
];

const SELECTED_THEME_ID: ThemeInfo['id'] = 'medium';

export default function Themes() {
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);
  const storeUrl = subdomain ? storefrontStoreUrl(subdomain) : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Themes</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Choose how your storefront looks to customers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {THEMES.map((theme) => {
          const isSelected = theme.id === SELECTED_THEME_ID;
          return (
            <div
              key={theme.id}
              className={`bg-white rounded-2xl border overflow-hidden flex flex-col ${
                isSelected ? 'border-regantify-cta ring-1 ring-regantify-cta' : 'border-black/5'
              }`}
            >
              <div className="aspect-[16/10] bg-regantify-content flex items-center justify-center">
                <span className="text-regantify-text-muted text-sm">{theme.name} preview</span>
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

                <div className="mt-4">
                  {theme.id === 'medium' && storeUrl ? (
                    <a
                      href={storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
                        text-white text-sm font-medium transition-colors"
                    >
                      <ExternalLink size={16} />
                      View
                    </a>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-content
                        text-regantify-text-muted text-sm font-medium cursor-not-allowed"
                      title={theme.id !== 'medium' ? 'Coming soon' : 'Store address not found'}
                    >
                      <ExternalLink size={16} />
                      View
                    </button>
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
