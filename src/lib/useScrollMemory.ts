import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// Where each dashboard page was scrolled to. Module-level, so it lives as
// long as the tab does.
const saved = new Map<string, number>();

/**
 * Remembers how far the dashboard's scrolling area (`<main>` in the layout,
 * not the window, so the router's own scroll restoration can't help) was
 * scrolled on each page, and puts it back when the shopper returns:
 * browser Back/Forward, or a link from a detail page up to its list
 * ("All orders" on an order opens the list where it was). Any other new
 * page starts at the top.
 *
 * A list fills in after its data arrives, so the restore keeps trying for
 * up to 2 seconds until the content is tall enough, and gives up the
 * moment the person scrolls themselves.
 */
export function useScrollMemory(ref: RefObject<HTMLElement>) {
  const { pathname, search } = useLocation();
  const navType = useNavigationType();
  const key = pathname + search;
  const keyRef = useRef(key);
  const prevPath = useRef(pathname);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => saved.set(keyRef.current, el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [ref]);

  useLayoutEffect(() => {
    const from = prevPath.current;
    keyRef.current = key;
    prevPath.current = pathname;
    const el = ref.current;
    if (!el) return;

    const backUpToList = from.startsWith(`${pathname.replace(/\/$/, '')}/`);
    const target = navType === 'POP' || backUpToList ? (saved.get(key) ?? 0) : 0;

    let raf = 0;
    const started = performance.now();
    const stop = () => cancelAnimationFrame(raf);
    const apply = () => {
      el.scrollTop = target;
      if (Math.abs(el.scrollTop - target) > 2 && performance.now() - started < 2000) raf = requestAnimationFrame(apply);
    };
    apply();
    el.addEventListener('wheel', stop, { passive: true, once: true });
    el.addEventListener('touchstart', stop, { passive: true, once: true });
    return () => {
      stop();
      el.removeEventListener('wheel', stop);
      el.removeEventListener('touchstart', stop);
    };
    // Runs once per page change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
