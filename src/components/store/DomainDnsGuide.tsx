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

/** Companies that can point the main domain (mystore.com) at us. */
const APEX_OK: Record<DnsHost, boolean> = { cloudflare: true, namecheap: true, hostinger: true, porkbun: true, godaddy: false, other: false };

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

function Steps({ children }: { children: React.ReactNode }) {
  return <ol className="list-decimal space-y-2.5 pl-5 text-sm text-regantify-text marker:text-regantify-text-muted">{children}</ol>;
}

export function DomainDnsGuide({
  domain,
  recordHost,
  target,
  detected,
  onUseWww,
}: {
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
        {needWww && <WwwPlan />}

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

        {host === 'namecheap' && (
          <Steps>
            <li>Log in to Namecheap, open <span className="font-medium">Domain List</span> and click <span className="font-medium">Manage</span> next to your domain.</li>
            <li>Open the <span className="font-medium">Advanced DNS</span> tab.</li>
            <li>Delete the old records on host <span className="font-mono">{recordHost}</span>: any <span className="font-medium">A Record</span>, <span className="font-medium">CNAME Record</span> or <span className="font-medium">URL Redirect Record</span> (Namecheap adds parking records there).</li>
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
          </Steps>
        )}

        {host === 'hostinger' && (
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
            <li>Click <span className="font-medium">Add Record</span>. {apex && 'On the main domain Hostinger shows it as ALIAS after saving; that is right.'}</li>
          </Steps>
        )}

        {host === 'porkbun' && (
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
      </div>

      <div className="mt-5 flex gap-2.5 rounded-xl bg-neutral-50 p-4 text-sm text-regantify-text-muted">
        <Info size={16} className="mt-0.5 shrink-0" />
        <ul className="space-y-1">
          <li>Don't delete <span className="font-medium">MX</span> or <span className="font-medium">TXT</span> records: they run your email.</li>
          <li>Don't change your nameservers. Only the one record above is needed.</li>
          <li>After saving, press <span className="font-medium">Check now</span> above. It usually works in 5 to 30 minutes, sometimes up to 24 hours.</li>
        </ul>
      </div>
    </div>
  );
}
