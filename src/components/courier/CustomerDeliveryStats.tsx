import type { ReactNode } from 'react';
import type { CourierCheckLine, CourierStatLine, PhoneCourierStats, SteadfastScore } from '../../lib/ordersApi';

/** Success % of a record, or null when nothing has finished yet. */
function rate(line: CourierStatLine): number | null {
  return line.total > 0 ? Math.round((line.successful / line.total) * 100) : null;
}

// Risk colours for the combined line (pathao-plan.md Step 15): ≥80% fine,
// 60-80% careful, <60% risky. Always shown with the number, never colour alone.
function riskClass(percent: number | null): string {
  if (percent == null) return 'text-neutral-500';
  if (percent >= 80) return 'text-emerald-700';
  if (percent >= 60) return 'text-amber-700';
  return 'text-red-600';
}

function tooltip(name: string, line: CourierStatLine) {
  return `${name}: Successful=${line.successful}, Returned=${line.returned}, Total=${line.total}`;
}

const VOLUME_LABEL: Record<string, string> = {
  none: 'no finished parcels',
  low: '1-5 parcels',
  medium: '6-20 parcels',
  high: '21-200 parcels',
  very_high: '200+ parcels',
};

/** "92% delivered · 21-200 parcels" — SteadFast's score, which has percents and a volume band but no counts. */
export function steadfastScoreText(score: SteadfastScore): string {
  const volume = score.volumeBand ? VOLUME_LABEL[score.volumeBand] ?? score.volumeBand : null;
  if (score.deliveryRatio == null) return volume && score.volumeBand !== 'none' ? `Nothing delivered yet · ${volume}` : 'New number: no SteadFast history';
  return [`${score.deliveryRatio}% delivered`, volume].filter(Boolean).join(' · ');
}

/** "no_response ×3, refused ×1" from SteadFast's report categories. */
export function fraudCategoriesText(categories: Record<string, number>): string {
  return Object.entries(categories)
    .map(([code, times]) => `${code.replace(/_/g, ' ')} ×${times}`)
    .join(', ');
}

/** Small square letter mark identifying a source line (not a brand logo). */
export function SourceMark({ letter, className }: { letter: string; className: string }) {
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center min-w-3.5 h-3.5 px-[1px] rounded-[3px] text-[8px] font-bold text-white shrink-0 ${className}`}
    >
      {letter}
    </span>
  );
}

function Line({ mark, name, line, compact }: { mark: ReactNode; name: string; line: CourierStatLine; compact?: boolean }) {
  const percent = rate(line);
  return (
    <p className={`flex items-center gap-1.5 text-regantify-text ${compact ? 'text-xs' : 'text-[11px]'}`} title={tooltip(name, line)}>
      {mark}
      {!compact && <span className="text-neutral-500">{name}</span>}
      <span className="tabular-nums">{percent == null ? 'No history' : `${percent}% (${line.total})`}</span>
    </p>
  );
}

/** One courier's line — its numbers once fetched, else why there are none yet. */
function CourierLine({ mark, name, line, compact }: { mark: ReactNode; name: string; line: CourierCheckLine; compact?: boolean }) {
  if (!line.fetchedAt) {
    return (
      <p className="flex items-center gap-1.5 text-[11px] text-neutral-500" title={line.error ?? undefined}>
        {mark}
        {compact ? '' : `${name} `}{line.pending ? 'checking…' : line.error ? 'not available' : 'no record yet'}
      </p>
    );
  }
  const score = line.steadfastScore;
  const categories = score ? fraudCategoriesText(score.fraudCategories) : '';
  return (
    <>
      {score ? (
        <p
          className={`flex items-center gap-1.5 text-regantify-text ${compact ? 'text-xs' : 'text-[11px]'}`}
          title={`${name}: Delivered=${score.deliveryRatio ?? '?'}%, Cancelled=${score.cancellationRatio ?? '?'}% of finished parcels`}
        >
          {mark}
          {!compact && <span className="text-neutral-500">{name}</span>}
          <span className={`tabular-nums ${riskClass(score.deliveryRatio)}`}>
            {compact ? (score.deliveryRatio == null ? 'No history' : `${score.deliveryRatio}%`) : steadfastScoreText(score)}
          </span>
        </p>
      ) : (
        <Line mark={mark} name={name} line={line} compact={compact} />
      )}
      {line.fraudReports > 0 && (
        <p className="text-[11px] font-medium text-red-600 pl-5" title={categories || undefined}>
          {line.fraudReports} fraud report{line.fraudReports === 1 ? '' : 's'} on {name}
        </p>
      )}
    </>
  );
}

/**
 * The customer's delivery record under their phone on the Orders list
 * (pathao-plan.md Step 15): a line per connected courier (network-wide,
 * from the vendor's own Pathao / SteadFast account), our StorePal line,
 * and a combined "Total" coloured by risk. Hover a line for its full numbers.
 * SteadFast reports percents rather than counts, so it isn't part of the
 * combined total (its counts are 0).
 */
export function CustomerDeliveryStats({ stats, compact }: { stats: PhoneCourierStats | undefined; compact?: boolean }) {
  if (!stats) return null;
  const { pathao, steadfast, storepal } = stats;
  const known = [pathao, steadfast].filter((line): line is CourierCheckLine => Boolean(line?.fetchedAt));
  const combined: CourierStatLine = known.reduce(
    (acc, line) => ({ successful: acc.successful + line.successful, returned: acc.returned + line.returned, total: acc.total + line.total }),
    { ...storepal },
  );
  const combinedRate = rate(combined);

  return (
    <div className={compact ? 'mt-2 space-y-1' : 'mt-1.5 space-y-0.5'}>
      {pathao && <CourierLine mark={<SourceMark letter="P" className="bg-red-600" />} name="Pathao" line={pathao} compact={compact} />}
      {steadfast && <CourierLine mark={<SourceMark letter="SF" className="bg-teal-600" />} name="SteadFast" line={steadfast} compact={compact} />}
      <Line mark={<SourceMark letter="S" className="bg-regantify-black" />} name="StorePal" line={storepal} compact={compact} />
      <p className={`${compact ? 'text-xs' : 'text-[11px]'} font-semibold tabular-nums ${riskClass(combinedRate)}`} title={tooltip('Total', combined)}>
        {combinedRate == null ? 'No delivery history' : `Total: ${combinedRate}% (${combined.total})`}
      </p>
    </div>
  );
}
