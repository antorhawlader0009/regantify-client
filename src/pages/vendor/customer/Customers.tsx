import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, Download, MoreVertical, Plus, Send, Settings2, Upload, Users, X } from 'lucide-react';
import { CUSTOMER_GROUP_LABELS, customersApi, type CustomerGroup, type VendorCustomer } from '../../../lib/customersApi';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import {
  EmptyState,
  PageHeader,
  PageSection,
  SearchBox,
  SelectBox,
  StackedList,
  TableFooter,
  TableFrame,
  TableSkeleton,
  iconBtn,
  outlineBtn,
  primaryBtn,
  secondaryBtn,
  tableCheckbox,
  td,
  th,
  theadRow,
  trClass,
} from '../../../components/ui/PageKit';
import { toast } from '../../../lib/toast';
import { apiErrorMessage } from '../../../lib/api';
import { toCsv, downloadCsv } from '../../../lib/csv';
import { CustomerTabs } from './CustomerTabs';
import { CustomerGroupChip, CustomerTagChips } from './CustomerNoteCard';
import { CustomerGroupSettingsDialog } from './CustomerGroupSettingsDialog';
import { useCan } from '../../../lib/useStaffAccess';

const formatMoney = (n: number) => `৳${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function Initial({ name }: { name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-lime/60 text-xs font-semibold uppercase text-brand">
      {name.trim().charAt(0) || '?'}
    </span>
  );
}

function BlacklistedBadge() {
  return (
    <span className="inline-block rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">Blacklisted</span>
  );
}

/** Blacklist / delete for one customer, with a real confirm step for delete. */
function useCustomerActions(customer: VendorCustomer) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customers'] });

  const blacklistMutation = useMutation({
    mutationFn: (blacklisted: boolean) => customersApi.setBlacklisted(customer.phone, blacklisted),
    onSuccess: (_, blacklisted) => {
      invalidate();
      toast.success(blacklisted ? 'Customer blacklisted.' : 'Customer removed from blacklist.');
    },
    onError: () => toast.error('Could not update this customer. Please try again.'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => customersApi.remove(customer.phone),
    onSuccess: () => {
      invalidate();
      setConfirmDelete(false);
      toast.success('Customer deleted.');
    },
    // Refused while they owe money (POS due); the server's message says so.
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete this customer. Please try again.')),
  });

  // Only what this person's role can do (rule-plan.md Step 10); no menu at all for a read-only role.
  const canEdit = useCan('customers.edit');
  const canDelete = useCan('customers.delete');
  const menu = (canEdit || canDelete) && (
    <DropdownMenu
      trigger={
        <button aria-label="Actions" title="Actions" className={iconBtn}>
          <MoreVertical size={14} />
        </button>
      }
    >
      {canEdit && (
        <DropdownMenuItem onSelect={() => blacklistMutation.mutate(!customer.blacklisted)}>
          {customer.blacklisted ? 'Remove from blacklist' : 'Blacklist customer'}
        </DropdownMenuItem>
      )}
      {canDelete && (
        <DropdownMenuItem onSelect={() => setConfirmDelete(true)} danger>
          Delete customer
        </DropdownMenuItem>
      )}
    </DropdownMenu>
  );

  const dialog = (
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
  );

  return { menu, dialog };
}

interface CustomerRowProps {
  customer: VendorCustomer;
  selected: boolean;
  onToggleSelect: () => void;
}

function CustomerRow({ customer, selected, onToggleSelect }: CustomerRowProps) {
  const { menu, dialog } = useCustomerActions(customer);
  // A customer is opened by phone number; without customers.contact it comes masked (rule-plan.md Step 5).
  const canOpen = useCan('customers.contact');
  return (
    <tr className={trClass(selected)}>
      <td className={`${td} w-10`}>
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className={tableCheckbox} aria-label={`Select ${customer.name}`} />
      </td>
      <td className={`${td} min-w-[200px]`}>
        <div className="flex items-start gap-3">
          <Initial name={customer.name} />
          <div className="min-w-0">
            {canOpen ? (
              <Link to={`/vendor/customers/${encodeURIComponent(customer.phone)}`} className="font-medium text-brand hover:underline">
                {customer.name}
              </Link>
            ) : (
              <span className="font-medium text-regantify-text">{customer.name}</span>
            )}
            <p className="mt-0.5 text-xs text-neutral-500">{customer.phone}</p>
            {customer.group && (
              <div className="mt-1.5">
                <CustomerGroupChip group={customer.group} />
              </div>
            )}
            {customer.blacklisted && (
              <div className="mt-1.5">
                <BlacklistedBadge />
              </div>
            )}
            {customer.tags.length > 0 && (
              <div className="mt-1.5">
                <CustomerTagChips tags={customer.tags} />
              </div>
            )}
          </div>
        </div>
      </td>
      <td className={`${td} text-neutral-600`}>{customer.email ?? '—'}</td>
      <td className={`${td} min-w-[220px]`}>
        <p>{customer.address}</p>
        {customer.city && <p className="mt-0.5 text-xs text-neutral-500">City: {customer.city}</p>}
        <p className="text-xs text-neutral-500">Zip: {customer.zip ?? '—'}</p>
      </td>
      <td className={`${td} whitespace-nowrap`}>{customer.orderCount}</td>
      <td className={`${td} whitespace-nowrap font-medium`}>{formatMoney(customer.totalSpent)}</td>
      <td className={`${td} whitespace-nowrap`}>
        {customer.dueBalance > 0 ? <span className="font-medium text-amber-700">{formatMoney(customer.dueBalance)}</span> : <span className="text-neutral-400">—</span>}
      </td>
      <td className={`${td} whitespace-nowrap text-neutral-600`}>{formatDate(customer.lastOrderAt)}</td>
      <td className={td}>
        {menu}
        {dialog}
      </td>
    </tr>
  );
}

/** Phones: one tappable row per customer. */
function CustomerListItem({ customer }: { customer: VendorCustomer }) {
  const { menu, dialog } = useCustomerActions(customer);
  const canOpen = useCan('customers.contact');
  return (
    <li className="flex items-center gap-3 px-3 py-3">
      <Initial name={customer.name} />
      <Link
        to={`/vendor/customers/${encodeURIComponent(customer.phone)}`}
        className={`min-w-0 flex-1 ${canOpen ? '' : 'pointer-events-none'}`}
        aria-disabled={!canOpen}
        tabIndex={canOpen ? undefined : -1}
      >
        <p className="truncate text-sm font-medium text-brand">{customer.name}</p>
        <p className="truncate text-xs text-neutral-500">
          {customer.phone} · {customer.orderCount} {customer.orderCount === 1 ? 'order' : 'orders'} · {formatMoney(customer.totalSpent)}
          {customer.dueBalance > 0 && <span className="font-medium text-amber-700"> · owes {formatMoney(customer.dueBalance)}</span>}
        </p>
        {customer.group && (
          <div className="mt-1">
            <CustomerGroupChip group={customer.group} />
          </div>
        )}
        {customer.blacklisted && (
          <div className="mt-1">
            <BlacklistedBadge />
          </div>
        )}
        {customer.tags.length > 0 && (
          <div className="mt-1">
            <CustomerTagChips tags={customer.tags} />
          </div>
        )}
      </Link>
      {menu}
      {dialog}
      {canOpen && <ChevronRight size={16} className="shrink-0 text-neutral-400" aria-hidden />}
    </li>
  );
}

type CustomerFilter = 'ALL' | 'BLACKLISTED' | 'DUE';

/** One row of the exported CSV. */
const EXPORT_HEADERS = ['Name', 'Phone', 'Email', 'Address', 'City', 'District', 'Zip', 'Orders', 'Total Spent', 'Due', 'Group', 'Blacklisted', 'Tags', 'Note'];

function toExportRow(c: VendorCustomer): string[] {
  return [
    c.name,
    c.phone,
    c.email ?? '',
    c.address,
    c.city ?? '',
    c.district ?? '',
    c.zip ?? '',
    String(c.orderCount),
    c.totalSpent.toFixed(2),
    c.dueBalance.toFixed(2),
    c.group ? CUSTOMER_GROUP_LABELS[c.group] : '',
    c.blacklisted ? 'Yes' : 'No',
    c.tags.join(', '),
    c.note ?? '',
  ];
}

const COLUMN_COUNT = 8;

export default function Customers() {
  const navigate = useNavigate();
  // What this person's role can do here (rule-plan.md Step 10); the server checks each again.
  const canEdit = useCan('customers.edit');
  const canExport = useCan('customers.export');
  const canSms = useCan('sms.manage');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>('ALL');
  // Customers > tag filter ('' = any tag).
  const [tag, setTag] = useState('');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  // Automatic group filter (customer-groups.ts on the server); '' = every group.
  const [group, setGroup] = useState<CustomerGroup | ''>('');
  const [groupSettingsOpen, setGroupSettingsOpen] = useState(false);
  useEffect(() => setPage(1), [search, filter, tag, group, perPage]);
  useEffect(() => setSelected(new Set()), [search, filter, tag, group, page, perPage]);

  const { data: storeTags } = useQuery({ queryKey: ['customer-tags'], queryFn: customersApi.listTags });

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search, filter, tag, group, page, perPage }],
    queryFn: () =>
      customersApi.list({
        search: search.trim() || undefined,
        blacklistedOnly: filter === 'BLACKLISTED',
        dueOnly: filter === 'DUE',
        tag: tag || undefined,
        group: group || undefined,
        page,
        perPage,
      }),
  });

  const customers = data?.customers ?? [];
  const total = data?.total ?? 0;
  const allSelected = customers.length > 0 && selected.size === customers.length;

  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(customers.map((c) => c.phone)));
  };

  const toggleSelectOne = (phone: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(phone)) next.delete(phone);
      else next.add(phone);
      return next;
    });
  };

  // With nothing selected, exports every customer matching the current
  // search/filter (not just the current page); with a selection, only
  // those rows — see CustomersService.exportCsv.
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const rows = await customersApi.exportCsv({
        search: search.trim() || undefined,
        blacklistedOnly: filter === 'BLACKLISTED',
        dueOnly: filter === 'DUE',
        tag: tag || undefined,
        group: group || undefined,
        phones: selected.size > 0 ? Array.from(selected) : undefined,
      });
      if (rows.length === 0) {
        toast.error('No customers to export.');
        return;
      }
      downloadCsv('customers.csv', toCsv(EXPORT_HEADERS, rows.map(toExportRow)));
    } catch {
      toast.error('Could not export customers. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const emptyTitle = filter === 'BLACKLISTED' ? 'No blacklisted customers' : filter === 'DUE' ? 'Nobody owes you money' : group ? `No ${CUSTOMER_GROUP_LABELS[group]} customers yet` : search || tag ? 'No customers match your search' : 'No customers yet';
  const emptyHint =
    filter === 'BLACKLISTED'
      ? 'Customers you blacklist show up here, and can’t order with Cash on Delivery.'
      : filter === 'DUE'
        ? 'Counter sales paid by “Due (baki)” show up here until the customer pays.'
      : search
        ? 'Try a different name or phone number.'
        : 'Customers appear here after their first order. You can also add them yourself.';
  const emptyAction =
    filter === 'ALL' && !search && !tag && !group && canEdit ? (
      <button type="button" onClick={() => navigate('/vendor/customers/add')} className={primaryBtn}>
        <Plus size={15} />
        Add customer
      </button>
    ) : undefined;

  return (
    <PageSection>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            Customers
            <CustomerTabs />
          </span>
        }
        description={`${total.toLocaleString()} total`}
        actions={
          <>
            <SearchBox value={search} onChange={setSearch} placeholder="Search customer" />
            <SelectBox ariaLabel="Filter customers" value={filter} onChange={(v) => setFilter(v as CustomerFilter)}>
              <option value="ALL">All customers</option>
              <option value="BLACKLISTED">Blacklisted</option>
              <option value="DUE">Owes money (due)</option>
            </SelectBox>
            {(storeTags?.length ?? 0) > 0 && (
              <SelectBox ariaLabel="Filter by tag" value={tag} onChange={setTag}>
                <option value="">Any tag</option>
                {storeTags!.map((t) => (
                  <option key={t.tag} value={t.tag}>
                    {t.tag} ({t.count})
                  </option>
                ))}
              </SelectBox>
            )}
            {canSms && selected.size > 0 && (
              <button type="button" onClick={() => navigate('/vendor/sms', { state: { smsPhones: Array.from(selected) } })} className={outlineBtn}>
                <Send size={15} />
                Send SMS ({selected.size})
              </button>
            )}
            {canExport && (
              <button type="button" onClick={handleExportCsv} disabled={exporting} className={outlineBtn}>
                <Download size={15} />
                {exporting ? 'Exporting…' : selected.size > 0 ? `Export CSV (${selected.size})` : 'Export CSV'}
              </button>
            )}
            {canEdit && (
              <>
                <button type="button" onClick={() => navigate('/vendor/customers/bulk-upload')} className={secondaryBtn}>
                  <Upload size={15} />
                  Bulk upload
                </button>
                <button type="button" onClick={() => navigate('/vendor/customers/add')} className={primaryBtn}>
                  <Plus size={15} />
                  Add customer
                </button>
              </>
            )}
          </>
        }
      />

      {/* Automatic groups: one chip per group with its count; tap again to clear. */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setGroup('')}
          className={`rounded-full border px-3 py-1 text-sm ${group === '' ? 'border-brand bg-brand/5 font-medium text-brand' : 'border-line text-neutral-600 hover:bg-neutral-50'}`}
        >
          All groups
        </button>
        {(Object.keys(CUSTOMER_GROUP_LABELS) as CustomerGroup[]).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGroup(group === g ? '' : g)}
            className={`rounded-full border px-3 py-1 text-sm ${group === g ? 'border-brand bg-brand/5 font-medium text-brand' : 'border-line text-neutral-600 hover:bg-neutral-50'}`}
          >
            {CUSTOMER_GROUP_LABELS[g]}
            {data?.groupCounts && <span className="ml-1 text-neutral-400">{data.groupCounts[g].toLocaleString()}</span>}
          </button>
        ))}
        {canEdit && (
          <button
            type="button"
            onClick={() => setGroupSettingsOpen(true)}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-regantify-text"
          >
            <Settings2 size={14} aria-hidden />
            Group settings
          </button>
        )}
      </div>
      <CustomerGroupSettingsDialog open={groupSettingsOpen} onOpenChange={setGroupSettingsOpen} current={data?.groupSettings} />

      {/* Selection bar */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border border-brand-lime bg-brand-lime/30 px-3 py-2">
          <span className="text-sm font-medium text-regantify-text">{selected.size} selected</span>
          <button
            onClick={() => setSelected(new Set())}
            className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-sm text-neutral-600 hover:bg-white"
          >
            <X size={13} />
            Clear
          </button>
        </div>
      )}

      {/* Wide screens: table */}
      <TableFrame minWidth="min-w-[960px]" className="hidden md:block">
        <thead>
          <tr className={theadRow}>
            <th className="w-10 border-r border-line p-3">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className={tableCheckbox} aria-label="Select all customers on this page" />
            </th>
            <th className={th}>Customer</th>
            <th className={th}>Email</th>
            <th className={th}>Address</th>
            <th className={th}>Orders</th>
            <th className={th}>Total spent</th>
            <th className={th}>Due</th>
            <th className={th}>Last order</th>
            <th className={`${th} w-16`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <TableSkeleton rows={Math.min(perPage, 5)} colSpan={COLUMN_COUNT} />
          ) : customers.length === 0 ? (
            <EmptyState as="row" colSpan={COLUMN_COUNT} icon={Users} title={emptyTitle} hint={emptyHint} action={emptyAction} />
          ) : (
            customers.map((customer) => (
              <CustomerRow
                key={customer.phone}
                customer={customer}
                selected={selected.has(customer.phone)}
                onToggleSelect={() => toggleSelectOne(customer.phone)}
              />
            ))
          )}
        </tbody>
      </TableFrame>

      {/* Phones: stacked list */}
      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : customers.length === 0 ? (
          <div className="rounded-lg border border-line">
            <EmptyState icon={Users} title={emptyTitle} hint={emptyHint} action={emptyAction} />
          </div>
        ) : (
          <StackedList>
            {customers.map((customer) => (
              <CustomerListItem key={customer.phone} customer={customer} />
            ))}
          </StackedList>
        )}
      </div>

      <TableFooter page={page} perPage={perPage} total={total} onPageChange={setPage} onPerPageChange={setPerPage} />
    </PageSection>
  );
}
