import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** Optional - omit for a modal with no visible header (matches the existing Add Category/Brand modals). */
  title?: string;
  maxWidth?: string; // Tailwind max-w-* class, e.g. "max-w-lg"
}

/** True when another open dialog that is not this one sits on the page (a plain `role="dialog"` box, or another of these). */
function otherDialogOpen(own: HTMLElement | null): boolean {
  const all = Array.from(document.querySelectorAll<HTMLElement>('[role="dialog"], [role="alertdialog"], [aria-modal="true"]'));
  return all.some((el) => el !== own && !own?.contains(el) && !el.contains(own) && el.offsetParent !== null && isAbove(el, own));
}

/** Rough "drawn above": later in the page or a higher z-index than ours. */
function isAbove(el: HTMLElement, own: HTMLElement | null): boolean {
  if (!own) return true;
  const z = (n: HTMLElement) => {
    let cur: HTMLElement | null = n;
    let best = 0;
    while (cur) {
      const v = parseInt(getComputedStyle(cur).zIndex, 10);
      if (!Number.isNaN(v)) best = Math.max(best, v);
      cur = cur.parentElement;
    }
    return best;
  };
  const a = z(el);
  const b = z(own);
  if (a !== b) return a > b;
  return Boolean(own.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
}

/**
 * The dashboard's modal: white panel with a hairline border, 15px title, a square close button. Callers add their own body padding.
 *
 * Stacking fix (2026-11-17): it runs Radix in non-modal mode with its own backdrop. A Radix *modal* dialog turns off clicks on the whole
 * page (`pointer-events: none` on body) and treats any click outside its box as "close", so a dialog drawn on top of it by other code (the
 * "Set up your store" dialog over Billing, a portaled picker, a toast) could not be clicked: its close button did nothing. Now:
 *   - only a click on THIS dialog's own backdrop closes it; clicks in anything else on top are left alone,
 *   - Escape closes it only when no other dialog is open above it,
 *   - page scrolling behind it is held while it is open.
 */
export function Dialog({ open, onOpenChange, children, title, maxWidth = 'max-w-lg' }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Holds the page still behind the dialog (non-modal Radix does not do it).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange} modal={false}>
      <RadixDialog.Portal>
        <div ref={overlayRef} aria-hidden className="fixed inset-0 z-40 bg-black/40 transition-opacity" />
        <RadixDialog.Content
          ref={contentRef}
          aria-modal="true"
          onInteractOutside={(e) => {
            const target = e.target as Node | null;
            if (!target || !overlayRef.current?.contains(target)) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (otherDialogOpen(contentRef.current)) e.preventDefault();
          }}
          className={`fixed left-1/2 top-1/2 z-50 w-[calc(100%-1.5rem)] -translate-x-1/2 -translate-y-1/2 ${maxWidth}
            max-h-[90vh] overflow-y-auto rounded-xl border border-line bg-white shadow-xl focus:outline-none`}
        >
          {title ? (
            <div className="flex items-center justify-between gap-3 px-6 pt-5">
              <RadixDialog.Title className="text-[15px] font-semibold text-regantify-text">{title}</RadixDialog.Title>
              <RadixDialog.Close
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 hover:text-regantify-text"
              >
                <X size={17} />
              </RadixDialog.Close>
            </div>
          ) : (
            <RadixDialog.Title className="sr-only">Dialog</RadixDialog.Title>
          )}
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

// Re-exported so callers that want the close button somewhere other than
// the default header (e.g. the existing Add Category/Brand layout, which
// puts it top-right with no title) can place it themselves.
export const DialogClose = RadixDialog.Close;
