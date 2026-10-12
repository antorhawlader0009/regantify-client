import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { ArrowRight, History } from 'lucide-react';
import { EmptyState, PageHeader, PageSection, outlineBtn } from '../../../components/ui/PageKit';
import { AREA_LABEL, auditApi } from '../../../lib/auditApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';

const inputClass = 'h-9 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text focus:border-brand focus:outline-none';

/**
 * Account > Activity log (TellMe idea 158, owner only): who changed what in the store. Prices and costs, product deletes and hides, coupons, delivery and
 * checkout rules, payment options, courier accounts, the blacklist, the domain, and the team log (staff added, role changed...). For prices, delivery
 * charges and the domain it shows the old and the new value. Kept for 180 days.
 */
export default function ActivityLog() {
  const [area, setArea] = useState('');
  const [actor, setActor] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const query = { area: area || undefined, actor: actor.trim() || undefined, from: from || undefined, to: to || undefined, page };
  const { data, isLoading } = useQuery({ queryKey: ['audit-log', query], queryFn: () => auditApi.list(query), placeholderData: keepPreviousData });
  const pages = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;
  const filter = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPage(1);
  };

  return (
    <PageSection>
      <PageHeader title="Activity log" description="Who changed what: prices, coupons, delivery rules, payment and courier connections, the blacklist, the domain and your team. Kept for 180 days." />
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-sm text-neutral-600">
          About
          <select value={area} onChange={(e) => filter(setArea)(e.target.value)} className={`${inputClass} mt-1 block`}>
            <option value="">Everything</option>
            {(data?.areas ?? Object.keys(AREA_LABEL)).map((a) => (
              <option key={a} value={a}>
                {AREA_LABEL[a] ?? a}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-neutral-600">
          Done by
          <input value={actor} onChange={(e) => filter(setActor)(e.target.value)} placeholder="a name" className={`${inputClass} mt-1 block w-44`} />
        </label>
        <label className="text-sm text-neutral-600">
          From
          <input type="date" value={from} max={to || undefined} onChange={(e) => filter(setFrom)(e.target.value)} className={`${inputClass} mt-1 block`} />
        </label>
        <label className="text-sm text-neutral-600">
          To
          <input type="date" value={to} min={from || undefined} onChange={(e) => filter(setTo)(e.target.value)} className={`${inputClass} mt-1 block`} />
        </label>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>
      ) : !data || data.items.length === 0 ? (
        <EmptyState icon={History} title="Nothing here yet" hint="Changes to prices, coupons, delivery rules and connections appear here from now on." />
      ) : (
        <>
          <ul className="divide-y divide-line rounded-xl border border-line bg-white">
            {data.items.map((it) => (
              <li key={it.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="text-sm font-medium text-regantify-text">{it.actor}</span>
                  <span className="text-sm text-neutral-700">{it.summary}</span>
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {formatDhakaDateTime(it.at)} · {AREA_LABEL[it.area] ?? it.area}
                </p>
                {it.changes.length > 0 && (
                  <ul className="mt-1.5 space-y-0.5 text-xs">
                    {it.changes.map((c) => (
                      <li key={c.field} className="flex flex-wrap items-center gap-1.5 text-neutral-600">
                        <span className="font-medium">{c.field}:</span>
                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-800">{c.before}</span>
                        <ArrowRight size={11} aria-hidden />
                        <span className="rounded bg-green-50 px-1.5 py-0.5 text-green-800">{c.after}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          {pages > 1 && (
            <div className="mt-3 flex items-center justify-end gap-2 text-sm">
              <button type="button" className={outlineBtn} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <span className="text-neutral-500">
                {page} / {pages}
              </span>
              <button type="button" className={outlineBtn} disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </PageSection>
  );
}
