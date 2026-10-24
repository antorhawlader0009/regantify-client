import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ExternalLink, Inbox, Mail, MessageCircle, Phone, Search, Settings2, Trash2 } from 'lucide-react';
import { CustomerTabs } from './CustomerTabs';
import { Dialog } from '../../../components/ui/Dialog';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { COMPLAINT_KIND_LABEL, contactMessagesApi, type ContactMessageStatus, type ContactPageSettings } from '../../../lib/contactMessagesApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { useCan } from '../../../lib/useStaffAccess';
import { useAuthStore } from '../../../store/authStore';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';

const TABS: Array<{ id: '' | ContactMessageStatus; label: string }> = [
  { id: '', label: 'All' },
  { id: 'NEW', label: 'New' },
  { id: 'REPLIED', label: 'Answered' },
  { id: 'ARCHIVED', label: 'Archived' },
];

const STATUS_CHIP: Record<ContactMessageStatus, string> = {
  NEW: 'bg-emerald-50 text-emerald-700',
  READ: 'bg-neutral-100 text-neutral-600',
  REPLIED: 'bg-sky-50 text-sky-700',
  ARCHIVED: 'bg-neutral-100 text-neutral-500',
};
const STATUS_LABEL: Record<ContactMessageStatus, string> = { NEW: 'New', READ: 'Read', REPLIED: 'Answered', ARCHIVED: 'Archived' };

const inputClass = 'h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';

const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const waLink = (phone: string) => `https://wa.me/88${phone.replace(/^\+?88/, '')}`;

/**
 * Customers > Messages: what shoppers wrote on the store's Contact page (StorePal /contact). Open one to read it, call or WhatsApp the customer, or answer
 * by email when they gave an email address (it goes out with the store's name, and their reply comes to the owner's email). Also holds the Contact
 * page's own settings (form on/off, the WhatsApp / phone / address cards).
 */
