import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { customersApi } from '../../../lib/customersApi';
import { toast } from '../../../lib/toast';
import { OrderStatusBadge } from '../order/orderStatus';
import type { OrderStatus } from '../../../lib/ordersApi';

function formatPrice(value: number) {
  return `৳${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Customers > click a name — read-only profile details plus this
 * vendor's order history for that phone (see CustomersService.findOne).
 * "Blacklist Customer" toggles instantly from here (no confirmation,
 * same as the Actions menu on the list); "Edit Customer" goes to the
 * full edit form (see EditCustomer.tsx).
 */
export default function CustomerDetail() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customers', phone],
    queryFn: () => customersApi.findOne(phone!),
    enabled: Boolean(phone),
  });

  const blacklistMutation = useMutation({
    mutationFn: (blacklisted: boolean) => customersApi.setBlacklisted(phone!, blacklisted),
    onSuccess: (_, blacklisted) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success(blacklisted ? 'Customer blacklisted.' : 'Customer removed from blacklist.');
    },
    onError: () => toast.error('Could not update this customer. Please try again.'),
  });

  if (isLoading) {
    return <div className="text-sm text-regantify-text-muted">Loading…</div>;
  }

  if (!customer) {
    return <div className="text-sm text-regantify-text-muted">Customer not found.</div>;
  }

  return (
    <div>
      <button
        onClick={() => navigate('/vendor/customers')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Customers
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">{customer.name}</h1>
        <button
          onClick={() => blacklistMutation.mutate(!customer.blacklisted)}
          disabled={blacklistMutation.isPending}
          className="px-4 py-2 rounded-xl border border-red-300 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {customer.blacklisted ? 'Remove from Blacklist' : 'Blacklist Customer'}
        </button>
        <Link
          to={`/vendor/customers/${encodeURIComponent(customer.phone)}/edit`}
          className="px-4 py-2 text-sm text-regantify-cta hover:underline"
        >
          Edit Customer
        </Link>
      </div>

      <h2 className="text-base font-semibold text-regantify-text mb-3">Personal Details</h2>
      <div className="bg-white rounded-2xl border border-black/5 p-6 mb-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-sm font-semibold text-regantify-text mb-1">Phone:</p>
            <p className="text-sm text-regantify-text-muted mb-4">{customer.phone}</p>
            <p className="text-sm font-semibold text-regantify-text mb-1">Email:</p>
            <p className="text-sm text-regantify-text-muted">{customer.email || '—'}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-regantify-text mb-1">Shipping Address:</p>
            <p className="text-sm text-regantify-cta">{customer.address || '—'}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-regantify-text mb-1">City/Thana:</p>
            <p className="text-sm text-regantify-text-muted mb-4">{customer.city || '—'}</p>
            <p className="text-sm font-semibold text-regantify-text mb-1">District:</p>
            <p className="text-sm text-regantify-text-muted mb-4">{customer.district || '—'}</p>
            <p className="text-sm font-semibold text-regantify-text mb-1">Zip Code:</p>
            <p className="text-sm text-regantify-text-muted">{customer.zip || '—'}</p>
          </div>
        </div>
      </div>

      <h2 className="text-base font-semibold text-regantify-text mb-3">Order History</h2>
      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide border-b border-black/5">
                <th className="p-4">#</th>
                <th className="p-4">Invoice ID</th>
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
                <th className="p-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {customer.orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-regantify-text-muted">
                    No orders yet.
                  </td>
                </tr>
              ) : (
                customer.orders.map((order, i) => (
                  <tr key={order.id} className="border-b border-black/5 last:border-b-0">
                    <td className="p-4 text-regantify-text-muted">{i + 1}</td>
                    <td className="p-4">
                      <Link to={`/vendor/orders/${order.id}`} className="font-medium text-regantify-cta hover:underline">
                        ORDER-{order.invoiceNumber}
                      </Link>
                    </td>
                    <td className="p-4 text-regantify-text-muted">{formatDateTime(order.createdAt)}</td>
                    <td className="p-4">
                      <OrderStatusBadge status={order.status as OrderStatus} />
                    </td>
                    <td className="p-4 font-medium text-regantify-text">{formatPrice(order.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
