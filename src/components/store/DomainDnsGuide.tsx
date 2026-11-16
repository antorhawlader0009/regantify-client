import { useState } from 'react';
import { Check, Copy, Info, Loader2 } from 'lucide-react';
import { toast } from '../../lib/toast';
import type { DnsHost } from '../../lib/domainsApi';

// Store > Domain: the exact steps for the company where the store's domain DNS is managed (2026-11-10).
// Checked against each company's own help pages that day: Cloudflare flattens a CNAME on the main domain; Namecheap and Porkbun
// offer ALIAS records there; Hostinger turns a CNAME on @ into an ALIAS; GoDaddy can't, so the store uses www and forwards the main
// domain to it. The server guesses the company from the domain's nameservers (`dnsHost`), so the right guide usually opens by itself.

const HOSTS: { key: DnsHost; label: string }[] = [
  { key: 'cloudflare', label: 'Cloudflare' },
  { key: 'namecheap', label: 'Namecheap' },
  { key: 'hostinger', label: 'Hostinger' },
  { key: 'godaddy', label: 'GoDaddy' },
  { key: 'porkbun', label: 'Porkbun' },
  { key: 'other', label: 'Other (ExonHost, XeonBD, cPanel...)' },
];

/**
 * Companies that can point the main domain (mystore.com) at us: every one with an ALIAS / ANAME / flattened record on @. GoDaddy has none,
 * so its stores use www and forward the main domain to it. A main domain is set up in two stages (`ApexSteps`, 2026-11-16, tested on
 * solvanebd.com at Namecheap): first the ownership TXT and the certificate CNAME while the domain still points elsewhere, then the record on @.
 * Pointing @ first fails for good: the ALIAS answers with Cloudflare's addresses and Cloudflare then refuses every proof.
 */
const APEX_OK: Record<DnsHost, boolean> = { cloudflare: true, namecheap: true, hostinger: true, porkbun: true, godaddy: false, other: true };

/** How each company's form names the boxes of a CNAME record. */
const CNAME_LABELS: Record<DnsHost, { type: string; host: string; value: string; note?: string }> = {
  cloudflare: { type: 'CNAME', host: 'Name', value: 'Target', note: 'Proxy status: DNS only (grey cloud)' },
  namecheap: { type: 'CNAME Record', host: 'Host', value: 'Value' },
  hostinger: { type: 'CNAME', host: 'Name', value: 'Target' },
  godaddy: { type: 'CNAME', host: 'Name', value: 'Value' },
  porkbun: { type: 'CNAME', host: 'Host', value: 'Answer' },
  other: { type: 'CNAME', host: 'Name / Host', value: 'Value / Target' },
};

/** The record on @ (step 2), as each company's form names it. */
const APEX_RECORD: Record<DnsHost, { type: string; host: string; hostValue: string; value: string; note?: string }> = {
  cloudflare: { type: 'CNAME', host: 'Name', hostValue: '@', value: 'Target', note: 'Proxy status: DNS only (grey cloud). Cloudflare "flattens" it, that is right.' },
  namecheap: { type: 'ALIAS Record', host: 'Host', hostValue: '@', value: 'Value' },
  hostinger: { type: 'CNAME', host: 'Name', hostValue: '@', value: 'Target', note: 'Hostinger shows it as ALIAS after saving, that is right.' },
  godaddy: { type: 'CNAME', host: 'Name', hostValue: '@', value: 'Value' },
  porkbun: { type: 'ALIAS', host: 'Host', hostValue: '(leave empty)', value: 'Answer' },
  other: { type: 'ALIAS or ANAME', host: 'Name / Host', hostValue: '@', value: 'Value / Target' },
};

type ApexSetup = { stage: 'RECORDS' | 'POINT'; ownership: { host: string; value: string } | null; dcv: { host: string; value: string } | null };

