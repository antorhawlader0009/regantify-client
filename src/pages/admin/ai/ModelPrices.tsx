import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, Loader2, Pencil, Plus, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { apiErrorMessage } from '../../../lib/api';
import {
  clearAiModelPrice,
  getAiModelPrices,
  setAiModelPrice,
  type AiFeature,
  type AiModelPriceRow,
  type AiRateSource,
} from '../../../lib/aiApi';

export const MODEL_PRICES_KEY = ['admin-ai-model-prices'];

const FEATURE_SHORT: Record<AiFeature, string> = {
  PRODUCT_INFO_MAKER: 'Product info',
  STORE_CHATBOT: 'Store chat',
  LANDING_PAGE_GENERATOR: 'Landing page',
  LMS_ASSISTANT: 'LMS',
  DASHBOARD_ASSISTANT: 'Ask AI',
};

const SOURCE_BADGE: Record<AiRateSource, { label: string; className: string }> = {
  ADMIN: { label: 'Set here', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  BUILT_IN: { label: 'Cloudflare price', className: 'bg-neutral-50 text-neutral-600 border-neutral-200' },
  FALLBACK: { label: 'No price: highest rate', className: 'bg-amber-50 text-amber-800 border-amber-200' },
};

const inputCls =
  'w-24 px-2.5 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text bg-white tabular-nums focus:outline-none focus:border-regantify-cta';

function usd(n: number) {
  return `$${n.toLocaleString('en-US', { maximumFractionDigits: 4 })}`;
}

/** Two "$ per 1M tokens" boxes with Save/Cancel; used for editing a row and for adding a model. */
function PriceForm({
  initial,
  saving,
  onSave,
  onCancel,
}: {
  initial: { input: number; output: number } | null;
  saving: boolean;
  onSave: (input: number, output: number) => void;
  onCancel: () => void;
}) {
  const [input, setInput] = useState(initial ? String(initial.input) : '');
  const [output, setOutput] = useState(initial ? String(initial.output) : '');
  const i = Number(input);
  const o = Number(output);
  const valid = input !== '' && output !== '' && Number.isFinite(i) && Number.isFinite(o) && i >= 0 && o >= 0 && i <= 1000 && o <= 1000;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="block">
        <span className="block text-[11px] text-regantify-text-muted mb-0.5">Input $ / 1M</span>
        <input type="number" min={0} step="0.001" value={input} onChange={(e) => setInput(e.target.value)} className={inputCls} />
      </label>
      <label className="block">
        <span className="block text-[11px] text-regantify-text-muted mb-0.5">Output $ / 1M</span>
        <input type="number" min={0} step="0.001" value={output} onChange={(e) => setOutput(e.target.value)} className={inputCls} />
      </label>
      <button
        type="button"
        disabled={!valid || saving}
        onClick={() => onSave(i, o)}
        className="px-3 py-1.5 rounded-lg bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} className="px-3 py-1.5 rounded-lg text-sm text-regantify-text-muted hover:text-regantify-text">
        Cancel
      </button>
    </div>
  );
}

