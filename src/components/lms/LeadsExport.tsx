import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Printer } from 'lucide-react';
import { LmsButton } from './ui';
import { formatMoney, formatPhone } from './format';
import { orderStatusWord } from './CustomerPanel';
import { formatExtraValue, useLmsFields } from './ExtraFields';
import { apiErrorMessage } from '../../lib/api';
import { toCsv, downloadCsv } from '../../lib/csv';
import { toast } from '../../lib/toast';
import { LMS_KIND_LABELS, LMS_SOURCE_LABELS, lmsApi, type LmsExport, type LmsLeadFilters, type LmsMe } from '../../lib/lmsApi';

/** Print is for a sheet on the desk, not the whole database. */
const PRINT_LIMIT = 1000;

const OUTCOME_WORDS: Record<string, string> = {
  REACHED: 'Reached',
  CALL_LATER: 'Call later',
  NO_ANSWER: 'No answer',
  BUSY: 'Busy',
  SWITCHED_OFF: 'Switched off',
  WRONG_NUMBER: 'Wrong number',
  WON: 'Won',
  LOST: 'Lost',
  WHATSAPP_OPENED: 'WhatsApp',
  SMS_SENT: 'SMS',
};

const DHAKA_TIME = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Dhaka',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** "2026-09-24 14:05", Dhaka time: sorts and reads the same in Excel. */
function dhakaTime(iso: string | null): string {
  if (!iso) return '';
  const p = Object.fromEntries(DHAKA_TIME.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour === '24' ? '00' : p.hour}:${p.minute}`;
}

/** A cell from shopper-typed text that starts like a formula is written as text, so Excel never runs it. */
function safe(value: string | null | undefined): string {
  const s = value ?? '';
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

/** Excel drops a phone's leading 0 from a plain CSV cell; ="017…" keeps it (and our import reads it back). */
function phoneCell(phone: string | null): string {
  return phone ? `="${phone}"` : '';
}

function filterWords(filters: LmsLeadFilters, me: LmsMe): string {
  const parts: string[] = [];
  if (filters.stage) parts.push(me.stageLabels[filters.stage as keyof LmsMe['stageLabels']] ?? filters.stage);
  if (filters.kind) parts.push(LMS_KIND_LABELS[filters.kind as keyof typeof LMS_KIND_LABELS] ?? filters.kind);
  if (filters.source) parts.push(LMS_SOURCE_LABELS[filters.source as keyof typeof LMS_SOURCE_LABELS] ?? filters.source);
  if (filters.q) parts.push(`"${filters.q}"`);
  if (filters.tag) parts.push(`tag ${filters.tag}`);
  if (filters.from || filters.to) parts.push(`added ${filters.from ?? '…'} to ${filters.to ?? 'today'}`);
  if (filters.stale) parts.push('stale');
  return parts.length ? parts.join(', ') : 'All leads';
}

/** Export CSV: the current filter, every matching lead (up to 10,000), with a BOM so Excel shows Bangla. */
export function ExportButton({ me, filters }: { me: LmsMe; filters: LmsLeadFilters }) {
  const fields = useLmsFields().data ?? [];
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const data = await lmsApi.exportLeads(filters);
      if (!data.rows.length) {
        toast.error('No leads match these filters, so there is nothing to export.');
        return;
      }
      const headers = [
        'Added',
        'Stage',
        'Lost reason',
        'Kind',
        'Came from',
        'Name',
        'Phone',
        'Second phone',
        'Email',
        'Product',
        'Quantity',
        'Value',
        'Address',
        'District',
        'Division',
        'Area',
        'Agent',
        'Tries',
        'Last call',
        'Last note',
        'Next task',
        'Last update',
        'Closed',
        'Order',
        'Order status',
        'Tags',
        'Do not contact',
        'Reference ID',
        'Message',
        ...fields.map((f) => f.label),
      ];
      const rows = data.rows.map((r) => [
        dhakaTime(r.createdAt),
        me.stageLabels[r.stage],
        r.lostReason ?? '',
        LMS_KIND_LABELS[r.kind],
        LMS_SOURCE_LABELS[r.source],
        safe(r.name),
        phoneCell(r.phone),
        phoneCell(r.phoneAlt),
        safe(r.email),
        safe(r.productSummary),
        r.quantity?.toString() ?? '',
        r.value?.toString() ?? '',
        safe(r.address),
        safe(r.district),
        r.division ?? '',
        safe(r.area),
        r.agent ?? '',
        String(r.attemptCount),
        r.lastOutcome ? (OUTCOME_WORDS[r.lastOutcome] ?? r.lastOutcome) : '',
        safe(r.lastNote),
        dhakaTime(r.nextTaskAt),
        dhakaTime(r.lastActivityAt),
        dhakaTime(r.closedAt),
        r.order ? `#${r.order.invoiceNumber}` : '',
        r.order ? orderStatusWord(r.order.status) : '',
        r.tags.join(', '),
        r.doNotContact ? 'Yes' : '',
        safe(r.externalRef),
        safe(r.message),
        ...fields.map((f) => safe(formatExtraValue(f, r.customFields?.[f.key]))),
      ]);
      const day = dhakaTime(new Date().toISOString()).slice(0, 10);
      downloadCsv(`leads-${day}.csv`, toCsv(headers, rows));
      toast.success(
        data.truncated
          ? `Exported the first ${data.rows.length.toLocaleString('en-US')} of ${data.total.toLocaleString('en-US')} leads. Narrow the filters to get the rest.`
          : `Exported ${data.rows.length.toLocaleString('en-US')} lead${data.rows.length === 1 ? '' : 's'}`,
      );
    } catch (err) {
      toast.error(apiErrorMessage(err, "The export didn't work. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <LmsButton onClick={run} disabled={busy}>
      <Download size={15} />
      {busy ? 'Exporting…' : 'Export CSV'}
    </LmsButton>
  );
}

/**
 * Print: the current filter as a clean call sheet. The sheet renders
 * straight under <body>, and the print stylesheet (lms-theme.css) hides
 * everything else, so no bars or buttons reach the paper.
 */
export function PrintButton({ me, filters }: { me: LmsMe; filters: LmsLeadFilters }) {
  const [data, setData] = useState<LmsExport | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    const done = () => setData(null);
    window.addEventListener('afterprint', done);
    // Let the sheet paint before the print dialog opens.
    const t = setTimeout(() => window.print(), 50);
    return () => {
      clearTimeout(t);
      window.removeEventListener('afterprint', done);
    };
  }, [data]);

  const run = async () => {
    setBusy(true);
    try {
      const result = await lmsApi.exportLeads(filters, PRINT_LIMIT);
      if (!result.rows.length) toast.error('No leads match these filters, so there is nothing to print.');
      else setData(result);
    } catch (err) {
      toast.error(apiErrorMessage(err, "The list couldn't load for printing. Try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <LmsButton onClick={run} disabled={busy}>
        <Printer size={15} />
        {busy ? 'Getting it ready…' : 'Print'}
      </LmsButton>
      {data && createPortal(<PrintSheet me={me} filters={filters} data={data} />, document.body)}
    </>
  );
}

function PrintSheet({ me, filters, data }: { me: LmsMe; filters: LmsLeadFilters; data: LmsExport }) {
  return (
    <div className="lms-root lms-print-sheet">
      <header>
        <h1>
          {me.storeName ? `${me.storeName}: ` : ''}Leads
        </h1>
        <p>
          {filterWords(filters, me)}. {data.truncated ? `First ${data.rows.length} of ${data.total}` : `${data.total} lead${data.total === 1 ? '' : 's'}`}.
          Printed {dhakaTime(new Date().toISOString())} by {me.name}.
        </p>
      </header>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Stage</th>
            <th>Name</th>
            <th>Phone</th>
            <th>Product</th>
            <th className="num">Value</th>
            <th>Address</th>
            {me.isManager && <th>Assigned Agent</th>}
            <th className="num">Tries</th>
            <th>Last note</th>
            <th>Added</th>
            <th className="mark">Result</th>
          </tr>
        </thead>
        <tbody>
          {data.rows.map((r, i) => (
            <tr key={r.id}>
              <td className="num">{i + 1}</td>
              <td>
                {me.stageLabels[r.stage]}
                {r.lostReason ? `: ${r.lostReason}` : ''}
              </td>
              <td>{r.name}</td>
              <td className="nowrap">
                {formatPhone(r.phone)}
                {r.doNotContact ? ' (do not contact)' : ''}
              </td>
              <td>
                {r.productSummary ?? ''}
                {r.order ? ` (Order #${r.order.invoiceNumber})` : ''}
              </td>
              <td className="num nowrap">{r.value !== null ? formatMoney(r.value) : ''}</td>
              <td>{[r.address, r.area, r.district].filter(Boolean).join(', ')}</td>
              {me.isManager && <td>{r.agent ?? ''}</td>}
              <td className="num">{r.attemptCount || ''}</td>
              <td>{r.lastNote ?? ''}</td>
              <td className="nowrap">{dhakaTime(r.createdAt).slice(0, 10)}</td>
              {/* An empty box to write the call's result in by hand, like the paper call sheet. */}
              <td className="mark" />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
