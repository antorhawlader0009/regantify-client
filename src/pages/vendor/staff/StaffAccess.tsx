import { Lock, UsersRound } from 'lucide-react';
import { STAFF_OWNER_ONLY } from '../../../lib/staffPermissions';

/**
 * How access works, in plain words, under the Staff list (rule-plan.md
 * Step 8): each person's role decides what they can open, and a few things
 * stay with the owner whatever the role (STAFF_OWNER_ONLY, enforced as
 * @OwnerOnly on the server).
 */
export function StaffAccessNote() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-line bg-white p-3">
        <p className="flex items-center gap-2 text-sm font-medium text-regantify-text">
          <UsersRound size={15} className="text-neutral-500" aria-hidden />
          Each person’s role decides what they can open
        </p>
        <p className="mt-1.5 text-sm text-neutral-600">
          Pick the role when you add someone, and change it from Edit any time. It applies the next time they click anything.
        </p>
      </div>
      <div className="rounded-lg border border-line bg-white p-3">
        <p className="text-sm font-medium text-regantify-text">Only you, the owner, can</p>
        <ul className="mt-1.5 space-y-1 text-sm text-neutral-600">
          {STAFF_OWNER_ONLY.map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Lock size={14} className="mt-0.5 shrink-0 text-neutral-500" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
