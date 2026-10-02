import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bot, Coins, Plus } from 'lucide-react';
import { aiChatBotApi, type AiTokenCredits, type AiTokenLedgerRow, type AiTokenLedgerType } from '../../../lib/aiChatBotApi';
import { getVendorTheme } from '../../../lib/vendorApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import {
  EmptyState,
  PageHeader,
  PillTabs,
  StackedList,
  TableFooter,
  TableFrame,
  TableSkeleton,
  primaryBtn,
  td,
  th,
  theadRow,
  trClass,
} from '../../../components/ui/PageKit';
import { BuyChatBotDialog } from './BuyChatBotDialog';

type HistoryTab = 'all' | 'USAGE' | 'PURCHASE';
const PAGE_SIZE = 20;

const TYPE_LABEL: Record<AiTokenLedgerType, string> = {
  SIGNUP_GRANT: 'Free tokens for your new store',
  PLAN_GRANT: 'Included with your plan',
  PURCHASE: 'Tokens bought',
  USAGE: 'Chat reply',
  ADJUSTMENT: 'Changed by the Regantify team',
  MIGRATION: 'Old chat messages converted',
};

/** The small grey line under a history row's title. */
function rowDetail(row: AiTokenLedgerRow): string | null {
  if (row.type === 'USAGE' && row.promptTokens != null) {
    return `Question and product list ${row.promptTokens.toLocaleString()} + answer ${(row.completionTokens ?? 0).toLocaleString()}`;
  }
  if (row.type === 'ADJUSTMENT' || row.type === 'MIGRATION' || row.type === 'PLAN_GRANT') return row.description;
  return null;
}

function Amount({ value }: { value: number }) {
  return (
    <span className={`tabular-nums ${value > 0 ? 'text-emerald-700' : 'text-regantify-text'}`}>
      {value > 0 ? '+' : value < 0 ? '−' : ''}
      {Math.abs(value).toLocaleString()}
    </span>
  );
}

