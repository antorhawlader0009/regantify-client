import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SectionCard } from '../../../components/product/ProductFormPieces';
import { reviewsApi, type Review } from '../../../lib/reviewsApi';
import { formatDhakaDateTime } from '../../../lib/dhakaDate';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const MAX_REPLY = 500;

/**
 * Edit Review > "Your reply" (TellMe idea 17): the store's public answer, shown under the review on the StorePal
 * product page as "Reply from <your store>". It saves on its own (not with "Save review"), so answering a review
 * never touches the shopper's words. An empty reply removes it.
 */
export function ReviewReplyCard({ review }: { review: Review }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState(review.replyText ?? '');
  const saved = review.replyText ?? '';
  const dirty = text.trim() !== saved;

  const save = useMutation({
    mutationFn: (reply: string) => reviewsApi.reply(review.id, reply),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setText(updated.replyText ?? '');
      toast.success(updated.replyText ? 'Reply saved. It shows on your store if the review is shown.' : 'Reply removed.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the reply.')),
  });

  return (
    <SectionCard
      title="Your reply"
      description={
        review.rating <= 2
          ? 'A calm, helpful answer to a low rating shows the next shopper how you treat customers.'
          : 'Shoppers see this under the review, as a reply from your store.'
      }
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX_REPLY}
        rows={3}
        placeholder="e.g. Thank you for telling us. We are sorry about the late delivery and have called you to make it right."
        className="block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-regantify-text focus:border-brand focus:outline-none"
      />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-neutral-500">
          {text.length}/{MAX_REPLY}
          {review.repliedAt && saved && (
            <>
              {' '}
              · Replied {formatDhakaDateTime(review.repliedAt)}
              {review.repliedBy ? ` by ${review.repliedBy}` : ''}
            </>
          )}
        </p>
        <div className="flex gap-2">
          {saved && (
            <button
              type="button"
              onClick={() => save.mutate('')}
              disabled={save.isPending}
              className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-3 text-sm text-regantify-text hover:bg-neutral-50 disabled:opacity-60"
            >
              Remove reply
            </button>
          )}
          <button
            type="button"
            onClick={() => save.mutate(text.trim())}
            disabled={save.isPending || !dirty || !text.trim()}
            className="inline-flex h-9 items-center rounded-lg bg-brand px-3 text-sm text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {save.isPending ? 'Saving…' : saved ? 'Update reply' : 'Post reply'}
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
