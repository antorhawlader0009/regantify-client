import { useState, type ReactNode } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, MessageCircle, Pencil, Phone, Plus, ShoppingBag, Trash2, UserX } from 'lucide-react';
import { customersApi, type VendorCustomerDetail } from '../../../lib/customersApi';
import { ordersApi, type OrderStatus } from '../../../lib/ordersApi';
import { normalizeBdPhone, whatsappNumber } from '../../../lib/bdPhone';
import { formatDhakaDate, formatDhakaDateTime } from '../../../lib/dhakaDate';
import { toast } from '../../../lib/toast';
import { OrderStatusBadge } from '../order/orderStatus';
import { CustomerDeliveryStats } from '../../../components/courier/CustomerDeliveryStats';
import { ToggleRow } from '../../../components/product/ProductFormKit';
import { productInputClass } from '../../../components/product/ProductFormPieces';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import {
  EmptyState,
  StackedList,
  TableFrame,
  outlineBtn,
  primaryBtn,
  td,
  th,
  theadRow,
  trClass,
} from '../../../components/ui/PageKit';

const formatMoney = (n: number) => `৳${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** A white side card with a 15px title. */
function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-regantify-text">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 px-3 py-3 first:pl-0 sm:px-5">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-regantify-text sm:text-lg">{value}</p>
      {sub && <p className="truncate text-xs text-neutral-500">{sub}</p>}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy>
      <div className="h-36 animate-pulse rounded-xl bg-neutral-100" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="h-64 animate-pulse rounded-xl bg-neutral-100" />
        <div className="h-64 animate-pulse rounded-xl bg-neutral-100" />
      </div>
    </div>
  );
}

/** Blacklist switch + the reason, with a dialog that asks for the reason before blacklisting. */
function BlacklistCard({ customer }: { customer: VendorCustomerDetail }) {
  const queryClient = useQueryClient();
  const [asking, setAsking] = useState(false);
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: (v: { blacklisted: boolean; reason?: string }) => customersApi.setBlacklisted(customer.phone, v.blacklisted, v.reason),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setAsking(false);
      toast.success(!v.blacklisted ? 'Removed from blacklist' : customer.blacklisted ? 'Reason saved' : 'Customer blacklisted');
    },
    onError: () => toast.error('Couldn’t update the blacklist. Check your connection and try again.'),
  });

  const ask = () => {
    setReason(customer.blacklistReason ?? '');
    setAsking(true);
  };

  return (
    <Card title="Blacklist">
      <ToggleRow
        checked={customer.blacklisted}
        onChange={(on) => (on ? ask() : mutation.mutate({ blacklisted: false }))}
        label={customer.blacklisted ? 'Blacklisted' : 'Not blacklisted'}
        hint="Blacklisted numbers can’t check out with cash on delivery while COD Guard’s auto-block is on."
      />
      {customer.blacklisted && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm">
          <p className="text-xs font-medium text-red-700">Reason</p>
          <p className="mt-0.5 whitespace-pre-line text-regantify-text">{customer.blacklistReason || 'No reason written.'}</p>
          <button type="button" onClick={ask} className="mt-1.5 text-xs font-medium text-red-700 underline-offset-2 hover:underline">
            {customer.blacklistReason ? 'Change reason' : 'Add a reason'}
          </button>
        </div>
      )}
      <Link to="/vendor/store/cod-guard" className="mt-3 inline-block text-xs text-neutral-500 underline-offset-2 hover:text-regantify-text hover:underline">
        COD Guard settings
      </Link>

      <ConfirmDialog
        open={asking}
        onOpenChange={setAsking}
        title={customer.blacklisted ? 'Blacklist reason' : `Blacklist ${customer.name}?`}
        message={
          <>
            {!customer.blacklisted && <p className="mb-3">With COD Guard’s auto-block on, this number can’t place cash-on-delivery orders in your store.</p>}
            <label className="mb-1.5 block text-sm font-medium text-regantify-text" htmlFor="blacklist-reason">
              Reason <span className="font-normal text-neutral-500">(optional, only your team sees it)</span>
            </label>
            <textarea
              id="blacklist-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              rows={3}
              placeholder="e.g. Refused 3 parcels"
              className={`${productInputClass} resize-y`}
            />
          </>
        }
        confirmLabel={customer.blacklisted ? 'Save reason' : 'Blacklist customer'}
        onConfirm={() => mutation.mutate({ blacklisted: true, reason })}
        busy={mutation.isPending}
        danger={!customer.blacklisted}
      />
    </Card>
  );
}

/**
 * Customers > click a name — who they are, how they buy, and what to
 * do next: Call / WhatsApp / New order up top, three numbers (orders,
 * total spent, last order), this store's order history, their address,
 * their courier delivery record, and the blacklist switch with a reason
 * (see CustomersService.findOne / setBlacklisted).
 */
export default function CustomerDetail() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customers', phone],
    queryFn: () => customersApi.findOne(phone!),
    enabled: Boolean(phone),
    retry: false,
  });

  // The courier delivery record (same lookup as the Orders list), only for a full BD number.
  const statsPhone = customer && normalizeBdPhone(customer.phone) ? customer.phone : null;
  const { data: deliveryStats } = useQuery({
    queryKey: ['customer-courier-stats', statsPhone ? [statsPhone] : []],
    queryFn: () => ordersApi.getCustomerCourierStats([statsPhone!]),
    enabled: Boolean(statsPhone),
    staleTime: 60_000,
    refetchInterval: (query) =>
      query.state.dataUpdateCount < 3 && Object.values(query.state.data?.byPhone ?? {}).some((s) => s.pathao?.pending || s.steadfast?.pending) ? 4000 : false,
  });

  const deleteMutation = useMutation({
    mutationFn: () => customersApi.remove(customer!.phone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted');
      navigate('/vendor/customers');
    },
    onError: () => toast.error('Couldn’t delete this customer. Check your connection and try again.'),
  });

  const back = (
    <Link to="/vendor/customers" className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-regantify-text">
      <ChevronLeft size={16} aria-hidden />
      Customers
    </Link>
  );

  if (isLoading) {
    return (
      <div>
        {back}
        <DetailSkeleton />
      </div>
    );
  }

  if (!customer) {
    return (
      <div>
        {back}
        <section className="rounded-xl border border-line bg-white">
          <EmptyState
            icon={UserX}
            title="This customer isn’t in your store"
            hint="They may have been deleted, or the link has a typo."
            action={
              <Link to="/vendor/customers" className={outlineBtn}>
                Back to customers
              </Link>
            }
          />
        </section>
      </div>
    );
  }

  const newOrder = () =>
    navigate('/vendor/orders/add', {
      state: {
        customerName: customer.name,
        customerPhone: customer.phone,
        customerEmail: customer.email ?? undefined,
        shippingAddress: customer.address || undefined,
      },
    });
  const newOrderButton = (
    <button type="button" onClick={newOrder} className={primaryBtn}>
      <Plus size={15} aria-hidden />
      New order
    </button>
  );
  const editPath = `/vendor/customers/${encodeURIComponent(customer.phone)}/edit`;
  const addressLine = [customer.city, customer.district, customer.zip].filter(Boolean).join(', ');
  const hasOrders = customer.orders.length > 0;

  return (
    <div>
      {back}

      {/* Who + what to do next */}
      <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-lime/60 text-base font-semibold uppercase text-brand">
            {customer.name.trim().charAt(0) || '?'}
          </span>
          <div className="mr-auto min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-[15px] font-semibold text-regantify-text">{customer.name}</h1>
              {customer.blacklisted && (
                <span className="rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">Blacklisted</span>
              )}
            </div>
            <p className="mt-0.5 text-sm tabular-nums text-neutral-600">{customer.phone}</p>
            {customer.email && <p className="truncate text-sm text-neutral-500">{customer.email}</p>}
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <a href={`tel:${customer.phone}`} className={`${outlineBtn} h-10 flex-1 sm:h-9 sm:flex-none`}>
              <Phone size={14} aria-hidden />
              Call
            </a>
            <a
              href={`https://wa.me/${whatsappNumber(customer.phone)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`${outlineBtn} h-10 flex-1 sm:h-9 sm:flex-none`}
            >
              <MessageCircle size={14} aria-hidden />
              WhatsApp
            </a>
            <Link to={editPath} className={`${outlineBtn} h-10 flex-1 sm:h-9 sm:flex-none`}>
              <Pencil size={14} aria-hidden />
              Edit
            </Link>
            <button type="button" onClick={newOrder} className={`${primaryBtn} h-10 w-full sm:h-9 sm:w-auto`}>
              <Plus size={15} aria-hidden />
              New order
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x divide-line border-t border-line pt-1">
          <Stat label="Orders" value={customer.orderCount.toLocaleString()} />
          <Stat label="Total spent" value={formatMoney(customer.totalSpent)} />
          <Stat
            label="Last order"
            value={hasOrders ? formatDhakaDate(customer.orders[0].createdAt) : 'None yet'}
            sub={hasOrders ? `ORDER-${customer.orders[0].invoiceNumber}` : undefined}
          />
        </div>
      </section>

      <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Order history */}
        <section className="min-w-0 rounded-xl border border-line bg-white p-3.5">
          <div className="mb-3 flex items-center justify-between gap-2 px-0.5">
            <h2 className="text-[15px] font-semibold text-regantify-text">Order history</h2>
            {hasOrders && <span className="text-xs text-neutral-500">Newest first</span>}
          </div>

          {!hasOrders ? (
            <div className="rounded-lg border border-line">
              <EmptyState
                icon={ShoppingBag}
                title="No orders yet"
                hint="Orders this customer places in your store show up here."
                action={newOrderButton}
              />
            </div>
          ) : (
            <>
              <div className="hidden md:block">
                <TableFrame minWidth="min-w-[560px]">
                  <thead>
                    <tr className={theadRow}>
                      <th className={th}>Order</th>
                      <th className={th}>Date</th>
                      <th className={th}>Status</th>
                      <th className={`${th} text-right`}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.orders.map((order) => (
                      <tr key={order.id} className={trClass()}>
                        <td className={td}>
                          <Link to={`/vendor/orders/${order.id}`} className="font-medium text-brand hover:underline">
                            ORDER-{order.invoiceNumber}
                          </Link>
                        </td>
                        <td className={`${td} whitespace-nowrap text-neutral-600`}>{formatDhakaDateTime(order.createdAt)}</td>
                        <td className={td}>
                          <OrderStatusBadge status={order.status as OrderStatus} />
                        </td>
                        <td className={`${td} whitespace-nowrap text-right font-medium tabular-nums`}>{formatMoney(order.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </TableFrame>
              </div>

              <StackedList className="md:hidden">
                {customer.orders.map((order) => (
                  <li key={order.id}>
                    <Link to={`/vendor/orders/${order.id}`} className="flex min-h-14 items-center gap-3 px-3 py-3 active:bg-neutral-50">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-brand">ORDER-{order.invoiceNumber}</span>
                          <OrderStatusBadge status={order.status as OrderStatus} />
                        </div>
                        <p className="mt-0.5 text-xs text-neutral-500">
                          {formatDhakaDateTime(order.createdAt)} · <span className="tabular-nums">{formatMoney(order.total)}</span>
                        </p>
                      </div>
                      <ChevronRight size={16} className="shrink-0 text-neutral-400" aria-hidden />
                    </Link>
                  </li>
                ))}
              </StackedList>
            </>
          )}
        </section>

        {/* Side column */}
        <div className="min-w-0 space-y-4">
          <Card
            title="Delivery address"
            action={
              <Link to={editPath} className="text-xs text-neutral-500 underline-offset-2 hover:text-regantify-text hover:underline">
                Change
              </Link>
            }
          >
            {customer.address || addressLine ? (
              <>
                {customer.address && <p className="text-sm text-regantify-text">{customer.address}</p>}
                {addressLine && <p className="mt-1 text-xs text-neutral-500">{addressLine}</p>}
              </>
            ) : (
              <p className="text-sm text-neutral-500">No address saved yet.</p>
            )}
          </Card>

          {statsPhone && (
            <Card title="Delivery record">
              <p className="text-xs text-neutral-500">How their parcels went with couriers, in your store and others.</p>
              <CustomerDeliveryStats stats={deliveryStats?.byPhone[statsPhone]} />
            </Card>
          )}

          <BlacklistCard customer={customer} />

          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 size={14} aria-hidden />
            Delete customer
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${customer.name}?`}
        message="This sends all of their orders to Trash. You can restore the orders from Trash later."
        confirmLabel="Delete customer"
        onConfirm={() => deleteMutation.mutate()}
        busy={deleteMutation.isPending}
        danger
      />
    </div>
  );
}
