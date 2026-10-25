import { AudioLines, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getVoiceModel, setVoiceModel, type VoiceModelOption } from '../../../lib/aiApi';

const KEY = ['admin', 'ai', 'voice-model'];

/** "8.5 MB" */
const mb = (n: number) => `${n.toLocaleString('en-US', { maximumFractionDigits: 1 })} MB`;

/**
 * Admin > AI Settings: which version of the voice store voice calls use (server storefront/voice-files.ts VOICE_MODELS).
 * Every option is the same Bangla voice; the smaller ones keep its numbers in fewer bits, so a shopper downloads less
 * and the voice changes a little. The comparison shows, for each, the one-time download and how much the voice changes.
 * A shopper who already has a model keeps using it until the newly chosen one has downloaded in the background.
 */
export function VoiceModelSetting() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: KEY, queryFn: getVoiceModel });
  const save = useMutation({
    mutationFn: setVoiceModel,
    onSuccess: (model) => {
      qc.setQueryData(KEY, (old: typeof data) => (old ? { ...old, model } : old));
      const picked = data?.models.find((m) => m.key === model);
      toast.success(`Voice calls now use ${picked?.label ?? model} (${picked ? mb(picked.downloadMb) : ''} download).`);
    },
    onError: () => toast.error('Could not save this change. Please try again.'),
  });

  const models = data?.models ?? [];
  const biggest = Math.max(1, ...models.map((m) => m.downloadMb));
  const mostChange = Math.max(1, ...models.map((m) => m.changeDb));

  return (
    <div className="mt-6 bg-white rounded-2xl border border-black/5 p-5 sm:p-6">
      <div className="flex items-start gap-2.5">
        <AudioLines size={18} className="text-regantify-cta mt-0.5" aria-hidden />
        <div>
          <h2 className="text-base font-semibold text-regantify-text">Voice model for voice calls</h2>
          <p className="text-sm text-regantify-text-muted mt-0.5">
            The voice a store's AI speaks with on a voice call runs in the shopper's browser, which downloads it once. The same voice
            comes in several sizes: smaller means a faster first call and less mobile data, but the voice changes a little. A shopper who
            already has one keeps using it until the new choice has finished downloading in the background, then the old one is deleted.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 flex justify-center">
          <Loader2 size={18} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : isError || !data ? (
        <p className="mt-4 text-sm text-red-600">Could not load this setting.</p>
      ) : (
        <div className="mt-4" role="radiogroup" aria-label="Voice model">
          <div className="hidden sm:grid grid-cols-[minmax(150px,1.1fr)_minmax(160px,1.4fr)_minmax(160px,1.4fr)] gap-4 px-3.5 pb-2 text-xs text-regantify-text-muted">
            <span>Model</span>
            <span>Download for a shopper (once)</span>
            <span>Voice compared with the original</span>
          </div>
          <div className="space-y-2">
            {models.map((m) => (
              <Option
                key={m.key}
                m={m}
                on={data.model === m.key}
                isDefault={data.defaultModel === m.key}
                biggest={biggest}
                mostChange={mostChange}
                disabled={save.isPending}
                onPick={() => data.model !== m.key && save.mutate(m.key)}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-regantify-text-muted">
            The voice change is measured by comparing each model's sound with the original, frame by frame; lower is closer. Listen
            before choosing a 3-bit model: the change is easy to hear.
          </p>
        </div>
      )}
    </div>
  );
}

function Option({
  m,
  on,
  isDefault,
  biggest,
  mostChange,
  disabled,
  onPick,
}: {
  m: VoiceModelOption;
  on: boolean;
  isDefault: boolean;
  biggest: number;
  mostChange: number;
  disabled: boolean;
  onPick: () => void;
}) {
  const sizePct = (m.downloadMb / biggest) * 100;
  // A sliver for the original, so "no change" still reads as a bar.
  const changePct = Math.max(3, (m.changeDb / mostChange) * 100);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      disabled={disabled}
      onClick={onPick}
      className={`w-full text-left rounded-xl border p-3.5 transition-colors disabled:opacity-60 sm:grid sm:grid-cols-[minmax(150px,1.1fr)_minmax(160px,1.4fr)_minmax(160px,1.4fr)] sm:items-center sm:gap-4 ${
        on ? 'border-regantify-cta bg-regantify-cta/5' : 'border-black/10 hover:bg-black/[0.02]'
      }`}
    >
      <span className="block">
        <span className="flex items-center gap-2 text-sm font-medium text-regantify-text">
          <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${on ? 'border-regantify-cta bg-regantify-cta' : 'border-black/25'}`} aria-hidden />
          {m.label}
          {isDefault && <span className="text-xs font-normal text-regantify-text-muted">(default)</span>}
        </span>
        <span className="block mt-1 pl-[22px] text-xs text-regantify-text-muted">{m.note}</span>
      </span>
      <span className="mt-3 sm:mt-0 block">
        <span className="flex items-baseline justify-between gap-2 text-xs">
          <span className="sm:hidden text-regantify-text-muted">Download</span>
          <span className="font-semibold tabular-nums text-regantify-text">{mb(m.downloadMb)}</span>
        </span>
        <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-black/[0.06]" aria-hidden>
          <span className={`block h-full rounded-full ${on ? 'bg-regantify-cta' : 'bg-black/30'}`} style={{ width: `${sizePct}%` }} />
        </span>
      </span>
      <span className="mt-3 sm:mt-0 block">
        <span className="flex items-baseline justify-between gap-2 text-xs">
          <span className="sm:hidden text-regantify-text-muted">Voice</span>
          <span className="text-regantify-text">{m.voice}</span>
          <span className="tabular-nums text-regantify-text-muted">{m.changeDb ? `${m.changeDb} dB` : 'none'}</span>
        </span>
        <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-black/[0.06]" aria-hidden>
          <span className={`block h-full rounded-full ${m.changeDb >= 10 ? 'bg-red-500' : on ? 'bg-regantify-cta' : 'bg-black/30'}`} style={{ width: `${changePct}%` }} />
        </span>
      </span>
    </button>
  );
}
