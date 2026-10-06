import { useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown, Lock, Sparkles, type LucideIcon } from 'lucide-react';
import { STAFF_ROLE_KEYS, STAFF_ROLE_MIN_TIER, STAFF_ROLES, roleAllowedOnTier, type StaffRoleKey } from '../../lib/staffPermissions';

/** The plan each role tier starts at (Plan.staffRoleTier; seed-plans.ts). */
const TIER_PLAN = ['Free', 'Basic', 'Starter', 'Advance'];

const listOf = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

function IconTile({ icon: Icon, muted = false }: { icon: LucideIcon; muted?: boolean }) {
  return (
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${muted ? 'border-line bg-neutral-50 text-neutral-400' : 'border-line bg-white text-regantify-text'}`}
    >
      <Icon size={17} strokeWidth={1.8} aria-hidden />
    </span>
  );
}

/**
 * Staff role picker (rule-plan.md 5.8): each role with its icon and what it's
 * for. Roles the plan doesn't include stay readable but can't be picked, and
 * one line says which plan unlocks the next ones. The server checks the plan
 * again on save.
 */
export function RolePicker({ value, onChange, roleTier }: { value: StaffRoleKey; onChange: (key: StaffRoleKey) => void; roleTier: number }) {
  const [open, setOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const current = STAFF_ROLES[value];
  const locked = (key: StaffRoleKey) => !roleAllowedOnTier(key, roleTier);
  const nextTier = Math.min(...STAFF_ROLE_KEYS.filter(locked).map((k) => STAFF_ROLE_MIN_TIER[k]));
  const nextNames = Number.isFinite(nextTier) ? STAFF_ROLE_KEYS.filter((k) => STAFF_ROLE_MIN_TIER[k] === nextTier).map((k) => STAFF_ROLES[k].name) : [];

  // Up/Down move between the roles that can be picked; Home/End jump.
  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button[role="option"]:not([disabled])')];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const go = (i: number) => {
      e.preventDefault();
      items[(i + items.length) % items.length]?.focus();
    };
    if (e.key === 'ArrowDown') go(at + 1);
    else if (e.key === 'ArrowUp') go(at - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          className="flex w-full items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5 text-left transition-colors hover:border-neutral-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 data-[state=open]:border-regantify-text"
        >
          <IconTile icon={current.icon} />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-regantify-text">{current.name}</span>
            <span className="block truncate text-xs text-neutral-500">{current.description}</span>
          </span>
          <ChevronDown size={16} className="shrink-0 text-neutral-400" aria-hidden />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          collisionPadding={12}
          onOpenAutoFocus={(e) => {
            // Start on the current role rather than the first one.
            e.preventDefault();
            listRef.current?.querySelector<HTMLButtonElement>('button[aria-selected="true"]')?.focus();
          }}
          className="z-50 max-h-[min(70vh,560px)] w-[var(--radix-popover-trigger-width)] min-w-[280px] overflow-y-auto rounded-xl border border-line bg-white p-1.5 shadow-xl"
        >
          <div ref={listRef} role="listbox" aria-label="Role" onKeyDown={onListKey}>
            {STAFF_ROLE_KEYS.map((key) => {
              const role = STAFF_ROLES[key];
              const isLocked = locked(key);
              const selected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  aria-disabled={isLocked}
                  disabled={isLocked}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors enabled:hover:bg-neutral-50 focus-visible:bg-neutral-50 focus-visible:outline-none disabled:cursor-not-allowed"
                >
                  <IconTile icon={role.icon} muted={isLocked} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-sm font-medium ${isLocked ? 'text-neutral-400' : 'text-regantify-text'}`}>{role.name}</span>
                    <span className={`block text-xs ${isLocked ? 'text-neutral-400' : 'text-neutral-500'}`}>{role.description}</span>
                  </span>
                  {selected && <Check size={16} className="shrink-0 text-regantify-text" aria-hidden />}
                  {isLocked && <Lock size={14} className="shrink-0 text-neutral-400" aria-label={`Needs the ${TIER_PLAN[STAFF_ROLE_MIN_TIER[key]]} plan`} />}
                </button>
              );
            })}
          </div>
          {nextNames.length > 0 && (
            <Link
              to="/vendor/billing"
              className="mt-1.5 flex items-center gap-2 rounded-lg bg-brand-lime/60 px-3 py-2 text-sm font-medium text-brand transition-colors hover:bg-brand-lime"
            >
              <Sparkles size={15} aria-hidden />
              Upgrade to {TIER_PLAN[nextTier]} to give {listOf(nextNames)}
            </Link>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
