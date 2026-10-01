import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
  /** Tailwind width class for the menu panel. */
  widthClass?: string;
}

// Keep menus this far from the viewport edges: Radix flips / shifts the
// panel to stay inside, so a menu opened near the bottom of the page opens
// upwards instead of running off-screen.
const COLLISION_PADDING = 12;

const panelClass = 'bg-white rounded-lg shadow-lg border border-line py-1.5 z-30 focus:outline-none';

/**
 * Radix-backed dropdown — handles keyboard navigation, click-outside,
 * Escape-to-close and viewport collisions for free. Styling matches the
 * hand-rolled dropdowns already in the app (Topbar account menu, All
 * Products Actions menu), so swapping those over is a drop-in visual match.
 * Long option lists belong in a DropdownMenuSub rather than the main panel,
 * so the menu always fits on screen without a scrollbar.
 */
export function DropdownMenu({ trigger, children, align = 'end', widthClass = 'w-52' }: DropdownMenuProps) {
  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>{trigger}</RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content align={align} sideOffset={8} collisionPadding={COLLISION_PADDING} className={`${widthClass} ${panelClass}`}>
          {children}
        </RadixDropdown.Content>
      </RadixDropdown.Portal>
    </RadixDropdown.Root>
  );
}

interface DropdownMenuItemProps {
  onSelect: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  /** Leading icon. */
  icon?: ReactNode;
  /** Small muted text under the label (clamped to two lines). */
  hint?: ReactNode;
  /** Native tooltip — e.g. the full text of a clamped hint. */
  title?: string;
}

const itemClass = `flex items-center gap-2.5 px-4 py-2 text-sm cursor-pointer outline-none select-none
  hover:bg-neutral-50 focus:bg-neutral-50 data-[highlighted]:bg-neutral-50
  data-[disabled]:opacity-45 data-[disabled]:cursor-not-allowed data-[disabled]:hover:bg-transparent`;

export function DropdownMenuItem({ onSelect, children, danger, disabled, icon, hint, title }: DropdownMenuItemProps) {
  return (
    <RadixDropdown.Item
      onSelect={onSelect}
      disabled={disabled}
      title={title}
      className={`${itemClass} ${danger ? 'text-red-600' : 'text-regantify-text'}`}
    >
      {icon && <span className="shrink-0 text-regantify-text-muted [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">{children}</span>
        {hint && <span className="text-[11px] leading-tight text-regantify-text-muted mt-0.5 line-clamp-2">{hint}</span>}
      </span>
    </RadixDropdown.Item>
  );
}

export const DropdownMenuSeparator = () => <RadixDropdown.Separator className="h-px bg-line my-1" />;

/** Small heading for a group of items (sentence case, like every label in the theme). */
export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return (
    <RadixDropdown.Label className="px-4 pt-1.5 pb-1 text-xs font-medium text-neutral-500">
      {children}
    </RadixDropdown.Label>
  );
}

interface DropdownMenuSubProps {
  label: ReactNode;
  icon?: ReactNode;
  /** Short muted text shown at the right of the trigger (e.g. the current value). */
  value?: ReactNode;
  children: ReactNode;
  widthClass?: string;
}

/** A nested menu that opens beside its row (hover, click, or → key). */
export function DropdownMenuSub({ label, icon, value, children, widthClass = 'w-56' }: DropdownMenuSubProps) {
  return (
    <RadixDropdown.Sub>
      <RadixDropdown.SubTrigger className={`${itemClass} text-regantify-text data-[state=open]:bg-neutral-50`}>
        {icon && <span className="shrink-0 text-regantify-text-muted [&>svg]:w-4 [&>svg]:h-4">{icon}</span>}
        <span className="flex-1 min-w-0 whitespace-nowrap">{label}</span>
        {value && <span className="text-[11px] text-regantify-text-muted truncate max-w-[6rem]">{value}</span>}
        <ChevronRight size={14} className="shrink-0 text-regantify-text-muted" />
      </RadixDropdown.SubTrigger>
      <RadixDropdown.Portal>
        <RadixDropdown.SubContent sideOffset={4} alignOffset={-6} collisionPadding={COLLISION_PADDING} className={`${widthClass} ${panelClass}`}>
          {children}
        </RadixDropdown.SubContent>
      </RadixDropdown.Portal>
    </RadixDropdown.Sub>
  );
}
