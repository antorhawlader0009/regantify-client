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
 * click-outside-to-close for free (the hand-rolled modals elsewhere in
 * this app do this manually). Styling matches the existing white
 * rounded-2xl modal look used by Add Category / Add Brand.
 */
export function Dialog({ open, onOpenChange, children, title, maxWidth = 'max-w-lg' }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 bg-black/50 z-40 transition-opacity" />
        <RadixDialog.Content
          className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[calc(100%-2rem)] ${maxWidth}
            max-h-[90vh] overflow-y-auto bg-white rounded-2xl focus:outline-none`}
        >
          {title ? (
            <div className="flex items-center justify-between p-6 pb-0">
              <RadixDialog.Title className="text-lg font-semibold text-regantify-text">{title}</RadixDialog.Title>
              <RadixDialog.Close className="text-regantify-text-muted hover:text-regantify-text">
                <X size={18} />
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
