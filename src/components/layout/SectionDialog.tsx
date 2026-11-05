import { Suspense, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate, useOutletContext } from 'react-router-dom';
import { X } from 'lucide-react';
import { Dialog, DialogClose } from '../ui/Dialog';
import { PageLoading } from '../PageLoading';
import { navLinks, type NavSection } from '../../lib/navConfig';

const matches = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

/**
 * A sidebar section marked `dialog` (Courier Integration, Marketing) opens like Settings: a modal over the
 * dashboard with its pages as a tab list on the left and the open page on the right. It is a layout route, so
 * every page of the section (and its add/edit sub-pages) renders inside it. The tabs come from the same
 * filtered nav the sidebar shows (role, flags), handed down by VendorLayout's Outlet context.
 */
export function SectionDialog({ section }: { section: string }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const ctx = useOutletContext<{ nav?: NavSection[] } | undefined>();
  const found = ctx?.nav?.find((s) => s.label === section);
  const links = navLinks(found?.children);

  // Closing goes back to the page that was open before the dialog, however many tabs were visited inside it.
  const startIdx = useRef<number | null>(null);
  if (startIdx.current === null) {
    const idx = window.history.state?.idx;
    startIdx.current = typeof idx === 'number' ? idx : 0;
  }
  const close = () => {
    const idx = window.history.state?.idx;
    const start = startIdx.current ?? 0;
    if (start > 0 && typeof idx === 'number' && idx >= start) navigate(-(idx - start + 1));
    else navigate('/vendor/dashboard', { replace: true });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && close()} maxWidth="max-w-6xl">
      <div className="flex h-[min(88vh,860px)] flex-col">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            <h1 className="text-[15px] font-semibold text-regantify-text">{section}</h1>
            {found?.dialog && <p className="text-xs text-neutral-500">{found.dialog}</p>}
          </div>
          <DialogClose
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-regantify-text"
          >
            <X size={17} />
          </DialogClose>
        </div>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {links.length > 0 && (
            <nav
              aria-label={`${section} sections`}
              className="flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-white p-2 md:w-56 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r"
            >
              {links.map((l) => {
                const active =
                  matches(pathname, l.path) || Boolean(l.alsoActive?.some((p) => matches(pathname, p)));
                return (
                  <NavLink
                    key={l.path}
                    to={l.path}
                    aria-current={active ? 'page' : undefined}
                    className={`flex h-10 shrink-0 items-center rounded-lg px-3 text-left text-sm transition-colors ${
                      active ? 'bg-brand-lime font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {l.label}
                  </NavLink>
                );
              })}
            </nav>
          )}

          <div className="vendor-cards min-w-0 flex-1 overflow-y-auto bg-neutral-50 p-4 md:p-5">
            <Suspense fallback={<PageLoading />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
