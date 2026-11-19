import { useEffect, useRef, useState } from 'react';
import { Store } from 'lucide-react';

// ---------------------------------------------------------------------------
// "Questions, answered" as a chat. Sellers live in Messenger and WhatsApp, so the FAQ reads like a thread:
// the questions wait below as quick-reply chips, tapping one sends it as the seller's message, and after a short typing
// pause Regantify replies. Asked questions leave the chip row; "reset" clears the thread back to the first answer.
// The pause is skipped when the person prefers reduced motion.
// ---------------------------------------------------------------------------

export type FaqItem = { q: string; a: string };

const REPLY_DELAY_MS = 650;

function Avatar() {
  return (
    <span className="mb-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#F4A261] text-[#241812]" aria-hidden="true">
      <Store size={15} />
    </span>
  );
}

export default function FaqChat({ items, resetLabel }: { items: FaqItem[]; resetLabel: string }) {
  const [asked, setAsked] = useState<number[]>(items.length ? [0] : []);
  const [typing, setTyping] = useState<number | null>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Keep the newest message in view inside the thread (never scrolls the page itself).
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [asked, typing]);

  const ask = (i: number) => {
    if (typing !== null) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setAsked((a) => [...a, i]);
      return;
    }
    setTyping(i);
    timer.current = window.setTimeout(() => {
      setAsked((a) => [...a, i]);
      setTyping(null);
    }, REPLY_DELAY_MS);
  };

  const reset = () => {
    window.clearTimeout(timer.current);
    setTyping(null);
    setAsked(items.length ? [0] : []);
  };

  const waiting = items.map((_, i) => i).filter((i) => !asked.includes(i) && i !== typing);

  const mine = 'ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[#C2531F] px-4 py-2.5 text-[15px] font-medium leading-snug text-white';
  const theirs =
    'max-w-[85%] rounded-2xl rounded-bl-md border border-black/10 bg-white px-4 py-3 text-[15px] leading-relaxed text-[#241812]/80 dark:border-white/10 dark:bg-[#1B1210] dark:text-white/80';

  return (
    <div className="overflow-hidden rounded-3xl border border-black/10 bg-[#FCF3E8] dark:border-white/10 dark:bg-[#241812]">
      <div
        ref={threadRef}
        className="max-h-[26rem] min-h-[18rem] space-y-3 overflow-y-auto p-5 sm:p-6"
        role="log"
        aria-live="polite"
      >
        {asked.map((i) => (
          <div key={i} className="space-y-3">
            <p className={mine}>{items[i].q}</p>
            <div className="flex items-end gap-2.5">
              <Avatar />
              <p className={theirs}>{items[i].a}</p>
            </div>
          </div>
        ))}
        {typing !== null && (
          <div className="space-y-3">
            <p className={mine}>{items[typing].q}</p>
            <div className="flex items-end gap-2.5">
              <Avatar />
              <span className={`${theirs} flex items-center gap-1 py-3.5`} aria-hidden="true">
                {[0, 1, 2].map((d) => (
                  <i
                    key={d}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#241812]/40 motion-reduce:animate-none dark:bg-white/40"
                    style={{ animationDelay: `${d * 120}ms` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-black/10 bg-white/60 p-4 sm:px-6 dark:border-white/10 dark:bg-black/20">
        {waiting.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => ask(i)}
            disabled={typing !== null}
            className="rounded-full border border-[#C2531F]/50 px-3.5 py-2 text-left text-sm font-medium leading-snug text-[#C2531F] transition-colors
              hover:bg-[#C2531F] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C2531F] focus-visible:ring-offset-2
              disabled:opacity-50 dark:border-[#F4A261]/50 dark:text-[#F4A261] dark:hover:bg-[#F4A261] dark:hover:text-[#241812] dark:focus-visible:ring-offset-[#241812]"
          >
            {items[i].q}
          </button>
        ))}
        {asked.length > 1 && (
          <button
            type="button"
            onClick={reset}
            className="ml-auto px-2 py-2 text-sm text-[#241812]/55 underline-offset-4 hover:underline dark:text-white/55"
          >
            {resetLabel}
          </button>
        )}
      </div>
    </div>
  );
}