/** A main domain's two stages (see APEX_OK). The status card above ticks each record as it appears. */
function ApexSteps({ host, domain, target, setup, onUseWww, switching }: { host: DnsHost; domain: string; target: string; setup: ApexSetup; onUseWww: () => void; switching: boolean }) {
  const txt = TXT_LABELS[host];
  const cname = CNAME_LABELS[host];
  const rec = APEX_RECORD[host];
  const stepCls = (on: boolean) => `rounded-xl border p-4 ${on ? 'border-regantify-text/30 bg-white' : 'border-black/5 bg-neutral-50 opacity-70'}`;
  return (
    <div className="space-y-4">
      <div className={stepCls(setup.stage === 'RECORDS')}>
        <h3 className="text-sm font-semibold text-regantify-text">
          Step 1 of 2: prove the domain is yours {setup.stage === 'POINT' && <span className="ml-1 font-normal text-green-700">(done)</span>}
        </h3>
        {setup.stage === 'RECORDS' ? (
          <>
            <p className="mb-2 mt-1 text-sm text-regantify-text-muted">
              Add these two records. Don't change anything else yet: your domain keeps working as it is during this step.
            </p>
            <Steps>
              <li>{TXT_WHERE[host]}</li>
              <li>
                First record:
                {setup.ownership ? (
                  <RecordBox rows={[
                    { label: 'Type', value: txt.type },
                    { label: txt.host, value: setup.ownership.host, copy: true, note: `only this part, the company adds .${domain}` },
                    { label: txt.value, value: setup.ownership.value, copy: true },
                    { label: 'TTL', value: txt.ttl },
                  ]} />
                ) : (
                  <p className="my-2 text-sm text-regantify-text-muted"><Loader2 size={14} className="mr-1 inline animate-spin" /> Getting your code...</p>
                )}
              </li>
              <li>
                Add a second record (it lets your secure certificate renew by itself, keep it for ever):
                {setup.dcv ? (
                  <RecordBox rows={[
                    { label: 'Type', value: cname.type },
                    { label: cname.host, value: setup.dcv.host, copy: true, note: `only this part, the company adds .${domain}` },
                    { label: cname.value, value: setup.dcv.value, copy: true },
                    ...(cname.note ? [{ label: 'Note', value: cname.note }] : []),
                  ]} />
                ) : (
                  <p className="my-2 text-sm text-regantify-text-muted"><Loader2 size={14} className="mr-1 inline animate-spin" /> Getting the record...</p>
                )}
              </li>
              <li>Save both. If an older TXT named <span className="font-mono">_cf-custom-hostname</span> or a TXT named <span className="font-mono">_acme-challenge</span> is already there, delete it.</li>
              <li>Wait on this page. When both are ticked above and confirmed, step 2 opens by itself (usually 5 to 30 minutes).</li>
            </Steps>
          </>
        ) : (
          <p className="mt-1 text-sm text-regantify-text-muted">Your domain is confirmed and its secure certificate is ready. Keep both records.</p>
        )}
      </div>

      <div className={stepCls(setup.stage === 'POINT')}>
        <h3 className="text-sm font-semibold text-regantify-text">Step 2 of 2: point your domain to your store</h3>
        {setup.stage === 'POINT' ? (
          <>
            <Steps>
              <li>
                On the same DNS page, delete the old records on host <span className="font-mono">@</span>: any A, AAAA, CNAME, ALIAS or URL Redirect record
                (parking pages use them). Keep MX and TXT records, and the two records from step 1.
              </li>
              <li>
                Add this record:
                <RecordBox rows={[
                  { label: 'Type', value: rec.type },
                  { label: rec.host, value: rec.hostValue, copy: rec.hostValue === '@' },
                  { label: rec.value, value: target, copy: true },
                  { label: 'TTL', value: 'Automatic / default' },
                  ...(rec.note ? [{ label: 'Note', value: rec.note }] : []),
                ]} />
              </li>
              <li>
                If a <span className="font-mono">www</span> record points at <span className="font-mono">{target}</span>, delete it: your store uses{' '}
                <span className="font-mono">{domain}</span> only.
              </li>
              <li>Save. The check above turns green by itself, usually within a few minutes.</li>
            </Steps>
            {host === 'other' && (
              <div className="mt-3 rounded-xl bg-neutral-50 p-3 text-sm text-regantify-text-muted">
                No ALIAS or ANAME for @ at your company? Use <span className="font-mono">www.{domain}</span> for your store instead.
                <button type="button" onClick={onUseWww} disabled={switching} className="ml-2 font-medium text-regantify-text underline disabled:opacity-60">
                  Use www.{domain}
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="mt-1 text-sm text-regantify-text-muted">Opens when step 1 is confirmed. Don't point the domain before that: it would stop the confirmation.</p>
        )}
      </div>
    </div>
  );
}

function CopyValue({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(value).then(() => {
      setDone(true);
      toast.success('Copied');
      setTimeout(() => setDone(false), 1500);
    });
  };
  return (
    <button type="button" onClick={copy} className="ml-2 inline-flex items-center rounded-md p-1 text-regantify-text-muted hover:bg-black/5" aria-label={`Copy ${value}`}>
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

/** The record to add, as the company's own form names its boxes. */
function RecordBox({ rows }: { rows: { label: string; value: string; copy?: boolean; note?: string }[] }) {
  return (
    <div className="my-2 overflow-hidden rounded-xl border border-black/10">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-wrap items-center gap-x-3 border-b border-black/5 px-3.5 py-2 text-sm last:border-b-0">
          <span className="w-28 shrink-0 text-regantify-text-muted">{r.label}</span>
          <span className="font-mono font-medium text-regantify-text">{r.value}</span>
          {r.copy && <CopyValue value={r.value} />}
          {r.note && <span className="text-xs text-regantify-text-muted">({r.note})</span>}
        </div>
      ))}
    </div>
  );
}

/** How each company's form names the boxes of a TXT record. */
const TXT_LABELS: Record<DnsHost, { type: string; host: string; value: string; ttl: string }> = {
  cloudflare: { type: 'TXT', host: 'Name', value: 'Content', ttl: 'Auto' },
  namecheap: { type: 'TXT Record', host: 'Host', value: 'Value', ttl: 'Automatic' },
  hostinger: { type: 'TXT', host: 'Name', value: 'TXT value', ttl: 'leave as it is' },
  godaddy: { type: 'TXT', host: 'Name', value: 'Value', ttl: '1 Hour (default)' },
  porkbun: { type: 'TXT', host: 'Host', value: 'Answer', ttl: 'leave as it is' },
  other: { type: 'TXT', host: 'Name / Host', value: 'Value / Content', ttl: 'default' },
};

/** Where the "add record" button is, per company (the same page as record 1). */
const TXT_WHERE: Record<DnsHost, string> = {
  cloudflare: 'On the same DNS → Records page, click Add record.',
  namecheap: 'On the same Advanced DNS tab, click Add New Record.',
  hostinger: 'On the same DNS records page, add a new record.',
  godaddy: 'On the same DNS page, click Add New Record.',
  porkbun: 'On the same DNS page, add a new record.',
  other: 'On the same DNS page, add a new record.',
};

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal space-y-2.5 pl-5 text-sm text-regantify-text marker:text-regantify-text-muted">{children}</ol>;
}

