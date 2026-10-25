import { useRef, type ReactNode } from 'react';
import { ChevronRight, RefreshCw, Store } from 'lucide-react';
import type { CourierCheckLine, CourierStatLine, OrderStatus, PhoneCourierStats } from '../../lib/ordersApi';
import { orderStatusLabel } from '../../pages/vendor/order/orderStatus';
import { fraudCategoriesText } from './CustomerDeliveryStats';

/**
 * The customer's delivery record as a row of cards at the top of Order
 * detail: this store's own record, the overall figure, then one card per
 * courier. Every courier always has a card; one with no record for us
 * (not connected, or RedX / CarryBee, which have no per-number lookup)
 * shows dashes. Same data as `CustomerDeliveryStats`. Scrolls sideways.
 */

const VOLUME: Record<string, string> = { none: '0', low: '1-5', medium: '6-20', high: '21-200', very_high: '200+' };

/** Shown on a card whose courier gives us nothing for this number. */
const EMPTY = '—';

function rate(line: CourierStatLine): number | null {
  return line.total > 0 ? Math.round((line.successful / line.total) * 100) : null;
}

// Same thresholds as the Orders list: ≥80% fine, 60-80% careful, <60% risky.
function tone(percent: number | null): { text: string; bar: string } {
  if (percent == null) return { text: 'text-neutral-400', bar: 'bg-neutral-200' };
  if (percent >= 80) return { text: 'text-emerald-600', bar: 'bg-emerald-500' };
  if (percent >= 60) return { text: 'text-amber-600', bar: 'bg-amber-500' };
  return { text: 'text-red-600', bar: 'bg-red-600' };
}

/* ---------- header drawings (our own shapes, not brand artwork) ---------- */

/** Big faded shape behind a header's right side. */
function HeaderArt({ kind }: { kind: 'swoosh' | 'plane' | 'word' | 'rings' | 'dots' }) {
  const common = 'pointer-events-none absolute right-0 top-0 h-full w-28 text-white opacity-20';
  if (kind === 'word') {
    return (
      <span aria-hidden className="pointer-events-none absolute -right-1 top-1/2 -translate-y-1/2 text-[26px] font-black italic tracking-tighter text-black/25">
        RED
      </span>
    );
  }
  return (
    <svg aria-hidden viewBox="0 0 112 36" preserveAspectRatio="xMaxYMid slice" className={common} fill="none">
      {kind === 'swoosh' && (
        <>
          <circle cx="78" cy="18" r="22" stroke="currentColor" strokeWidth="9" />
          <path d="M96 -4 L112 -4 L112 40 L88 40 Z" fill="currentColor" />
        </>
      )}
      {kind === 'plane' && <path d="M40 30 L110 2 L84 36 L74 22 Z M74 22 L110 2" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />}
      {kind === 'rings' && (
        <>
          <circle cx="92" cy="18" r="10" stroke="currentColor" strokeWidth="3" />
          <circle cx="92" cy="18" r="20" stroke="currentColor" strokeWidth="3" />
          <circle cx="92" cy="18" r="30" stroke="currentColor" strokeWidth="3" />
        </>
      )}
      {kind === 'dots' &&
        [0, 1, 2, 3].flatMap((r) => [0, 1, 2, 3, 4].map((c) => <circle key={`${r}-${c}`} cx={64 + c * 11} cy={4 + r * 10} r="2.2" fill="currentColor" />))}
    </svg>
  );
}

/** Small white badge with a mark before a courier's name. */
function Badge({ children, className = 'text-neutral-800' }: { children: ReactNode; className?: string }) {
  return (
    <span aria-hidden className={`inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-white px-1 text-[10px] font-black shadow-sm ${className}`}>
      {children}
    </span>
  );
}

/* ---------- card pieces ---------- */

