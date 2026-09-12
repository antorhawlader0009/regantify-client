import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, Search, MessageSquare, Plus, Copy } from 'lucide-react';
import { incompleteOrdersApi, type IncompleteOrder } from '../../../lib/incompleteOrdersApi';
import { DropdownMenu, DropdownMenuItem, DropdownMenuSeparator } from '../../../components/ui/DropdownMenu';
import { toast } from '../../../lib/toast';
import { ChangeLabelModal } from './ChangeLabelModal';
import type { CreateOrderFromIncompleteState } from './AddOrder';
import { ViewProductOnStorefront } from '../../../components/product/ViewProductOnStorefront';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface NotesModalProps {
  order: IncompleteOrder | null;
  onOpenChange: (open: boolean) => void;
}

function NotesPanel({ order, onOpenChange }: NotesModalProps) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  const addNoteMutation = useMutation({
    mutationFn: (noteText: string) => incompleteOrdersApi.addNote(order!.id, noteText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomplete-orders'] });
      setText('');
    },
    onError: () => toast.error('Could not save the note. Please try again.'),
  });

  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4" onClick={() => onOpenChange(false)}>
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-black/5">
          <h2 className="text-base font-semibold text-regantify-text">Notes</h2>
          <p className="text-xs text-regantify-text-muted mt-0.5">{order.customerName || order.customerPhone || 'Unknown customer'}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {order.customerNote && (
            <div className="p-3 rounded-xl bg-regantify-content">
              <p className="text-xs font-medium text-regantify-text-muted mb-1">From customer at checkout</p>
              <p className="text-sm text-regantify-text whitespace-pre-wrap">{order.customerNote}</p>
            </div>
          )}
          {order.staffNotes.length === 0 && !order.customerNote ? (
            <p className="text-sm text-regantify-text-muted text-center py-6">No notes yet.</p>
          ) : (
            order.staffNotes.map((note) => (
              <div key={note.id} className="p-3 rounded-xl border border-black/5">
                <p className="text-sm text-regantify-text whitespace-pre-wrap">{note.text}</p>
                <p className="text-xs text-regantify-text-muted mt-1.5">{formatDateTime(note.createdAt)}</p>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-black/5 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && text.trim()) addNoteMutation.mutate(text.trim());
            }}
            placeholder="Add a note…"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
          />
          <button
            onClick={() => text.trim() && addNoteMutation.mutate(text.trim())}
            disabled={addNoteMutation.isPending || !text.trim()}
            className="px-4 py-2.5 rounded-xl bg-regantify-black text-white text-sm font-medium disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

interface RowProps {
  order: IncompleteOrder;
  selected: boolean;
  onToggleSelect: () => void;
  onChangeLabel: () => void;
  onOpenNotes: () => void;
}

function IncompleteOrderRow({ order, selected, onToggleSelect, onChangeLabel, onOpenNotes }: RowProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const removeMutation = useMutation({
    mutationFn: () => incompleteOrdersApi.remove(order.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomplete-orders'] });
      toast.success('Removed.');
    },
    onError: () => toast.error('Could not remove. Please try again.'),
  });

  const handleCreateOrder = () => {
    const itemsSummary = order.items.map((i) => `${i.quantity}x ${i.productName} (${i.productSku})`).join('\n');
    const state: CreateOrderFromIncompleteState = {
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      shippingAddress: order.shippingAddress,
      itemsSummary: itemsSummary || undefined,
    };
    navigate('/vendor/orders/add', { state });
  };

  const copyPhone = () => {
    if (!order.customerPhone) return;
    navigator.clipboard.writeText(order.customerPhone).then(() => toast.success('Phone number copied.'));
  };

  const firstItem = order.items[0];
  const extraCount = order.items.length - 1;

  return (
    <tr className="border-b border-black/5 align-top">
      <td className="p-4">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="mt-1" />
      </td>
      <td className="p-4 min-w-[110px]">
        <p className="text-xs text-regantify-text-muted">{formatDateTime(order.updatedAt)}</p>
        {order.label && (
          <span className="inline-flex items-center mt-1 text-[11px] font-medium text-regantify-cta bg-regantify-cta/10 px-2 py-0.5 rounded-full">
            {order.label}
          </span>
        )}
        {order.customerNote && (
          <p className="text-xs text-regantify-text-muted mt-1.5 line-clamp-2">
            <span className="font-medium">Customer: </span>
            {order.customerNote}
          </p>
        )}
        <button
          onClick={onOpenNotes}
          className="mt-1.5 flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-black/10 text-regantify-text-muted hover:bg-regantify-content"
        >
          <MessageSquare size={11} />
          See All
        </button>
        <button onClick={onOpenNotes} className="mt-1.5 flex items-center gap-1 text-xs text-regantify-cta hover:underline">
          <Plus size={11} />
          Note
        </button>
      </td>
      <td className="p-4 min-w-[140px]">
        <p className="text-sm text-regantify-text">{order.customerName || <span className="text-regantify-text-muted">—</span>}</p>
      </td>
      <td className="p-4 min-w-[150px]">
        {order.customerPhone ? (
          <span className="flex items-center gap-1.5 text-sm text-regantify-cta">
            {order.customerPhone}
            <button onClick={copyPhone} title="Copy phone number">
              <Copy size={12} className="text-regantify-text-muted hover:text-regantify-text" />
            </button>
          </span>
        ) : (
          <span className="text-sm text-regantify-text-muted">—</span>
        )}
      </td>
      <td className="p-4 min-w-[140px]">
        <p className="text-sm text-regantify-text">{order.customerEmail || <span className="text-regantify-text-muted">—</span>}</p>
      </td>
      <td className="p-4 min-w-[220px]">
        {firstItem ? (
          <>
            <div className="flex items-center gap-2.5">
              {firstItem.productImage ? (
                <img src={firstItem.productImage} alt="" className="w-10 h-10 rounded-lg object-cover bg-regantify-content" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-regantify-content" />
              )}
              <div>
                <p className="text-sm text-regantify-text leading-tight flex items-center gap-1.5">
                  {firstItem.productName}
                  {firstItem.product?.visibility === 'PUBLIC' && <ViewProductOnStorefront slug={firstItem.product.slug} />}
                </p>
                <p className="text-xs text-regantify-text-muted">
                  {firstItem.productSku} <span className="ml-1">x{firstItem.quantity}</span>
                </p>
              </div>
            </div>
            {extraCount > 0 && <p className="text-xs text-regantify-text-muted mt-1">+{extraCount} more item(s)</p>}
          </>
        ) : (
          <span className="text-sm text-regantify-text-muted">Empty cart</span>
        )}
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
          <DropdownMenuItem onSelect={handleCreateOrder}>Create Order</DropdownMenuItem>
          <DropdownMenuItem onSelect={onChangeLabel}>Change Label</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem danger onSelect={() => removeMutation.mutate()}>
            Delete
          </DropdownMenuItem>
        </DropdownMenu>
      </td>
    </tr>
  );
}

export default function IncompleteOrders() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [labelOrder, setLabelOrder] = useState<IncompleteOrder | null>(null);
  const [bulkLabelOpen, setBulkLabelOpen] = useState(false);
  const [notesOrder, setNotesOrder] = useState<IncompleteOrder | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['incomplete-orders', search, page, perPage],
    queryFn: () => incompleteOrdersApi.list({ search: search.trim() || undefined, page, perPage }),
  });

  // Clear any bulk-selected ids whenever the visible result set changes
  // (new search or page). Without this, selected ids from a previous
  // page/search stay in `selectedIds` with nothing on screen to show
  // for it — the header checkbox's checked state can end up wrong by
  // coincidence, and bulkRemoveMutation/bulkLabelMutation would act on
  // rows the vendor can no longer see and likely doesn't remember
  // selecting.
  useEffect(() => setSelectedIds([]), [search, page]);

  const incompleteOrders = data?.incompleteOrders ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const labelMutation = useMutation({
    mutationFn: ({ id, label }: { id: string; label: string | null }) => incompleteOrdersApi.updateLabel(id, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomplete-orders'] });
      toast.success('Label updated.');
      setLabelOrder(null);
    },
    onError: () => toast.error('Could not update the label. Please try again.'),
  });

  const bulkLabelMutation = useMutation({
    mutationFn: (label: string | null) => incompleteOrdersApi.bulkChangeLabel(selectedIds, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomplete-orders'] });
      toast.success('Labels updated.');
      setBulkLabelOpen(false);
      setSelectedIds([]);
    },
    onError: () => toast.error('Could not update labels. Please try again.'),
  });

  const bulkRemoveMutation = useMutation({
    mutationFn: () => incompleteOrdersApi.bulkRemove(selectedIds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['incomplete-orders'] });
      toast.success(`Removed ${result.removed} item(s).`);
      setSelectedIds([]);
    },
    onError: () => toast.error('Could not remove selected items. Please try again.'),
  });

  const allSelected = incompleteOrders.length > 0 && selectedIds.length === incompleteOrders.length;
  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : incompleteOrders.map((o) => o.id));
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const liveNotesOrder = notesOrder ? incompleteOrders.find((o) => o.id === notesOrder.id) ?? notesOrder : null;

  return (
    <div className="max-w-7xl">
      <h1 className="text-2xl font-semibold text-regantify-text mb-6">Incomplete Orders</h1>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative w-64">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by title"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm
              text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
          />
        </div>

        <DropdownMenu
          align="start"
          trigger={
            <button
              disabled={selectedIds.length === 0}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-regantify-cta text-regantify-cta text-sm font-medium
                hover:bg-regantify-cta/5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Bulk Actions
              <ChevronDown size={14} />
            </button>
          }
        >
          <DropdownMenuItem danger onSelect={() => bulkRemoveMutation.mutate()}>
            Bulk remove
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setBulkLabelOpen(true)}>Bulk Change Label</DropdownMenuItem>
        </DropdownMenu>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide border-b border-black/5">
                <th className="p-4">
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
                <th className="p-4">Date</th>
                <th className="p-4">Name</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Email</th>
                <th className="p-4">Cart</th>
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
              ) : incompleteOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-regantify-text-muted">
                    No incomplete orders found.
                  </td>
                </tr>
              ) : (
                incompleteOrders.map((order) => (
                  <IncompleteOrderRow
                    key={order.id}
                    order={order}
                    selected={selectedIds.includes(order.id)}
                    onToggleSelect={() => toggleSelect(order.id)}
                    onChangeLabel={() => setLabelOrder(order)}
                    onOpenNotes={() => setNotesOrder(order)}
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
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                ‹
              </button>
              <span className="px-3 py-1 text-sm text-regantify-text">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2.5 py-1 rounded-lg text-sm text-regantify-text-muted hover:bg-regantify-content disabled:opacity-40"
              >
                ›
              </button>
            </div>
          )}
        </div>
      </div>

      <ChangeLabelModal
        open={Boolean(labelOrder)}
        onOpenChange={(open) => !open && setLabelOrder(null)}
        currentLabel={labelOrder?.label}
        onSave={(label) => labelOrder && labelMutation.mutate({ id: labelOrder.id, label })}
        saving={labelMutation.isPending}
      />
      <ChangeLabelModal
        open={bulkLabelOpen}
        onOpenChange={setBulkLabelOpen}
        currentLabel={null}
        onSave={(label) => bulkLabelMutation.mutate(label)}
        saving={bulkLabelMutation.isPending}
      />
      <NotesPanel order={liveNotesOrder} onOpenChange={(open) => !open && setNotesOrder(null)} />
    </div>
  );
}
