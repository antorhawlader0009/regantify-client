import type { ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../ui/DropdownMenu';

export interface RowMenuItem {
  label: string;
  onSelect: () => void;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  /** A thin line above this item, to set a risky action apart from the routine ones. */
  separated?: boolean;
}

/**
 * The "more" menu at the end of a table row (Super Admin console). One primary action sits in the row as a plain link; everything else goes here, so a row
 * stays one line tall instead of growing a stack of buttons. Items the person's role can't use should simply not be passed.
 */
export function RowMenu({ items, label = 'More actions' }: { items: RowMenuItem[]; label?: string }) {
  if (items.length === 0) return null;
  return (
    <DropdownMenu
      widthClass="w-48"
      trigger={
        <button type="button" aria-label={label} title={label} className="grid h-7 w-7 place-items-center rounded-md text-regantify-text-muted transition hover:bg-black/5 hover:text-regantify-text">
          <MoreHorizontal size={16} />
        </button>
      }
    >
      {items.map((it) => (
        <div key={it.label}>
          {it.separated && <DropdownMenuSeparator />}
          <DropdownMenuItem onSelect={it.onSelect} icon={it.icon} danger={it.danger} disabled={it.disabled}>
            {it.label}
          </DropdownMenuItem>
        </div>
      ))}
    </DropdownMenu>
  );
}
