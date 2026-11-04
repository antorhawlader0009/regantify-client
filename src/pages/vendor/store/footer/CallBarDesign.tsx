import { MessageCircle, PhoneCall, RotateCcw } from 'lucide-react';
import type { CallBarStyle, FooterConfig } from '../../../../lib/footerApi';

const inputClass = 'w-full px-3 py-2 rounded-lg border border-black/10 text-sm focus:outline-none focus:border-regantify-cta';

const COLORS: { key: 'background' | 'textColor' | 'buttonColor' | 'buttonTextColor'; label: string; sample: string }[] = [
  { key: 'background', label: 'Bar colour', sample: '#EDE7F6' },
  { key: 'textColor', label: 'Text colour', sample: '#1D1A3A' },
  { key: 'buttonColor', label: 'Button colour', sample: '#6B4FC1' },
  { key: 'buttonTextColor', label: 'Button text colour', sample: '#FFFFFF' },
];

/**
 * Store > Footer > call bar > Design: the store's own colours, layout, button shape, which buttons show and their words.
 * Every choice is optional; "Template" puts one back to the template's own look (the key is left out). A small preview
 * shows the bar with the choices made. Saved with the footer (FooterConfig.callBarStyle).
 */
export function CallBarDesign({ config, onChange }: { config: FooterConfig; onChange: (patch: Partial<FooterConfig>) => void }) {
  const style: CallBarStyle = config.callBarStyle ?? {};
  const set = (patch: Partial<CallBarStyle>) => {
    const next: CallBarStyle = { ...style, ...patch };
    for (const k of Object.keys(next) as (keyof CallBarStyle)[]) if (next[k] === undefined || next[k] === '') delete next[k];
    onChange({ callBarStyle: Object.keys(next).length > 0 ? next : null });
  };
  const radius = style.buttonShape === 'PILL' ? 9999 : style.buttonShape === 'ROUNDED' ? 8 : style.buttonShape === 'SQUARE' ? 2 : 6;
  const center = style.layout === 'CENTER';
  const showCall = style.showCall !== false;
  const showWa = style.showWhatsapp !== false;

  return (
    <div className="space-y-4 rounded-xl border border-black/5 bg-neutral-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-regantify-text">Design</span>
        {config.callBarStyle && (
          <button type="button" onClick={() => onChange({ callBarStyle: null })} className="inline-flex items-center gap-1 text-xs font-medium text-regantify-text-muted hover:text-regantify-text">
            <RotateCcw size={13} aria-hidden />
            Use the template&apos;s look
          </button>
        )}
      </div>

      {/* Preview */}
      <div
        className={`flex gap-3 rounded-lg px-4 py-3 ${center ? 'flex-col items-center text-center' : 'flex-col sm:flex-row sm:items-center sm:justify-between'}`}
        style={{ backgroundColor: style.background ?? '#EDE7F6', color: style.textColor ?? '#1D1A3A' }}
      >
        <div className="min-w-0">
          <p className="text-[12px] font-bold uppercase tracking-wide">{config.callBarTitle || 'Got a question?'}</p>
          <p className="text-[12px] opacity-75">{config.callBarText || 'Orders, products or delivery: ask us anything directly'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {showCall && (
            <span
              className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold uppercase"
              style={{ backgroundColor: style.buttonColor ?? '#6B4FC1', color: style.buttonTextColor ?? '#FFFFFF', borderRadius: radius }}
            >
              <PhoneCall size={13} aria-hidden />
              {style.callLabel || config.callBarPhone || '01XXXXXXXXX'}
            </span>
          )}
          {showWa && (
            <span
              className="inline-flex items-center gap-1.5 border px-3 py-2 text-[11px] font-semibold uppercase"
              style={{ borderColor: style.buttonColor ?? 'currentColor', borderRadius: radius }}
            >
              <MessageCircle size={13} aria-hidden />
              {style.whatsappLabel || 'WhatsApp'}
            </span>
          )}
        </div>
      </div>
      <p className="text-xs text-regantify-text-muted">Preview only. Colours you leave on &quot;Template&quot; follow your store template.</p>

      <div className="grid gap-3 sm:grid-cols-2">
        {COLORS.map((c) => (
          <div key={c.key}>
            <label className="mb-1 block text-xs font-medium text-regantify-text-muted">{c.label}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={style[c.key] ?? c.sample}
                onChange={(e) => set({ [c.key]: e.target.value.toUpperCase() })}
                className="h-9 w-12 cursor-pointer rounded border border-black/10 bg-white p-0.5"
                aria-label={c.label}
              />
              <span className="flex-1 text-xs text-regantify-text-muted">{style[c.key] ?? 'Template'}</span>
              {style[c.key] && (
                <button type="button" onClick={() => set({ [c.key]: undefined })} className="text-xs font-medium text-regantify-text-muted hover:text-regantify-text">
                  Template
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-regantify-text-muted">Layout</label>
          <select value={style.layout ?? ''} onChange={(e) => set({ layout: (e.target.value || undefined) as CallBarStyle['layout'] })} className={inputClass}>
            <option value="">Template (text left, buttons right)</option>
            <option value="SPLIT">Text left, buttons right</option>
            <option value="CENTER">Everything in the middle</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-regantify-text-muted">Button shape</label>
          <select value={style.buttonShape ?? ''} onChange={(e) => set({ buttonShape: (e.target.value || undefined) as CallBarStyle['buttonShape'] })} className={inputClass}>
            <option value="">Template</option>
            <option value="SQUARE">Square corners</option>
            <option value="ROUNDED">Rounded corners</option>
            <option value="PILL">Fully round</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-regantify-text">Show the Call button</span>
            <input type="checkbox" checked={showCall} onChange={(e) => set({ showCall: e.target.checked ? undefined : false })} className="h-4 w-4" />
          </label>
          {showCall && (
            <input
              type="text"
              maxLength={30}
              placeholder="Button words (empty = the number)"
              value={style.callLabel ?? ''}
              onChange={(e) => set({ callLabel: e.target.value })}
              className={inputClass}
            />
          )}
        </div>
        <div className="space-y-2">
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm text-regantify-text">Show the WhatsApp button</span>
            <input type="checkbox" checked={showWa} onChange={(e) => set({ showWhatsapp: e.target.checked ? undefined : false })} className="h-4 w-4" />
          </label>
          {showWa && (
            <input
              type="text"
              maxLength={30}
              placeholder="Button words (empty = WhatsApp)"
              value={style.whatsappLabel ?? ''}
              onChange={(e) => set({ whatsappLabel: e.target.value })}
              className={inputClass}
            />
          )}
        </div>
      </div>
      {!showCall && !showWa && <p className="text-xs font-medium text-red-600">With both buttons off, the bar is not shown.</p>}
    </div>
  );
}
