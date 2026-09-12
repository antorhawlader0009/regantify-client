import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, ChevronDown, Download } from 'lucide-react';
import { customersApi, type VendorCustomer } from '../../../lib/customersApi';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { toast } from '../../../lib/toast';
import { toCsv, downloadCsv } from '../../../lib/csv';

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
    <tr className="border-b border-black/5 align-top">
      <td className="p-4 w-10">
        <input type="checkbox" checked={selected} onChange={onToggleSelect} />
      </td>
      <td className="p-4 min-w-[180px]">
        <Link
          to={`/vendor/customers/${encodeURIComponent(customer.phone)}`}
          className="text-sm font-medium text-regantify-cta hover:underline"
        >
          {customer.name}
        </Link>
        <p className="text-xs text-regantify-text-muted mt-0.5">{customer.phone}</p>
        {customer.blacklisted && (
          <span className="inline-flex items-center mt-1 text-[11px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            Blacklisted
          </span>
        )}
      </td>
      <td className="p-4 text-sm text-regantify-text-muted">{customer.email ?? '—'}</td>
      <td className="p-4 min-w-[220px]">
        <p className="text-sm text-regantify-text">{customer.address}</p>
        {customer.city && <p className="text-xs text-regantify-text-muted mt-0.5">City: {customer.city}</p>}
        <p className="text-xs text-regantify-text-muted">Zip: {customer.zip ?? '—'}</p>
      </td>
      <td className="p-4 text-sm text-regantify-text-muted">—</td>
      <td className="p-4">
        <DropdownMenu
          trigger={
            <button className="px-3 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text hover:bg-regantify-content">
              Actions
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

/** One row of the exported CSV — same column set shown in the table. */
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

  const toggleSelectAll = () => {
    if (selected.size === customers.length) {
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
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Customers</h1>
        <div className="flex items-stretch rounded-xl bg-regantify-cta overflow-hidden">
          <button
            onClick={() => navigate('/vendor/customers/add')}
            className="flex items-center gap-1.5 pl-4 pr-3 py-2 hover:bg-regantify-cta-dark text-white text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add New
          </button>
          <DropdownMenu
            trigger={
              <button className="px-2 border-l border-white/20 hover:bg-regantify-cta-dark text-white transition-colors">
                <ChevronDown size={16} />
              </button>
            }
            align="start"
          >
            <DropdownMenuItem onSelect={() => navigate('/vendor/customers/bulk-upload')}>Bulk Upload</DropdownMenuItem>
          </DropdownMenu>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-black/5 flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/10 text-sm
                text-regantify-text placeholder:text-regantify-text-muted focus:outline-none"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as CustomerFilter)}
            className="px-3 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text focus:outline-none"
          >
            <option value="ALL">All Customers</option>
            <option value="BLACKLISTED">Blacklisted</option>
          </select>
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
        </div>

        <div className="px-4 py-3 border-b border-black/5">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-black/10 text-sm text-regantify-text hover:bg-regantify-content disabled:opacity-50"
          >
            <Download size={14} />
            {exporting ? 'Exporting…' : selected.size > 0 ? `Export CSV (${selected.size})` : 'Export CSV'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide border-b border-black/5">
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={customers.length > 0 && selected.size === customers.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-4">Customer</th>
                <th className="p-4">Email</th>
                <th className="p-4">Address</th>
                <th className="p-4">Company</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-regantify-text-muted">
                    Loading…
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm text-regantify-text-muted">
                    {filter === 'BLACKLISTED' ? 'No blacklisted customers.' : 'No customers yet.'}
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
    </div>
  );
}
