import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { contactMessagesApi } from '../../../lib/contactMessagesApi';
import { useCan } from '../../../lib/useStaffAccess';
import { idlePoll } from '../../../lib/idlePolling';

/**
 * Sub-tabs inside the Customers section: "Details" (summary cards +
 * order-status breakdown, see CustomerDetails.tsx), "Customers"
 * (the list, see Customers.tsx) and "Messages" (the Contact page inbox,
 * see Messages.tsx, with its unread count). Rendered on each page so
 * switching feels like one section, not unrelated routes.
 */
export function CustomerTabs() {
  const canMessages = useCan('customers.contact');
  const { data: unread = 0 } = useQuery({ queryKey: ['contact-messages-unread'], queryFn: contactMessagesApi.unread, enabled: canMessages, refetchInterval: idlePoll(60_000) });
  const tabClass = ({ isActive }: { isActive: boolean }) =>
    `flex h-7 items-center gap-1.5 rounded-md px-3 text-sm transition-colors ${
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
      {canMessages && (
        <NavLink to="/vendor/customers/messages" className={tabClass}>
          Messages
          {unread > 0 && <span className="rounded-full bg-emerald-600 px-1.5 text-[11px] font-semibold text-white">{unread}</span>}
        </NavLink>
      )}
    </div>
  );
}
