import { Link } from 'react-router-dom';
import { DESIGN_CARDS } from '../../../lib/designPages';
import { isFullViewPath } from '../../../lib/simpleView';
import { useDashboardView } from '../../../lib/useDashboardView';
import { MoreInFullView } from '../../../components/ui/FullViewOnly';

/**
 * Store > Design: one card per design page, opened one at a time. Replaces the sidebar sub-menu, so the
 * Store menu stays short and the design tools are easy to browse with a sentence under each name.
 */
export default function DesignHub() {
  // Simple view keeps the everyday design pages (SIMPLE-VIEW-plan.md Step 3); pinned ones stay.
  const { isSimple, pins } = useDashboardView();
  const cards = isSimple ? DESIGN_CARDS.filter((c) => !isFullViewPath(c.path) || pins.includes(c.path)) : DESIGN_CARDS;
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Design</h1>
        <p className="mt-1 text-sm text-regantify-text-muted">Choose what to change on your store. Each opens on its own page.</p>
      </div>

      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-3">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <li key={card.path}>
              <Link
                to={card.path}
                className="group flex h-full items-start gap-3 rounded-xl border border-line bg-white px-4 py-3 transition-colors hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              >
                <Icon size={22} strokeWidth={1.5} className="mt-0.5 shrink-0 text-neutral-500 group-hover:text-regantify-text" />
                <span className="min-w-0">
                  <span className="block text-[15px] font-medium text-regantify-text">{card.label}</span>
                  <span className="mt-0.5 block text-[13px] text-regantify-text-muted">{card.description}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <MoreInFullView count={DESIGN_CARDS.length - cards.length} className="mt-4" />
    </div>
  );
}
