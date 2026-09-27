import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  KeyRound,
  Loader2,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Send,
  Trash2,
} from 'lucide-react';
import { webhooksApi, type WebhookDelivery, type WebhookEndpoint, type WebhookSendResult } from '../../../../lib/webhooksApi';
import { apiErrorMessage } from '../../../../lib/api';
import { toast } from '../../../../lib/toast';
import { Dialog } from '../../../../components/ui/Dialog';
import { Checkbox } from '../../../../components/ui/Checkbox';
import { inputClass, LoadError, Notice } from './IntegrationForm';

const buttonClass =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/10 text-xs text-regantify-text hover:bg-black/[0.03] transition-colors disabled:opacity-50';

// For the "How to verify" box: the same check the server's signature
// allows (server/src/webhooks/webhooks.service.ts).
const VERIFY_NODE = `const crypto = require('crypto');

// rawBody: the request body exactly as received (not re-serialized JSON)
function isFromRegantify(rawBody, headers, secret) {
  const timestamp = headers['x-regantify-timestamp'];
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(timestamp + '.' + rawBody)
    .digest('hex');
  const received = headers['x-regantify-signature'] || '';
  const fresh = Math.abs(Date.now() / 1000 - Number(timestamp)) < 300;
  return fresh && received.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}`;

const VERIFY_PHP = `$raw = file_get_contents('php://input');
$timestamp = $_SERVER['HTTP_X_REGANTIFY_TIMESTAMP'] ?? '';
$received = $_SERVER['HTTP_X_REGANTIFY_SIGNATURE'] ?? '';
$expected = 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $raw, $secret);
$fresh = abs(time() - (int) $timestamp) < 300;
if (!$fresh || !hash_equals($expected, $received)) {
  http_response_code(401);
  exit;
}
$event = json_decode($raw, true); // $event['event'], $event['data']`;

function copy(text: string, what: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(`${what} copied.`));
}

function resultToast(result: WebhookSendResult) {
  if (result.ok) toast.success(`Delivered: your server answered ${result.status} in ${result.durationMs} ms.`);
  else toast.error(`Not delivered: ${result.error ?? 'unknown error'}`);
}

/**
 * Store > Integrations > Webhooks. Sending, signing and retries are
 * server/src/webhooks/webhooks.service.ts.
 */
