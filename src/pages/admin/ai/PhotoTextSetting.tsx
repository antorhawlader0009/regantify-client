import { ScanText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPhotoTextMode, setPhotoTextMode, type PhotoTextMode } from '../../../lib/aiApi';

const KEY = ['admin', 'ai', 'photo-text'];

const OPTIONS: Array<{ mode: PhotoTextMode; title: string; text: string }> = [
  {
    mode: 'BROWSER',
    title: "In the shopper's browser",
    text: 'No load on our server. The first photo downloads about 7 MB (the reader and its Bangla and English data); the browser keeps it for later visits.',
  },
  {
    mode: 'SERVER',
    title: 'On our server',
    text: 'Nothing to download for the shopper and usually faster on phones. Uses server CPU and about 100 MB of memory while photos are coming in.',
  },
];

/**
 * Admin > AI Settings: where the text in a photo sent to a store's AI chat is read (server photo-match/photo-text.ts).
 * Either way the photo itself never goes to the AI, only its text, cut short.
 */
export function PhotoTextSetting() {
  const qc = useQueryClient();
  const { data: mode, isLoading, isError } = useQuery({ queryKey: KEY, queryFn: getPhotoTextMode });
  const save = useMutation({
    mutationFn: setPhotoTextMode,
    onSuccess: (m) => {
      qc.setQueryData(KEY, m);
      toast.success(m === 'SERVER' ? 'Photo text is now read on the server.' : "Photo text is now read in the shopper's browser.");
    },
    onError: () => toast.error('Could not save this change. Please try again.'),
  });

  return (
    <div className="mt-6 bg-white rounded-2xl border border-black/5 p-5 sm:p-6">
      <div className="flex items-start gap-2.5">
        <ScanText size={18} className="text-regantify-cta mt-0.5" aria-hidden />
        <div>
          <h2 className="text-base font-semibold text-regantify-text">Text in chat photos</h2>
          <p className="text-sm text-regantify-text-muted mt-0.5">
            When a shopper sends a photo or screenshot to a store's AI chat, its Bangla and English text is read and given to the
            AI with their next message (up to 400 characters, phone numbers hidden). The photo itself is never sent to the AI.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 flex justify-center">
          <Loader2 size={18} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : isError ? (
        <p className="mt-4 text-sm text-red-600">Could not load this setting.</p>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Where photo text is read">
          {OPTIONS.map((o) => {
            const on = mode === o.mode;
            return (
              <button
                key={o.mode}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={save.isPending}
                onClick={() => !on && save.mutate(o.mode)}
                className={`text-left rounded-xl border p-3.5 transition-colors disabled:opacity-60 ${
                  on ? 'border-regantify-cta bg-regantify-cta/5' : 'border-black/10 hover:bg-black/[0.02]'
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-regantify-text">
                  <span className={`h-3.5 w-3.5 rounded-full border-2 ${on ? 'border-regantify-cta bg-regantify-cta' : 'border-black/25'}`} aria-hidden />
                  {o.title}
                  {o.mode === 'BROWSER' && <span className="text-xs font-normal text-regantify-text-muted">(default)</span>}
                </span>
                <span className="block mt-1 text-xs text-regantify-text-muted">{o.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
