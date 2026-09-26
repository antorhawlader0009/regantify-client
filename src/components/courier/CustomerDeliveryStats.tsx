import type { ReactNode } from 'react';
import type { CourierStatLine, PhoneCourierStats } from '../../lib/ordersApi';

/** Success % of a record, or null when nothing has finished yet. */
function rate(line: CourierStatLine): number | null {
  return line.total > 0 ? Math.round((line.successful / line.total) * 100) : null;
}

// Risk colours for the combined line (pathao-plan.md Step 15): ≥80% fine,
// 60-80% careful, <60% risky. Always shown with the number, never colour alone.
function riskClass(percent: number | null): string {
  if (percent == null) return 'text-regantify-text-muted';
  if (percent >= 80) return 'text-green-700';
  if (percent >= 60) return 'text-amber-700';
  return 'text-red-600';
}

function tooltip(name: string, line: CourierStatLine) {
  return `${name}: Successful=${line.successful}, Returned=${line.returned}, Total=${line.total}`;
}

/** Small square letter mark identifying a source line (not a brand logo). */
export function SourceMark({ letter, className }: { letter: string; className: string }) {
  return (
    <span aria-hidden className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-[3px] text-[8px] font-bold text-white shrink-0 ${className}`}>
      {letter}
    </span>
  );
}

function Line({ mark, name, line }: { mark: ReactNode; name: string; line: CourierStatLine }) {
  const percent = rate(line);
  return (
    <p className="flex items-center gap-1.5 text-[11px] text-regantify-text" title={tooltip(name, line)}>
      {mark}
      <span className="text-regantify-text-muted">{name}</span>
      <span className="tabular-nums">{percent == null ? 'No history' : `${percent}% (${line.total})`}</span>
    </p>
  );
}

/**
 * The customer's delivery record under their phone on the Orders list
 * (pathao-plan.md Step 15): the Pathao line (network-wide, from the
 * vendor's own Pathao account), our StorePal line, and a combined
 * "Total" coloured by risk. Hover a line for its full numbers.
 */
export function CustomerDeliveryStats({ stats }: { stats: PhoneCourierStats | undefined }) {
  if (!stats) return null;
  const { pathao, storepal } = stats;
  const pathaoKnown = pathao && pathao.fetchedAt ? pathao : null;
  const combined: CourierStatLine = {
    successful: storepal.successful + (pathaoKnown?.successful ?? 0),
    returned: storepal.returned + (pathaoKnown?.returned ?? 0),
    total: storepal.total + (pathaoKnown?.total ?? 0),
  };
  const combinedRate = rate(combined);

  return (
    <div className="mt-1.5 space-y-0.5">
      {pathao &&
        (pathaoKnown ? (
          <Line mark={<SourceMark letter="P" className="bg-red-600" />} name="Pathao" line={pathaoKnown} />
        ) : (
          <p className="flex items-center gap-1.5 text-[11px] text-regantify-text-muted" title={pathao.error ?? undefined}>
            <SourceMark letter="P" className="bg-red-600" />
            Pathao {pathao.pending ? 'checking…' : pathao.error ? 'not available' : 'no record yet'}
          </p>
        ))}
      <Line mark={<SourceMark letter="S" className="bg-regantify-black" />} name="StorePal" line={storepal} />
      <p className={`text-[11px] font-semibold tabular-nums ${riskClass(combinedRate)}`} title={tooltip('Total', combined)}>
        {combinedRate == null ? 'No delivery history' : `Total: ${combinedRate}% (${combined.total})`}
      </p>
    </div>
  );
}
