import { Check, Lock } from 'lucide-react';

/**
 * What a staff member can and can't do, in plain words. The role
 * ("Admin", "Shop Manager", "Customer Support") is only a label today:
 * every staff member gets the owner's access on every vendor route,
 * except the owner-only ones (StaffController.requireOwner and
 * VendorController's store settings). Keep this list in step with those
 * checks; don't describe per-role limits the server doesn't enforce.
 */
export function StaffAccessNote() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-line bg-white p-3">
        <p className="text-sm font-medium text-regantify-text">Every staff member can</p>
        <ul className="mt-1.5 space-y-1 text-sm text-neutral-600">
          {[
            'Take and manage orders, customers and products',
            'Run coupons, discounts and campaigns',
            'Send parcels with your couriers',
            'See finance and ask for withdrawals',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Check size={15} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-line bg-white p-3">
        <p className="text-sm font-medium text-regantify-text">Only you, the owner, can</p>
        <ul className="mt-1.5 space-y-1 text-sm text-neutral-600">
          {[
            'Add or remove staff',
            'Change the store’s look: theme, branding, footer, banner',
            'Change delivery charges, COD Guard, stock and GDPR settings',
            'Change the domain, tracking pixels and custom code',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Lock size={14} className="mt-0.5 shrink-0 text-neutral-500" aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-neutral-500 sm:col-span-2">
        The role you pick is a name for your team, like a job title. It doesn’t limit what the person can open yet. To let someone sign in
        only from your shop’s internet connection, set an allowed IP address for them.
      </p>
    </div>
  );
}
