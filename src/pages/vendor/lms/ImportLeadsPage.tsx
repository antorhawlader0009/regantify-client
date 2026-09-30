import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Download, FileSpreadsheet } from 'lucide-react';
import { LmsPage, Panel } from '../../../components/lms/LmsPage';
import { Field, LmsButton, LmsInput, LmsSelect } from '../../../components/lms/ui';
import { AgentSelect } from '../../../components/lms/Team';
import { useLmsFields } from '../../../components/lms/ExtraFields';
import { formatMoney, formatPhone } from '../../../components/lms/format';
import { apiErrorMessage } from '../../../lib/api';
import { toCsv, downloadCsv } from '../../../lib/csv';
import { toast } from '../../../lib/toast';
import { LMS_IMPORT_CHUNK, lmsApi, type LmsFieldDef, type LmsMe } from '../../../lib/lmsApi';
import {
  autoMatch,
  checkRows,
  downloadCsvTemplate,
  downloadXlsxTemplate,
  importColumns,
  localBdPhone,
  readImportFile,
  type ImportMapping,
  type ImportSheet,
  type ParsedImportRow,
} from '../../../lib/lmsImport';

const PREVIEW_ROWS = 100;

/** Today in Dhaka, "YYYY-MM-DD" (the server checks dates against the same day). */
function dhakaToday(): string {
  return new Date(Date.now() + 6 * 60 * 60_000).toISOString().slice(0, 10);
}

/** LMS > Leads > Import: the old LMS's Excel/CSV upload, with a preview before anything is saved. */
export default function ImportLeadsPage() {
  return (
    <LmsPage title="Import leads">
      {(me) => (
        <>
          <Link to="/vendor/lms/leads" className="-mt-4 mb-5 inline-flex items-center gap-1 text-sm text-lms-muted hover:text-lms-ink">
            <ChevronLeft size={16} />
            Leads
          </Link>
          {me.isManager ? (
            <Importer me={me} />
          ) : (
            <Panel>
              <p className="text-sm">Only the store owner or a lead manager can import leads. Ask them to import the list for you.</p>
            </Panel>
          )}
        </>
      )}
    </LmsPage>
  );
}

interface Summary {
  inserted: number;
  merged: number;
  /** Server skips plus rows the preview already left out (problems, repeats). */
  skipped: { line: number; reason: string }[];
  empty: number;
  /** Set when a chunk failed: the rows from there on weren't sent. */
  stoppedAt: string | null;
  tag: string;
}

