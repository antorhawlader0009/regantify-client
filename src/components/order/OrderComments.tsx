import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { idlePoll } from '../../lib/idlePolling';
import { Trash2 } from 'lucide-react';
import { ordersApi } from '../../lib/ordersApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';

const MAX = 500;
const when = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' });

/**
 * Order detail > Comments (TellMe idea 82): the team's talk on this order, one comment under another with who wrote it and when. Only the
 * writer deletes their own (the owner any). The old single "Staff note" stays above as it was. The customer never sees any of it.
 */
export function OrderComments({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const key = ['order-comments', orderId];
  const { data } = useQuery({ queryKey: key, queryFn: () => ordersApi.listComments(orderId), refetchInterval: idlePoll(60_000) });
  const post = useMutation({
    mutationFn: () => ordersApi.addComment(orderId, text.trim()),
    onSuccess: () => {
      setText('');
      void queryClient.invalidateQueries({ queryKey: key });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not post the comment. Please try again.')),
  });
  const remove = useMutation({
    mutationFn: (commentId: string) => ordersApi.deleteComment(orderId, commentId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete the comment.')),
  });

  return (
    <div className="space-y-3">
      {data?.legacyNote && (
        <div>
          <p className="mb-1 text-xs font-medium text-neutral-500">Old note</p>
          <p className="whitespace-pre-line rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-700">{data.legacyNote}</p>
        </div>
      )}
      {data && data.comments.length === 0 && !data.legacyNote && <p className="text-xs text-neutral-500">No comments yet. Only your team sees these.</p>}
      <ul className="space-y-2.5">
        {(data?.comments ?? []).map((c) => (
          <li key={c.id} className="rounded-lg border border-line px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-neutral-500">
                <span className="font-medium text-regantify-text">{c.authorName}</span> ({c.authorRole}) · {when(c.createdAt)}
              </p>
              {c.canDelete && (
                <button type="button" onClick={() => remove.mutate(c.id)} className="text-neutral-400 hover:text-red-600" aria-label="Delete comment">
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <p className="mt-1 whitespace-pre-line text-sm text-regantify-text">{c.body}</p>
          </li>
        ))}
      </ul>
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX))}
          rows={2}
          placeholder="e.g. Called the customer, will take it tomorrow morning"
          className="w-full rounded-lg border border-line px-3 py-2 text-sm"
        />
        <div className="mt-1.5 flex items-center justify-between">
          <span className="text-xs text-neutral-400">{text.length}/{MAX}</span>
          <button
            type="button"
            onClick={() => post.mutate()}
            disabled={!text.trim() || post.isPending}
            className="h-9 rounded-lg bg-regantify-cta px-4 text-sm font-medium text-white hover:bg-regantify-cta-dark disabled:opacity-60"
          >
            {post.isPending ? 'Posting…' : 'Post comment'}
          </button>
        </div>
      </div>
    </div>
  );
}
