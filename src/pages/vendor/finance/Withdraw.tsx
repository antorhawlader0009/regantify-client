import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock } from 'lucide-react';
import { inputClass } from '../../../components/product/ProductFormPieces';
import { financeApi, type WithdrawMethod, type WithdrawRequestStatus } from '../../../lib/financeApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

function formatAmount(value: string) {
  return `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
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

const METHOD_LABEL: Record<WithdrawMethod, string> = {
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  BANK: 'Bank Transfer',
};

const STATUS_BADGE: Record<WithdrawRequestStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-blue-100 text-blue-800',
  REJECTED: 'bg-red-100 text-red-700',
  PAID: 'bg-green-100 text-green-800',
};

const MINIMUM_WITHDRAW_AMOUNT = 100;

/**
 * Finance > Withdraw — request a payout from Vendor.balance. No real
 * payout gateway exists yet (see FeeSummary.tsx's own note on checkout
 * being COD-only), so this is the same manual "vendor requests, Super
 * Admin reviews and pays outside the platform" flow as Billing's plan
 * upgrade requests — see server's WithdrawRequestsService for the
 * balance-reservation behavior a submitted request has.
 */
export default function Withdraw() {
  const queryClient = useQueryClient();

  const { data: wallet } = useQuery({
    queryKey: ['finance', 'wallet'],
    queryFn: () => financeApi.getWallet(),
  });
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['finance', 'withdraw-requests'],
    queryFn: () => financeApi.getWithdrawRequests(),
  });

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<WithdrawMethod>('BKASH');
  const [receiverNumber, setReceiverNumber] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const pendingRequest = requests.find((r) => r.status === 'PENDING');
  const balance = Number(wallet?.balance ?? 0);

  const submitMutation = useMutation({
    mutationFn: () =>
      financeApi.createWithdrawRequest({
        amount: Number(amount),
        method,
        receiverNumber: method !== 'BANK' ? receiverNumber.trim() : undefined,
        bankDetails: method === 'BANK' ? bankDetails.trim() : undefined,
        note: note.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'withdraw-requests'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'wallet'] });
      setAmount('');
      setReceiverNumber('');
      setBankDetails('');
      setNote('');
      setFormError(null);
      toast.success('Withdrawal request submitted — we’ll review it shortly.');
    },
    onError: (err) => setFormError(apiErrorMessage(err, 'Could not submit this request. Please try again.')),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const numericAmount = Number(amount);
    if (!amount || Number.isNaN(numericAmount) || numericAmount <= 0) {
      setFormError('Enter a valid amount.');
      return;
    }
    if (numericAmount < MINIMUM_WITHDRAW_AMOUNT) {
      setFormError(`Minimum withdrawal amount is ${formatAmount(String(MINIMUM_WITHDRAW_AMOUNT))}.`);
      return;
    }
    if (numericAmount > balance) {
      setFormError('This amount is more than your available balance.');
      return;
    }
    if (method !== 'BANK' && !receiverNumber.trim()) {
      setFormError(`Enter your ${METHOD_LABEL[method]} number.`);
      return;
    }
    if (method === 'BANK' && !bankDetails.trim()) {
      setFormError('Enter your bank account details.');
      return;
    }

    submitMutation.mutate();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Withdraw</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Request a payout from your wallet balance — available balance: {formatAmount(String(balance))}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
        <div className="bg-white rounded-2xl border border-black/5 p-6 h-fit">
          <h2 className="text-base font-semibold text-regantify-text mb-4">Request Withdrawal</h2>

          {pendingRequest ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <Clock size={16} className="text-amber-700 mt-0.5 shrink-0" />
              <p className="text-sm text-amber-900">
                You have a pending request for {formatAmount(pendingRequest.amount)}. Please wait for it to be
                resolved before submitting another.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-regantify-text mb-1.5">Amount</label>
                <input
                  type="number"
                  min={MINIMUM_WITHDRAW_AMOUNT}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Min. ${MINIMUM_WITHDRAW_AMOUNT}`}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-regantify-text mb-1.5">Payout Method</label>
                <div className="flex gap-2">
                  {(['BKASH', 'NAGAD', 'BANK'] as WithdrawMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        method === m
                          ? 'bg-regantify-black text-white'
                          : 'bg-regantify-search text-regantify-text-muted hover:bg-regantify-content'
                      }`}
                    >
                      {METHOD_LABEL[m]}
                    </button>
                  ))}
                </div>
              </div>

              {method !== 'BANK' ? (
                <div>
                  <label className="block text-sm font-medium text-regantify-text mb-1.5">
                    {METHOD_LABEL[method]} Number
                  </label>
                  <input
                    type="text"
                    value={receiverNumber}
                    onChange={(e) => setReceiverNumber(e.target.value)}
                    placeholder="01XXXXXXXXX"
                    className={inputClass}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-regantify-text mb-1.5">Bank Account Details</label>
                  <textarea
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    placeholder="Account name, account number, bank name, branch"
                    rows={3}
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-regantify-text mb-1.5">Note (optional)</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className={inputClass}
                />
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full px-4 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white
                  text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitMutation.isPending ? 'Submitting…' : 'Submit Request'}
              </button>
            </form>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-black/5 overflow-hidden h-fit">
          <div className="px-5 py-3.5 border-b border-black/5">
            <h2 className="text-base font-semibold text-regantify-text">Withdrawal History</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-regantify-content text-left text-regantify-text-muted">
                  <th className="px-5 py-3 font-medium">DATE</th>
                  <th className="px-5 py-3 font-medium">METHOD</th>
                  <th className="px-5 py-3 font-medium">AMOUNT</th>
                  <th className="px-5 py-3 font-medium">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-regantify-text-muted">
                      Loading…
                    </td>
                  </tr>
                )}
                {!isLoading && requests.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-regantify-text-muted">
                      No withdrawal requests yet.
                    </td>
                  </tr>
                )}
                {requests.map((r) => (
                  <tr key={r.id} className="border-t border-black/5">
                    <td className="px-5 py-3.5 text-regantify-text whitespace-nowrap">{formatDateTime(r.createdAt)}</td>
                    <td className="px-5 py-3.5 text-regantify-text">{METHOD_LABEL[r.method]}</td>
                    <td className="px-5 py-3.5 font-medium text-regantify-text">{formatAmount(r.amount)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-md ${STATUS_BADGE[r.status]}`}>
                        {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
