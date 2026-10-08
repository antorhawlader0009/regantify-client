import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send, Trash2, Users } from 'lucide-react';
import { notificationsApi, type TelegramChat, type TelegramTopic } from '../../lib/notificationsApi';
import { PUSH_TOPICS } from '../../lib/pushNotifications';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { useCan } from '../../lib/useStaffAccess';

const CONFIG_KEY = ['notifications', 'telegram', 'config'];
const CHATS_KEY = ['notifications', 'telegram', 'chats'];

const TOPICS: { topic: TelegramTopic; label: string; hint: string }[] = [
  ...PUSH_TOPICS,
  { topic: 'LMS', label: 'Lead alerts', hint: 'Leads given to you, tasks due and leads gone quiet in the LMS. Only for your own chat.' },
];

/** A connect link that was made and is waiting for the person to press Start in Telegram. */
interface Waiting {
  url: string;
  kind: 'PRIVATE' | 'GROUP';
  /** How many chats there were when the link was made: a new one means it worked. */
  before: number;
  until: number;
}

/**
 * Notifications > Alert settings > Telegram: the store's alerts in a Telegram chat or group. Free, works with
 * the dashboard closed. "Connect Telegram" opens the bot with a one-time link (press Start); the store owner can
 * also add the bot to a team group. Each chat picks its own kinds of alert.
 */
export function TelegramSection({ open }: { open: boolean }) {
  const queryClient = useQueryClient();
  const isOwner = useCan('owner');
  const canLms = useCan('lms.access');
  const [waiting, setWaiting] = useState<Waiting | null>(null);

  const { data: config } = useQuery({ queryKey: CONFIG_KEY, queryFn: notificationsApi.telegramConfig, enabled: open, retry: false });
  const { data: chats } = useQuery({
    queryKey: CHATS_KEY,
    queryFn: notificationsApi.telegramChats,
    enabled: open && config?.enabled === true,
    // While a connect link is waiting, look every few seconds so the new chat shows up by itself.
    refetchInterval: waiting ? 3000 : false,
  });

  // A new chat appeared (or the link ran out): stop waiting.
  useEffect(() => {
    if (!waiting || !chats) return;
    if (chats.length > waiting.before) {
      toast.success('Telegram connected.');
      setWaiting(null);
    } else if (Date.now() > waiting.until) {
      setWaiting(null);
    }
  }, [chats, waiting]);
  useEffect(() => {
    if (!open) setWaiting(null);
  }, [open]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: CHATS_KEY });

  const link = useMutation({
    mutationFn: (kind: 'PRIVATE' | 'GROUP') => notificationsApi.telegramLink(kind),
    onSuccess: (res, kind) => {
      setWaiting({ url: res.url, kind, before: chats?.length ?? 0, until: new Date(res.expiresAt).getTime() });
      window.open(res.url, '_blank', 'noopener,noreferrer');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not make the Telegram link. Please try again.')),
  });
  const topicsMutation = useMutation({
    mutationFn: ({ chat, topics }: { chat: TelegramChat; topics: TelegramTopic[] }) => notificationsApi.telegramTopics(chat.id, topics),
    onMutate: ({ chat, topics }) => {
      queryClient.setQueryData<TelegramChat[]>(CHATS_KEY, (old) => old?.map((c) => (c.id === chat.id ? { ...c, topics } : c)));
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Could not save your choice.'));
      void refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (chat: TelegramChat) => notificationsApi.telegramRemove(chat.id),
    onSuccess: () => void refresh(),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not disconnect that chat.')),
  });
  const test = useMutation({
    mutationFn: notificationsApi.telegramTest,
    onSuccess: (res) =>
      res.sent > 0
        ? toast.success('Sent. It should show up in Telegram in a moment.')
        : toast.error(res.chats === 0 ? 'Connect your own Telegram chat first.' : 'Telegram could not be reached. Try again.'),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send the test.')),
  });

  const hasPrivate = (chats ?? []).some((c) => c.kind === 'PRIVATE');

  let body;
  if (config && !config.enabled) {
    body = <p className="text-xs text-neutral-500">Telegram alerts are not switched on for this server yet.</p>;
  } else {
    body = (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => link.mutate('PRIVATE')}
            disabled={link.isPending || !config}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-3 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            <Send size={14} aria-hidden />
            Connect Telegram
          </button>
          {isOwner && (
            <button
              type="button"
              onClick={() => link.mutate('GROUP')}
              disabled={link.isPending || !config}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-sm font-medium text-regantify-text transition-colors hover:bg-neutral-50 disabled:opacity-60"
            >
              <Users size={14} aria-hidden />
              Add to a group
            </button>
          )}
        </div>

        {waiting && (
          <p className="rounded-lg bg-neutral-50 px-3 py-2.5 text-xs text-neutral-600">
            Waiting for you in Telegram: {waiting.kind === 'GROUP' ? 'pick your group and add the bot' : 'press Start'}. Nothing opened?{' '}
            <a href={waiting.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand hover:underline">
              Open Telegram
            </a>
            . The link works for 10 minutes.
          </p>
        )}

        {chats && chats.length > 0 && (
          <ul className="space-y-3">
            {chats.map((chat) => {
              const topics = TOPICS.filter((t) => t.topic !== 'LMS' || (chat.kind === 'PRIVATE' && canLms));
              return (
                <li key={chat.id} className="rounded-lg border border-line px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm font-medium text-regantify-text">
                      {chat.title ?? 'Telegram chat'}
                      <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-semibold text-neutral-600">{chat.kind === 'GROUP' ? 'Group' : 'You'}</span>
                    </span>
                    {chat.canManage && (
                      <button
                        type="button"
                        onClick={() => remove.mutate(chat)}
                        disabled={remove.isPending}
                        aria-label={`Disconnect ${chat.title ?? 'this chat'}`}
                        className="shrink-0 text-neutral-500 hover:text-red-600 disabled:opacity-60"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {topics.map(({ topic, label, hint }) => (
                      <label key={topic} className="flex items-start gap-2 text-sm text-regantify-text">
                        <input
                          type="checkbox"
                          checked={chat.topics.includes(topic)}
                          disabled={!chat.canManage}
                          onChange={(e) =>
                            topicsMutation.mutate({ chat, topics: e.target.checked ? [...chat.topics, topic] : chat.topics.filter((t) => t !== topic) })
                          }
                          className="mt-0.5 h-4 w-4 rounded border-line accent-brand"
                        />
                        <span>
                          {label}
                          <span className="block text-xs text-neutral-500">{hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {hasPrivate && (
          <button type="button" onClick={() => test.mutate()} disabled={test.isPending} className="text-xs font-medium text-brand hover:underline disabled:opacity-60">
            {test.isPending ? 'Sending…' : 'Send a test message'}
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="border-t border-line pt-5">
      <div className="mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-regantify-text">
          <Send size={15} aria-hidden />
          Telegram
        </h3>
        <p className="mt-0.5 text-xs text-neutral-500">
          Free, and works with the dashboard closed. Get new orders and problems in your own Telegram chat
          {isOwner ? ' or a team group' : ''}.
        </p>
      </div>
      {body}
    </section>
  );
}
