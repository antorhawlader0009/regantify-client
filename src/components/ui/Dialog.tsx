import * as RadixDialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  /** Optional — omit for a modal with no visible header (matches the existing Add Category/Brand modals). */
  title?: string;
  maxWidth?: string; // Tailwind max-w-* class, e.g. "max-w-lg"
}

/**
 * Radix-backed modal — handles focus trap, Escape-to-close, and
 * click-outside-to-close for free. Dashboard theme: white panel with a
 * hairline border, 15px title, a square close button. Callers add their
 * own body padding, as before.
 */
export function Dialog({ open, onOpenChange, children, title, maxWidth = 'max-w-lg' }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/40 transition-opacity" />
        <RadixDialog.Content
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
