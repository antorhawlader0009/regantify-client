/**
 * Drag a wide table sideways with the mouse (admin and vendor dashboards). Press on an empty part of a panel that scrolls horizontally, drag left or right, and it
 * moves, like grabbing a map. Three things keep it from getting in the way:
 *  - it never starts on a link, button, field, label, a draggable or sortable item, or anything marked data-no-drag;
 *  - it never starts on text, so dragging across a phone number or an order id still selects it for copying;
 *  - it only starts after the pointer has moved 4px, and a drag swallows the click that would otherwise follow it.
 * Mouse only: touch screens already scroll sideways by swiping.
 */
const BLOCK = 'a, button, input, select, textarea, label, summary, [role="button"], [contenteditable="true"], [draggable="true"], [aria-roledescription], [data-no-drag]';
const THRESHOLD = 4;

/** The nearest ancestor that really scrolls sideways. */
function sidewaysScroller(from: HTMLElement | null): HTMLElement | null {
  for (let el = from; el && el !== document.body; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 1) {
      const overflowX = getComputedStyle(el).overflowX;
      if (overflowX === 'auto' || overflowX === 'scroll') return el;
    }
  }
  return null;
}

/** Is the pointer on a line of text of this element? Then the person means to select it, not to pan. */
function onText(x: number, y: number, el: HTMLElement): boolean {
  for (const node of Array.from(el.childNodes)) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const r of Array.from(range.getClientRects())) {
      if (x >= r.left - 1 && x <= r.right + 1 && y >= r.top - 1 && y <= r.bottom + 1) return true;
    }
  }
  return false;
}

let started = false;

export function initDragScroll(): void {
  if (started || typeof document === 'undefined') return;
  started = true;
  let drag: { el: HTMLElement; startX: number; startLeft: number; moved: boolean } | null = null;

  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0 || e.defaultPrevented) return;
    const target = e.target as HTMLElement | null;
    if (!target || target.closest(BLOCK) || onText(e.clientX, e.clientY, target)) return;
    const el = sidewaysScroller(target);
    if (el) drag = { el, startX: e.clientX, startLeft: el.scrollLeft, moved: false };
  });

  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    if (!drag.moved) {
      if (Math.abs(dx) < THRESHOLD) return;
      drag.moved = true;
      drag.el.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }
    drag.el.scrollLeft = drag.startLeft - dx;
  });

  const finish = () => {
    if (!drag) return;
    const { el, moved } = drag;
    drag = null;
    el.style.cursor = '';
    document.body.style.userSelect = '';
    if (moved) {
      // The release after a drag would count as a click on whatever is under the pointer: swallow that one click.
      const swallow = (ev: MouseEvent) => ev.stopPropagation();
      document.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => document.removeEventListener('click', swallow, true), 0);
    }
  };
  document.addEventListener('pointerup', finish);
  document.addEventListener('pointercancel', finish);
}