/** Is the chat showing on the store right now, and if not, what to do. */
function BotStatus({ credits, theme }: { credits: AiTokenCredits; theme: string | undefined }) {
  const canReply = credits.canReply;
  const onStorePal = theme === 'STOREPAL';
  const on = onStorePal && canReply;

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span
        className={`inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-xs font-medium ${
          on ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-neutral-200 bg-neutral-50 text-neutral-600'
        }`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${on ? 'bg-emerald-500' : 'bg-neutral-400'}`} aria-hidden />
        {on ? 'On' : 'Off'}
      </span>
      <span className="text-neutral-600">
        {theme === undefined ? (
          'Checking your store…'
        ) : !onStorePal ? (
          <>
            The chat shows only on the StorePal theme.{' '}
            <Link to="/vendor/store/themes" className="font-medium text-brand hover:underline">
              Change theme
            </Link>
          </>
        ) : !canReply ? (
          'Out of tokens: shoppers don’t see the chat until you buy more.'
        ) : (
          'Shoppers see the chat button on your store and can ask about your products.'
        )}
      </span>
    </div>
  );
}

function History() {
  const [tab, setTab] = useState<HistoryTab>('all');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['chatbot-ledger', tab, page],
    queryFn: () => aiChatBotApi.getLedger({ page, pageSize: PAGE_SIZE, type: tab === 'all' ? undefined : tab }),
    placeholderData: (prev) => prev,
  });
  const rows = data?.items ?? [];
  const COLS = 4;
  const empty = (
    <EmptyState
      icon={Coins}
      title={tab === 'USAGE' ? 'No chat replies yet' : tab === 'PURCHASE' ? 'No tokens bought yet' : 'No token activity yet'}
      hint="Each time the chat answers a shopper, the tokens it used show up here."
    />
  );

  return (
    <>
      <PillTabs<HistoryTab>
        value={tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
        }}
        tabs={[
          { id: 'all', label: 'All' },
          { id: 'USAGE', label: 'Chat replies' },
          { id: 'PURCHASE', label: 'Bought' },
        ]}
      />

      <div className="hidden md:block">
        <TableFrame minWidth="min-w-[720px]">
          <thead>
            <tr className={theadRow}>
              <th className={`${th} w-48`}>Date</th>
              <th className={th}>What</th>
              <th className={`${th} w-32 text-right`}>Tokens</th>
              <th className={`${th} w-36 text-right`}>Balance after</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <TableSkeleton rows={6} colSpan={COLS} />
            ) : rows.length === 0 ? (
              <tr className="border-t border-line">
                <td colSpan={COLS}>{empty}</td>
              </tr>
            ) : (
              rows.map((row) => {
                const detail = rowDetail(row);
                return (
                  <tr key={row.id} className={trClass()}>
                    <td className={`${td} whitespace-nowrap text-neutral-600`}>{formatDhakaDateTime(row.createdAt)}</td>
                    <td className={td}>
                      {TYPE_LABEL[row.type]}
                      {detail && <span className="mt-0.5 block text-xs text-neutral-500">{detail}</span>}
                    </td>
                    <td className={`${td} text-right`}>
                      <Amount value={row.amount} />
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{row.balanceAfter.toLocaleString()}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </TableFrame>
      </div>

      <div className="md:hidden">
        {isLoading ? (
          <div className="space-y-2" aria-busy>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-neutral-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-lg border border-line">{empty}</div>
        ) : (
          <StackedList>
            {rows.map((row) => {
              const detail = rowDetail(row);
              return (
                <li key={row.id} className="px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm text-regantify-text">{TYPE_LABEL[row.type]}</span>
                    <span className="text-sm">
                      <Amount value={row.amount} />
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-neutral-500">
                    <span>{formatDhakaDateTime(row.createdAt)}</span>
                    <span className="tabular-nums">Left {row.balanceAfter.toLocaleString()}</span>
                  </div>
                  {detail && <p className="mt-1 text-xs text-neutral-500">{detail}</p>}
                </li>
              );
            })}
          </StackedList>
        )}
      </div>

      {data && data.total > 0 && <TableFooter page={page} perPage={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
    </>
  );
}

/**
 * AI & Automation > AI Chat Bot (ai-token-plan.md Step 8): the store's AI
 * token wallet. Tokens left (big, amber when low) with Buy tokens and
 * "about N replies left", whether the chat is on the store, and the
 * history of every reply and top-up.
 */
export default function AiChatBot() {
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);
  const { data: credits, isLoading } = useQuery({ queryKey: ['chatbot-credits'], queryFn: () => aiChatBotApi.getCredits() });
  const { data: themeInfo } = useQuery({ queryKey: ['vendor-theme'], queryFn: () => getVendorTheme() });
  const low = !!credits?.lowBalance;

  return (
    <div className="space-y-4">
      <PageHeader
        className=""
        title="AI Chat Bot"
        description="A shopping assistant on your store that answers shoppers’ questions about your products."
      />

      <section className={`rounded-xl border p-4 ${low ? 'border-amber-200 bg-amber-50' : 'border-line bg-white'}`}>
        <div className="flex flex-wrap items-center gap-4">
          <div className="mr-auto">
            <p className="text-sm text-neutral-600">AI tokens left</p>
            {isLoading || !credits ? (
              <div className="mt-1 h-9 w-32 animate-pulse rounded bg-neutral-100" />
            ) : (
              <p className="text-3xl font-semibold tabular-nums text-regantify-text">{credits.available.toLocaleString()}</p>
            )}
            {credits && (
              <p className={`mt-0.5 text-xs ${low ? 'text-amber-800' : 'text-neutral-500'}`}>
                {low && credits.available > 0 ? 'Running low. ' : ''}
                About {credits.repliesLeft.toLocaleString()} replies left at your store’s size ({credits.productCount.toLocaleString()}{' '}
                {credits.productCount === 1 ? 'product' : 'products'}, about {credits.tokensPerReply.toLocaleString()} tokens a reply).
              </p>
            )}
          </div>
          <button type="button" onClick={() => setBuyDialogOpen(true)} className={`${primaryBtn} h-10 w-full px-4 sm:w-auto`}>
            <Plus size={15} aria-hidden />
            Buy tokens
          </button>
        </div>
        {credits && (
          <div className={`mt-3 border-t pt-3 ${low ? 'border-amber-200' : 'border-line'}`}>
            <BotStatus credits={credits} theme={themeInfo?.theme} />
          </div>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white p-3.5">
        <div className="mb-3 flex items-center gap-2 px-0.5">
          <Bot size={16} className="text-neutral-500" aria-hidden />
          <h2 className="text-[15px] font-semibold text-regantify-text">Token history</h2>
        </div>
        <History />
        <p className="mt-3 px-0.5 text-xs text-neutral-500">
          Every reply sends your product list along with the shopper’s question, so a store with more products uses more tokens a reply. Tokens never
          expire. A reply that fails or gets cut off isn’t charged.
        </p>
      </section>

      <BuyChatBotDialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen} tokensPerReply={credits?.tokensPerReply} />
    </div>
  );
}
