import { X, Check } from 'lucide-react';
import { FOOTER_TEMPLATES, type FooterTemplateKey } from '../../../../lib/footerTemplates';

interface FooterTemplateModalProps {
  currentTemplate: FooterTemplateKey;
  onSelect: (template: FooterTemplateKey) => void;
  onClose: () => void;
}

/**
 * Store > Footer's "Browse Templates" modal (reference screenshots 2-3)
 * — a gallery of pre-built LAYOUT templates (structure only, see
 * footerTemplates.ts's own header comment). Clicking a card applies that
 * structural arrangement immediately (column count/arrangement + which
 * optional blocks are present) — content already entered (menu links,
 * about blurb, etc.) is preserved, only which slots/blocks are shown
 * changes, same "re-flowed into whichever template is selected"
 * behavior FooterConfig's own schema comment describes.
 */
export function FooterTemplateModal({ currentTemplate, onSelect, onClose }: FooterTemplateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-regantify-text">Select Footer Template</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-regantify-text-muted hover:bg-regantify-search transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {(Object.entries(FOOTER_TEMPLATES) as [FooterTemplateKey, (typeof FOOTER_TEMPLATES)[FooterTemplateKey]][]).map(
            ([key, def]) => {
              const selected = key === currentTemplate;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelect(key)}
                  className={`w-full text-left rounded-xl border-2 overflow-hidden transition-colors ${
                    selected ? 'border-regantify-cta' : 'border-black/10 hover:border-black/20'
                  }`}
                >
                  <div className={`p-5 ${def.background === 'band' ? 'bg-regantify-search' : 'bg-white'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-regantify-text">{def.label}</p>
                      {selected && (
                        <span className="flex items-center gap-1 text-xs font-medium text-regantify-cta">
                          <Check size={13} /> Selected
                        </span>
                      )}
                    </div>
                    <div
                      className="grid gap-3"
                      style={{ gridTemplateColumns: `repeat(${def.columns.length}, minmax(0, 1fr))` }}
                    >
                      {def.columns.map((col) => (
                        <div key={col} className="rounded-lg bg-black/5 p-2.5 space-y-1.5">
                          <div className="h-2 w-3/4 rounded bg-black/15" />
                          <div className="h-1.5 w-full rounded bg-black/10" />
                          <div className="h-1.5 w-5/6 rounded bg-black/10" />
                          {col === 'about' && def.supportsSubscribe && (
                            <div className="h-2 w-2/3 rounded bg-regantify-cta/30 mt-1.5" />
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-regantify-text-muted mt-3">{def.description}</p>
                  </div>
                </button>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
}
