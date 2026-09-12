import { NavLink } from 'react-router-dom';

/**
 * Sub-tabs inside the Customers section: "Details" (summary cards +
 * order-status breakdown, see CustomerDetails.tsx) and "Customers"
 * (the existing list, see Customers.tsx). Rendered above both pages so
 * switching tabs feels like one section, not two unrelated routes.
 */
export function CustomerTabs() {
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 text-sm font-medium rounded-xl transition-colors ${
      isActive
        ? 'bg-regantify-black text-white'
        : 'text-regantify-text-muted hover:bg-regantify-content'
    }`;

  return (
    <div className="flex items-center gap-2 mb-6">
      <NavLink to="/vendor/customers/details" className={tabClass}>
        Details
      </NavLink>
      <NavLink to="/vendor/customers" end className={tabClass}>
        Customers
      </NavLink>
    </div>
  );
}
