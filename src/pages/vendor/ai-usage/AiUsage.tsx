import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Check,
  Coins,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  LayoutTemplate,
  MessageCircle,
  Mic,
  Minus,
  PackageSearch,
  PhoneCall,
  Plug,
  Plus,
  Sparkles,
  Star,
  type LucideIcon,
} from 'lucide-react';
import {
  aiChatBotApi,
  type AiCreditLedgerRow,
  type AiCreditLedgerType,
  type AiCreditSummary,
  type AiToolKey,
  type AiUsageReport,
} from '../../../lib/aiChatBotApi';
import { getVendorTheme } from '../../../lib/vendorApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { useViewer } from '../../../lib/useStaffAccess';
import { useAuthStore } from '../../../store/authStore';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import { StoreAiInstructionsCard } from '../../../components/ai/StoreAiInstructionsCard';
import { AiAssistantLookCard } from '../../../components/ai/AiAssistantLookCard';
import { PhotoSearchAiCard } from '../../../components/ai/PhotoSearchAiCard';
import {
  EmptyState,
  PillTabs,
  StackedList,
  TableFooter,
  TableFrame,
  TableSkeleton,
  secondaryBtn,
  td,
  th,
  theadRow,
  trClass,
} from '../../../components/ui/PageKit';
import { ChangeBadge, Segmented, Share } from '../../../components/analytics/AnalyticsUi';
import { BuyChatBotDialog } from '../ai-automation/BuyChatBotDialog';
import { BalanceBackdrop } from './BalanceBackdrop';

type Period = '7' | '30' | '90';
const PERIODS: { id: Period; label: string }[] = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: '90', label: '90 days' },
];

/** The white panels of this page: softer corners and a faint lift, like the hero beside them. */
const panel = 'rounded-2xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]';

/** Each AI tool as the seller knows it: what it does and where it lives. */
const TOOLS: Record<AiToolKey, { name: string; what: string; icon: LucideIcon; to?: string }> = {
  STORE_CHAT: { name: 'Store chat', what: 'Answers shoppers on your store', icon: MessageCircle, to: '/vendor/store/themes' },
  STORE_VOICE: { name: 'Store voice call', what: 'Talks with shoppers by voice on your store', icon: Mic },
  PHOTO_SEARCH: { name: 'Photo search (AI)', what: 'Finds a product from a shopper’s photo when the free match finds none', icon: ImageIcon },
  ASK_AI: { name: 'Ask AI', what: 'Answers your questions in the dashboard', icon: Sparkles },
  PRODUCT_AI: { name: 'Product AI', what: 'Writes and fills in product details', icon: PackageSearch, to: '/vendor/product/add' },
  CHAT_EXTENSION: { name: 'Chat extension', what: 'Reply drafts and photo reading in customer chats', icon: Plug, to: '/vendor/store/extension' },
  REPLY_DRAFTS: { name: 'Review and question replies', what: 'Drafts answers to reviews and product questions', icon: Star, to: '/vendor/reviews' },
  OTHER: { name: 'Other AI', what: 'Anything else that used AI Credits', icon: Bot },
};

const ALLOWANCES: Record<'LANDING_PAGE' | 'LMS', { name: string; what: string; icon: LucideIcon; to: string }> = {
  LANDING_PAGE: { name: 'Landing page AI', what: 'AI drafts of a landing page', icon: LayoutTemplate, to: '/vendor/store/landing-pages' },
  LMS: { name: 'LMS AI assist', what: 'Chat to lead, summaries, message drafts', icon: PhoneCall, to: '/vendor/lms' },
};

/** Client copy of the server's aiToolOf (ai-chatbot.service.ts), for the Recent list's icons. */
function toolOf(description: string, feature: string | null): AiToolKey {
  if (description === 'Store voice reply') return 'STORE_VOICE';
  if (description === 'Store photo search') return 'PHOTO_SEARCH';
  if (feature === 'STORE_CHATBOT' || description === 'Store chat reply') return 'STORE_CHAT';
  if (description === 'Ask AI answer') return 'ASK_AI';
  if (description === 'Product chat' || description === 'Product description' || description === 'AI photo look') return 'PRODUCT_AI';
  if (description === 'Chat reply draft' || description.startsWith('Chat photo')) return 'CHAT_EXTENSION';
  if (description === 'AI answer draft' || description === 'AI review reply draft') return 'REPLY_DRAFTS';
  return 'OTHER';
}

