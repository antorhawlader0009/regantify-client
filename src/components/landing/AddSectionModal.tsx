import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { SECTION_CATEGORIES, SECTION_REGISTRY, type SectionCategory } from '../../lib/landingSections';
import { SectionThumbnail } from './SectionThumbnail';

interface AddSectionModalProps {
  onPick: (type: string) => void;
  onClose: () => void;
}

/**
 * "Add Section" picker - category tabs plus a live-rendered thumbnail per
 * section type, so a vendor can tell sections apart at a glance rather
 * than reading a list of names (landing-plan.md §4.2).
 */
export function AddSectionModal({ onPick, onClose }: AddSectionModalProps) {
  const [category, setCategory] = useState<SectionCategory | 'All'>('All');
  const [search, setSearch] = useState('');

  const term = search.trim().toLowerCase();
  const visible = SECTION_REGISTRY.filter((s) => {
    if (category !== 'All' && s.category !== category) return false;
    if (!term) return true;
    return s.label.toLowerCase().includes(term) || s.description.toLowerCase().includes(term);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-line bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <h3 className="text-[15px] font-semibold text-regantify-text">Add a section</h3>
          <button onClick={onClose} className="text-neutral-500 hover:text-regantify-text" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-line px-5 py-3">
          <div className="relative mr-1 w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sections"
              className="w-full rounded-lg border border-line bg-white py-1.5 pl-9 pr-3
                text-[12.5px] text-regantify-text placeholder:text-neutral-400 focus:outline-none"
            />
          </div>

          {(['All', ...SECTION_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                category === c ? 'bg-neutral-100 text-regantify-text' : 'text-neutral-500 hover:text-regantify-text'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3">
          {visible.length === 0 && (
            <p className="col-span-full py-10 text-center text-[13px] text-neutral-400">
              No sections match that search.
            </p>
          )}

          {visible.map((s) => (
            <button
              key={s.type}
              onClick={() => onPick(s.type)}
              className="group overflow-hidden rounded-xl border border-line bg-white text-left
                transition-colors hover:border-violet-400/50 hover:bg-neutral-50"
            >
              <div className="flex h-28 items-center justify-center overflow-hidden bg-neutral-50 p-3">
                <SectionThumbnail type={s.type} />
              </div>
              <div className="border-t border-line px-3 py-2.5">
                <span className="block text-[13px] font-medium text-regantify-text">{s.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-neutral-400">{s.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
