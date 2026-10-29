import type { FooterConfig } from '../../../../lib/footerApi';
import { FooterLinkListEditor } from './FooterLinkListEditor';

const inputClass = 'w-full px-3 py-2 rounded-lg border border-black/10 text-sm focus:outline-none focus:border-regantify-cta';

/**
 * Store > Footer > "Contact, app links and credit": three extra footer pieces the StorePal footer can show, each hidden or shown on its own.
 * The contact block (address, phone, email) and the app badges (Google Play / App Store, each shown only when its link is filled) sit in a
 * column at the left of the footer; the "System Design & Developed By: Reganto IT Solution" line sits in the bottom bar and is on unless hidden here.
 * Saved with the rest of the footer by the page's Save button.
 */
export function FooterExtras({ config, onChange, storeAddress, storePhone }: { config: FooterConfig; onChange: (patch: Partial<FooterConfig>) => void; storeAddress?: string | null; storePhone?: string | null }) {
  return (
    <div className="mt-8 space-y-6 rounded-2xl border border-black/5 bg-white p-5">
      <div>
        <h2 className="text-base font-semibold text-regantify-text">Contact, app links and credit</h2>
        <p className="mt-0.5 text-xs text-regantify-text-muted">Shown on the StorePal theme. Save the footer to publish them.</p>
      </div>

      <section className="space-y-3">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-regantify-text">Show contact info</span>
          <input type="checkbox" checked={config.showContact} onChange={(e) => onChange({ showContact: e.target.checked })} className="h-4 w-4" />
        </label>
        {config.showContact && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-regantify-text-muted">Heading</label>
              <input type="text" maxLength={60} value={config.contactTitle} onChange={(e) => onChange({ contactTitle: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-regantify-text-muted">Address</label>
              <textarea rows={2} maxLength={300} value={config.contactAddress ?? ''} onChange={(e) => onChange({ contactAddress: e.target.value })} className={`${inputClass} resize-none`} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-regantify-text-muted">Phone (more than one: separate with a comma)</label>
                <input type="text" maxLength={120} value={config.contactPhone ?? ''} onChange={(e) => onChange({ contactPhone: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-regantify-text-muted">Email</label>
                <input type="email" maxLength={120} value={config.contactEmail ?? ''} onChange={(e) => onChange({ contactEmail: e.target.value })} className={inputClass} />
              </div>
            </div>
            {(storeAddress || storePhone) && (!config.contactAddress?.trim() || !config.contactPhone?.trim()) && (
              <button
                type="button"
                onClick={() =>
                  onChange({
                    contactAddress: config.contactAddress?.trim() ? config.contactAddress : (storeAddress ?? ''),
                    contactPhone: config.contactPhone?.trim() ? config.contactPhone : (storePhone ?? ''),
                  })
                }
                className="text-xs font-medium text-regantify-cta hover:underline"
              >
                Fill the empty ones from my store details
              </button>
            )}
          </div>
        )}
      </section>

      <section className="space-y-3 border-t border-black/5 pt-5">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-regantify-text">Show app download links</span>
          <input type="checkbox" checked={config.showApps} onChange={(e) => onChange({ showApps: e.target.checked })} className="h-4 w-4" />
        </label>
        {config.showApps && (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-regantify-text-muted">Heading</label>
              <input type="text" maxLength={60} value={config.appsTitle} onChange={(e) => onChange({ appsTitle: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-regantify-text-muted">Google Play link</label>
              <input type="url" maxLength={300} placeholder="https://play.google.com/store/apps/details?id=…" value={config.playStoreUrl ?? ''} onChange={(e) => onChange({ playStoreUrl: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-regantify-text-muted">App Store link</label>
              <input type="url" maxLength={300} placeholder="https://apps.apple.com/app/…" value={config.appStoreUrl ?? ''} onChange={(e) => onChange({ appStoreUrl: e.target.value })} className={inputClass} />
            </div>
            <p className="text-xs text-regantify-text-muted">A badge shows only when its link is filled in.</p>
          </div>
        )}
      </section>

      {/* The "Got a question?" bar across the top of the footer (2026-10-29). */}
      <section className="space-y-3 border-t border-black/5 pt-5">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-regantify-text">Show a call bar at the top of the footer</span>
          <input type="checkbox" checked={config.showCallBar} onChange={(e) => onChange({ showCallBar: e.target.checked })} className="h-4 w-4" />
        </label>
        {config.showCallBar && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-regantify-text-muted">Heading</label>
                <input type="text" maxLength={60} value={config.callBarTitle} onChange={(e) => onChange({ callBarTitle: e.target.value })} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-regantify-text-muted">Line under it (optional)</label>
                <input
                  type="text"
                  maxLength={140}
                  placeholder="Orders, products or delivery: ask us anything"
                  value={config.callBarText ?? ''}
                  onChange={(e) => onChange({ callBarText: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-regantify-text-muted">Call button number</label>
                <input
                  type="tel"
                  maxLength={30}
                  placeholder={storePhone ?? '01XXXXXXXXX'}
                  value={config.callBarPhone ?? ''}
                  onChange={(e) => onChange({ callBarPhone: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-regantify-text-muted">WhatsApp number or link</label>
                <input
                  type="text"
                  maxLength={300}
                  placeholder="Empty = your WhatsApp from Store > Social"
                  value={config.callBarWhatsapp ?? ''}
                  onChange={(e) => onChange({ callBarWhatsapp: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>
            <p className="text-xs text-regantify-text-muted">A button shows only when it has a number. With no call number the bar uses your contact phone.</p>
          </div>
        )}
      </section>

      {/* A third column of links (2026-10-29), like "Help Center": order tracking, how to order, complaints. */}
      <section className="space-y-3 border-t border-black/5 pt-5">
        <div>
          <span className="text-sm font-medium text-regantify-text">Third link column</span>
          <p className="mt-0.5 text-xs text-regantify-text-muted">Shown next to your other link columns when it has at least one link.</p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-regantify-text-muted">Heading</label>
          <input type="text" maxLength={60} value={config.extraTitle} onChange={(e) => onChange({ extraTitle: e.target.value })} className={inputClass} />
        </div>
        <FooterLinkListEditor links={config.extraLinks} onChange={(extraLinks) => onChange({ extraLinks })} />
      </section>
    </div>
  );
}

/**
 * The "System Design & Developed By" line in the footer's bottom bar: on by default, and the store may hide it. Its own
 * card, shown in Simple mode too (the rest of FooterExtras is Full mode), so every seller can find the switch.
 */
export function FooterCreditToggle({ config, onChange }: { config: FooterConfig; onChange: (patch: Partial<FooterConfig>) => void }) {
  return (
    <section className="mt-5 rounded-xl border border-line bg-white p-5">
      <label className="flex items-center justify-between gap-3">
        <span>
          <span className="block text-sm font-medium text-regantify-text">Show “System Design &amp; Developed By: Reganto IT Solution”</span>
          <span className="mt-0.5 block text-xs text-regantify-text-muted">A small line in the footer’s bottom bar. Untick to hide it, then press Save.</span>
        </span>
        <input type="checkbox" checked={config.showCredit} onChange={(e) => onChange({ showCredit: e.target.checked })} className="h-4 w-4 shrink-0" />
      </label>
    </section>
  );
}
