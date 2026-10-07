import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2, Wallet as WalletIcon } from 'lucide-react';
import { expensesApi, type Expense } from '../../../lib/financeApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { Dialog } from '../../../components/ui/Dialog';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState, PageHeader, TableFooter, TableFrame, outlineBtn, primaryBtn, td, th, theadRow, trClass } from '../../../components/ui/PageKit';
import { Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { formatTaka } from './financeUi';

/** Today in Dhaka as YYYY-MM-DD. */
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' });
const monthStart = () => `${today().slice(0, 8)}01`;

/**
 * Finance > Expenses: what the store spends besides product cost (Facebook ads, packaging, rent,
 * salaries...). Analytics > Sales takes the total off the profit ("Profit after expenses").
 * These are records only; they never change the wallet balance.
 */
export default function Expenses() {
  const queryClient = useQueryClient();
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  useEffect(() => setPage(1), [from, to, category, perPage]);

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', { from, to, category, page, perPage }],
    queryFn: () => expensesApi.list({ from: from || undefined, to: to || undefined, category: category || undefined, page, perPage }),
  });
  const { data: categories = [] } = useQuery({ queryKey: ['expense-categories'], queryFn: expensesApi.categories, staleTime: Infinity });

  const remove = useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      setDeleting(null);
      toast.success('Expense removed.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not remove it. Please try again.')),
  });

  const expenses = data?.expenses ?? [];
  const addButton = (
    <button type="button" onClick={() => setEditing('new')} className={primaryBtn}>
      <Plus size={15} />
      Add expense
    </button>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="Expenses" description="Ads, packaging, rent, salaries and other costs. Analytics takes them off your profit." actions={addButton} />

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <label className="text-xs text-neutral-500">
          From
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`${productInputClass} mt-1 !w-40`} />
        </label>
        <label className="text-xs text-neutral-500">
          To
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`${productInputClass} mt-1 !w-40`} />
        </label>
        <label className="text-xs text-neutral-500">
          Category
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${productInputClass} mt-1 !w-44`}>
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-white p-3">
          <p className="text-xs text-neutral-500">Total</p>
          <p className="text-lg font-semibold tabular-nums text-regantify-text">{formatTaka(data?.total ?? 0)}</p>
        </div>
        {(data?.byCategory ?? []).slice(0, 3).map((c) => (
          <div key={c.category} className="rounded-lg border border-line bg-white p-3">
            <p className="text-xs text-neutral-500">{c.category}</p>
            <p className="text-lg font-semibold tabular-nums text-regantify-text">{formatTaka(c.total)}</p>
          </div>
        ))}
      </div>

      {!isLoading && expenses.length === 0 ? (
        <EmptyState
          icon={WalletIcon}
          title="No expenses in these dates"
          hint="Add what you spend on ads, packaging, rent and so on to see your real profit."
          action={addButton}
        />
      ) : (
        <>
          <TableFrame minWidth="min-w-[720px]">
            <thead>
              <tr className={theadRow}>
                <th className={th}>Date</th>
                <th className={th}>Category</th>
                <th className={th}>Note</th>
                <th className={`${th} text-right`}>Amount</th>
                <th className={`${th} w-24`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr key={e.id} className={trClass()}>
                  <td className={`${td} whitespace-nowrap`}>{e.date.slice(0, 10)}</td>
                  <td className={td}>{e.category}</td>
                  <td className={td}>
                    {e.note || <span className="text-neutral-400">—</span>}
                    {e.addedBy && <p className="text-xs text-neutral-400">by {e.addedBy}</p>}
                  </td>
                  <td className={`${td} text-right font-medium tabular-nums`}>{formatTaka(e.amount)}</td>
                  <td className={td}>
                    <div className="flex gap-1">
                      <button type="button" onClick={() => setEditing(e)} className="rounded p-1.5 text-neutral-500 hover:bg-neutral-100" aria-label="Edit">
                        <Pencil size={14} />
                      </button>
                      <button type="button" onClick={() => setDeleting(e)} className="rounded p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600" aria-label="Remove">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableFrame>
          <TableFooter page={page} perPage={perPage} total={data?.count ?? 0} onPageChange={setPage} onPerPageChange={setPerPage} perPageOptions={[25, 50, 100]} />
        </>
      )}

      <ExpenseDialog expense={editing} categories={categories} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Remove this expense?"
        message={deleting ? `${deleting.category}, ${formatTaka(deleting.amount)} on ${deleting.date.slice(0, 10)}.` : ''}
        confirmLabel="Remove expense"
        danger
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}

function ExpenseDialog({ expense, categories, onClose }: { expense: Expense | 'new' | null; categories: string[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(today());
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!expense) return;
    if (expense === 'new') {
      setDate(today());
      setCategory(categories[0] ?? 'Other');
      setAmount('');
      setNote('');
    } else {
      setDate(expense.date.slice(0, 10));
      setCategory(expense.category);
      setAmount(String(Number(expense.amount)));
      setNote(expense.note ?? '');
    }
  }, [expense, categories]);

  const save = useMutation({
    mutationFn: () => {
      const input = { date, category: category.trim(), amount: Number(amount), note: note.trim() };
      return expense && expense !== 'new' ? expensesApi.update(expense.id, input) : expensesApi.create(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      toast.success(expense === 'new' ? 'Expense added.' : 'Expense updated.');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Please try again.')),
  });

  const valid = Boolean(date) && category.trim().length > 0 && Number(amount) > 0;
  return (
    <Dialog open={expense !== null} onOpenChange={(open) => !open && onClose()} title={expense === 'new' ? 'Add expense' : 'Edit expense'} maxWidth="max-w-md">
      <form
        className="space-y-3 px-6 pb-6 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) save.mutate();
        }}
      >
        <Field label="Date">
          <input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} className={productInputClass} />
        </Field>
        <Field label="Category">
          <input list="expense-categories" value={category} onChange={(e) => setCategory(e.target.value.slice(0, 40))} className={productInputClass} />
          <datalist id="expense-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <Field label="Amount (৳)">
          <input type="number" inputMode="decimal" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus className={productInputClass} />
        </Field>
        <Field label="Note (optional)">
          <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 300))} placeholder="e.g. Facebook ads for the Eid collection" className={productInputClass} />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className={outlineBtn}>
            Cancel
          </button>
          <button type="submit" disabled={!valid || save.isPending} className={primaryBtn}>
            {save.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
