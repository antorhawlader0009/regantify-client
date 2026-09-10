import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ChevronDown, Settings2, Tag } from 'lucide-react';
import { ordersApi, type Order, type OrderStatus, type CourierProvider } from '../../../lib/ordersApi';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../../../components/ui/DropdownMenu';
import { toast } from '../../../lib/toast';
import { ALL_ORDER_STATUSES, DEFAULT_TABS, OrderStatusBadge, orderStatusLabel } from './orderStatus';
import { CustomizeTabsModal } from './CustomizeTabsModal';
import { CheckHistoryModal } from './CheckHistoryModal';
import { ChangeLabelModal } from './ChangeLabelModal';
import { InvoiceModal } from './InvoiceModal';
import { DateRangeFilter } from './DateRangeFilter';
import { ViewProductOnStorefront } from '../../../components/product/ViewProductOnStorefront';

function formatPrice(value: string) {
  return `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const COURIER_LABELS: Record<CourierProvider, string> = {
  NONE: 'None',
  PATHAO: 'Pathao Courier',
  STEADFAST: 'SteadFast Courier',
};

interface OrderRowProps {
  order: Order;
  trashView: boolean;
  onCheckHistory: (phone: string) => void;
  onChangeLabel: (order: Order) => void;
  onShowInvoice: (order: Order) => void;
}

function OrderRow({ order, trashView, onCheckHistory, onChangeLabel, onShowInvoice }: OrderRowProps) {
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: OrderStatus) => ordersApi.updateStatus(order.id, status),
    onSuccess: () => {
      invalidate();
      toast.success('Order status updated.');
    },
    onError: () => toast.error('Could not update the order status. Please try again.'),
  });

  const courierMutation = useMutation({
    mutationFn: (courierProvider: CourierProvider) => ordersApi.updateCourier(order.id, courierProvider),
    onSuccess: (_, courierProvider) => {
      invalidate();
      toast.success(
        courierProvider === 'NONE' ? 'Courier assignment cleared.' : `Marked as sent to ${COURIER_LABELS[courierProvider]}.`,
      );
    },
    onError: () => toast.error('Could not update the courier. Please try again.'),
  });

  const trashMutation = useMutation({
    mutationFn: () => (trashView ? ordersApi.restore(order.id) : ordersApi.trash(order.id)),
    onSuccess: () => {
      invalidate();
      toast.success(trashView ? 'Order restored.' : 'Order sent to trash.');
    },
    onError: () => toast.error('Could not update the order. Please try again.'),
  });

  const firstItem = order.items[0];
  const extraCount = order.items.length - 1;

  return (
    <tr className="border-b border-black/5 align-top">
      <td className="p-4">
        <Link to={`/vendor/orders/${order.id}`} className="text-sm font-semibold text-regantify-cta hover:underline">
          ORDER-{order.invoiceNumber}
        </Link>
        <p className="text-xs text-regantify-text-muted mt-0.5">{formatDateTime(order.createdAt)}</p>
        {order.label && (
          <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-medium text-regantify-cta bg-regantify-cta/10 px-2 py-0.5 rounded-full">
            <Tag size={10} />
            {order.label}
          </span>
        )}
      </td>
      <td className="p-4">
        <OrderStatusBadge status={order.status} />
        {order.courierProvider !== 'NONE' && (
          <p className="text-[11px] text-regantify-text-muted mt-1">{COURIER_LABELS[order.courierProvider]}</p>
        )}
      </td>
      <td className="p-4 min-w-[180px]">
        <p className="text-sm text-regantify-text">{order.customerName}</p>
        <p className="text-xs text-regantify-text-muted mt-0.5">{order.customerPhone}</p>
        <button
          onClick={() => onCheckHistory(order.customerPhone)}
          className="mt-1.5 text-xs px-2.5 py-1 rounded-lg border border-black/10 text-regantify-text-muted hover:bg-regantify-content"
        >
          Check History
        </button>
      </td>
      <td className="p-4 min-w-[200px]">
        <p className="text-sm text-regantify-text">{order.shippingAddress}</p>
        {order.shippingCity && (
          <p className="text-xs text-regantify-text-muted mt-0.5">City: {order.shippingCity}</p>
        )}
        {order.shippingDistrict && (
          <p className="text-xs text-regantify-text-muted">District: {order.shippingDistrict}</p>
        )}
      </td>
      <td className="p-4 min-w-[180px]">
        <div className="flex items-center gap-2.5">
          {firstItem?.productImage ? (
            <img src={firstItem.productImage} alt="" className="w-10 h-10 rounded-lg object-cover bg-regantify-content" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-regantify-content" />
          )}
          <div>
            <p className="text-sm text-regantify-text leading-tight flex items-center gap-1.5">
              {firstItem?.productName}
              {firstItem?.product?.visibility === 'PUBLIC' && <ViewProductOnStorefront slug={firstItem.product.slug} />}
            </p>
            <p className="text-xs text-regantify-text-muted">{firstItem?.productSku}</p>
            <p className="text-xs text-regantify-text-muted">x{firstItem?.quantity}</p>
          </div>
        </div>
        {extraCount > 0 && <p className="text-xs text-regantify-text-muted mt-1">+{extraCount} more item(s)</p>}
      </td>
      <td className="p-4">
        <p className="text-sm font-semibold text-regantify-text">{formatPrice(order.total)}</p>
        <p className="text-xs text-regantify-text-muted mt-0.5">{order.paymentMethod}</p>
      </td>
      <td className="p-4">
        <DropdownMenu
          trigger={
            <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content">
              Actions
              <ChevronDown size={14} />
            </button>
          }
        >
          {trashView ? (
            <DropdownMenuItem onSelect={() => trashMutation.mutate()}>Restore</DropdownMenuItem>
          ) : (
            <>
              <DropdownMenuItem onSelect={() => onShowInvoice(order)}>Download Invoice</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onShowInvoice(order)}>Print Invoice</DropdownMenuItem>
              <DropdownMenuSeparator />
              {ALL_ORDER_STATUSES.filter((s) => s !== order.status).map((status) => (
                <DropdownMenuItem key={status} onSelect={() => statusMutation.mutate(status)}>
                  Mark as {orderStatusLabel(status)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onChangeLabel(order)}>Change Label</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => courierMutation.mutate('PATHAO')}>Pathao Courier</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => courierMutation.mutate('STEADFAST')}>SteadFast Courier</DropdownMenuItem>
              {order.courierProvider !== 'NONE' && (
                <DropdownMenuItem onSelect={() => courierMutation.mutate('NONE')}>Clear Courier</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem danger onSelect={() => trashMutation.mutate()}>
                Send to Trash
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenu>
      </td>
    </tr>
  );
}

export default function Orders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<OrderStatus | 'ALL'>('ALL');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [trashView, setTrashView] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [historyPhone, setHistoryPhone] = useState<string | null>(null);
  const [labelOrder, setLabelOrder] = useState<Order | null>(null);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);

  useEffect(() => setPage(1), [search, activeTab, perPage, dateFrom, dateTo, trashView]);

  const { data: tabs = DEFAULT_TABS } = useQuery({
    queryKey: ['order-status-tabs'],
    queryFn: () => ordersApi.getStatusTabs(),
  });

  const tabsMutation = useMutation({
    mutationFn: (statuses: OrderStatus[]) => ordersApi.updateStatusTabs(statuses),
    onSuccess: (statuses) => {
      queryClient.setQueryData(['order-status-tabs'], statuses);
      setCustomizeOpen(false);
      toast.success('Tabs updated.');
      // If the currently-active tab was just removed, fall back to All
      // rather than silently showing a filter that's no longer visible.
      if (activeTab !== 'ALL' && !statuses.includes(activeTab)) setActiveTab('ALL');
    },
    onError: () => toast.error('Could not save tabs. Please try again.'),
  });

  const labelMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string | null }) => ordersApi.updateLabel(id, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setLabelOrder(null);
      toast.success('Label updated.');
    },
    onError: () => toast.error('Could not save the label. Please try again.'),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['orders', { search, activeTab, page, perPage, dateFrom, dateTo, trashView }],
    queryFn: () =>
      ordersApi.list({
        search: search.trim() || undefined,
        status: activeTab === 'ALL' ? undefined : activeTab,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        trashOnly: trashView,
        page,
        perPage,
      }),
  });

  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5,
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Orders</h1>
        <button
          onClick={() => navigate('/vendor/orders/add')}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark
            text-white text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add New
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        {!trashView && (
          <div className="flex items-center gap-1 px-2 pt-2 border-b border-black/5 overflow-x-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${
                activeTab === 'ALL'
                  ? 'border-regantify-cta text-regantify-text'
                  : 'border-transparent text-regantify-text-muted hover:text-regantify-text'
              }`}
            >
              All
            </button>
            {tabs.map((status) => (
              <button
                key={status}
                onClick={() => setActiveTab(status)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === status
                    ? 'border-regantify-cta text-regantify-text'
                    : 'border-transparent text-regantify-text-muted hover:text-regantify-text'
                }`}
              >
                {orderStatusLabel(status)}
              </button>
            ))}
            <button
              onClick={() => setCustomizeOpen(true)}
              title="Customize tabs"
              className="px-3 py-2.5 text-regantify-text-muted hover:text-regantify-text"
            >
              <Settings2 size={16} />
            </button>
          </div>
        )}

        <div className="p-4 border-b border-black/5 flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order, customer"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm
                text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
          </div>
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="px-3 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text focus:outline-none"
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <DateRangeFilter
            dateFrom={dateFrom}
            dateTo={dateTo}
            onChange={(from, to) => {
              setDateFrom(from);
              setDateTo(to);
            }}
          />
          <button
            onClick={() => setTrashView((v) => !v)}
            className={`ml-auto text-xs font-medium ${
              trashView ? 'text-regantify-cta' : 'text-regantify-text-muted hover:text-regantify-text'
            }`}
          >
            {trashView ? '← Back to Orders' : 'Show Trash'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide border-b border-black/5">
                <th className="p-4">Invoice</th>
                <th className="p-4">Status</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Address</th>
                <th className="p-4">Items</th>
                <th className="p-4">Total</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-regantify-text-muted">
                    Loading…
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-regantify-text-muted">
                    {trashView ? 'Trash is empty.' : 'No orders found.'}
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <OrderRow
                    key={order.id}
                    order={order}
                    trashView={trashView}
                    onCheckHistory={setHistoryPhone}
                    onChangeLabel={setLabelOrder}
                    onShowInvoice={setInvoiceOrder}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-black/5">
          <span className="text-xs text-regantify-text-muted">Total: {total}</span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                ‹
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`px-3 py-1 rounded-lg text-sm ${
                    n === page ? 'bg-regantify-black text-white' : 'text-regantify-text hover:bg-regantify-content'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                ›
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                »
              </button>
            </div>
          )}
        </div>
      </div>

      <CustomizeTabsModal
        open={customizeOpen}
        onOpenChange={setCustomizeOpen}
        currentTabs={tabs}
        onSave={(statuses) => tabsMutation.mutate(statuses)}
        saving={tabsMutation.isPending}
      />
      <CheckHistoryModal phone={historyPhone} onOpenChange={(open) => !open && setHistoryPhone(null)} />
      <ChangeLabelModal
        open={Boolean(labelOrder)}
        onOpenChange={(open) => !open && setLabelOrder(null)}
        currentLabel={labelOrder?.label}
        onSave={(label) => labelOrder && labelMutation.mutate({ id: labelOrder.id, label })}
        saving={labelMutation.isPending}
      />
      <InvoiceModal order={invoiceOrder} onOpenChange={(open) => !open && setInvoiceOrder(null)} />
    </div>
  );
}
