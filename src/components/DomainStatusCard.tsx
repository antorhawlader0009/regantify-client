import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Circle, Copy, Loader2, RefreshCw } from 'lucide-react';
import { apiErrorMessage } from '../lib/api';
import { DOMAIN_STATUS, domainsApi } from '../lib/domainsApi';
import { toast } from '../lib/toast';

function CopyLine({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-0.5 font-mono text-xs text-regantify-text">
      {value}
      <button
        type="button"
        aria-label={`Copy ${value}`}
        className="rounded p-0.5 text-regantify-text-muted hover:bg-black/5"
        onClick={() =>
          void navigator.clipboard?.writeText(value).then(() => {
            setDone(true);
            toast.success('Copied');
            setTimeout(() => setDone(false), 1500);
          })
        }
      >
        {done ? <Check size={12} /> : <Copy size={12} />}
      </button>
    </span>
  );
}

/**
 * Once the domain is live: how the store gets its Google search numbers. Search Console belongs to the store's own Google account (its
 * data is theirs and only they can add the TXT at their domain seller), so the store does these steps; the server already made the domain
 * the store's main address for search engines (Store > SEO "Prefer my custom domain", turned on when it went live).
 */
function GoogleSearchCard({ domain }: { domain: string }) {
  const sitemap = `https://${domain}/sitemap.xml`;
  return (
    <div className="mt-4 border-t border-black/5 pt-4">
      <p className="text-sm font-medium text-regantify-text">Get found on Google</p>
      <p className="mt-1 text-sm text-regantify-text-muted">
        {domain} is now your store's main address for Google. To see how many people find you on Google and what they search, add it to
        Google Search Console once (about 5 minutes):
      </p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-regantify-text marker:text-regantify-text-muted">
        <li>
          Open{' '}
          <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="font-medium underline">
            Google Search Console
          </a>{' '}
          and sign in with your Gmail.
        </li>
        <li>
          Choose <span className="font-medium">Domain</span> and type <CopyLine value={domain} />
        </li>
        <li>Google shows a TXT record. Add it where you manage your domain (same place as the records above), then press Verify.</li>
        <li>
          Open <span className="font-medium">Sitemaps</span> and submit <CopyLine value={sitemap} />
        </li>
      </ol>
      <p className="mt-2 text-xs text-regantify-text-muted">
        Google usually shows the first numbers in 2 or 3 days. All visits (Facebook, direct, Google) are already in Analytics. Search settings:{' '}
        <Link to="/vendor/store/seo" className="underline">
          Store &gt; SEO
        </Link>
        .
      </p>
    </div>
  );
}

/** Store > Domain: where the connected domain stands, checked by the server (super-admin-new.md Step 9). */
export function DomainStatusCard({ domain }: { domain: string }) {
  const qc = useQueryClient();
  // Same key as the Domain page, so the guide and this card share one answer. While the domain isn't live it is asked every 15 seconds:
  // the server looks at DNS each time and, once the records are there, asks Cloudflare again by itself, so the page finishes on its own.
  const { data } = useQuery({ queryKey: ['vendor-domain-status', domain], queryFn: domainsApi.status, refetchInterval: (q) => (q.state.data?.status === 'ACTIVE' ? false : 15_000) });
  const check = useMutation({
    mutationFn: domainsApi.check,
    onSuccess: (r) => qc.setQueryData(['vendor-domain-status', domain], r),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not check right now.')),
  });
  if (!data) return null;
  const checks = data.checks ?? null;
  const apex = data.apexSetup ?? null;
  // A main domain shows where it is in its two stages instead of the plain status (VERIFIED would say "DNS is right" before @ points at us).
  const s =
    apex?.stage === 'RECORDS'
      ? { label: 'Step 1 of 2', cls: 'bg-amber-50 text-amber-800', hint: 'Add the two records shown below. This page ticks each one when it sees it.' }
      : apex?.stage === 'POINT'
        ? { label: 'Step 2 of 2', cls: 'bg-blue-50 text-blue-700', hint: 'Your domain is confirmed and its certificate is ready. Now point it to your store (step 2 below).' }
        : DOMAIN_STATUS[data.status ?? 'PENDING'];
  const rows: { label: string; ok: boolean }[] = [];
  if (checks && apex?.stage === 'RECORDS') {
    if (checks.txt !== null) rows.push({ label: 'Ownership code (TXT _cf-custom-hostname)', ok: checks.txt });
    if (checks.dcv != null) rows.push({ label: 'Certificate record (CNAME _acme-challenge)', ok: checks.dcv });
  } else if (checks && apex?.stage === 'POINT') {
    rows.push({ label: 'Step 1: domain confirmed, certificate ready', ok: true });
    rows.push({ label: 'Step 2: your domain points to your store', ok: checks.pointing });
  } else if (checks) {
    rows.push({ label: 'Your domain points to your store', ok: checks.pointing });
  }
  const allFound = rows.length > 0 && rows.every((r) => r.ok);
  // Cloudflare's own words ("does not CNAME to this zone") mean nothing to a store, so while the tick list is shown they stay hidden.
  const showError = data.error && data.status !== 'ACTIVE' && rows.length === 0;
  return (
    <div className="mb-6 rounded-2xl border border-black/5 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-regantify-text">
            {domain} <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>{s.label}</span>
          </p>
          <p className="mt-1 text-sm text-regantify-text-muted">{s.hint}</p>
          {showError && <p className="mt-1 text-xs text-regantify-text">{data.error}</p>}
          {data.checkedAt && (
            <p className="mt-1 text-xs text-regantify-text-muted">
              Last checked {new Date(data.checkedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' })}
            </p>
          )}
        </div>
        {data.status !== 'ACTIVE' && (
          <button type="button" disabled={check.isPending} onClick={() => check.mutate()} className="flex items-center gap-1.5 rounded-xl border border-black/10 px-4 py-2 text-sm text-regantify-text disabled:opacity-60">
            {check.isPending ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />} Check now
          </button>
        )}
      </div>
      {data.status !== 'ACTIVE' && rows.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-black/5 pt-4">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center gap-2.5 text-sm">
              {r.ok ? (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white"><Check size={13} /></span>
              ) : (
                <span className="flex h-5 w-5 items-center justify-center text-regantify-text-muted"><Circle size={16} /></span>
              )}
              <span className={r.ok ? 'text-regantify-text' : 'text-regantify-text-muted'}>
                {r.label} <span className="text-xs">{r.ok ? '(found)' : '(not found yet)'}</span>
              </span>
            </li>
          ))}
          {allFound && (
            <li className="flex items-center gap-2.5 text-sm text-regantify-text">
              <Loader2 size={16} className="animate-spin text-regantify-text-muted" />
              {apex?.stage === 'RECORDS'
                ? 'Both records found. Waiting for the confirmation; step 2 opens by itself, usually within a few minutes.'
                : 'All records found. Finishing the setup, usually within a few minutes. You can leave this page open.'}
            </li>
          )}
          {!allFound && <li className="pl-7 text-xs text-regantify-text-muted">Records can take a few minutes to show up after you save them. This list updates by itself.</li>}
        </ul>
      )}
      {data.status === 'ACTIVE' && (
        <a href={`https://${domain}`} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-medium text-regantify-text underline">
          Open https://{domain}
        </a>
      )}
      {data.status === 'ACTIVE' && <GoogleSearchCard domain={domain} />}
    </div>
  );
}