function Card({ title, head, art, badge, action, wide, children }: {
  title: string;
  head: string;
  art?: ReactNode;
  badge?: ReactNode;
  action?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`flex shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm ${wide ? 'w-64' : 'w-44'}`}>
      <div className={`relative flex h-9 items-center gap-2 overflow-hidden px-3 ${head}`}>
        {art}
        <span className={`relative flex min-w-0 flex-1 items-center gap-2 ${wide ? '' : 'justify-center'}`}>
          {badge}
          <span className="truncate text-[13px] font-semibold">{title}</span>
          {!wide && action}
        </span>
        {wide && action}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 px-3 py-2.5 text-xs">{children}</div>
    </div>
  );
}

function Row({ label, value, className = 'text-regantify-text' }: { label: string; value: ReactNode; className?: string }) {
  return (
    <p className="flex items-center justify-between gap-2 leading-5">
      <span className="text-neutral-500">{label}</span>
      <span className={`font-semibold tabular-nums ${className}`}>{value}</span>
    </p>
  );
}

function Bar({ percent }: { percent: number | null }) {
  return (
    <div className="mt-auto pt-2">
      <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
        <div className={`h-full rounded-full ${tone(percent).bar}`} style={{ width: `${percent ?? 0}%` }} />
      </div>
    </div>
  );
}

/** Success rate / Total / Success / Cancelled, or dashes when there's no line. */
function CountRows({ line }: { line: CourierStatLine | null }) {
  const percent = line ? rate(line) : null;
  return (
    <>
      <Row label="Success Rate" value={percent == null ? EMPTY : `${percent}%`} className={tone(percent).text} />
      <Row label="Total" value={line ? line.total : EMPTY} />
      <Row label="Success" value={line ? line.successful : EMPTY} />
      <Row label="Cancelled" value={line ? line.returned : EMPTY} />
      <Bar percent={percent} />
    </>
  );
}

/** A courier card: its numbers once fetched, dashes otherwise (the reason on hover). */
function CourierBody({ line }: { line: CourierCheckLine | null }) {
  if (!line?.fetchedAt) {
    const why = !line ? 'Connect any courier to see every courier\'s record' : line.pending ? 'Checking…' : line.error ? 'Not available right now' : 'No record yet';
    return (
      <div title={why} className="flex flex-1 flex-col">
        <CountRows line={null} />
      </div>
    );
  }
  const score = line.steadfastScore;
  return (
    <>
      {score ? (
        // SteadFast gives percents and a size band, not counts.
        <>
          <Row label="Success Rate" value={score.deliveryRatio == null ? EMPTY : `${score.deliveryRatio}%`} className={tone(score.deliveryRatio).text} />
          <Row label="Total" value={score.volumeBand ? VOLUME[score.volumeBand] ?? score.volumeBand : EMPTY} />
          <Row label="Success" value={score.deliveryRatio == null ? EMPTY : `${score.deliveryRatio}%`} />
          <Row label="Cancelled" value={score.cancellationRatio == null ? EMPTY : `${score.cancellationRatio}%`} />
          <Bar percent={score.deliveryRatio} />
        </>
      ) : (
        <CountRows line={line} />
      )}
      {line.fraudReports > 0 && (
        <p className="mt-1 font-semibold text-red-600" title={score ? fraudCategoriesText(score.fraudCategories) || undefined : undefined}>
          {line.fraudReports} fraud report{line.fraudReports === 1 ? '' : 's'}
        </p>
      )}
    </>
  );
}