function PriceRow({ row }: { row: AiModelPriceRow }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const badge = SOURCE_BADGE[row.source];
  const refresh = () => queryClient.invalidateQueries({ queryKey: MODEL_PRICES_KEY });

  const save = useMutation({
    mutationFn: ({ input, output }: { input: number; output: number }) => setAiModelPrice(row.modelName, input, output),
    onSuccess: () => {
      toast.success('Price saved. AI calls on this model are charged at it from now on.');
      setEditing(false);
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the price. Please try again.')),
  });
  const reset = useMutation({
    mutationFn: () => clearAiModelPrice(row.modelName),
    onSuccess: () => {
      toast.success(row.builtIn ? 'Back to the Cloudflare price.' : 'Price removed: this model is charged at the highest rate.');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not change the price. Please try again.')),
  });

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm font-medium text-regantify-text break-all">{row.modelName.replace(/^@cf\//, '')}</span>
        <span className={`rounded border px-1.5 py-0.5 text-[11px] font-medium ${badge.className}`}>{badge.label}</span>
        {row.inUseBy.map((f) => (
          <span key={f} className="rounded bg-regantify-cta/10 px-1.5 py-0.5 text-[11px] font-medium text-regantify-cta">
            {FEATURE_SHORT[f]}
          </span>
        ))}
      </div>
      {editing ? (
        <div className="mt-2">
          <PriceForm
            initial={{ input: row.inputUsdPerM, output: row.outputUsdPerM }}
            saving={save.isPending}
            onSave={(input, output) => save.mutate({ input, output })}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-regantify-text-muted">
          <span className="tabular-nums">
            {usd(row.inputUsdPerM)} in · {usd(row.outputUsdPerM)} out per 1M tokens
          </span>
          <span className="tabular-nums">≈ {row.sampleCredits.toLocaleString('en-US')} credits per 1K-token prompt + 200-token reply</span>
          <span className="ml-auto flex items-center gap-3">
            <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-1 font-medium text-regantify-text hover:underline">
              <Pencil size={12} aria-hidden />
              {row.source === 'ADMIN' ? 'Edit' : 'Set price'}
            </button>
            {row.source === 'ADMIN' && (
              <button
                type="button"
                disabled={reset.isPending}
                onClick={() => reset.mutate()}
                className="inline-flex items-center gap-1 font-medium text-regantify-text-muted hover:text-regantify-text disabled:opacity-50"
              >
                <RotateCcw size={12} aria-hidden />
                {row.builtIn ? 'Use Cloudflare price' : 'Remove'}
              </button>
            )}
          </span>
        </div>
      )}
    </li>
  );
}

/** A model not on the list yet: its id and price. */
function AddModelPrice({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient();
  const [modelName, setModelName] = useState('');
  const save = useMutation({
    mutationFn: ({ input, output }: { input: number; output: number }) => setAiModelPrice(modelName.trim(), input, output),
    onSuccess: () => {
      toast.success('Price saved.');
      queryClient.invalidateQueries({ queryKey: MODEL_PRICES_KEY });
      onDone();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the price. Please try again.')),
  });

  return (
    <div className="mt-3 rounded-xl border border-black/10 p-3 space-y-2">
      <label className="block">
        <span className="block text-[11px] text-regantify-text-muted mb-0.5">Model id</span>
        <input
          type="text"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder="@cf/meta/llama-3.3-70b-instruct-fp8-fast"
          className="w-full px-2.5 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text bg-white focus:outline-none focus:border-regantify-cta"
        />
      </label>
      <PriceForm initial={null} saving={save.isPending} onSave={(input, output) => modelName.trim() && save.mutate({ input, output })} onCancel={onDone} />
    </div>
  );
}

/**
 * Super Admin > AI Settings > Model prices. A store pays for AI in AI
 * Credits, and one credit is a fixed slice of our real cost, so what a
 * call takes depends on its model's price here. Prices come from
 * Cloudflare's list in the code; set one here when Cloudflare changes a
 * price or for a model the list doesn't have. Models the features use
 * are listed first.
 */
export function ModelPrices() {
  const [adding, setAdding] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading, isError } = useQuery({ queryKey: MODEL_PRICES_KEY, queryFn: getAiModelPrices });

  const rows = data?.models ?? [];
  const shown = showAll ? rows : rows.filter((r) => r.inUseBy.length > 0 || r.source !== 'BUILT_IN');
  const hidden = rows.length - shown.length;

  return (
    <div className="mt-6 bg-white rounded-2xl border border-black/5 p-5 sm:p-6">
      <div className="flex items-start gap-2.5">
        <Coins size={18} className="text-regantify-cta mt-0.5" aria-hidden />
        <div>
          <h2 className="text-base font-semibold text-regantify-text">Model prices</h2>
          <p className="text-sm text-regantify-text-muted mt-0.5">
            Stores pay for AI in AI Credits. One credit is {data ? usd(data.usdPerCredit) : '$0.0001'} of what the AI costs us, so a call on a
            pricier model takes more credits. Change a model above and its cost follows by itself.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-6 flex justify-center">
          <Loader2 size={18} className="animate-spin text-regantify-text-muted" />
        </div>
      ) : isError ? (
        <p className="mt-4 text-sm text-red-600">Could not load the model prices.</p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-black/5">
            {shown.map((row) => (
              <PriceRow key={row.modelName} row={row} />
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
            {hidden > 0 && (
              <button type="button" onClick={() => setShowAll(true)} className="font-medium text-regantify-text hover:underline">
                Show all {rows.length} models
              </button>
            )}
            {showAll && (
              <button type="button" onClick={() => setShowAll(false)} className="font-medium text-regantify-text hover:underline">
                Show models in use only
              </button>
            )}
            {!adding && (
              <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1 font-medium text-regantify-text hover:underline">
                <Plus size={14} aria-hidden />
                Price for another model
              </button>
            )}
          </div>
          {adding && <AddModelPrice onDone={() => setAdding(false)} />}
        </>
      )}
    </div>
  );
}
