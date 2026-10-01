import { NavLink } from 'react-router-dom';

/**
 * Sub-tabs inside the Customers section: "Details" (summary cards +
 * order-status breakdown, see CustomerDetails.tsx) and "Customers"
 * (the list, see Customers.tsx). Rendered on both pages so switching
 * feels like one section, not two unrelated routes.
 */
export function CustomerTabs() {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex h-7 items-center rounded-md px-3 text-sm transition-colors ${
      isActive ? 'bg-brand-lime font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-100'
    }`;

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-line bg-white p-1">
      <NavLink to="/vendor/customers" end className={tabClass}>
        Customers
      </NavLink>
      <NavLink to="/vendor/customers/details" className={tabClass}>
        Details
      </NavLink>
    </div>
  );
}
