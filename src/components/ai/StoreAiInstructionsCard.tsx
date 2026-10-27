import { useEffect, useState } from 'react';
import { useDesignSettings, SaveButton } from '../../pages/vendor/store/design/designShared';
import { useViewer } from '../../lib/useStaffAccess';
import { canAccess } from '../../lib/staffPermissions';

/** Same limit as the server (STORE_CHAT_NOTES_MAX). */
const MAX = 1500;

/** Ready lines a seller can add with one tap and then edit. */
const EXAMPLES = [
  'Dhaka-r bhitore 1-2 din, Dhaka-r baire 3-5 din-e delivery hoy.',
  'Product haate peye check kore taka diben. Bhul product hole 3 diner moddhe return.',
  'Customer-ke "apu" ba "bhaiya" bole sombodhon korben.',
  'Shob kapor 100% cotton, deshe toiri.',
];

/**
 * AI Usages > "Your instructions for the AI": the store owner's own notes for the store AI chat and voice call, in any
 * language (StoreDesignSettings.aiChatInstructions). The assistant adds them to its fixed rules, which still win (only
 * real products and prices, it is an AI, it never places an order). Never shown to shoppers.
 */
export function StoreAiInstructionsCard({ className }: { className: string }) {
  const viewer = useViewer();
  const { settings, save } = useDesignSettings();
  const [text, setText] = useState('');
  useEffect(() => {
    if (settings) setText(settings.aiChatInstructions ?? '');
  }, [settings]);
  if (!canAccess(viewer, 'store.design') || !settings) return null;

  const addExample = (line: string) => setText((t) => (t.trim() ? `${t.trimEnd()}\n${line}` : line).slice(0, MAX));
  const changed = text.trim() !== (settings.aiChatInstructions ?? '').trim();

  return (
    <section className={className}>
      <h2 className="text-[15px] font-semibold text-regantify-text">Your instructions for the AI</h2>
      <p className="mt-0.5 text-[13px] text-neutral-500">
        Tell your store's AI assistant anything about your shop: delivery time, return rules, what your products are made of, how to talk to
        customers. It uses this in the chat and on voice calls.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, MAX))}
        rows={6}
        aria-label="Your instructions for the AI"
        placeholder="One thing per line, in Bangla, Banglish or English."
        className="mt-4 w-full resize-y rounded-lg border border-line bg-white px-3 py-2.5 text-sm leading-relaxed text-regantify-text outline-none placeholder:text-neutral-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
      <div className="mt-1 flex justify-end text-[11.5px] tabular-nums text-neutral-400">
        {text.length} / {MAX}
      </div>
      <p className="mt-2 text-xs font-medium text-neutral-600">Add an example</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {EXAMPLES.map((line) => (
          <button
            key={line}
            type="button"
            onClick={() => addExample(line)}
            className="max-w-full truncate rounded-full border border-line px-2.5 py-1 text-left text-[12px] text-neutral-600 hover:border-indigo-300 hover:text-regantify-text"
            title={line}
          >
            + {line}
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-neutral-500">
        Customers never see this text. The AI still only talks about your real products and prices, says it is an AI, and never places an order
        itself. A longer text uses a few more AI Credits per reply.
      </p>
      <div className="mt-4">
        <SaveButton pending={save.isPending} onClick={() => save.mutate({ aiChatInstructions: text.trim() })} label={changed ? 'Save' : 'Saved'} />
      </div>
    </section>
  );
}