const n = (v: number) => v.toLocaleString('en-US');

/** "12 Oct" for a "YYYY-MM-DD" day. */
const shortDay = (day: string) => new Date(`${day}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function changePct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// ---------------------------------------------------------------- history

type HistoryTab = 'all' | 'USAGE' | 'PURCHASE';
const PAGE_SIZE = 20;

const TYPE_LABEL: Record<AiCreditLedgerType, string> = {
  SIGNUP_GRANT: 'Free AI Credits for your new store',
  PLAN_GRANT: 'Included with your plan',
  PURCHASE: 'AI Credits bought',
  USAGE: 'AI used',
  ADJUSTMENT: 'Changed by the Regantify team',
  MIGRATION: 'Old chat messages converted',
};

function rowTitle(row: AiCreditLedgerRow): string {
  if (row.type === 'USAGE') return row.description || TYPE_LABEL.USAGE;
  return TYPE_LABEL[row.type];
}

/** The small grey line under a history row's title. */
function rowDetail(row: AiCreditLedgerRow): string | null {
  if (row.type === 'ADJUSTMENT' || row.type === 'MIGRATION' || row.type === 'PLAN_GRANT') return row.description;
  return null;
}

function Amount({ value }: { value: number }) {
  return (
    <span className={`tabular-nums ${value > 0 ? 'text-emerald-700' : 'text-regantify-text'}`}>
      {value > 0 ? '+' : value < 0 ? '−' : ''}
      {n(Math.abs(value))}
    </span>
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
      title={tab === 'USAGE' ? 'No AI use yet' : tab === 'PURCHASE' ? 'No AI Credits bought yet' : 'No AI Credit activity yet'}
      hint="Each time an AI tool answers, the credits it used show up here."
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
          { id: 'USAGE', label: 'Used' },
          { id: 'PURCHASE', label: 'Bought' },
        ]}
      />

      <div className="hidden md:block">
        <TableFrame minWidth="min-w-[720px]">
          <thead>
            <tr className={theadRow}>
              <th className={`${th} w-48`}>Date</th>
              <th className={th}>What</th>
              <th className={`${th} w-32 text-right`}>Credits</th>
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
                      {rowTitle(row)}
                      {detail && <span className="mt-0.5 block text-xs text-neutral-500">{detail}</span>}
                    </td>
                    <td className={`${td} text-right`}>
                      <Amount value={row.amount} />
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{n(row.balanceAfter)}</td>
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
                    <span className="text-sm text-regantify-text">{rowTitle(row)}</span>
                    <span className="text-sm">
                      <Amount value={row.amount} />
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between gap-2 text-xs text-neutral-500">
                    <span>{formatDhakaDateTime(row.createdAt)}</span>
                    <span className="tabular-nums">Left {n(row.balanceAfter)}</span>
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

// ---------------------------------------------------------------- hero

function chatLine(credits: AiCreditSummary, theme: string | undefined, switchedOff: 'ALL' | 'CHAT' | null): { on: boolean; text: ReactNode } {
  const onStorePal = theme === 'STOREPAL';
  const on = onStorePal && credits.canReply && !switchedOff;
  if (switchedOff) return { on, text: switchedOff === 'ALL' ? 'All AI is turned off' : 'Store chat is turned off' };
  if (theme === undefined) return { on, text: 'Checking your store…' };
  if (!onStorePal)
    return {
      on,
      text: (
        <>
          Store chat works on the StorePal template.{' '}
          <Link to="/vendor/store/themes" className="font-medium underline underline-offset-2">
            Change template
          </Link>
        </>
      ),
    };
  if (credits.capReached) return { on, text: 'Store chat paused: monthly AI limit reached' };
  if (!credits.canReply) return { on, text: 'Store chat off: out of AI Credits' };
  return { on, text: 'Store chat is answering shoppers' };
}

function paceText(report: AiUsageReport): string {
  const { perDay, daysLeft, endsBy } = report.pace;
  if (perDay <= 0 || daysLeft === null) return 'No AI used in the last 14 days';
  const when = daysLeft === 0 ? 'less than a day' : daysLeft === 1 ? 'about 1 day' : `about ${n(daysLeft)} days`;
  return endsBy === 'MONTHLY_LIMIT' ? `Monthly limit reached in ${when}` : `Lasts ${when} at your pace`;
}

function BalanceHero({ report, theme, onBuy }: { report: AiUsageReport | undefined; theme: string | undefined; onBuy: () => void }) {
  const credits = report?.credits;
  const change = report ? changePct(report.totals.credits, report.totals.previousCredits) : null;
  const { data: switches } = useQuery({ queryKey: ['ai-usage-settings'], queryFn: aiChatBotApi.getSettings });
  const switchedOff = switches?.aiOff ? 'ALL' : switches?.storeChatOff ? 'CHAT' : null;
  const chat = credits ? chatLine(credits, theme, switchedOff) : null;
  const warn = !!credits && (credits.lowBalance || credits.capReached);

  return (
    <section
      className={`relative flex flex-col overflow-hidden rounded-2xl p-5 text-white shadow-[0_10px_30px_-12px_rgba(67,56,202,0.55)] ${
        warn ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500'
      }`}
    >
      {/* The wave follows this period's daily use. */}
      <BalanceBackdrop trend={report?.daily.map((d) => d.credits)} />
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-[13px] text-white/80">AI Credits left</p>
        {change !== null && (
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium tabular-nums ring-1 ring-white/20" title="Credits used, against the period before">
            {change > 0 ? '+' : ''}
            {change}% use
          </span>
        )}
      </div>
      {credits ? (
        <p className="relative mt-1 text-[34px] font-semibold leading-tight tracking-tight tabular-nums">{n(credits.available)}</p>
      ) : (
        <div className="relative mt-2 h-10 w-36 animate-pulse rounded-lg bg-white/20" />
      )}
      <p className="relative text-[13px] text-white/85">{report ? paceText(report) : ' '}</p>

      {/* Room for the wave between the number and the footer. */}
      <div className="min-h-16 flex-1" />

      <div className="relative flex flex-wrap items-center gap-3 pt-3">
        {chat && (
          <span className="mr-auto inline-flex min-w-0 items-center gap-2 text-xs text-white/90">
            <span className={`h-2 w-2 shrink-0 rounded-full ${chat.on ? 'bg-emerald-300' : 'bg-white/50'}`} aria-hidden />
            <span className="min-w-0">{chat.text}</span>
          </span>
        )}
        <button
          type="button"
          onClick={onBuy}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3.5 text-sm font-medium text-indigo-700 shadow-sm transition-colors hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
        >
          <Plus size={15} aria-hidden />
          Buy AI Credits
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- in / out

function InOutCard({ report }: { report: AiUsageReport | undefined }) {
  const t = report?.totals;
  const credits = report?.credits;
  const cap = credits?.monthlyCap ?? null;
  // With a monthly limit the bar is the limit; without one, how much of what the store had went in this period.
  const barPct = !credits || !t ? 0 : cap ? Math.min(100, (credits.usedThisMonth / cap) * 100) : t.credits + credits.available > 0 ? (t.credits / (t.credits + credits.available)) * 100 : 0;
  const barTone = barPct >= 100 ? 'bg-red-500' : barPct >= 80 ? 'bg-amber-500' : 'bg-indigo-500';

  return (
    <section className={`${panel} flex flex-col`}>
      <div className="grid grid-cols-2 gap-4">
        <Flow icon={Plus} tone="in" label="Credits added" value={t ? `+${n(t.added)}` : null} sub={t ? (t.bought ? `${n(t.bought)} bought` : 'Plan and free credits') : null} />
        <Flow icon={Minus} tone="out" label="Credits used" value={t ? n(t.credits) : null} sub={t ? `${n(t.uses)} AI ${t.uses === 1 ? 'use' : 'uses'}` : null} />
      </div>

      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-2 text-xs">
          <span className="text-neutral-600">{cap ? 'Monthly AI limit' : 'Share of your credits used'}</span>
          <span className="tabular-nums text-neutral-600">
            {cap && credits ? `${n(credits.usedThisMonth)} of ${n(cap)}` : `${Math.round(barPct)}%`}
          </span>
        </div>
        <div
          className="mt-2 h-2.5 overflow-hidden rounded-full bg-neutral-100"
          role="progressbar"
          aria-valuenow={Math.round(barPct)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={cap ? 'Monthly AI limit used' : 'Share of your credits used in this period'}
        >
          <div className={`h-full rounded-full transition-[width] duration-500 ${barTone}`} style={{ width: `${barPct}%` }} />
        </div>
      </div>

      <dl className="mt-auto grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
        <Mini label="A day" value={report ? n(report.pace.perDay) : null} />
        <Mini label="A use" value={t ? (t.uses ? n(Math.round(t.credits / t.uses)) : '0') : null} />
        <Mini
          label="Chat replies left"
          value={credits ? n(credits.repliesLeft) : null}
        />
      </dl>
    </section>
  );
}

function Flow({ icon: Icon, tone, label, value, sub }: { icon: LucideIcon; tone: 'in' | 'out'; label: string; value: string | null; sub: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {/* Coloured because it means something: green comes in, red goes out. */}
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${tone === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}
      >
        <Icon size={20} strokeWidth={2.2} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-neutral-500">{label}</p>
        {value === null ? <div className="mt-1 h-6 w-16 animate-pulse rounded bg-neutral-100" /> : <p className="truncate text-xl font-semibold tabular-nums text-regantify-text">{value}</p>}
        {sub && <p className="truncate text-[11px] text-neutral-500">{sub}</p>}
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[11px] text-neutral-500">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums text-regantify-text">{value ?? '-'}</dd>
    </div>
  );
}

// ---------------------------------------------------------------- bars

interface Bar {
  key: string;
  label: string;
  title: string;
  credits: number;
  uses: number;
}

/** One bar a day up to 30 days; 90 days are summed by week so the bars stay readable. */
function barsOf(report: AiUsageReport): Bar[] {
  const daily = report.daily;
  if (daily.length <= 31) {
    return daily.map((d) => ({ key: d.bucket, label: shortDay(d.bucket), title: shortDay(d.bucket), credits: d.credits, uses: d.uses }));
  }
  const bars: Bar[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const week = daily.slice(i, i + 7);
    const first = week[0].bucket;
    const last = week[week.length - 1].bucket;
    bars.push({
      key: first,
      label: shortDay(first),
      title: `${shortDay(first)} to ${shortDay(last)}`,
      credits: week.reduce((s, d) => s + d.credits, 0),
      uses: week.reduce((s, d) => s + d.uses, 0),
    });
  }
  return bars;
}

function UsageBars({ report, period, onPeriod }: { report: AiUsageReport | undefined; period: Period; onPeriod: (p: Period) => void }) {
  const bars = useMemo(() => (report ? barsOf(report) : []), [report]);
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.credits));
  const avg = bars.length ? bars.reduce((s, b) => s + b.credits, 0) / bars.length : 0;
  const labelEvery = bars.length > 16 ? Math.ceil(bars.length / 8) : 1;
  const shown = active !== null ? bars[active] : null;
  const weekly = report ? report.daily.length > 31 : false;

  return (
    <section className={`${panel} flex flex-col`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-regantify-text">Credits used</h2>
          <p className="mt-0.5 text-[13px] text-neutral-500">
            {shown ? (
              <>
                {shown.title}: <span className="font-medium tabular-nums text-regantify-text">{n(shown.credits)} credits</span>, {n(shown.uses)}{' '}
                {shown.uses === 1 ? 'use' : 'uses'}
              </>
            ) : weekly ? (
              'Each bar is one week'
            ) : (
              'Each bar is one day'
            )}
          </p>
        </div>
        <Segmented options={PERIODS} value={period} onChange={onPeriod} />
      </div>

      {!report ? (
        <div className="mt-5 h-52 animate-pulse rounded-xl bg-neutral-100" />
      ) : (
        <div className="mt-5">
          <div className="relative h-52" onMouseLeave={() => setActive(null)}>
            {avg > 0 && (
              <div className="pointer-events-none absolute inset-x-0 border-t border-dashed border-neutral-300" style={{ bottom: `${(avg / max) * 100}%` }}>
                <span className="absolute -top-2.5 right-0 bg-white pl-1.5 text-[10px] text-neutral-500">avg {n(Math.round(avg))}</span>
              </div>
            )}
            <div className={`flex h-full items-end ${bars.length > 20 ? 'gap-[3px]' : 'gap-2 sm:gap-3'}`}>
              {bars.map((b, i) => {
                const h = b.credits > 0 ? Math.max(3, (b.credits / max) * 100) : 0;
                const on = active === i;
                return (
                  <button
                    key={b.key}
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                    aria-label={`${b.title}: ${n(b.credits)} credits, ${n(b.uses)} uses`}
                    className="group flex h-full min-w-0 flex-1 items-end rounded-t-md focus-visible:outline-none"
                  >
                    <span
                      className={`block w-full rounded-t-md transition-colors group-focus-visible:ring-2 group-focus-visible:ring-indigo-300 ${
                        b.credits === 0 ? 'bg-neutral-100' : on ? 'bg-indigo-600' : b.credits >= avg ? 'bg-indigo-400' : 'bg-indigo-200'
                      }`}
                      style={{ height: b.credits === 0 ? '3px' : `${h}%` }}
                    />
                  </button>
                );
              })}
            </div>
          </div>
          <div className={`mt-2 flex ${bars.length > 20 ? 'gap-[3px]' : 'gap-2 sm:gap-3'}`} aria-hidden>
            {bars.map((b, i) => (
              <span key={b.key} className="min-w-0 flex-1 truncate text-center text-[10px] text-neutral-400">
                {i % labelEvery === 0 ? b.label : ''}
              </span>
            ))}
          </div>
          {report.totals.credits === 0 && <p className="mt-3 text-center text-sm text-neutral-500">No AI used in this period.</p>}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- recent

function RecentCard() {
  const { data, isLoading } = useQuery({ queryKey: ['chatbot-ledger', 'recent'], queryFn: () => aiChatBotApi.getLedger({ page: 1, pageSize: 6 }) });
  const rows = data?.items ?? [];

  return (
    <section className={`${panel} flex flex-col`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-regantify-text">Recent</h2>
        <a href="#ai-credit-history" className="text-[13px] text-neutral-500 underline decoration-neutral-300 underline-offset-4 hover:text-regantify-text">
          See all
        </a>
      </div>
      {isLoading ? (
        <div className="mt-4 space-y-3" aria-busy>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="m-auto py-8 text-center text-sm text-neutral-500">Nothing yet. AI answers and top-ups show up here.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {rows.map((row) => {
            const used = row.amount < 0;
            const Icon = row.type === 'USAGE' ? TOOLS[toolOf(row.description, row.feature)].icon : Plus;
            const title = row.type === 'USAGE' ? TOOLS[toolOf(row.description, row.feature)].name : TYPE_LABEL[row.type];
            return (
              <li key={row.id} className="flex items-center gap-3 rounded-xl px-1 py-2">
                {/* Red = credits went out, green = came in. */}
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${used ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-600'}`}>
                  <Icon size={16} strokeWidth={2} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-regantify-text">{title}</p>
                  <p className="truncate text-[11px] text-neutral-500">{row.type === 'USAGE' ? `${row.description}, ${formatDhakaDateTime(row.createdAt)}` : formatDhakaDateTime(row.createdAt)}</p>
                </div>
                <span className={`shrink-0 text-sm font-semibold tabular-nums ${used ? 'text-red-600' : 'text-emerald-600'}`}>
                  {used ? '−' : '+'}
                  {n(Math.abs(row.amount))}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- by tool