export function CustomerRecordStrip({ stats, onRefresh, refreshing, onFillInfo }: {
  stats: PhoneCourierStats | undefined;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** "Fill Info" on Our record; hidden when not given. */
  onFillInfo?: () => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  if (!stats) return null;
  const { pathao, steadfast, storepal, ours } = stats;
  const known = [pathao, steadfast].filter((line): line is CourierCheckLine => Boolean(line?.fetchedAt));
  const overall: CourierStatLine = known.reduce(
    (acc, line) => ({ successful: acc.successful + line.successful, returned: acc.returned + line.returned, total: acc.total + line.total }),
    { ...storepal },
  );
  const open = Object.entries(ours?.open ?? {}).filter(([, n]) => (n ?? 0) > 0) as [OrderStatus, number][];
  const finished = ours?.total ?? 0;

  return (
    <div className="relative">
      <div
        ref={scroller}
        className="flex gap-3 overflow-x-auto pb-2.5 [scrollbar-width:thin] [scrollbar-color:#a78bca_transparent] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#a78bca]"
      >
        {/* Our record */}
        <Card
          wide
          title="Our Record"
          head="bg-[#5b2a86] text-white"
          badge={<Store size={16} className="shrink-0" />}
          action={
            onFillInfo && (
              <button
                type="button"
                onClick={onFillInfo}
                className="relative shrink-0 rounded-full border border-white/60 px-2.5 py-0.5 text-[11px] font-medium text-white hover:bg-white/15"
              >
                Fill Info
              </button>
            )
          }
        >
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {finished === 0 ? (
              <>
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">New customer</span>
                <span className="text-neutral-500">No orders yet</span>
              </>
            ) : (
              <span className="text-neutral-600">
                <span className={`font-semibold ${tone(rate(ours!)).text}`}>{rate(ours!)}%</span> success · {ours!.successful} delivered, {ours!.returned} cancelled
              </span>
            )}
          </div>
          {open.length > 0 && (
            <div className="mt-auto pt-3">
              <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Web orders</p>
              {open.map(([status, n]) => (
                <p key={status} className="flex items-center justify-between leading-5 text-[#3b6fd8]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {orderStatusLabel(status)}
                  </span>
                  <span className="w-16 tabular-nums">{n}</span>
                </p>
              ))}
            </div>
          )}
        </Card>

        <Card
          title="Overall"
          head="bg-[#5b2a86] text-white"
          action={
            onRefresh && (
              <button type="button" onClick={onRefresh} aria-label="Check again" className="shrink-0 rounded p-0.5 hover:bg-white/15">
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              </button>
            )
          }
        >
          {overall.total === 0 && steadfast?.fetchedAt && steadfast.steadfastScore?.deliveryRatio != null ? (
            // No counted history, but SteadFast has a percent: show that rather than 0/0.
            <>
              <Row label="Success Rate" value={`${steadfast.steadfastScore.deliveryRatio}%`} className={tone(steadfast.steadfastScore.deliveryRatio).text} />
              <Row label="Total" value={VOLUME[steadfast.steadfastScore.volumeBand ?? ''] ?? EMPTY} />
              <Row label="Cancelled" value={steadfast.steadfastScore.cancellationRatio == null ? EMPTY : `${steadfast.steadfastScore.cancellationRatio}%`} />
              <p className="text-[10px] text-neutral-400">from SteadFast</p>
              <Bar percent={steadfast.steadfastScore.deliveryRatio} />
            </>
          ) : (
            <CountRows line={overall} />
          )}
        </Card>

        <Card title="Pathao" head="bg-[#e8432e] text-white" art={<HeaderArt kind="swoosh" />} badge={<Badge className="text-[#e8432e]">P</Badge>}>
          <CourierBody line={pathao} />
        </Card>
        <Card title="Steadfast" head="bg-[#2e9e86] text-white" art={<HeaderArt kind="plane" />} badge={<Badge className="text-[#2e9e86]">▼</Badge>}>
          <CourierBody line={steadfast} />
        </Card>
        <Card title="RedX" head="bg-[#e21f26] text-white" art={<HeaderArt kind="word" />} badge={<Badge className="text-[#e21f26]">RX</Badge>}>
          <CourierBody line={null} />
        </Card>
        <Card title="CarryBee" head="bg-[#f5c518] text-neutral-900" art={<HeaderArt kind="rings" />} badge={<Badge className="text-amber-600">CB</Badge>}>
          <CourierBody line={null} />
        </Card>
        <Card title="StorePal" head="bg-neutral-800 text-white" art={<HeaderArt kind="dots" />} badge={<Badge>S</Badge>}>
          <CountRows line={storepal} />
        </Card>
      </div>

      <button
        type="button"
        aria-label="More"
        onClick={() => scroller.current?.scrollBy({ left: 200, behavior: 'smooth' })}
        className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-white text-neutral-600 shadow-md hover:bg-neutral-50"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
