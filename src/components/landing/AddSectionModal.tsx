import { useState } from 'react';
import { X, Search } from 'lucide-react';
import { SECTION_CATEGORIES, SECTION_REGISTRY, type SectionCategory } from '../../lib/landingSections';
import { SectionThumbnail } from './SectionThumbnail';

interface AddSectionModalProps {
  onPick: (type: string) => void;
  onClose: () => void;
}

/**
 * "Add Section" picker — category tabs plus a live-rendered thumbnail per
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#15151D]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h3 className="text-[15px] font-semibold text-slate-100">Add a section</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-3">
          <div className="relative mr-1 w-52">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sections"
              className="w-full rounded-lg border border-white/10 bg-white/[0.04] py-1.5 pl-9 pr-3
                text-[12.5px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>

          {(['All', ...SECTION_CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${
                category === c ? 'bg-white/10 text-slate-100' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 overflow-y-auto p-5 sm:grid-cols-3">
          {visible.length === 0 && (
            <p className="col-span-full py-10 text-center text-[13px] text-slate-500">
              No sections match that search.
            </p>
          )}

          {visible.map((s) => (
            <button
              key={s.type}
              onClick={() => onPick(s.type)}
              className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] text-left
                transition-colors hover:border-violet-400/50 hover:bg-white/[0.06]"
            >
              <div className="flex h-28 items-center justify-center overflow-hidden bg-white/[0.02] p-3">
                <SectionThumbnail type={s.type} />
              </div>
              <div className="border-t border-white/10 px-3 py-2.5">
                <span className="block text-[13px] font-medium text-slate-100">{s.label}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{s.description}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
