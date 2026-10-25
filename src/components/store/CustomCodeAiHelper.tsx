import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Copy, Download, ExternalLink, Sparkles } from 'lucide-react';
import { getVendorSettings } from '../../lib/vendorApi';
import { storefrontStoreUrl } from '../../lib/storefrontUrl';
import { customCodeGuide, EXAMPLES, type CustomCodeKind } from '../../lib/customCodeGuide';
import { toast } from '../../lib/toast';

const BOX_NAME: Record<CustomCodeKind, string> = { css: 'Custom CSS', head: 'Custom Head Scripts', js: 'JavaScript Code' };

/**
 * "Get this code from AI" on Store > Design > Custom CSS / Custom Head Scripts / JavaScript Code: the seller writes what
 * they want in plain words, copies a full guide (lib/customCodeGuide.ts: how the code is loaded, the stable names on
 * the page, the rules) and pastes it into Claude, which writes code that fits this store. Nothing is sent anywhere
 * by the dashboard; it only copies text.
 */
export function CustomCodeAiHelper({ kind }: { kind: CustomCodeKind }) {
  const [request, setRequest] = useState('');
  const { data: settings } = useQuery({ queryKey: ['vendor-settings'], queryFn: getVendorSettings });

  const guide = () =>
    customCodeGuide({
      kind,
      request,
      storeName: settings?.storeName ?? null,
      storeUrl: settings?.subdomain ? storefrontStoreUrl(settings.subdomain) : null,
    });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(guide());
      toast.success(request.trim() ? 'Copied. Paste it into Claude.' : 'Copied. Write your request at the top in Claude, then send.');
    } catch {
      toast.error('Could not copy. Use "Download" instead.');
    }
  };

  const download = () => {
    const blob = new Blob([guide()], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `regantify-${kind === 'css' ? 'custom-css' : kind === 'head' ? 'head-scripts' : 'javascript'}-ai-guide.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <section className="rounded-2xl border border-line bg-white p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
          <Sparkles size={17} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-regantify-text">Don’t know code? Let AI write it</h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            Write what you want in Bangla or English, copy it, and paste it into Claude (or ChatGPT). It gets everything it needs about your store
            and gives back code for this box.
          </p>
        </div>
      </div>

      <ol className="mt-4 space-y-3 text-sm">
        <li>
          <p className="mb-1.5 font-medium text-regantify-text">1. What do you want?</p>
          <textarea
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="e.g. Make the Buy Now button round and green on phones."
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-regantify-text outline-none focus:border-brand"
          />
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {EXAMPLES[kind].map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setRequest(ex)}
                className="rounded-full border border-line bg-neutral-50 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
              >
                {ex.length > 60 ? `${ex.slice(0, 58)}…` : ex}
              </button>
            ))}
          </div>
        </li>
        <li>
          <p className="mb-1.5 font-medium text-regantify-text">2. Copy it and ask Claude</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand px-3 text-sm text-white hover:bg-brand-dark"
            >
              <Copy size={14} /> Copy for Claude
            </button>
            <a
              href="https://claude.ai/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text hover:bg-neutral-50"
            >
              <ExternalLink size={14} /> Open Claude
            </a>
            <button
              type="button"
              onClick={download}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text hover:bg-neutral-50"
            >
              <Download size={14} /> Download guide
            </button>
          </div>
        </li>
        <li>
          <p className="font-medium text-regantify-text">3. Paste the code it gives you into the {BOX_NAME[kind]} box below and save</p>
          <p className="mt-0.5 text-xs text-neutral-500">
            Open your store on a phone to check it. To undo, delete that code and save again.
          </p>
        </li>
      </ol>
    </section>
  );
}