function ToolsCard({ report }: { report: AiUsageReport | undefined }) {
  const tools = report?.tools ?? [];
  const total = report?.totals.credits ?? 0;
  return (
    <section className={panel}>
      <h2 className="text-[15px] font-semibold text-regantify-text">By AI tool</h2>
      <p className="mt-0.5 text-[13px] text-neutral-500">Where your credits went in this period</p>
      {!report ? (
        <div className="mt-4 space-y-2" aria-busy>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-neutral-100" />
          ))}
        </div>
      ) : tools.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">No AI used in this period.</p>
      ) : (
        <ul className="mt-4 divide-y divide-line">
          {tools.map((t) => {
            const meta = TOOLS[t.key];
            const Icon = meta.icon;
            const pct = total > 0 ? (t.credits / total) * 100 : 0;
            return (
              <li key={t.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0">
                <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                    <Icon size={16} strokeWidth={1.9} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-regantify-text">
                      {meta.to ? (
                        <Link to={meta.to} className="hover:underline">
                          {meta.name}
                        </Link>
                      ) : (
                        meta.name
                      )}
                    </p>
                    <p className="truncate text-xs text-neutral-500">{meta.what}</p>
                  </div>
                </div>
                <div className="w-28 shrink-0">
                  <Share pct={pct} />
                  <p className="mt-1 text-xs tabular-nums text-neutral-500">{pct.toFixed(pct < 10 && pct > 0 ? 1 : 0)}% of use</p>
                </div>
                <div className="w-24 shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-regantify-text">{n(t.credits)}</p>
                  <p className="text-xs tabular-nums text-neutral-500">
                    {n(t.uses)} {t.uses === 1 ? 'use' : 'uses'}
                  </p>
                </div>
                <div className="w-24 shrink-0 text-right">
                  <p className="text-xs tabular-nums text-neutral-600">{t.uses > 0 ? `${n(Math.round(t.credits / t.uses))} a use` : '-'}</p>
                  <ChangeBadge value={{ current: t.credits, previous: t.previousCredits }} kind="count" lowerIsBetter />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- limits + free AI

function NumberField({ id, label, hint, value, onChange, disabled }: { id: string; label: string; hint: ReactNode; value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="text-[13px] font-medium text-regantify-text">
        {label}
      </label>
      <div className="mt-1 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min={0}
          step={100}
          placeholder="No limit"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-full rounded-lg border border-line bg-white px-3 text-sm tabular-nums outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-neutral-50 disabled:text-neutral-500"
        />
        <span className="shrink-0 text-xs text-neutral-500">credits</span>
      </div>
      <p className="mt-1 text-xs text-neutral-500">{hint}</p>
    </div>
  );
}

const toField = (v: number | null | undefined) => (v ? String(v) : '');
const fromField = (v: string): number | null => {
  const num = Math.floor(Number(v));
  return v.trim() === '' || !Number.isFinite(num) || num <= 0 ? null : num;
};

/**
 * A link anyone can open to talk with the store's AI by voice: the store's address with #call, which opens the store
 * with a "Call" card (the storefront's AiAssistantWidget). The shopper taps once, since browsers allow the microphone
 * only after a tap. Works on StorePal while the voice call is on.
 */
function VoiceCallLinkCard({ theme }: { theme: string | undefined }) {
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);
  const { data: switches } = useQuery({ queryKey: ['ai-usage-settings'], queryFn: aiChatBotApi.getSettings });
  const [copied, setCopied] = useState(false);
  const link = subdomain ? `${storefrontStoreUrl(subdomain)}/#call` : '';
  const off = !!switches && (switches.aiOff || switches.storeChatOff || switches.voiceOff);
  const notStorePal = theme !== undefined && theme !== 'STOREPAL';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Voice call link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Select the link and copy it.');
    }
  };

  return (
    <section className={panel}>
      <h2 className="text-[15px] font-semibold text-regantify-text">Voice call link</h2>
      <p className="mt-0.5 text-[13px] text-neutral-500">Share it on Facebook, WhatsApp or anywhere. One tap and the customer talks with your store's AI.</p>
      <div className="mt-4 flex items-center gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Voice call link"
          className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-neutral-50 px-3 text-sm text-neutral-700 outline-none focus:border-indigo-400"
        />
        <button type="button" onClick={copy} disabled={!link} className={`${secondaryBtn} h-9 shrink-0 px-3`}>
          {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
          {copied ? 'Copied' : 'Copy'}
        </button>
        <a
          href={link || undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open the voice call link"
          className={`${secondaryBtn} h-9 shrink-0 px-2.5`}
        >
          <ExternalLink size={15} aria-hidden />
        </a>
      </div>
      {(off || notStorePal) && (
        <p className="mt-2 text-xs text-red-600">
          {notStorePal ? 'Voice calls work only on the StorePal template, so this link opens your store without a call.' : 'The voice call is turned off above, so this link opens the chat instead.'}
        </p>
      )}
      <p className="mt-2 text-xs text-neutral-500">Calls need Chrome, Edge or Safari. Inside the Facebook or Messenger app, the customer is asked to open it in Chrome.</p>
    </section>
  );
}

function SwitchRow({
  label,
  hint,
  on,
  disabled,
  onChange,
}: {
  label: string;
  hint: string;
  on: boolean;
  disabled: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className={`text-sm font-medium ${disabled ? 'text-neutral-400' : 'text-regantify-text'}`}>{label}</p>
        <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!on)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300 disabled:cursor-not-allowed disabled:opacity-50 ${
          on ? 'bg-indigo-600' : 'bg-neutral-300'
        }`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

/**
 * The owner's off switches. All AI off stops every AI service of the store; the store chat switch also covers its voice
 * call, so a child switch is greyed out while its parent is off (the saved value is kept for when the parent comes back).
 */
function AiSwitches() {
  const { isOwner } = useViewer();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['ai-usage-settings'], queryFn: aiChatBotApi.getSettings });

  const save = useMutation({
    mutationFn: (patch: { aiOff?: boolean; storeChatOff?: boolean; voiceOff?: boolean }) => aiChatBotApi.updateSettings(patch),
    onSuccess: (saved, patch) => {
      queryClient.setQueryData(['ai-usage-settings'], saved);
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] });
      const [key, off] = Object.entries(patch)[0] as [string, boolean];
      const what = key === 'aiOff' ? 'All AI' : key === 'storeChatOff' ? 'Store chat' : 'Voice call';
      toast.success(`${what} turned ${off ? 'off' : 'on'}`);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Please try again.')),
  });

  const allOn = data ? !data.aiOff : true;
  const chatOn = data ? !data.storeChatOff : true;
  const voiceOn = data ? !data.voiceOff : true;
  const locked = !isOwner || !data || save.isPending;

  return (
    <section className={panel}>
      <h2 className="text-[15px] font-semibold text-regantify-text">AI on your store</h2>
      <p className="mt-0.5 text-[13px] text-neutral-500">{isOwner ? 'Turn AI services off whenever you want.' : 'Only the store owner can change these.'}</p>
      <div className="mt-4 divide-y divide-line">
        <SwitchRow
          label="All AI"
          hint="Off stops every AI service: store chat, voice call, Ask AI, product AI, chat extension, reply drafts, landing page and LMS AI."
          on={allOn}
          disabled={locked}
          onChange={(on) => save.mutate({ aiOff: !on })}
        />
        <SwitchRow
          label="Store chat"
          hint="The AI chat shoppers see on your store."
          on={allOn && chatOn}
          disabled={locked || !allOn}
          onChange={(on) => save.mutate({ storeChatOff: !on })}
        />
        <SwitchRow
          label="Voice call"
          hint="Shoppers talking with the store chat by voice."
          on={allOn && chatOn && voiceOn}
          disabled={locked || !allOn || !chatOn}
          onChange={(on) => save.mutate({ voiceOff: !on })}
        />
      </div>
    </section>
  );
}

function SpendingControls() {
  const { isOwner } = useViewer();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['ai-usage-settings'], queryFn: aiChatBotApi.getSettings });
  const [cap, setCap] = useState('');
  const [reserve, setReserve] = useState('');
  useEffect(() => {
    if (!data) return;
    setCap(toField(data.monthlyCap));
    setReserve(toField(data.chatReserve));
  }, [data]);

  const save = useMutation({
    mutationFn: () => aiChatBotApi.updateSettings({ monthlyCap: fromField(cap), chatReserve: fromField(reserve) }),
    onSuccess: () => {
      toast.success('AI limits saved');
      queryClient.invalidateQueries({ queryKey: ['ai-usage-settings'] });
      queryClient.invalidateQueries({ queryKey: ['ai-usage'] });
      queryClient.invalidateQueries({ queryKey: ['chatbot-credits'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Please try again.')),
  });

  const changed = !!data && (fromField(cap) !== data.monthlyCap || fromField(reserve) !== data.chatReserve);

  return (
    <section className={panel}>
      <h2 className="text-[15px] font-semibold text-regantify-text">Spending limits</h2>
      <p className="mt-0.5 text-[13px] text-neutral-500">{isOwner ? 'Leave empty for no limit.' : 'Only the store owner can change these.'}</p>
      <div className="mt-4 space-y-4">
        <NumberField
          id="ai-monthly-cap"
          label="Monthly AI limit"
          value={cap}
          onChange={setCap}
          disabled={!isOwner}
          hint="All AI stops for the rest of the month at this many credits. You get a bell note at 80%."
        />
        <NumberField
          id="ai-chat-reserve"
          label="Keep for store chat"
          value={reserve}
          onChange={setReserve}
          disabled={!isOwner}
          hint="Ask AI, product AI, the chat extension and reply drafts leave this many credits for shoppers."
        />
        {isOwner && (
          <div className="flex justify-end">
            <button type="button" disabled={!changed || save.isPending} onClick={() => save.mutate()} className={`${secondaryBtn} h-9 px-4`}>
              {save.isPending ? 'Saving…' : 'Save limits'}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function AllowancesCard({ report }: { report: AiUsageReport | undefined }) {
  if (!report) return null;
  return (
    <section className={panel}>
      <h2 className="text-[15px] font-semibold text-regantify-text">Free AI each month</h2>
      <p className="mt-0.5 text-[13px] text-neutral-500">Included with your plan, not paid in credits</p>
      <ul className="mt-4 space-y-4">
        {report.allowances.map((a) => {
          const meta = ALLOWANCES[a.key];
          const Icon = meta.icon;
          const pct = a.limit ? Math.min(100, Math.round((a.used / a.limit) * 100)) : 0;
          return (
            <li key={a.key}>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
                  <Icon size={16} strokeWidth={1.9} aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <Link to={meta.to} className="text-sm font-medium text-regantify-text hover:underline">
                    {meta.name}
                  </Link>
                  <p className="truncate text-xs text-neutral-500">{meta.what}</p>
                </div>
                <span className="shrink-0 text-xs tabular-nums text-neutral-600">
                  {a.limit === 0 ? 'Not in your plan' : a.limit === null ? `${n(a.used)} used, no limit` : `${n(a.used)} of ${n(a.limit)}`}
                </span>
              </div>
              {!!a.limit && (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div className={`h-full rounded-full ${pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------- page

/**
 * AI Usages (sidebar, under Store next to SMS; was AI & Automation > AI Chat Bot):
 * the store's AI Credits in one place, laid out like a wallet: a blue balance
 * card with the period's use as a line and how long the credits last, credits
 * in and out, a bar per day (per week for 90 days), the latest movements, use
 * per AI tool, the owner's spending limits (enforced in the server's
 * AiCreditsService.reserve), the plan's free monthly AI and the full history.
 */
export default function AiUsage() {
  const [period, setPeriod] = useState<Period>('30');
  const [buyOpen, setBuyOpen] = useState(false);
  const days = Number(period) as 7 | 30 | 90;
  const { data: report } = useQuery({
    queryKey: ['ai-usage', days],
    queryFn: () => aiChatBotApi.getUsage(days),
    placeholderData: (prev) => prev,
  });
  const { data: themeInfo } = useQuery({ queryKey: ['vendor-theme'], queryFn: () => getVendorTheme() });

  return (
    <div className="space-y-4">
      <header className="pb-1">
        <h1 className="text-2xl font-semibold tracking-tight text-regantify-text">AI Usages</h1>
        <p className="mt-1 text-[13px] text-neutral-500">What your AI tools use, how long your credits last, and the limits you set.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <BalanceHero report={report} theme={themeInfo?.theme} onBuy={() => setBuyOpen(true)} />
        <InOutCard report={report} />
      </div>

      {/* Two columns that stack on their own, so a tall card on one side never leaves a gap on the other. */}
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <div className="min-w-0 space-y-4 lg:col-span-2">
          <UsageBars report={report} period={period} onPeriod={setPeriod} />
          <ToolsCard report={report} />
          <StoreAiInstructionsCard className={panel} />
          <AiAssistantLookCard className={panel} />
          <section id="ai-credit-history" className={`${panel} scroll-mt-20`}>
            <h2 className="mb-3 text-[15px] font-semibold text-regantify-text">AI Credit history</h2>
            <History />
            <p className="mt-3 text-xs text-neutral-500">
              Each AI answer takes credits for what it really costs. A store chat reply sends your product list with the shopper’s question, so a store with more
              products uses a few more credits a reply. AI Credits never expire, and an answer that fails or gets cut off isn’t charged.
            </p>
          </section>
        </div>
        <div className="min-w-0 space-y-4">
          <RecentCard />
          <AiSwitches />
          <PhotoSearchAiCard className={panel} />
          <VoiceCallLinkCard theme={themeInfo?.theme} />
          <SpendingControls />
          <AllowancesCard report={report} />
        </div>
      </div>

      <BuyChatBotDialog open={buyOpen} onOpenChange={setBuyOpen} creditsPerReply={report?.credits.creditsPerReply} />
    </div>
  );
}
