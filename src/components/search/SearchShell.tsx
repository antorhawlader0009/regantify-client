import { lazy, Suspense, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { useSearchUi } from '../../store/searchStore';

/*
 * The light part of the top-bar search: the button and the Ctrl/Cmd+K and "/" shortcuts. The palette itself
 * (GlobalSearch.tsx) and the settings catalog it searches load only when it is first opened, so they are not in the
 * site's first download. The catalog names third-party services (payment and courier companies) as search words, and
 * nothing that names another company should load on the public homepage (see the brand-complaint note of 2026-10-20).
 */
const PaletteBody = lazy(() => import('./GlobalSearch'));

/** The field in the top bar. Looks like a search box, opens the palette. */
export function SearchTrigger() {
  const setOpen = useSearchUi((s) => s.setOpen);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="mx-auto hidden h-9 w-full max-w-[360px] items-center gap-2 rounded-lg border border-line px-3 text-left text-sm text-neutral-500 transition hover:border-neutral-300 md:flex"
      >
        <Search size={16} className="shrink-0 text-neutral-600" />
        <span className="flex-1 truncate">Search</span>
        <kbd className="hidden shrink-0 rounded border border-line bg-neutral-50 px-1.5 py-0.5 font-sans text-[11px] text-neutral-500 lg:block">/</kbd>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-white text-neutral-700 md:hidden"
      >
        <Search size={17} />
      </button>
    </>
  );
}

/** Mounted once in the Topbar; renders nothing until opened. */
export function SearchPalette() {
  const open = useSearchUi((s) => s.open);
  const setOpen = useSearchUi((s) => s.setOpen);

  // Ctrl/Cmd+K toggles it anywhere; "/" opens it when not typing in a field.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useSearchUi.getState().open);
        return;
      }
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || useSearchUi.getState().open) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      e.preventDefault();
      setOpen(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  if (!open) return null;
  return createPortal(
    <Suspense fallback={null}>
      <PaletteBody onClose={() => setOpen(false)} />
    </Suspense>,
    document.body,
  );
}
