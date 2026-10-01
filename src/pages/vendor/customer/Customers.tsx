import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, ChevronDown, Download, MoreVertical, Plus, Search, Upload, Users, X } from 'lucide-react';
import { customersApi, type VendorCustomer } from '../../../lib/customersApi';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { toast } from '../../../lib/toast';
import { toCsv, downloadCsv } from '../../../lib/csv';
import { CustomerTabs } from './CustomerTabs';

// Table + toolbar pieces from the dashboard theme (hairline grid, outline buttons).
const th = 'border-r border-line px-3 py-3 text-left font-normal last:border-r-0';
const td = 'border-r border-line p-3 last:border-r-0';
const toolbarBtn =
  'inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50';

const formatMoney = (n: number) => `৳${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

interface CustomerRowProps {
  customer: VendorCustomer;
  selected: boolean;
  onToggleSelect: () => void;
}

function CustomerRow({ customer, selected, onToggleSelect }: CustomerRowProps) {
  const queryClient = useQueryClient();

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
      toast.success('Customer deleted.');
    },
    onError: () => toast.error('Could not delete this customer. Please try again.'),
  });

  const handleDelete = () => {
    if (window.confirm(`Delete ${customer.name}? This sends all of their orders to trash.`)) {
      deleteMutation.mutate();
    }
  };

  return (
    <tr
      className={`border-t border-line align-top text-regantify-text transition-colors ${
        selected ? 'bg-brand-lime/20' : 'hover:bg-neutral-50/70'
      }`}
    >
      <td className={`${td} w-10`}>
        <input type="checkbox" checked={selected} onChange={onToggleSelect} className="h-4 w-4 cursor-pointer accent-brand" />
      </td>
      <td className={`${td} min-w-[200px]`}>
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-lime/60 text-xs font-semibold uppercase text-brand">
            {customer.name.trim().charAt(0) || '?'}
          </span>
          <div className="min-w-0">
            <Link to={`/vendor/customers/${encodeURIComponent(customer.phone)}`} className="font-medium text-brand hover:underline">
              {customer.name}
            </Link>
            <p className="mt-0.5 text-xs text-neutral-500">{customer.phone}</p>
            {customer.blacklisted && (
              <span className="mt-1.5 inline-block rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700">
                Blacklisted
              </span>
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
      <td className={`${td} whitespace-nowrap text-neutral-600`}>{formatDate(customer.lastOrderAt)}</td>
      <td className={td}>
        <DropdownMenu
          trigger={
            <button
              aria-label="Actions"
              title="Actions"
              className="rounded-md border border-line bg-white p-1.5 text-regantify-text transition-colors hover:bg-neutral-50 data-[state=open]:bg-neutral-50"
            >
              <MoreVertical size={14} />
            </button>
          }
        >
          <DropdownMenuItem onSelect={() => blacklistMutation.mutate(!customer.blacklisted)}>
            {customer.blacklisted ? 'Remove from blacklist' : 'Blacklist customer'}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDelete} danger>
            Delete
          </DropdownMenuItem>
        </DropdownMenu>
      </td>
    </tr>
  );
}

type CustomerFilter = 'ALL' | 'BLACKLISTED';

/** One row of the exported CSV. */
const EXPORT_HEADERS = ['Name', 'Phone', 'Email', 'Address', 'City', 'District', 'Zip', 'Orders', 'Total Spent', 'Blacklisted'];

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
    c.blacklisted ? 'Yes' : 'No',
  ];
}

const COLUMN_COUNT = 8;

export default function Customers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<CustomerFilter>('ALL');
  const [perPage, setPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => setPage(1), [search, filter, perPage]);
  useEffect(() => setSelected(new Set()), [search, filter, page, perPage]);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', { search, filter, page, perPage }],
    queryFn: () =>
      customersApi.list({
        search: search.trim() || undefined,
        blacklistedOnly: filter === 'BLACKLISTED',
        page,
        perPage,
      }),
  });

  const customers = data?.customers ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5,
  );
  const allSelected = customers.length > 0 && selected.size === customers.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(customers.map((c) => c.phone)));
    }
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

  return (
    <section className="rounded-xl border border-line bg-white p-3.5">
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="mr-auto flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-[15px] font-semibold text-regantify-text">Customers</h1>
            <p className="mt-0.5 text-xs text-neutral-500">{total.toLocaleString()} total</p>
          </div>
          <CustomerTabs />
        </div>

        <div className="flex h-9 w-full items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm sm:w-[215px]">
          <Search size={15} className="shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer"
            className="w-full bg-transparent text-regantify-text outline-none placeholder:text-neutral-500"
          />
        </div>
        <div className="relative">
          <select
            aria-label="Filter customers"
            value={filter}
            onChange={(e) => setFilter(e.target.value as CustomerFilter)}
            className={`${toolbarBtn} appearance-none pr-8`}
          >
            <option value="ALL">All Customers</option>
            <option value="BLACKLISTED">Blacklisted</option>
          </select>
          <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-3" />
        </div>
        <button type="button" onClick={handleExportCsv} disabled={exporting} className={toolbarBtn}>
          <Download size={15} />
          {exporting ? 'Exporting…' : selected.size > 0 ? `Export CSV (${selected.size})` : 'Export CSV'}
        </button>
        <button
          type="button"
          onClick={() => navigate('/vendor/customers/bulk-upload')}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-brand-blue px-3 text-sm text-white transition hover:opacity-90"
        >
          <Upload size={15} />
          Bulk Upload
        </button>
        <button
          type="button"
          onClick={() => navigate('/vendor/customers/add')}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm text-white transition-colors hover:bg-brand-dark"
        >
          <Plus size={15} />
          Add Customer
        </button>
      </div>

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

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[960px] border-collapse text-[14px]">
          <thead>
            <tr className="bg-neutral-50 text-neutral-600">
              <th className="w-10 border-r border-line p-3">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="h-4 w-4 cursor-pointer accent-brand" />
              </th>
              <th className={th}>Customer</th>
              <th className={th}>Email</th>
              <th className={th}>Address</th>
              <th className={th}>Orders</th>
              <th className={th}>Total Spent</th>
              <th className={th}>Last Order</th>
              <th className={`${th} w-16`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: Math.min(perPage, 5) }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-t border-line">
                  <td colSpan={COLUMN_COUNT} className="p-3">
                    <div className="h-8 w-full animate-pulse rounded-md bg-neutral-100" />
                  </td>
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr className="border-t border-line">
                <td colSpan={COLUMN_COUNT} className="px-3 py-16 text-center">
                  <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                    <Users size={20} />
                  </div>
                  <p className="mt-2 text-sm font-medium text-regantify-text">
                    {filter === 'BLACKLISTED' ? 'No blacklisted customers.' : 'No customers yet.'}
                  </p>
                  {search && <p className="mt-1 text-xs text-neutral-500">Try changing your search.</p>}
                </td>
              </tr>
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
        </table>
      </div>

      {/* Footer */}
      <div className="mt-4 flex flex-col gap-3 px-2 pb-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-neutral-700">
          Show
          <div className="relative">
            <select
              value={perPage}
              onChange={(e) => setPerPage(Number(e.target.value))}
              className="h-9 appearance-none rounded-lg border border-line bg-white pl-3 pr-8 text-xs text-regantify-text outline-none focus:border-brand"
            >
              {[10, 25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-3" />
          </div>
          <span className="text-xs">per page</span>
        </div>

        <div className="flex items-center gap-3 text-sm">
          <span className="mr-2 text-xs text-neutral-600">
            {total === 0 ? 0 : (page - 1) * perPage + 1}-{Math.min(page * perPage, total)} of {total}
          </span>
          {totalPages > 1 && (
            <>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Previous page"
                className="disabled:opacity-30"
              >
                <ArrowLeft size={16} />
              </button>
              {pageNumbers.map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`h-8 min-w-8 rounded-md px-1 ${
                    n === page ? 'bg-neutral-100 font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-50'
                  }`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
                className="disabled:opacity-30"
              >
                <ArrowRight size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