function Importer({ me }: { me: LmsMe }) {
  const queryClient = useQueryClient();
  const fields = useLmsFields().data ?? [];
  const columns = useMemo(() => importColumns(fields), [fields]);
  const fileInput = useRef<HTMLInputElement>(null);

  const [fileName, setFileName] = useState('');
  const [sheet, setSheet] = useState<ImportSheet | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [problemsOnly, setProblemsOnly] = useState(false);

  const [assignTo, setAssignTo] = useState<string>(me.autoAssign === 'ROUND_ROBIN' ? 'AUTO' : 'POOL');
  const [stage, setStage] = useState<'NEW' | 'WON' | 'LOST'>('NEW');
  const [reason, setReason] = useState('');
  const [tag, setTag] = useState('');

  const [progress, setProgress] = useState<{ sent: number; total: number } | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const today = dhakaToday();
  const parsed = useMemo(() => (sheet ? checkRows(sheet, mapping, fields, today) : []), [sheet, mapping, fields, today]);
  const ready = parsed.filter((r) => r.row);
  const problems = parsed.filter((r) => r.errors.length);
  const repeats = parsed.filter((r) => r.repeatOf !== null);
  const empty = parsed.filter((r) => r.empty).length;
  const phoneMapped = (mapping.phone ?? -1) >= 0;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setReadError(null);
    setSummary(null);
    setReading(true);
    try {
      const read = await readImportFile(file);
      if (!read.headers.length || !read.rows.length) {
        setReadError('This file has no rows under the header. Check the file and try again.');
        setSheet(null);
        return;
      }
      setFileName(file.name);
      setSheet(read);
      setMapping(autoMatch(read.headers, columns));
      setProblemsOnly(false);
    } catch {
      setReadError("This file couldn't be read. Use a .csv, .xlsx or .xls file.");
      setSheet(null);
    } finally {
      setReading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const reset = () => {
    setSheet(null);
    setFileName('');
    setSummary(null);
    setTag('');
  };

  const run = async () => {
    const rows = ready.map((r) => r.row!);
    const cleanTag = tag.trim().toLowerCase();
    const result: Summary = {
      inserted: 0,
      merged: 0,
      skipped: [
        ...problems.map((r) => ({ line: r.line, reason: r.errors.join(' ') })),
        ...repeats.map((r) => ({ line: r.line, reason: `Same phone as line ${r.repeatOf}.` })),
      ],
      empty,
      stoppedAt: null,
      tag: cleanTag,
    };
    setProgress({ sent: 0, total: rows.length });
    for (let i = 0; i < rows.length; i += LMS_IMPORT_CHUNK) {
      const chunk = rows.slice(i, i + LMS_IMPORT_CHUNK);
      try {
        const res = await lmsApi.importLeads({
          rows: chunk,
          assignTo,
          stage,
          reason: stage === 'LOST' ? reason : undefined,
          tag: cleanTag || undefined,
          fileName: fileName.slice(0, 120),
        });
        result.inserted += res.inserted;
        result.merged += res.merged;
        result.skipped.push(...res.skipped);
      } catch (err) {
        result.stoppedAt = `${apiErrorMessage(err, 'The import stopped.')} Lines from ${chunk[0].line} on weren't imported.`;
        break;
      }
      setProgress({ sent: Math.min(rows.length, i + chunk.length), total: rows.length });
    }
    result.skipped.sort((a, b) => a.line - b.line);
    setProgress(null);
    setSummary(result);
    queryClient.invalidateQueries({ queryKey: ['lms'] });
    if (result.stoppedAt) toast.error(result.stoppedAt);
    else toast.success(`${result.inserted.toLocaleString('en-US')} lead${result.inserted === 1 ? '' : 's'} imported`);
  };

  if (summary) return <ImportSummary summary={summary} sheet={sheet} fileName={fileName} onAgain={reset} />;

  const canImport = phoneMapped && ready.length > 0 && !progress && (stage !== 'LOST' || !!reason);
  const shown = (problemsOnly ? parsed.filter((r) => r.errors.length || r.repeatOf !== null) : parsed.filter((r) => !r.empty)).slice(0, PREVIEW_ROWS);

  return (
    <div className="space-y-4">
      <Panel>
        <Step n={1} title="Choose a file" />
        <p className="mb-4 max-w-2xl text-sm text-lms-muted">
          A CSV or Excel file (.csv, .xlsx, .xls) with a header row. The old LMS's files work as they are. Only the phone is needed; every other
          column is optional.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="sr-only"
            id="lms-import-file"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <LmsButton variant="primary" onClick={() => fileInput.current?.click()} disabled={reading || !!progress}>
            <FileSpreadsheet size={15} />
            {reading ? 'Reading…' : sheet ? 'Choose another file' : 'Choose a file'}
          </LmsButton>
          {fileName && <span className="text-sm text-lms-muted">{fileName}</span>}
          <span className="ml-auto flex flex-wrap items-center gap-1 text-sm text-lms-muted">
            Template:
            <LmsButton variant="quiet" onClick={() => downloadXlsxTemplate(fields).catch(() => toast.error("The template couldn't be made. Try again."))}>
              <Download size={14} />
              Excel
            </LmsButton>
            <LmsButton variant="quiet" onClick={() => downloadCsvTemplate(fields)}>
              <Download size={14} />
              CSV
            </LmsButton>
          </span>
        </div>
        {readError && <p className="mt-3 text-sm text-lms-alert">{readError}</p>}
      </Panel>

      {sheet && (
        <>
          <Panel>
            <Step n={2} title="Match the columns" />
            <p className="mb-4 text-sm text-lms-muted">We matched what we could by the header names. Fix any that are wrong.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {columns.map((col) => (
                <Field key={col.key} label={col.required ? `${col.label} (needed)` : col.label} hint={col.hint}>
                  <LmsSelect
                    value={mapping[col.key] ?? -1}
                    onChange={(e) => setMapping((m) => ({ ...m, [col.key]: Number(e.target.value) }))}
                    className={col.required && !phoneMapped ? '!border-lms-alert' : ''}
                  >
                    <option value={-1}>Not in the file</option>
                    {sheet.headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </LmsSelect>
                </Field>
              ))}
            </div>
            {!phoneMapped && <p className="mt-3 text-sm text-lms-alert">Pick the column that has the phone numbers.</p>}
          </Panel>

          {phoneMapped && (
            <Panel className="!p-0 overflow-hidden">
              <div className="p-5 pb-3 sm:p-6 sm:pb-3">
                <Step n={3} title="Check the rows" />
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                  <span>
                    <b className="tabular-nums">{ready.length.toLocaleString('en-US')}</b> ready
                  </span>
                  <span className={problems.length ? 'text-lms-alert' : 'text-lms-muted'}>
                    <b className="tabular-nums">{problems.length.toLocaleString('en-US')}</b> with a problem
                  </span>
                  <span className="text-lms-muted">
                    <b className="tabular-nums">{repeats.length.toLocaleString('en-US')}</b> repeat{repeats.length === 1 ? '' : 's'} of an earlier phone
                  </span>
                  {empty > 0 && (
                    <span className="text-lms-muted">
                      <b className="tabular-nums">{empty.toLocaleString('en-US')}</b> blank
                    </span>
                  )}
                  {(problems.length > 0 || repeats.length > 0) && (
                    <label className="ml-auto flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[var(--lms-ink)]"
                        checked={problemsOnly}
                        onChange={(e) => setProblemsOnly(e.target.checked)}
                      />
                      Only rows that won't be imported
                    </label>
                  )}
                </div>
                <p className="mt-1 text-xs text-lms-muted">
                  Rows with a problem and repeats are left out. A phone that already has an open lead is added to that lead instead of making a second
                  one.
                </p>
              </div>
              <PreviewTable rows={shown} fields={fields} mapping={mapping} />
              {parsed.length - empty > PREVIEW_ROWS && (
                <p className="border-t border-lms-line px-5 py-2 text-xs text-lms-muted">Showing the first {PREVIEW_ROWS} rows. Every row is checked.</p>
              )}
            </Panel>
          )}

          {phoneMapped && (
            <Panel>
              <Step n={4} title="Import" />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Stage for every row" hint={stage === 'NEW' ? 'New leads to call.' : 'Kept as history; nobody calls them.'}>
                  <LmsSelect
                    value={stage}
                    onChange={(e) => {
                      const next = e.target.value as typeof stage;
                      setStage(next);
                      if (next !== 'NEW' && assignTo === 'AUTO') setAssignTo('POOL');
                    }}
                  >
                    <option value="NEW">{me.stageLabels.NEW}</option>
                    <option value="WON">{me.stageLabels.WON}</option>
                    <option value="LOST">{me.stageLabels.LOST}</option>
                  </LmsSelect>
                </Field>
                {stage === 'LOST' && (
                  <Field label="Why they were lost">
                    <LmsSelect value={reason} onChange={(e) => setReason(e.target.value)}>
                      <option value="">Pick a reason</option>
                      {me.lostReasons.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </LmsSelect>
                  </Field>
                )}
                <Field label="Who calls them">
                  <AgentSelect
                    me={me}
                    extra={stage === 'NEW' ? ['AUTO', 'ME', 'POOL'] : ['ME', 'POOL']}
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                  />
                </Field>
                <Field label="Tag for this batch" hint="Optional. Find the batch later by this tag.">
                  <LmsInput value={tag} onChange={(e) => setTag(e.target.value)} maxLength={40} placeholder="e.g. facebook-sept" />
                </Field>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <LmsButton variant="primary" disabled={!canImport} onClick={run}>
                  {progress
                    ? `Importing ${progress.sent.toLocaleString('en-US')} of ${progress.total.toLocaleString('en-US')}…`
                    : `Import ${ready.length.toLocaleString('en-US')} lead${ready.length === 1 ? '' : 's'}`}
                </LmsButton>
                {!progress && (
                  <LmsButton variant="quiet" onClick={reset}>
                    Cancel
                  </LmsButton>
                )}
                {stage === 'LOST' && !reason && <span className="text-sm text-lms-muted">Pick why they were lost first.</span>}
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}

function Step({ n, title }: { n: number; title: string }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 text-base font-semibold">
      <span className="grid h-6 w-6 place-items-center rounded-full border border-lms-line text-xs tabular-nums text-lms-muted">{n}</span>
      {title}
    </h2>
  );
}

function PreviewTable({ rows, fields, mapping }: { rows: ParsedImportRow[]; fields: LmsFieldDef[]; mapping: ImportMapping }) {
  const has = (key: string) => (mapping[key] ?? -1) >= 0;
  const extra = fields.filter((f) => has(`field:${f.key}`));
  const td = 'h-9 border-b border-lms-line px-3 align-middle';
  if (!rows.length) return <p className="px-5 pb-5 text-sm text-lms-muted sm:px-6">Nothing to show.</p>;
  return (
    <div className="max-h-[60vh] overflow-auto border-t border-lms-line">
      <table className="w-full min-w-[820px] border-separate border-spacing-0 text-[13px]">
        <thead>
          <tr className="text-left text-lms-muted">
            {['Line', 'Check', 'Name', 'Phone', has('product') && 'Product', has('price') && 'Price', has('quantity') && 'Qty', has('date') && 'Date', has('district') && 'District', ...extra.map((f) => f.label)]
              .filter(Boolean)
              .map((h, i) => (
                <th key={i} className="sticky top-0 z-10 h-9 whitespace-nowrap border-b border-lms-line bg-lms-surface px-3 font-medium">
                  {h}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const row = r.row;
            const cell = (key: string) => {
              const i = mapping[key] ?? -1;
              return i >= 0 ? (r.cells[i] ?? '').trim() : '';
            };
            const phone = localBdPhone(cell('phone'));
            return (
              <tr key={r.line}>
                <td className={`${td} tabular-nums text-lms-muted`}>{r.line}</td>
                <td className={`${td} max-w-[280px]`}>
                  {r.errors.length ? (
                    <span className="text-lms-alert">{r.errors.join(' ')}</span>
                  ) : r.repeatOf !== null ? (
                    <span className="text-lms-muted">Same phone as line {r.repeatOf}</span>
                  ) : (
                    <span className="text-lms-stage-won">Ready</span>
                  )}
                </td>
                <td className={`${td} max-w-[180px] truncate`}>{cell('name') || <span className="text-lms-muted">No name given</span>}</td>
                <td className={`${td} whitespace-nowrap tabular-nums`}>{phone ? formatPhone(phone) : cell('phone')}</td>
                {has('product') && <td className={`${td} max-w-[200px] truncate`}>{cell('product')}</td>}
                {has('price') && <td className={`${td} whitespace-nowrap tabular-nums`}>{row?.price !== undefined ? formatMoney(row.price) : cell('price')}</td>}
                {has('quantity') && <td className={`${td} tabular-nums`}>{cell('quantity')}</td>}
                {has('date') && <td className={`${td} whitespace-nowrap tabular-nums`}>{row?.date ?? cell('date')}</td>}
                {has('district') && <td className={`${td} whitespace-nowrap`}>{cell('district')}</td>}
                {extra.map((f) => (
                  <td key={f.key} className={`${td} max-w-[160px] truncate`}>
                    {cell(`field:${f.key}`)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ImportSummary({ summary, sheet, fileName, onAgain }: { summary: Summary; sheet: ImportSheet | null; fileName: string; onAgain: () => void }) {
  const leadsLink = summary.tag ? `/vendor/lms/leads?tag=${encodeURIComponent(summary.tag)}` : '/vendor/lms/leads?source=IMPORT&sort=newest';

  const downloadSkipped = () => {
    if (!sheet) return;
    const byLine = new Map(sheet.rows.map((r) => [r.line, r.cells]));
    const rows = summary.skipped.map((s) => [String(s.line), s.reason, ...(byLine.get(s.line) ?? [])]);
    downloadCsv(`skipped-${fileName.replace(/\.[^.]+$/, '') || 'import'}.csv`, toCsv(['Line', 'Why it was skipped', ...sheet.headers], rows));
  };

  return (
    <Panel>
      <h2 className="text-base font-semibold">{summary.stoppedAt ? 'The import stopped partway' : 'Import finished'}</h2>
      {summary.stoppedAt && <p className="mt-1 text-sm text-lms-alert">{summary.stoppedAt}</p>}
      <dl className="mt-4 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-lms-line bg-lms-line sm:grid-cols-4">
        <Stat label="New leads" value={summary.inserted} />
        <Stat label="Added to an open lead" value={summary.merged} />
        <Stat label="Skipped" value={summary.skipped.length} alert={summary.skipped.length > 0} />
        <Stat label="Blank rows" value={summary.empty} />
      </dl>
      {summary.skipped.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-medium">Skipped lines</h3>
            <LmsButton variant="quiet" className="ml-auto" onClick={downloadSkipped}>
              <Download size={14} />
              Download them to fix
            </LmsButton>
          </div>
          <ul className="max-h-72 divide-y divide-lms-line overflow-auto rounded-md border border-lms-line text-sm">
            {summary.skipped.slice(0, 500).map((s) => (
              <li key={`${s.line}-${s.reason}`} className="flex gap-3 px-3 py-2">
                <span className="w-16 shrink-0 tabular-nums text-lms-muted">Line {s.line}</span>
                <span>{s.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to={leadsLink} className="inline-flex h-9 items-center rounded-md bg-lms-ink px-3.5 text-sm font-medium text-white hover:opacity-90">
          See the imported leads
        </Link>
        <LmsButton onClick={onAgain}>Import another file</LmsButton>
      </div>
    </Panel>
  );
}

function Stat({ label, value, alert = false }: { label: string; value: number; alert?: boolean }): ReactNode {
  return (
    <div className="bg-lms-surface px-4 py-3">
      <dt className="text-xs text-lms-muted">{label}</dt>
      <dd className={`mt-0.5 text-xl font-semibold tabular-nums ${alert ? 'text-lms-alert' : ''}`}>{value.toLocaleString('en-US')}</dd>
    </div>
  );
}
