import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { lmsApi, type LmsAiUsage, type LmsChatRead } from '../../lib/lmsApi';
import { LmsButton, LmsTextarea } from './ui';
import { formatMoney } from './format';

/*
 * LMS AI assist (LMS-plan.md Step 12). The AI only suggests: every result
 * lands in a form or a text box the agent checks and changes before
 * anything is saved or sent. Each use counts toward the store's monthly
 * AI uses, shown next to the button.
 */

export const LMS_AI_USAGE_KEY = ['lms', 'ai-usage'] as const;

export function useAiUsage() {
  return useQuery({ queryKey: LMS_AI_USAGE_KEY, queryFn: lmsApi.aiUsage, staleTime: 60_000 });
}

/** Keeps the "N of 300 AI uses left" line right after a use, without another request. */
export function useSetAiUsage() {
  const queryClient = useQueryClient();
  return (usage: LmsAiUsage) => queryClient.setQueryData(LMS_AI_USAGE_KEY, usage);
}

export function AiUsageLine({ className = '' }: { className?: string }) {
  const usage = useAiUsage().data;
  if (!usage) return null;
  const left = Math.max(0, usage.limit - usage.used);
  return (
    <span className={`text-xs tabular-nums ${left === 0 ? 'text-lms-alert' : 'text-lms-muted'} ${className}`}>
      {left === 0 ? 'No AI uses left this month' : `${left.toLocaleString('en-US')} of ${usage.limit.toLocaleString('en-US')} AI uses left this month`}
    </span>
  );
}

/**
 * Add lead > "Paste a chat": the agent pastes a Messenger / WhatsApp
 * conversation (Bangla, Banglish or English) and the AI fills the form.
 */
export function ChatReader({ onRead }: { onRead: (result: LmsChatRead, text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setUsage = useSetAiUsage();
  const usage = useAiUsage().data;
  const noneLeft = !!usage && usage.used >= usage.limit;

  const read = useMutation({
    mutationFn: () => lmsApi.readChat(text.trim()),
    onSuccess: (result) => {
      setUsage(result.usage);
      setError(null);
      onRead(result, text.trim());
    },
    onError: (err) => setError(apiErrorMessage(err, "The AI couldn't read this chat. Try again, or fill the form by hand.")),
  });

  if (!open) {
    return (
      <LmsButton onClick={() => setOpen(true)} className="w-full justify-start">
        <Sparkles size={15} />
        Paste a chat and let AI fill this in
      </LmsButton>
    );
  }
  return (
    <div className="rounded-md border border-lms-line bg-lms-page p-3">
      <label className="mb-1 block text-[13px] font-medium" htmlFor="lms-chat-paste">
        Paste the Messenger or WhatsApp chat
      </label>
      <LmsTextarea
        id="lms-chat-paste"
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={6000}
        placeholder={'Customer: vai panjabi 2 ta dien\nCustomer: Rakib, 01712345678, Mirpur 10, Dhaka'}
        autoFocus
      />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <LmsButton variant="primary" disabled={!text.trim() || read.isPending || noneLeft} onClick={() => read.mutate()}>
          <Sparkles size={15} />
          {read.isPending ? 'Reading…' : 'Fill the form from this chat'}
        </LmsButton>
        <LmsButton variant="quiet" onClick={() => setOpen(false)}>
          Close
        </LmsButton>
        <AiUsageLine className="ml-auto" />
      </div>
      {error && <p className="mt-2 text-sm text-lms-alert">{error}</p>}
      <p className="mt-2 text-xs text-lms-muted">Works with Bangla, Banglish and English. The AI can get things wrong, so check the form before you save.</p>
    </div>
  );
}

/** What the chat reader found, shown above the form so the agent sees which products matched the catalog. */
export function ChatItems({ items, value }: { items: LmsChatRead['items']; value: number | null }) {
  if (!items.length) return <p className="text-sm text-lms-muted">No products found in the chat. Type what they want below.</p>;
  return (
    <div className="rounded-md border border-lms-line p-3 text-sm">
      <p className="mb-1 font-medium">Products from the chat</p>
      <ul className="space-y-0.5">
        {items.map((i, n) => (
          <li key={n} className="flex justify-between gap-3">
            <span>
              {i.quantity} × {i.name}
              {!i.productId && <span className="ml-1 text-lms-muted">(not in your catalog: add it on the order by hand)</span>}
            </span>
            {i.unitPrice != null && <span className="tabular-nums text-lms-muted">{formatMoney(i.unitPrice * i.quantity)}</span>}
          </li>
        ))}
      </ul>
      {value !== null && <p className="mt-1 text-xs text-lms-muted">At today's prices. "Create order" on the lead adds these to the order.</p>}
    </div>
  );
}

/** The lead drawer's AI summary: three lines on demand, never saved. */
export function LeadSummary({ leadId, activityCount }: { leadId: string; activityCount: number }) {
  const setUsage = useSetAiUsage();
  const summary = useMutation({
    mutationFn: () => lmsApi.aiSummary(leadId),
    onSuccess: (result) => setUsage(result.usage),
  });
  // A short timeline reads faster than a summary of it.
  if (activityCount < 4) return null;
  if (summary.data) {
    return (
      <div className="rounded-md border border-lms-line bg-lms-page p-3 text-sm">
        <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-lms-muted">
          <Sparkles size={13} aria-hidden />
          AI summary (check the timeline for details)
        </p>
        <ul className="space-y-1">
          {summary.data.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LmsButton variant="quiet" className="-ml-3.5" disabled={summary.isPending} onClick={() => summary.mutate()}>
        <Sparkles size={15} />
        {summary.isPending ? 'Summarising…' : 'Summarise with AI'}
      </LmsButton>
      {summary.isError && <span className="text-sm text-lms-alert">{apiErrorMessage(summary.error, "The AI couldn't summarise this lead. Try again.")}</span>}
    </div>
  );
}
