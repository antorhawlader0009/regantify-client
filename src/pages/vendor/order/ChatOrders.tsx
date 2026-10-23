import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Download, KeyRound, MessageSquareText, ShieldCheck, ShoppingCart, Trash2, Zap } from 'lucide-react';
import { InstantCheckoutDialog } from '../../../components/order/InstantCheckoutDialog';
import { instantCheckoutApi } from '../../../lib/instantCheckoutApi';
import { EmptyState, PageHeader, PageSection, SearchBox, TableFooter, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { Dialog } from '../../../components/ui/Dialog';
import { chatExtensionApi, type ChatRecord, type ChatRecordEdit, type ChatRecordPhoto } from '../../../lib/chatExtensionApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { useCan } from '../../../lib/useStaffAccess';

const inputClass = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-regantify-text focus:border-brand focus:outline-none';
const SOURCE_LABEL: Record<ChatRecord['source'], string> = { FB_MESSAGES: 'Messenger', BUSINESS_INBOX: 'Business inbox', WHATSAPP: 'WhatsApp', INSTAGRAM: 'Instagram', TIKTOK: 'TikTok', OTHER: 'Chat' };
const RETENTION_CHOICES = [7, 30, 60, 90, 180, 365];

/** Linking the Chrome extension: a one-time code and the browsers already linked. */
function ConnectCard() {
  const queryClient = useQueryClient();
  const isOwner = useCan('owner');
  const { data: status } = useQuery({ queryKey: ['chat-extension-status'], queryFn: chatExtensionApi.status });
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const pair = useMutation({
    mutationFn: chatExtensionApi.pairCode,
    onSuccess: (c) => setCode(c),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not make a code. Please try again.')),
  });
  const revoke = useMutation({
    mutationFn: chatExtensionApi.revokeDevice,
    onSuccess: () => {
      toast.success('The browser is disconnected.');
      void queryClient.invalidateQueries({ queryKey: ['chat-extension-status'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not disconnect it.')),
  });

  return (
    <div className="rounded-xl border border-line p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-regantify-text">
        <KeyRound size={16} aria-hidden /> Connect the extension
      </h2>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs text-neutral-600">
        <li>Install the Regantify Chat Order Saver in Chrome.</li>
        <li>Press “Make a pairing code” below and type the code into the extension (it works once, for 10 minutes).</li>
        <li>Open a customer chat on facebook.com/messages, messenger.com or WhatsApp Web and press the green R button. Nothing is read until you press it.</li>
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className={primaryBtn} onClick={() => pair.mutate()} disabled={pair.isPending}>
          Make a pairing code
        </button>
        {code && (
          <div className="flex items-center gap-2 rounded-lg border border-dashed border-brand bg-brand/5 px-3 py-1.5">
            <span className="font-mono text-lg font-semibold tracking-widest text-regantify-text">{code.code}</span>
            <button
              type="button"
              className="text-neutral-500 hover:text-regantify-text"
              aria-label="Copy the code"
              onClick={() => navigator.clipboard.writeText(code.code).then(() => toast.success('Code copied.'))}
            >
              <Copy size={15} />
            </button>
            <span className="text-xs text-neutral-500">works until {formatDhakaDateTime(code.expiresAt)}</span>
          </div>
        )}
      </div>

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-neutral-500">Linked browsers</h3>
      {!status?.devices.length ? (
        <p className="mt-1 text-sm text-neutral-500">No browser is linked yet.</p>
      ) : (
        <ul className="mt-1 divide-y divide-line">
          {status.devices.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className="font-medium text-regantify-text">{d.name}</span>
              <span className="text-xs text-neutral-500">
                linked by {d.linkedBy} · {formatDhakaDateTime(d.createdAt)}
                {d.lastUsedAt ? ` · last used ${formatDhakaDateTime(d.lastUsedAt)}` : ''}
              </span>
              {/* The server lets the owner disconnect any browser and everyone else only their own. */}
              <button type="button" className={`${outlineBtn} ml-auto`} onClick={() => revoke.mutate(d.id)} disabled={revoke.isPending} title={isOwner ? undefined : 'You can disconnect your own browser'}>
                Disconnect
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** What is collected, how long it is kept, and the owner's export / delete-all. */
function PrivacyCard() {
  const queryClient = useQueryClient();
  const isOwner = useCan('owner');
  const { data: status } = useQuery({ queryKey: ['chat-extension-status'], queryFn: chatExtensionApi.status });
  const [confirmAll, setConfirmAll] = useState(false);
  const save = useMutation({
    mutationFn: chatExtensionApi.updateSettings,
    onSuccess: () => {
      toast.success('Saved.');
      void queryClient.invalidateQueries({ queryKey: ['chat-extension-status'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save.')),
  });
  const removeAll = useMutation({
    mutationFn: chatExtensionApi.removeAll,
    onSuccess: (r) => {
      toast.success(`${r.deleted} saved chats deleted.`);
      setConfirmAll(false);
      void queryClient.invalidateQueries({ queryKey: ['chat-records'] });
      void queryClient.invalidateQueries({ queryKey: ['chat-extension-status'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete them.')),
  });
  const download = async () => {
    try {
      const data = await chatExtensionApi.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `saved-chats-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not download them.'));
    }
  };

  return (
    <div className="rounded-xl border border-line p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-regantify-text">
        <ShieldCheck size={16} aria-hidden /> Privacy and data
      </h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-neutral-600">
        <li>The extension reads only the chat open on your screen, only when you press a button, and only the last {status?.messageLimit ?? 10} visible messages.</li>
        <li>You see and can edit everything before it is sent. It never clicks, types or sends anything on Facebook or WhatsApp.</li>
        <li>Saved: customer name, phone, address, items and note (phone, address and messages are encrypted).</li>
        <li>“Suggest reply” sends the messages to our AI provider (Anthropic) with phone numbers and addresses hidden. Nothing from it is saved.</li>
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="chat-retention" className="text-neutral-700">
          Delete saved chats after
        </label>
        <select
          id="chat-retention"
          value={status?.retentionDays ?? 90}
          disabled={!isOwner || save.isPending}
          onChange={(e) => save.mutate({ retentionDays: Number(e.target.value) })}
          className="h-9 rounded-lg border border-line bg-white px-2 text-sm"
        >
          {RETENTION_CHOICES.map((d) => (
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
        <label htmlFor="chat-limit" className="ml-2 text-neutral-700">
          Messages read per chat
        </label>
        <select
          id="chat-limit"
          value={status?.messageLimit ?? 10}
          disabled={!isOwner || save.isPending}
          onChange={(e) => save.mutate({ messageLimit: Number(e.target.value) })}
          className="h-9 rounded-lg border border-line bg-white px-2 text-sm"
        >
          {[5, 10, 15, 20, 30].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>
      {isOwner && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className={outlineBtn} onClick={download}>
            <Download size={15} /> Download all (JSON)
          </button>
          <button type="button" className={`${outlineBtn} text-red-700`} onClick={() => setConfirmAll(true)} disabled={!status?.recordCount}>
            <Trash2 size={15} /> Delete all saved chats
          </button>
          <Link to="/legal/chat-extension-privacy" className="self-center text-xs text-brand underline" target="_blank">
            Privacy policy
          </Link>
        </div>
      )}
      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Delete all saved chats?"
        message={`All ${status?.recordCount ?? 0} saved chats of this store are deleted for good. Orders you already made from them are not touched.`}
        confirmLabel="Delete all"
        danger
        busy={removeAll.isPending}
        onConfirm={() => removeAll.mutate()}
      />
    </div>
  );
}

/** One kept photo, loaded through the signed-in session; deleting it is final. */
function KeptPhoto({ photo, recordId }: { photo: ChatRecordPhoto; recordId: string }) {
  const queryClient = useQueryClient();
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let url: string | null = null;
    let cancelled = false;
    chatExtensionApi
      .photoUrl(photo.id)
      .then((u) => {
        url = u;
        if (cancelled) URL.revokeObjectURL(u);
        else setSrc(u);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [photo.id]);
  const remove = useMutation({
    mutationFn: () => chatExtensionApi.deletePhoto(photo.id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['chat-record-photos', recordId] }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete the photo.')),
  });
  return (
    <figure className="w-28">
      {src ? (
        <a href={src} target="_blank" rel="noopener noreferrer">
          <img src={src} alt="Customer photo" className="h-28 w-28 rounded-lg border border-line object-cover" />
        </a>
      ) : (
        <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-neutral-100 text-xs text-neutral-500">{failed ? 'Not available' : 'Loading…'}</div>
      )}
      <figcaption className="mt-1 text-[11px] text-neutral-500">
        Deleted {formatDhakaDateTime(photo.deletesAt).split(',')[0]} ·{' '}
        <button type="button" className="text-red-700 underline" onClick={() => remove.mutate()} disabled={remove.isPending}>
          Delete
        </button>
      </figcaption>
    </figure>
  );
}

/** One saved chat: its details (editable), the messages that were kept, delete and "Make order". */
function RecordDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ['chat-record', id], queryFn: () => chatExtensionApi.record(id) });
  const { data: photos } = useQuery({ queryKey: ['chat-record-photos', id], queryFn: () => chatExtensionApi.photos(id) });
  const [edit, setEdit] = useState<ChatRecordEdit | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [instant, setInstant] = useState(false);
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ['chat-records'] });
    void queryClient.invalidateQueries({ queryKey: ['chat-record', id] });
  };
  const save = useMutation({
    mutationFn: (body: ChatRecordEdit) => chatExtensionApi.update(id, body),
    onSuccess: () => {
      toast.success('Saved.');
      setEdit(null);
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save.')),
  });
  const remove = useMutation({
    mutationFn: () => chatExtensionApi.remove(id),
    onSuccess: () => {
      toast.success('Deleted.');
      refresh();
      void queryClient.invalidateQueries({ queryKey: ['chat-extension-status'] });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete it.')),
  });

  const field = (key: keyof ChatRecordEdit, label: string, multiline = false) => (
    <label className="block text-xs text-neutral-600">
      {label}
      {multiline ? (
        <textarea rows={2} className={inputClass} value={edit?.[key] ?? ''} onChange={(e) => setEdit({ ...edit, [key]: e.target.value })} />
      ) : (
        <input className={inputClass} value={edit?.[key] ?? ''} onChange={(e) => setEdit({ ...edit, [key]: e.target.value })} />
      )}
    </label>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Saved chat" maxWidth="max-w-xl">
      <div className="space-y-3 px-6 pb-6 pt-3 text-sm">
        {!data ? (
          <p className="text-neutral-500">Loading…</p>
        ) : edit ? (
          <div className="space-y-2">
            {field('customerName', 'Customer name')}
            {field('phone', 'Phone')}
            {field('address', 'Address', true)}
            {field('district', 'District')}
            {field('items', 'Items', true)}
            {field('note', 'Note', true)}
            <div className="flex justify-end gap-2">
              <button type="button" className={outlineBtn} onClick={() => setEdit(null)}>
                Cancel
              </button>
              <button type="button" className={primaryBtn} onClick={() => save.mutate(edit)} disabled={save.isPending}>
                Save
              </button>
            </div>
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5">
              <dt className="text-neutral-500">Customer</dt>
              <dd className="text-regantify-text">{data.customerName}</dd>
              <dt className="text-neutral-500">Phone</dt>
              <dd className="text-regantify-text">{data.phone ?? '—'}</dd>
              <dt className="text-neutral-500">Address</dt>
              <dd className="whitespace-pre-wrap text-regantify-text">{[data.address, data.district].filter(Boolean).join(', ') || '—'}</dd>
              <dt className="text-neutral-500">Items</dt>
              <dd className="whitespace-pre-wrap text-regantify-text">{data.items ?? '—'}</dd>
              {data.note && (
                <>
                  <dt className="text-neutral-500">Note</dt>
                  <dd className="whitespace-pre-wrap text-regantify-text">{data.note}</dd>
                </>
              )}
              <dt className="text-neutral-500">From</dt>
              <dd className="text-regantify-text">
                {SOURCE_LABEL[data.source]} · {formatDhakaDateTime(data.createdAt)}
              </dd>
            </dl>
            {data.messages.length > 0 && (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg bg-neutral-50 p-2 text-xs">
                {data.messages.map((m, i) => (
                  <p key={i} className={m.from === 'store' ? 'text-right text-neutral-600' : 'text-regantify-text'}>
                    <span className="font-medium">{m.from === 'store' ? 'You' : 'Customer'}:</span> {m.text}
                  </p>
                ))}
              </div>
            )}
            {photos && photos.length > 0 && (
              <div>
                <p className="mb-1 text-xs font-medium text-neutral-600">Customer photos (kept 90 days)</p>
                <div className="flex flex-wrap gap-2">
                  {photos.map((p) => (
                    <KeptPhoto key={p.id} photo={p} recordId={id} />
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button type="button" className={`${outlineBtn} text-red-700`} onClick={() => setConfirmDelete(true)}>
                <Trash2 size={15} /> Delete
              </button>
              <button
                type="button"
                className={outlineBtn}
                onClick={() => setEdit({ customerName: data.customerName, phone: data.phone ?? '', address: data.address ?? '', district: data.district ?? '', items: data.items ?? '', note: data.note ?? '' })}
              >
                Edit
              </button>
              {data.orderId ? (
                <Link to={`/vendor/orders/${data.orderId}`} className={primaryBtn}>
                  Open the order
                </Link>
              ) : (
                <>
                  <button type="button" className={outlineBtn} onClick={() => setInstant(true)} title="Send the customer a link: they confirm the order in one tap">
                    <Zap size={15} /> Instant checkout link
                  </button>
                  <button type="button" className={primaryBtn} onClick={() => navigate(`/vendor/orders/add?fromChat=${data.id}`)}>
                    <ShoppingCart size={15} /> Make order
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
      {instant && data && (
        <InstantCheckoutDialog
          open={instant}
          onOpenChange={setInstant}
          chatRecordId={data.id}
          customer={{ customerName: data.customerName, phone: data.phone, address: data.address, district: data.district }}
        />
      )}
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this saved chat?"
        message="It is deleted for good. An order already made from it is not touched."
        confirmLabel="Delete"
        danger
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </Dialog>
  );
}

const STATE_LABEL = { OPEN: 'Waiting', ORDERED: 'Ordered', EXPIRED: 'Expired', CANCELLED: 'Cancelled' } as const;
const STATE_CLASS = { OPEN: 'bg-amber-50 text-amber-700', ORDERED: 'bg-emerald-50 text-emerald-700', EXPIRED: 'bg-neutral-100 text-neutral-500', CANCELLED: 'bg-neutral-100 text-neutral-500' } as const;

/** The instant checkout links made from the dashboard or the extension: opened how often, ordered or not. */
function InstantLinks() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [making, setMaking] = useState(false);
  const { data } = useQuery({ queryKey: ['instant-links', page], queryFn: () => instantCheckoutApi.list(page) });
  const cancel = useMutation({
    mutationFn: instantCheckoutApi.cancel,
    onSuccess: () => {
      toast.success('The link is cancelled.');
      void queryClient.invalidateQueries({ queryKey: ['instant-links'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not cancel it.')),
  });
  return (
    <PageSection>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto flex items-center gap-2 text-sm font-semibold text-regantify-text">
          <Zap size={16} aria-hidden /> Instant checkout links
        </h2>
        <button type="button" className={primaryBtn} onClick={() => setMaking(true)}>
          New link
        </button>
      </div>
      {!data?.items.length ? (
        <p className="py-4 text-center text-sm text-neutral-500">No links yet. Make one here, from a saved chat, or with the extension inside a chat.</p>
      ) : (
        <>
          <ul className="divide-y divide-line rounded-xl border border-line text-sm">
            {data.items.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
                <span className={`rounded-full px-2 py-0.5 text-xs ${STATE_CLASS[l.state]}`}>{STATE_LABEL[l.state]}</span>
                <span className="font-medium text-regantify-text">{l.customerName || 'No name'}</span>
                <span className="min-w-0 flex-1 truncate text-neutral-500">{l.lines.map((x) => `${x.name} × ${x.quantity}`).join(', ')}</span>
                <span className="text-xs text-neutral-500">
                  opened {l.opens}× · {l.source === 'EXTENSION' ? 'from a chat' : 'dashboard'} · {formatDhakaDateTime(l.createdAt)}
                </span>
                {l.orderId ? (
                  <Link to={`/vendor/orders/${l.orderId}`} className="text-xs font-medium text-brand underline">
                    ORDER-{l.orderInvoice}
                  </Link>
                ) : l.state === 'OPEN' ? (
                  <>
                    {l.url && (
                      <button type="button" className="text-xs text-brand underline" onClick={() => navigator.clipboard.writeText(l.url!).then(() => toast.success('Link copied.'))}>
                        Copy link
                      </button>
                    )}
                    <button type="button" className="text-xs text-red-700 underline" onClick={() => cancel.mutate(l.id)} disabled={cancel.isPending}>
                      Cancel
                    </button>
                  </>
                ) : null}
              </li>
            ))}
          </ul>
          <TableFooter page={data.page} perPage={data.perPage} total={data.total} onPageChange={setPage} />
        </>
      )}
      {making && <InstantCheckoutDialog open={making} onOpenChange={setMaking} />}
    </PageSection>
  );
}

export default function ChatOrders() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const { data, isLoading } = useQuery({ queryKey: ['chat-records', q, page], queryFn: () => chatExtensionApi.records(q, page) });

  return (
    <div className="space-y-3">
      <PageSection>
        <PageHeader
          title="Chat orders"
          description="Order details saved from Facebook Messenger and WhatsApp chats with the Regantify Chrome extension. Check them and make the order in one click."
          back={{ to: '/vendor/orders', label: 'All orders' }}
        />
        <div className="grid gap-3 lg:grid-cols-2">
          <ConnectCard />
          <PrivacyCard />
        </div>
      </PageSection>

      <PageSection>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-sm font-semibold text-regantify-text">Saved chats</h2>
          <SearchBox
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder="Name, phone or item"
          />
        </div>
        {isLoading ? (
          <p className="py-8 text-center text-sm text-neutral-500">Loading…</p>
        ) : !data?.items.length ? (
          <EmptyState icon={MessageSquareText} title={q ? 'Nothing matches' : 'No saved chats yet'} hint="Open a customer chat on Messenger or WhatsApp Web, press the Regantify button, check the details and save." />
        ) : (
          <>
            <ul className="divide-y divide-line rounded-xl border border-line">
              {data.items.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => setOpen(r.id)} className="flex w-full flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2.5 text-left hover:bg-neutral-50">
                    <span className="font-medium text-regantify-text">{r.customerName}</span>
                    <span className="text-sm tabular-nums text-neutral-600">{r.phone ?? 'No phone'}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-neutral-500">{[r.address, r.district].filter(Boolean).join(', ')}</span>
                    {r.orderId && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">Ordered</span>}
                    <span className="text-xs text-neutral-500">{formatDhakaDateTime(r.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
            <TableFooter page={data.page} perPage={data.perPage} total={data.total} onPageChange={setPage} />
          </>
        )}
      </PageSection>
      <InstantLinks />
      {open && <RecordDialog id={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
