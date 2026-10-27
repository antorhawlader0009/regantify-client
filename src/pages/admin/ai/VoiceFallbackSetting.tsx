import { Loader2, Server } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getVoiceFallback, setVoiceFallback, type VoiceFallback } from '../../../lib/aiApi';

const KEY = ['admin', 'ai', 'voice-fallback'];

const OPTIONS: { key: VoiceFallback; label: string; note: string }[] = [
  {
    key: 'GOOGLE',
    label: "Google's voice",
    note: 'Free and costs our server nothing. A different voice from the one the call starts with.',
  },
  {
    key: 'SERVER',
    label: 'Our server (same voice)',
    note: 'The same Bangla voice, made on our server. One sentence at a time, remembered, and freed after 10 quiet minutes. If the server is busy, that sentence still uses Google.',
  },
];

/**
 * Admin > AI Settings: the voice a store voice call switches to when the shopper's phone is too slow to make the voice
 * itself (server storefront/voice-fallback.ts). Google's free voice is the default; SERVER makes the same Piper voice on
 * our server (storefront/server-voice.service.ts) and still drops to Google when the server is busy.
 */
export function VoiceFallbackSetting() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: KEY, queryFn: getVoiceFallback });
  const save = useMutation({
    mutationFn: setVoiceFallback,
    onSuccess: (value) => {
      qc.setQueryData(KEY, value);
      toast.success(value === 'SERVER' ? 'Slow phones now get the voice from our server.' : "Slow phones now get Google's voice.");
    },
    onError: () => toast.error('Could not save this change. Please try again.'),
  });

  return (
    <div className="mt-6 bg-white rounded-2xl border border-black/5 p-5 sm:p-6">
      <div className="flex items-start gap-2.5">
        <Server size={18} className="text-regantify-cta mt-0.5" aria-hidden />
        <div>
          <h2 className="text-base font-semibold text-regantify-text">Fallback voice for slow phones</h2>
          <p className="text-sm text-regantify-text-muted mt-0.5">
            When a shopper's phone is too slow to make the call's voice itself, the call switches to this voice. Calls started after a
            change use it.
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
        <div className="mt-4 space-y-2" role="radiogroup" aria-label="Fallback voice">
          {OPTIONS.map((o) => {
            const on = data === o.key;
            return (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={save.isPending}
                onClick={() => !on && save.mutate(o.key)}
                className={`w-full text-left rounded-xl border p-3.5 transition-colors disabled:opacity-60 ${
                  on ? 'border-regantify-cta bg-regantify-cta/5' : 'border-black/10 hover:bg-black/[0.02]'
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-medium text-regantify-text">
                  <span className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${on ? 'border-regantify-cta bg-regantify-cta' : 'border-black/25'}`} aria-hidden />
                  {o.label}
                  {o.key === 'GOOGLE' && <span className="text-xs font-normal text-regantify-text-muted">(default)</span>}
                </span>
                <span className="block mt-1 pl-[22px] text-xs text-regantify-text-muted">{o.note}</span>
              </button>
            );
          })}
          <p className="pt-1 text-xs text-regantify-text-muted">
            The server voice uses one CPU thread and keeps the voice in memory only while calls use it. Its first sentence after a quiet
            spell takes a few seconds longer while it loads.
          </p>
        </div>
      )}
    </div>
  );
}
