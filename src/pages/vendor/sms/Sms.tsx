import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquareText, Plus, Send } from 'lucide-react';
import { smsApi } from '../../../lib/smsApi';
import { apiErrorMessage } from '../../../lib/api';
import { BD_PHONE_HINT, normalizeBdPhone, toLatinDigits } from '../../../lib/bdPhone';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { EmptyState, PageHeader, PillTabs, StackedList, TableFrame, TableSkeleton, primaryBtn, td, th, theadRow, trClass } from '../../../components/ui/PageKit';
import { BuySmsDialog, perSms } from './BuySmsDialog';
import { useCan } from '../../../lib/useStaffAccess';
import { useLocation } from 'react-router-dom';
import { SendToCustomers } from '../../../components/sms/SendToCustomers';

type Tab = 'send' | 'logs' | 'test';

/**
 * Sent messages, newest first (the last 30). The gateway (bulksmsbd.net)
 * only confirms it accepted a message; it sends no delivery reports, so
 * there's no "delivered" column (theme-update-plan.md Step 9).
 */
function SentLogs() {
  const { data: logs, isLoading } = useQuery({ queryKey: ['sms-logs'], queryFn: () => smsApi.getLogs() });
  const COLS = 4;
  const empty = (
    <EmptyState
      icon={MessageSquareText}
      title="No SMS sent yet"
      hint="Order updates, verification codes and tracking messages show up here once your store sends them."
    />
  );

  return (
    <>
      <div className="hidden md:block">
        <TableFrame minWidth="min-w-[720px]">
          <thead>
            <tr className={theadRow}>
              <th className={`${th} w-44`}>Sent</th>
              <th className={`${th} w-36`}>To</th>
              <th className={th}>Message</th>
              <th className={`${th} w-24 text-right`}>SMS used</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={6} colSpan={COLS} />
            ) : !logs || logs.length === 0 ? (
              <tr className="border-t border-line">
                <td colSpan={COLS}>{empty}</td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className={trClass()}>
                  <td className={`${td} whitespace-nowrap text-neutral-600`}>{formatDhakaDateTime(log.createdAt)}</td>
                  <td className={`${td} whitespace-nowrap tabular-nums`}>{log.phone}</td>
                  <td className={td}>{log.message}</td>
                  <td className={`${td} text-right tabular-nums`}>{log.smsCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </TableFrame>
      </div>

      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-2" aria-busy>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : !logs || logs.length === 0 ? (
          <div className="rounded-lg border border-line">{empty}</div>
        ) : (
          <StackedList>
            {logs.map((log) => (
              <li key={log.id} className="px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-2 text-xs text-neutral-500">
                  <span className="tabular-nums">{log.phone}</span>
                  <span>
                    {formatDhakaDateTime(log.createdAt)} · {log.smsCount} SMS
                  </span>
                </div>
                <p className="mt-1 text-sm text-regantify-text">{log.message}</p>
              </li>
            ))}
          </StackedList>
        )}
      </div>
      {logs && logs.length > 0 && (
        <p className="mt-3 px-0.5 text-xs text-neutral-500">The last 30 messages. “Sent” means the SMS company accepted it for delivery.</p>
      )}
    </>
  );
}