export default function Webhooks() {
  const queryClient = useQueryClient();
  const { data: endpoints, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['webhooks'],
    queryFn: webhooksApi.list,
  });
  const { data: events } = useQuery({ queryKey: ['webhook-events'], queryFn: webhooksApi.events, staleTime: Infinity });
  // null = closed, 'new' = add, otherwise the endpoint being edited.
  const [editing, setEditing] = useState<'new' | WebhookEndpoint | null>(null);
  // A secret to show (just created, revealed or rotated).
  const [shownSecret, setShownSecret] = useState<{ endpoint: WebhookEndpoint; secret: string; isNew?: boolean } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['webhooks'] });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Parameters<typeof webhooksApi.update>[1] }) => webhooksApi.update(id, body),
    onSuccess: refresh,
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update the webhook.')),
  });
  const remove = useMutation({
    mutationFn: webhooksApi.remove,
    onSuccess: () => {
      toast.success('Webhook deleted.');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete the webhook.')),
  });
  const sendTest = useMutation({
    mutationFn: webhooksApi.sendTest,
    onSuccess: (result, id) => {
      resultToast(result);
      refresh();
      queryClient.invalidateQueries({ queryKey: ['webhook-deliveries', id] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send the test.')),
  });
  const reveal = useMutation({
    mutationFn: async (endpoint: WebhookEndpoint) => ({ endpoint, ...(await webhooksApi.revealSecret(endpoint.id)) }),
    onSuccess: ({ endpoint, secret }) => setShownSecret({ endpoint, secret }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not load the secret.')),
  });
  const rotate = useMutation({
    mutationFn: async (endpoint: WebhookEndpoint) => ({ endpoint, ...(await webhooksApi.rotateSecret(endpoint.id)) }),
    onSuccess: ({ endpoint, secret }) => {
      toast.success('New secret created. The old one no longer works.');
      setShownSecret({ endpoint, secret });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not create a new secret.')),
  });

  const eventLabel = (name: string) => events?.find((e) => e.event === name)?.label ?? name;

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <Link
          to="/vendor/store/integrations"
          className="inline-flex items-center gap-1.5 text-xs text-regantify-cta hover:underline mb-1"
        >
          <ArrowLeft size={14} />
          Integrations
        </Link>
        <h1 className="text-2xl font-semibold text-regantify-text">Webhooks</h1>
        <p className="text-sm text-regantify-text-muted mt-1">
          Send new orders, status changes, product changes and leads to your own apps as they happen: Google Sheets,
          your CRM, n8n, Make, Zapier or any server.
        </p>
      </div>

      {isError && !endpoints ? (
        <LoadError
          message={apiErrorMessage(error, 'Could not load your webhooks. Please try again.')}
          onRetry={() => void refetch()}
          retrying={isFetching}
        />
      ) : isLoading || !endpoints ? (
        <div className="bg-white rounded-2xl border border-black/5 p-8 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-medium text-regantify-text">Your Webhooks</h2>
              <button
                type="button"
                onClick={() => setEditing('new')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Add Webhook
              </button>
            </div>

            {endpoints.length === 0 ? (
              <div className="bg-white rounded-2xl border border-black/5 p-8 text-center text-sm text-regantify-text-muted">
                No webhooks yet. Add one to start sending events to your app.
              </div>
            ) : (
              <div className="space-y-3">
                {endpoints.map((endpoint) => (
                  <div key={endpoint.id} className="bg-white rounded-2xl border border-black/5">
                    <div className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-medium text-regantify-text">{endpoint.name || 'Webhook'}</h3>
                            <StatusBadge endpoint={endpoint} />
                          </div>
                          <p className="text-xs text-regantify-text-muted mt-1 break-all font-mono">{endpoint.url}</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            className={buttonClass}
                            disabled={sendTest.isPending}
                            onClick={() => sendTest.mutate(endpoint.id)}
                          >
                            {sendTest.isPending && sendTest.variables === endpoint.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Send size={13} />
                            )}
                            Send test
                          </button>
                          <button type="button" className={buttonClass} onClick={() => setEditing(endpoint)}>
                            <Pencil size={13} />
                            Edit
                          </button>
                          <button
                            type="button"
                            className={buttonClass}
                            disabled={update.isPending}
                            onClick={() => update.mutate({ id: endpoint.id, body: { isActive: !endpoint.isActive } })}
                          >
                            {endpoint.isActive ? <Pause size={13} /> : <Play size={13} />}
                            {endpoint.isActive ? 'Pause' : 'Resume'}
                          </button>
                          <button type="button" className={buttonClass} onClick={() => reveal.mutate(endpoint)}>
                            <Eye size={13} />
                            Secret
                          </button>
                          <button
                            type="button"
                            className={`${buttonClass} text-red-600`}
                            onClick={() => {
                              if (window.confirm(`Delete this webhook? ${endpoint.url} will stop getting events.`)) {
                                remove.mutate(endpoint.id);
                              }
                            }}
                          >
                            <Trash2 size={13} />
                            Delete
                          </button>
                        </div>
                      </div>

                      {endpoint.disabledReason && (
                        <div className="mt-3">
                          <Notice tone="error">
                            {endpoint.disabledReason} Fix your endpoint, then click Resume.
                          </Notice>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {endpoint.events.map((e) => (
                          <span key={e} className="text-[11px] px-2 py-0.5 rounded-full bg-black/5 text-regantify-text-muted">
                            {eventLabel(e)}
                          </span>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpanded(expanded === endpoint.id ? null : endpoint.id)}
                        className="mt-3 inline-flex items-center gap-1 text-xs text-regantify-cta hover:underline"
                      >
                        {expanded === endpoint.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        Recent deliveries
                        {endpoint.lastDeliveryAt && (
                          <span className="text-regantify-text-muted">
                            {' '}
                            · last {new Date(endpoint.lastDeliveryAt).toLocaleString()}
                            {endpoint.lastResponseStatus !== null && ` (${endpoint.lastResponseStatus})`}
                          </span>
                        )}
                      </button>
                    </div>
                    {expanded === endpoint.id && <Deliveries endpointId={endpoint.id} />}
                  </div>
                ))}
              </div>
            )}
          </section>

          <HowItWorks />
        </div>
      )}

      {editing && events && (
        <WebhookDialog
          endpoint={editing === 'new' ? null : editing}
          events={events}
          onClose={() => setEditing(null)}
          onSaved={(created) => {
            setEditing(null);
            refresh();
            if (created) setShownSecret({ endpoint: created, secret: created.secret, isNew: true });
          }}
        />
      )}

      <Dialog open={!!shownSecret} onOpenChange={(open) => !open && setShownSecret(null)} title="Signing Secret">
        {shownSecret && (
          <div className="p-6 space-y-4">
            <p className="text-sm text-regantify-text-muted">
              {shownSecret.isNew ? 'Webhook added. ' : ''}Use this secret in your app to check that each request really
              comes from your store (see &quot;How to verify&quot; on this page). Keep it private.
            </p>
            <div className="flex gap-2">
              <input readOnly value={shownSecret.secret} className={`${inputClass} font-mono text-xs`} />
              <button type="button" className={buttonClass} onClick={() => copy(shownSecret.secret, 'Secret')}>
                <Copy size={13} />
                Copy
              </button>
            </div>
            {!shownSecret.isNew && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:underline"
                onClick={() => {
                  if (window.confirm('Create a new secret? The current one stops working right away.')) {
                    rotate.mutate(shownSecret.endpoint);
                  }
                }}
              >
                <KeyRound size={13} />
                Create a new secret
              </button>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}

function StatusBadge({ endpoint }: { endpoint: WebhookEndpoint }) {
  if (endpoint.isActive) {
    return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Active</span>;
  }
  if (endpoint.disabledReason) {
    return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">Turned off</span>;
  }
  return <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-black/5 text-regantify-text-muted">Paused</span>;
}

function WebhookDialog({
  endpoint,
  events,
  onClose,
  onSaved,
}: {
  endpoint: WebhookEndpoint | null;
  events: { event: string; label: string; description: string }[];
  onClose: () => void;
  onSaved: (created?: WebhookEndpoint & { secret: string }) => void;
}) {
  const [name, setName] = useState(endpoint?.name ?? '');
  const [url, setUrl] = useState(endpoint?.url ?? '');
  const [selected, setSelected] = useState<string[]>(endpoint?.events ?? ['order.created', 'order.status_changed']);

  const save = useMutation({
    mutationFn: () =>
      endpoint
        ? webhooksApi.update(endpoint.id, { name: name.trim(), url: url.trim(), events: selected })
        : webhooksApi.create({ name: name.trim() || undefined, url: url.trim(), events: selected }),
    onSuccess: (result) => {
      toast.success(endpoint ? 'Webhook saved.' : 'Webhook added.');
      onSaved(endpoint ? undefined : (result as WebhookEndpoint & { secret: string }));
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the webhook.')),
  });

  const toggle = (event: string, on: boolean) =>
    setSelected((prev) => (on ? [...prev, event] : prev.filter((e) => e !== event)));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={endpoint ? 'Edit Webhook' : 'Add Webhook'}>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Name (optional)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Google Sheet, CRM"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Endpoint URL</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/webhooks/store"
            spellCheck={false}
            className={`${inputClass} font-mono text-xs`}
          />
          <p className="text-xs text-regantify-text-muted mt-1">
            Must start with https://. Your server should answer with a 2xx status within 10 seconds.
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-regantify-text">Events</label>
            <button
              type="button"
              className="text-xs text-regantify-cta hover:underline"
              onClick={() => setSelected(selected.length === events.length ? [] : events.map((e) => e.event))}
            >
              {selected.length === events.length ? 'Clear all' : 'Select all'}
            </button>
          </div>
          <div className="space-y-2.5">
            {events.map((e) => (
              <Checkbox
                key={e.event}
                checked={selected.includes(e.event)}
                onChange={(on) => toggle(e.event, on)}
                label={e.label}
                hint={`${e.event} · ${e.description}`}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-regantify-text hover:bg-black/[0.03]">
            Cancel
          </button>
          <button
            type="button"
            disabled={save.isPending || !url.trim() || selected.length === 0}
            onClick={() => save.mutate()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
          >
            {save.isPending && <Loader2 size={15} className="animate-spin" />}
            {endpoint ? 'Save' : 'Add Webhook'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

function Deliveries({ endpointId }: { endpointId: string }) {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['webhook-deliveries', endpointId],
    queryFn: () => webhooksApi.deliveries(endpointId),
  });
  const [open, setOpen] = useState<string | null>(null);
  const resend = useMutation({
    mutationFn: (deliveryId: string) => webhooksApi.resend(endpointId, deliveryId),
    onSuccess: (result) => {
      resultToast(result);
      queryClient.invalidateQueries({ queryKey: ['webhook-deliveries', endpointId] });
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not resend.')),
  });

  return (
    <div className="border-t border-black/5 px-5 py-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-regantify-text-muted">Last 30 deliveries (kept for 30 days). Failed ones are retried for about 15 hours.</p>
        <button type="button" className={buttonClass} onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw size={13} className={isFetching ? 'animate-spin' : undefined} />
          Refresh
        </button>
      </div>
      {isLoading || !data ? (
        <Loader2 size={16} className="animate-spin text-regantify-text-muted" />
      ) : data.length === 0 ? (
        <p className="text-sm text-regantify-text-muted py-2">Nothing sent yet. Try &quot;Send test&quot;.</p>
      ) : (
        <div className="divide-y divide-black/5">
          {data.map((d) => (
            <div key={d.id} className="py-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                <DeliveryBadge delivery={d} />
                <span className="font-mono text-regantify-text">{d.event}</span>
                <span className="text-regantify-text-muted">{new Date(d.createdAt).toLocaleString()}</span>
                <span className="text-regantify-text-muted">
                  {d.responseStatus !== null ? `HTTP ${d.responseStatus}` : 'no response'}
                  {d.attempts > 1 && ` · ${d.attempts} attempts`}
                </span>
                <span className="ml-auto flex gap-1.5">
                  <button type="button" className={buttonClass} onClick={() => setOpen(open === d.id ? null : d.id)}>
                    {open === d.id ? 'Hide' : 'Details'}
                  </button>
                  <button type="button" className={buttonClass} disabled={resend.isPending} onClick={() => resend.mutate(d.id)}>
                    <Send size={12} />
                    Resend
                  </button>
                </span>
              </div>
              {d.status === 'PENDING' && d.nextAttemptAt && (
                <p className="text-xs text-amber-700 mt-1">Next try {new Date(d.nextAttemptAt).toLocaleString()}.</p>
              )}
              {d.error && <p className="text-xs text-red-600 mt-1">{d.error}</p>}
              {open === d.id && (
                <div className="grid sm:grid-cols-2 gap-2 mt-2">
                  <pre className="text-[11px] bg-black/[0.03] rounded-lg p-3 overflow-auto max-h-64">
                    {JSON.stringify(d.payload, null, 2)}
                  </pre>
                  <pre className="text-[11px] bg-black/[0.03] rounded-lg p-3 overflow-auto max-h-64 whitespace-pre-wrap">
                    {d.responseBody || '(empty response)'}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeliveryBadge({ delivery }: { delivery: WebhookDelivery }) {
  const style =
    delivery.status === 'SUCCEEDED'
      ? 'bg-emerald-50 text-emerald-700'
      : delivery.status === 'FAILED'
        ? 'bg-red-50 text-red-700'
        : 'bg-amber-50 text-amber-800';
  const label = delivery.status === 'SUCCEEDED' ? 'Delivered' : delivery.status === 'FAILED' ? 'Failed' : 'Retrying';
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${style}`}>{label}</span>;
}

function HowItWorks() {
  const [open, setOpen] = useState(false);
  return (
    <section className="bg-white rounded-2xl border border-black/5 p-5">
      <button type="button" onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-sm font-medium text-regantify-text">
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        How it works &amp; how to verify
      </button>
      {open && (
        <div className="mt-3 space-y-3 text-sm text-regantify-text-muted">
          <p>
            Each event is sent as an HTTPS <span className="font-mono text-xs">POST</span> with a JSON body:{' '}
            <span className="font-mono text-xs">{'{ id, event, created_at, store, data }'}</span>, where{' '}
            <span className="font-mono text-xs">data</span> is the order, product or lead, the same as the External API
            returns. Order status changes also include <span className="font-mono text-xs">previous_status</span>.
          </p>
          <p>
            Headers: <span className="font-mono text-xs">X-Regantify-Event</span>,{' '}
            <span className="font-mono text-xs">X-Regantify-Delivery</span> (the same on every retry, so you can skip
            duplicates), <span className="font-mono text-xs">X-Regantify-Timestamp</span> and{' '}
            <span className="font-mono text-xs">X-Regantify-Signature</span>. If your server doesn&apos;t answer with a
            2xx status, we retry after 1 minute, 5 minutes, 30 minutes, 2 hours and 12 hours. After 15 events in a row fail
            completely, the webhook is turned off until you resume it.
          </p>
          <p>Check the signature with your webhook&apos;s secret before trusting a request:</p>
          <p className="text-xs font-medium text-regantify-text">Node.js</p>
          <pre className="text-[11px] bg-black/[0.03] rounded-lg p-3 overflow-auto">{VERIFY_NODE}</pre>
          <p className="text-xs font-medium text-regantify-text">PHP</p>
          <pre className="text-[11px] bg-black/[0.03] rounded-lg p-3 overflow-auto">{VERIFY_PHP}</pre>
        </div>
      )}
    </section>
  );
}