export function DomainDnsGuide({
  domain,
  recordHost,
  target,
  detected,
  onUseWww,
  txt,
  needsTxt,
  apexSetup,
}: {
  /** A main domain's two-stage setup from the server (null for a subdomain, once live, or while loading). */
  apexSetup?: ApexSetup | null;
  /** The ownership TXT record (host = what to type in the Host/Name box). Null when not needed or already live. */
  txt?: { host: string; value: string } | null;
  /** True for a main domain: the TXT record is required, not a fallback. */
  needsTxt?: boolean;
  domain: string;
  /** '@' for the main domain, else the part in front of it (www, shop). */
  recordHost: string;
  target: string;
  detected: DnsHost | null;
  /** Switches the connected domain to www.<domain> (for companies that can't point the main domain). */
  onUseWww: () => Promise<void>;
}) {
  const [pick, setPick] = useState<DnsHost | null>(null);
  const [switching, setSwitching] = useState(false);
  const host = pick ?? detected ?? 'other';
  const apex = recordHost === '@';
  /** The name that was bought (mystore.com for www.mystore.com). */
  const bought = apex ? domain : domain.slice(recordHost.length + 1);
  const www = `www.${domain}`;
  const needWww = apex && !APEX_OK[host];
  /** A main domain at a company that can point it: the two-stage steps replace the company's single-record steps. */
  const apexFlow = apex && !needWww && !!apexSetup;

  const switchToWww = async () => {
    setSwitching(true);
    try {
      await onUseWww();
    } finally {
      setSwitching(false);
    }
  };

  const WwwPlan = () => (
    <div className="mb-3 rounded-xl border border-black/10 bg-neutral-50 p-4 text-sm text-regantify-text">
      <p className="font-medium">This company can't point the main domain ({domain}) at your store.</p>
      <p className="mt-1 text-regantify-text-muted">
        Use <span className="font-mono">{www}</span> for your store, and send visitors of {domain} there. It takes one click here, then the steps below.
      </p>
      <button
        type="button"
        onClick={switchToWww}
        disabled={switching}
        className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-regantify-cta px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {switching && <Loader2 size={15} className="animate-spin" />} Use {www} instead
      </button>
    </div>
  );

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 sm:p-6">
      <h2 className="text-lg font-medium text-regantify-text">Point your domain to your store</h2>
      <p className="mt-1 text-sm text-regantify-text-muted">Where do you manage your domain? Pick the company, then follow its steps.</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {HOSTS.map((h) => (
          <button
            key={h.key}
            type="button"
            onClick={() => setPick(h.key)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              host === h.key ? 'border-regantify-text bg-regantify-text text-white' : 'border-black/10 text-regantify-text hover:bg-black/5'
            }`}
          >
            {h.label}
            {detected === h.key && h.key !== 'other' && <span className="ml-1.5 text-xs opacity-80">(detected)</span>}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {txt && !needWww && <h3 className="mb-2 text-sm font-semibold text-regantify-text">Record 1: point your domain to your store</h3>}
        {needWww && <WwwPlan />}

        {apexFlow && apexSetup ? (
          <ApexSteps host={host} domain={domain} target={target} setup={apexSetup} onUseWww={() => void switchToWww()} switching={switching} />
        ) : (
        <>

        {host === 'cloudflare' && (
          <Steps>
            <li>Log in to <span className="font-medium">dash.cloudflare.com</span> and open <span className="font-mono">{bought}</span>.</li>
            <li>Go to <span className="font-medium">DNS → Records</span>.</li>
            <li>If a record with the name <span className="font-mono">{recordHost}</span> is already there (A, AAAA or CNAME), click <span className="font-medium">Edit</span> on it. Otherwise click <span className="font-medium">Add record</span>.</li>
            <li>
              Fill it in like this:
              <RecordBox rows={[
                { label: 'Type', value: 'CNAME' },
                { label: 'Name', value: recordHost, copy: true },
                { label: 'Target', value: target, copy: true },
                { label: 'Proxy status', value: 'DNS only', note: 'grey cloud, switch it off' },
                { label: 'TTL', value: 'Auto' },
              ]} />
            </li>
            <li>Click <span className="font-medium">Save</span>. {apex && 'Cloudflare allows a CNAME on the main domain (it "flattens" it), so this is fine.'}</li>
          </Steps>
        )}

        {host === 'namecheap' && !needWww && (
          <Steps>
            <li>Log in to Namecheap, open <span className="font-medium">Domain List</span> and click <span className="font-medium">Manage</span> next to your domain.</li>
            <li>Open the <span className="font-medium">Advanced DNS</span> tab.</li>
            <li>
              Delete the old records on host <span className="font-mono">{recordHost}</span>
              {recordHost === 'www' && <> and on host <span className="font-mono">@</span></>}: any <span className="font-medium">A Record</span>, <span className="font-medium">ALIAS Record</span>,{' '}
              <span className="font-medium">CNAME Record</span>, <span className="font-medium">URL Redirect Record</span>
              {recordHost === 'www' && <> or a <span className="font-medium">TXT Record</span> named <span className="font-mono">_cf-custom-hostname</span></>} (Namecheap adds parking records there). Keep MX and other TXT records.
            </li>
            <li>
              Click <span className="font-medium">Add New Record</span> and fill it in:
              <RecordBox rows={[
                { label: 'Type', value: apex ? 'ALIAS Record' : 'CNAME Record' },
                { label: 'Host', value: recordHost, copy: true },
                { label: apex ? 'Value' : 'Target', value: target, copy: true },
                { label: 'TTL', value: 'Automatic' },
              ]} />
            </li>
            <li>Click the green tick to save.</li>
            {recordHost === 'www' && (
              <li>
                So people who type <span className="font-mono">{bought}</span> also arrive, click <span className="font-medium">Add New Record</span> again:
                <RecordBox rows={[
                  { label: 'Type', value: 'URL Redirect Record' },
                  { label: 'Host', value: '@', copy: true },
                  { label: 'Value', value: `https://${domain}`, copy: true },
                  { label: 'Redirect type', value: 'Permanent (301)', note: 'pick it in the dropdown' },
                ]} />
                Click the green tick to save.
              </li>
            )}
          </Steps>
        )}

        {host === 'hostinger' && !needWww && (
          <Steps>
            <li>Log in to hPanel, go to <span className="font-medium">Domains</span> and click <span className="font-medium">Manage</span> next to your domain.</li>
            <li>Open <span className="font-medium">DNS / Nameservers</span> (DNS records).</li>
            <li>Delete the old <span className="font-medium">A</span>, <span className="font-medium">AAAA</span>, <span className="font-medium">CNAME</span> or <span className="font-medium">ALIAS</span> records with the name <span className="font-mono">{recordHost}</span>.</li>
            <li>
              Add a new record:
              <RecordBox rows={[
                { label: 'Type', value: 'CNAME' },
                { label: 'Name', value: recordHost, copy: true },
                { label: 'Target', value: target, copy: true },
                { label: 'TTL', value: 'leave as it is' },
              ]} />
            </li>
            <li>Click <span className="font-medium">Add Record</span>.</li>
            {recordHost === 'www' && (
              <li>
                So people who type <span className="font-mono">{bought}</span> also arrive: in hPanel open <span className="font-medium">Domains → Redirects</span> (or Redirect domain), send{' '}
                <span className="font-mono">{bought}</span> to <span className="font-mono">https://{domain}</span>, type Permanent (301).
              </li>
            )}
          </Steps>
        )}

        {host === 'porkbun' && !needWww && (
          <Steps>
            <li>Log in to Porkbun, open <span className="font-medium">Domain Management</span> and click <span className="font-medium">DNS</span> under your domain.</li>
            <li>Delete the old records for this name (Porkbun's parking page uses an <span className="font-medium">ALIAS</span> record on the main domain and a <span className="font-medium">CNAME</span> on www).</li>
            <li>
              Add a new record:
              <RecordBox rows={[
                { label: 'Type', value: apex ? 'ALIAS' : 'CNAME' },
                { label: 'Host', value: apex ? '(leave empty)' : recordHost, copy: !apex },
                { label: 'Answer', value: target, copy: true },
                { label: 'TTL', value: 'leave as it is' },
              ]} />
            </li>
            <li>Click <span className="font-medium">Add</span>.</li>
            {recordHost === 'www' && (
              <li>
                So people who type <span className="font-mono">{bought}</span> also arrive: open <span className="font-medium">URL Forwarding</span> for the domain, leave the subdomain empty, forward to{' '}
                <span className="font-mono">https://{domain}</span>, type Permanent (301), and don't include the path.
              </li>
            )}
          </Steps>
        )}

        {host === 'godaddy' && !needWww && (
          <Steps>
            <li>Log in to GoDaddy, open <span className="font-medium">My Products → Domains</span>, pick your domain and open <span className="font-medium">DNS</span>.</li>
            <li>If a <span className="font-medium">CNAME</span> named <span className="font-mono">{recordHost}</span> is already there, click the pencil (Edit) on it. Otherwise click <span className="font-medium">Add New Record</span>.</li>
            <li>
              Fill it in:
              <RecordBox rows={[
                { label: 'Type', value: 'CNAME' },
                { label: 'Name', value: recordHost, copy: true },
                { label: 'Value', value: target, copy: true },
                { label: 'TTL', value: '1 Hour (default)' },
              ]} />
            </li>
            <li>Click <span className="font-medium">Save</span>.</li>
            {recordHost === 'www' && (
              <li>
                So people who type <span className="font-mono">{domain.replace(/^www\./, '')}</span> also arrive: on the same page open <span className="font-medium">Forwarding</span>, add a <span className="font-medium">Domain</span> forward to{' '}
                <span className="font-mono">https://{domain}</span>, type <span className="font-medium">Permanent (301)</span>, and save. Don't let GoDaddy change the www record you just made.
              </li>
            )}
          </Steps>
        )}

        {host === 'other' && !needWww && (
          <Steps>
            <li>Log in where your domain's DNS is managed. It is usually called <span className="font-medium">DNS Management</span>, <span className="font-medium">Zone Editor</span> or <span className="font-medium">Manage DNS</span> (in cPanel: Domains → Zone Editor).</li>
            <li>Delete the old <span className="font-medium">A</span>, <span className="font-medium">AAAA</span> or <span className="font-medium">CNAME</span> records with the name <span className="font-mono">{recordHost}</span>.</li>
            <li>
              Add this record:
              <RecordBox rows={[
                { label: 'Type', value: apex ? 'ALIAS or ANAME (if offered)' : 'CNAME' },
                { label: 'Name / Host', value: recordHost, copy: true },
                { label: 'Value / Target', value: target, copy: true },
              ]} />
            </li>
            <li>Save it.</li>
            {recordHost === 'www' && (
              <li>
                So people who type <span className="font-mono">{domain.replace(/^www\./, '')}</span> also arrive: add a redirect (forward) from it to{' '}
                <span className="font-mono">https://{domain}</span>. In cPanel this is Domains → Redirects, type Permanent (301).
              </li>
            )}
          </Steps>
        )}
        {host === 'other' && apex && (
          <p className="mt-3 text-sm text-regantify-text-muted">
            If your company offers <span className="font-medium">ALIAS</span>, <span className="font-medium">ANAME</span> or "CNAME flattening" for the main domain (@), use that with the value{' '}
            <span className="font-mono">{target}</span> and you can skip the www step. Ask their support if you are not sure.
          </p>
        )}
        </>
        )}
      </div>

      {txt && !needWww && (
        <div className="mt-6 border-t border-black/5 pt-5">
          <h3 className="text-sm font-semibold text-regantify-text">
            Record 2: prove the domain is yours{' '}
            <span className="font-normal text-regantify-text-muted">{needsTxt ? '(needed)' : "(only if it doesn't connect within 30 minutes)"}</span>
          </h3>
          <p className="mb-2 mt-1 text-sm text-regantify-text-muted">
            {needsTxt
              ? 'A main domain needs this second record too. Without it the domain can stay on "Waiting" even when record 1 is right.'
              : 'Usually record 1 is enough for this address. If the check above stays on "not found", add this record too.'}
          </p>
          <Steps>
            <li>{TXT_WHERE[host]}</li>
            <li>
              Fill it in like this:
              <RecordBox rows={[
                { label: 'Type', value: TXT_LABELS[host].type },
                { label: TXT_LABELS[host].host, value: txt.host, copy: true, note: `only this part, ${host === 'other' ? 'most companies add' : 'the company adds'} .${bought} by itself` },
                { label: TXT_LABELS[host].value, value: txt.value, copy: true },
                { label: 'TTL', value: TXT_LABELS[host].ttl },
              ]} />
            </li>
            <li>Save it. Keep record 1 as it is: both records stay.</li>
            {host === 'other' && <li>If the form wants the full name, type <span className="font-mono">{txt.host}.{bought}</span> instead.</li>}
          </Steps>
        </div>
      )}

      <div className="mt-5 flex gap-2.5 rounded-xl bg-neutral-50 p-4 text-sm text-regantify-text-muted">
        <Info size={16} className="mt-0.5 shrink-0" />
        <ul className="space-y-1">
          <li>Don't delete your <span className="font-medium">MX</span> or other <span className="font-medium">TXT</span> records: they run your email.</li>
          <li>Don't change your nameservers. Only the {txt && !needWww ? 'records' : 'record'} above {txt && !needWww ? 'are' : 'is'} needed.</li>
          <li>You don't need to press anything after saving: the check above turns green by itself, usually in 5 to 30 minutes, sometimes a few hours.</li>
          <li>
            The domain stays yours. To use it somewhere else later, press <span className="font-medium">Remove Domain</span> first, then delete the
            records you added here (the record on <span className="font-mono">{recordHost}</span>, and for a main domain also{' '}
            <span className="font-mono">_cf-custom-hostname</span> and <span className="font-mono">_acme-challenge</span>). A domain that points
            elsewhere for 7 days is disconnected by itself.
          </li>
        </ul>
      </div>
    </div>
  );
}
