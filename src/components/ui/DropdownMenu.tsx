import * as RadixDropdown from '@radix-ui/react-dropdown-menu';
import type { ReactNode } from 'react';

interface DropdownMenuProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'end';
}

/**
 * Radix-backed dropdown — handles keyboard navigation, click-outside,
 * and Escape-to-close for free. Styling matches the hand-rolled dropdowns
 * already in the app (Topbar account menu, All Products Actions menu),
 * so swapping those over is a drop-in visual match.
 */
export function DropdownMenu({ trigger, children, align = 'end' }: DropdownMenuProps) {
  return (
    <RadixDropdown.Root>
      <RadixDropdown.Trigger asChild>{trigger}</RadixDropdown.Trigger>
      <RadixDropdown.Portal>
        <RadixDropdown.Content
          align={align}
          sideOffset={8}
          className="w-52 bg-white rounded-xl shadow-lg border border-black/10 py-1.5 z-30 focus:outline-none"
        >
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
}

export function DropdownMenuItem({ onSelect, children, danger }: DropdownMenuItemProps) {
  return (
    <RadixDropdown.Item
      onSelect={onSelect}
      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm cursor-pointer outline-none
        hover:bg-regantify-content focus:bg-regantify-content ${danger ? 'text-red-600' : 'text-regantify-text'}`}
    >
      {children}
    </RadixDropdown.Item>
  );
}

export const DropdownMenuSeparator = () => <RadixDropdown.Separator className="h-px bg-black/5 my-1" />;