function TestSms() {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const normalized = normalizeBdPhone(phone);
  const phoneError = !phone.trim() ? 'Enter a phone number.' : !normalized ? BD_PHONE_HINT : null;

  const sendTestMutation = useMutation({
    mutationFn: () => smsApi.sendTest(normalized!),
    onSuccess: (data) => {
      queryClient.setQueryData(['sms-credits'], data);
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
      setSentTo(normalized);
      setPhone('');
      setSubmitted(false);
    },
    onError: (err) => setError(apiErrorMessage(err, 'Couldn’t send the test SMS. Try again in a minute.')),
  });

  return (
    <form
      noValidate
      className="max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        setSentTo(null);
        setSubmitted(true);
        if (!phoneError) sendTestMutation.mutate();
      }}
    >
      <p className="mb-4 text-sm text-neutral-600">Send yourself a test message to check SMS works. It uses 1 SMS.</p>
      <Field label="Send to" error={submitted ? phoneError : null}>
        <input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(toLatinDigits(e.target.value))}
          placeholder="01XXXXXXXXX"
          className={productInputClass}
        />
      </Field>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {sentTo && <p className="animate-pop-in mt-3 text-sm text-emerald-700">Test SMS sent to {sentTo}.</p>}
      <button type="submit" disabled={sendTestMutation.isPending} className={`${primaryBtn} mt-4 h-10 px-4`}>
        <Send size={14} aria-hidden />
        {sendTestMutation.isPending ? 'Sending…' : 'Send test SMS'}
      </button>
    </form>
  );
}

/**
 * Store > SMS: how many SMS are left (big, with Buy SMS and the price
 * of one), the messages your store sent, and a test send.
 */
export default function Sms() {
  const isOwner = useCan('owner');
  const canTest = useCan('sms.manage');
  // Customers page "Send SMS" opens here with the picked customers' phones.
  const pickedPhones = (useLocation().state as { smsPhones?: string[] } | null)?.smsPhones;
  const [tab, setTab] = useState<Tab>(pickedPhones?.length ? 'send' : 'logs');
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);

  const { data: creditsData, isLoading } = useQuery({ queryKey: ['sms-credits'], queryFn: () => smsApi.getCredits() });
  const { data: packages } = useQuery({ queryKey: ['sms-packages'], queryFn: () => smsApi.getPackages() });
  const credits = creditsData?.smsCredits ?? 0;
  const cheapest = packages?.reduce<(typeof packages)[number] | null>((b, p) => (!b || p.price / p.smsCount < b.price / b.smsCount ? p : b), null);
  const low = !isLoading && credits < 50;

  return (
    <div className="space-y-4">
      <PageHeader className="" title="SMS" description="Messages your store sends: order updates, verification codes and tracking." />

      <section className={`flex flex-wrap items-center gap-4 rounded-xl border p-4 ${low ? 'border-amber-200 bg-amber-50' : 'border-line bg-white'}`}>
        <div className="mr-auto">
          <p className="text-sm text-neutral-600">SMS left</p>
          {isLoading ? (
            <div className="mt-1 h-9 w-24 animate-pulse rounded bg-neutral-100" />
          ) : (
            <p className="text-3xl font-semibold tabular-nums text-regantify-text">{credits.toLocaleString()}</p>
          )}
          <p className="mt-0.5 text-xs text-neutral-500">
            {low ? 'Running low: messages stop when this reaches 0. ' : ''}
            {cheapest ? `From ${perSms(cheapest)} per SMS. A long message can use 2 or more.` : 'A long message can use 2 or more.'}
          </p>
        </div>
        {/* Buying spends the store's money: owner only (rule-plan.md 5.2). */}
        {isOwner && (
          <button type="button" onClick={() => setBuyDialogOpen(true)} className={`${primaryBtn} h-10 w-full px-4 sm:w-auto`}>
            <Plus size={15} aria-hidden />
            Buy SMS
          </button>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white p-3.5">
        <PillTabs<Tab>
          value={canTest ? tab : 'logs'}
          onChange={setTab}
          tabs={[
            ...(canTest ? [{ id: 'send' as const, label: 'Send to customers' }] : []),
            { id: 'logs', label: 'Sent messages' },
            ...(canTest ? [{ id: 'test' as const, label: 'Send a test' }] : []),
          ]}
        />
        <div className="px-0.5">
          {tab === 'test' && canTest ? <TestSms /> : tab === 'send' && canTest ? <SendToCustomers selectedPhones={pickedPhones} /> : <SentLogs />}
        </div>
      </section>

      <BuySmsDialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen} />
    </div>
  );
}