export default function Messages() {
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<'' | ContactMessageStatus>('');
  // Where it came from: the Contact page, or a complaint the store AI chat recorded.
  const [source, setSource] = useState<'' | 'CONTACT_FORM' | 'AI_CHAT'>('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const openId = params.get('open');
  const canEdit = useCan('customers.edit');
  const canDelete = useCan('customers.delete');
  const canSettings = useCan('store.content');

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useQuery({
    queryKey: ['contact-messages', tab, source, query, page],
    queryFn: () => contactMessagesApi.list({ status: tab || undefined, source: source || undefined, search: query || undefined, page }),
  });
  const open = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set('open', id);
    else next.delete('open');
    setParams(next, { replace: true });
  };

  const pages = list.data ? Math.max(1, Math.ceil(list.data.total / list.data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-regantify-text">Messages</h1>
          <p className="mt-1 text-sm text-neutral-600">What customers wrote on your store’s Contact page, and the complaints your store’s AI chat recorded. Answer by email, or call / WhatsApp them.</p>
        </div>
        <div className="flex items-center gap-2">
          <CustomerTabs />
          {canSettings && (
            <button type="button" onClick={() => setSettingsOpen(true)} className="flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm font-medium text-regantify-text hover:bg-neutral-50">
              <Settings2 size={15} /> Contact page
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center gap-1 rounded-lg border border-line bg-white p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setTab(t.id);
                setPage(1);
              }}
              className={`flex h-7 items-center gap-1.5 rounded-md px-3 text-sm ${tab === t.id ? 'bg-brand-lime font-medium text-regantify-text' : 'text-neutral-600 hover:bg-neutral-100'}`}
            >
              {t.label}
              {t.id === 'NEW' && (list.data?.counts.NEW ?? 0) > 0 && <span className="rounded-full bg-emerald-600 px-1.5 text-[11px] font-semibold text-white">{list.data?.counts.NEW}</span>}
            </button>
          ))}
        </div>
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value as typeof source);
            setPage(1);
          }}
          aria-label="Where it came from"
          className="h-9 rounded-lg border border-line bg-white px-2.5 text-sm text-regantify-text"
        >
          <option value="">Everything</option>
          <option value="CONTACT_FORM">Contact page</option>
          <option value="AI_CHAT">AI chat complaints</option>
        </select>
        <label className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, phone, email or words" className={`${inputClass} pl-9`} />
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
        {list.isLoading ? (
          <p className="p-6 text-sm text-neutral-500">Loading…</p>
        ) : !list.data?.items.length ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Inbox size={28} className="text-neutral-300" />
            <p className="text-sm font-medium text-regantify-text">No messages {tab ? 'here' : 'yet'}</p>
            <p className="max-w-sm text-xs text-neutral-500">Customers write from the “Contact us” page of your store (link in the store footer). Each new message also rings your bell.</p>
          </div>
        ) : (
          <ul className="divide-y divide-black/5">
            {list.data.items.map((m) => (
              <li key={m.id}>
                <button type="button" onClick={() => open(m.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${m.status === 'NEW' ? 'bg-emerald-500' : 'bg-transparent'}`} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2">
                      <span className={`text-sm text-regantify-text ${m.status === 'NEW' ? 'font-semibold' : 'font-medium'}`}>{m.name}</span>
                      <span className="text-xs text-neutral-500">{m.phone}</span>
                      {m.email && <Mail size={12} className="text-neutral-400" aria-label="Has email" />}
                      {m.source === 'AI_CHAT' && (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700">
                          AI chat · {m.kind ? COMPLAINT_KIND_LABEL[m.kind] : 'Complaint'}
                        </span>
                      )}
                      {m.orderRef && <span className="text-xs text-neutral-500">{m.orderRef}</span>}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-neutral-600">{m.message}</span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-neutral-500">{when(m.createdAt)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CHIP[m.status]}`}>{STATUS_LABEL[m.status]}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">
            Previous
          </button>
          <span className="text-neutral-600">
            Page {page} of {pages}
          </span>
          <button type="button" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-line px-3 py-1.5 disabled:opacity-40">
            Next
          </button>
        </div>
      )}

      {openId && (
        <MessageDialog
          id={openId}
          canEdit={canEdit}
          canDelete={canDelete}
          onClose={() => open(null)}
          onChanged={() => {
            queryClient.invalidateQueries({ queryKey: ['contact-messages'] });
            queryClient.invalidateQueries({ queryKey: ['contact-messages-unread'] });
          }}
        />
      )}
      {settingsOpen && <ContactSettingsDialog onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}

function MessageDialog({ id, canEdit, canDelete, onClose, onChanged }: { id: string; canEdit: boolean; canDelete: boolean; onClose: () => void; onChanged: () => void }) {
  const queryClient = useQueryClient();
  const [answer, setAnswer] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const msg = useQuery({ queryKey: ['contact-message', id], queryFn: () => contactMessagesApi.get(id) });

  // Opening a new message marks it read on the server; refresh the list's dot and counts.
  useEffect(() => {
    if (msg.data) onChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msg.data?.id]);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['contact-message', id] });
    onChanged();
  };

  const reply = useMutation({
    mutationFn: () => contactMessagesApi.reply(id, answer.trim()),
    onSuccess: (r) => {
      if (r.ok) {
        toast.success('Answer sent by email.');
        setAnswer('');
      } else toast.error(r.error ?? 'The email could not be sent.');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send the answer.')),
  });
  const status = useMutation({
    mutationFn: (s: 'NEW' | 'READ' | 'ARCHIVED') => contactMessagesApi.setStatus(id, s),
    onSuccess: (_d, s) => {
      refresh();
      if (s === 'ARCHIVED' || s === 'NEW') onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not change it.')),
  });
  const remove = useMutation({
    mutationFn: () => contactMessagesApi.remove(id),
    onSuccess: () => {
      toast.success('Message deleted.');
      onChanged();
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete it.')),
  });

  const m = msg.data;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={m ? `Message from ${m.name}` : 'Message'} maxWidth="max-w-2xl">
      <div className="max-h-[75vh] space-y-4 overflow-y-auto px-6 pb-6 pt-3">
        {msg.isLoading || !m ? (
          <p className="text-sm text-neutral-500">{msg.isError ? apiErrorMessage(msg.error, 'Could not open this message.') : 'Loading…'}</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <a href={`tel:${m.phone}`} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-regantify-text hover:bg-neutral-50">
                <Phone size={14} /> {m.phone}
              </a>
              <a href={waLink(m.phone)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-regantify-text hover:bg-neutral-50">
                <MessageCircle size={14} /> WhatsApp
              </a>
              {m.email && (
                <span className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-regantify-text">
                  <Mail size={14} /> {m.email}
                </span>
              )}
              <span className="ml-auto text-xs text-neutral-500">{when(m.createdAt)}</span>
            </div>

            {m.source === 'AI_CHAT' && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">
                <span className="font-medium">{m.kind ? COMPLAINT_KIND_LABEL[m.kind] : 'Complaint'} recorded by your store’s AI chat.</span>
                <span>The customer was told it was received and that the store will look into it. Call them, then mark it done.</span>
                {m.orderId ? (
                  <Link to={`/vendor/orders/${m.orderId}`} className="flex items-center gap-1 font-medium underline">
                    Open order {m.orderRef} <ExternalLink size={12} />
                  </Link>
                ) : (
                  m.orderRef && <span>Order number they gave: {m.orderRef} (did not match this phone)</span>
                )}
              </div>
            )}

            <div className="whitespace-pre-wrap rounded-xl bg-neutral-50 p-4 text-sm leading-relaxed text-regantify-text">{m.message}</div>

            {m.replies.length > 0 && (
              <div className="space-y-2">
                {m.replies.map((r) => (
                  <div key={r.id} className="ml-6 rounded-xl border border-sky-100 bg-sky-50/50 p-3">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <span className="font-medium text-regantify-text">{r.sentByName}</span>
                      <span>{when(r.createdAt)}</span>
                      {r.emailStatus === 'SENT' ? (
                        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-700">Emailed</span>
                      ) : (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700" title={r.error ?? undefined}>
                          Not sent{r.error ? `: ${r.error}` : ''}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-regantify-text">{r.body}</p>
                  </div>
                ))}
              </div>
            )}

            {canEdit &&
              (m.email ? (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-regantify-text">
                    Answer by email
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      rows={5}
                      maxLength={5000}
                      placeholder={`Write your answer to ${m.name}…`}
                      className="mt-1.5 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-regantify-cta/30"
                    />
                  </label>
                  <p className="text-xs text-neutral-500">Sent to {m.email} with your store’s name. If the customer replies, it goes to your account’s email.</p>
                  <button
                    type="button"
                    onClick={() => reply.mutate()}
                    disabled={reply.isPending || answer.trim().length < 2}
                    className="rounded-xl bg-regantify-cta px-5 py-2.5 text-sm font-medium text-white hover:bg-regantify-cta-dark disabled:opacity-60"
                  >
                    {reply.isPending ? 'Sending…' : 'Send email'}
                  </button>
                </div>
              ) : (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{m.source === 'AI_CHAT' ? 'This came from the AI chat, so there is no email. Call or WhatsApp the customer.' : 'This customer did not give an email address. Call or WhatsApp them instead.'}</p>
              ))}

            {canEdit && (
              <div className="flex flex-wrap items-center gap-2 border-t border-black/5 pt-4">
                {m.status !== 'ARCHIVED' ? (
                  <button type="button" onClick={() => status.mutate('ARCHIVED')} className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm text-regantify-text hover:bg-neutral-50">
                    <Archive size={14} /> {m.source === 'AI_CHAT' ? 'Mark done' : 'Archive'}
                  </button>
                ) : (
                  <button type="button" onClick={() => status.mutate('READ')} className="rounded-lg border border-line px-3 py-1.5 text-sm text-regantify-text hover:bg-neutral-50">
                    Move back to inbox
                  </button>
                )}
                {m.status !== 'NEW' && (
                  <button type="button" onClick={() => status.mutate('NEW')} className="rounded-lg border border-line px-3 py-1.5 text-sm text-regantify-text hover:bg-neutral-50">
                    Mark as unread
                  </button>
                )}
                {canDelete && (
                  <button type="button" onClick={() => setConfirmDelete(true)} className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-100 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this message?"
        message="The message and your answers are removed for good."
        confirmLabel="Delete message"
        danger
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </Dialog>
  );
}

function ContactSettingsDialog({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const subdomain = useAuthStore((s) => s.user?.vendor?.subdomain);
  const { data } = useQuery({ queryKey: ['contact-page-settings'], queryFn: contactMessagesApi.settings });
  const [form, setForm] = useState<ContactPageSettings | null>(null);
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: () => contactMessagesApi.saveSettings(form!),
    onSuccess: (saved) => {
      queryClient.setQueryData(['contact-page-settings'], saved);
      toast.success('Contact page saved. Your store will show it shortly.');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Please try again.')),
  });

  const set = (patch: Partial<ContactPageSettings>) => setForm((f) => (f ? { ...f, ...patch } : f));
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Contact page" maxWidth="max-w-lg">
      <div className="space-y-4 px-6 pb-6 pt-3">
        {!form ? (
          <p className="text-sm text-neutral-500">Loading…</p>
        ) : (
          <>
            <p className="text-sm text-neutral-600">
              The “Contact us” page of your store (StorePal theme), linked from the footer.
              {subdomain && (
                <a href={`${storefrontStoreUrl(subdomain)}/contact`} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center gap-1 text-regantify-cta hover:underline">
                  Open it <ExternalLink size={12} />
                </a>
              )}
            </p>
            <label className="flex items-center gap-2 text-sm text-regantify-text">
              <input type="checkbox" checked={form.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
              Show the page and its message form
            </label>
            <label className="block text-sm font-medium text-regantify-text">
              Line under the title <span className="font-normal text-neutral-500">(optional)</span>
              <input value={form.intro} onChange={(e) => set({ intro: e.target.value })} maxLength={300} placeholder="Have a question? Write to us and we will get back to you." className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-medium text-regantify-text">
              WhatsApp number
              <input value={form.whatsapp} onChange={(e) => set({ whatsapp: e.target.value })} inputMode="tel" maxLength={16} placeholder="01XXXXXXXXX" className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-medium text-regantify-text">
              Phone to call
              <input value={form.phone} onChange={(e) => set({ phone: e.target.value })} inputMode="tel" maxLength={20} placeholder="01XXXXXXXXX" className={`${inputClass} mt-1.5`} />
            </label>
            <label className="block text-sm font-medium text-regantify-text">
              Based in
              <input value={form.basedIn} onChange={(e) => set({ basedIn: e.target.value })} maxLength={120} placeholder="Chittagong and Dhaka, Bangladesh" className={`${inputClass} mt-1.5`} />
            </label>
            <p className="text-xs text-neutral-500">Leave a box empty to hide its card. The first time, these are filled from your WhatsApp link, your phone and your store address.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-xl border border-black/10 px-4 py-2.5 text-sm font-medium text-regantify-text hover:bg-neutral-50">
                Cancel
              </button>
              <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className="rounded-xl bg-regantify-cta px-6 py-2.5 text-sm font-medium text-white hover:bg-regantify-cta-dark disabled:opacity-60">
                {save.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
