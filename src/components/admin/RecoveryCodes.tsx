import { useState } from 'react';
import { Copy, Download } from 'lucide-react';

/**
 * The ten one-use recovery codes, shown once (the server keeps only their hashes). The person must tick "I saved them" before going on,
 * because a lost phone plus lost codes means a server-side reset.
 */
export function RecoveryCodes({
  codes,
  confirmLabel,
  onConfirm,
}: {
  codes: string[];
  confirmLabel: string;
  onConfirm: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = `Regantify Super Admin recovery codes\nEach code works once.\n\n${codes.join('\n')}\n`;

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'regantify-admin-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-regantify-search p-4 font-mono text-sm tracking-wider">
        {codes.map((c) => (
          <span key={c}>{c}</span>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-medium hover:bg-neutral-50"
          onClick={() =>
            navigator.clipboard?.writeText(codes.join('\n')).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            })
          }
        >
          <Copy size={15} /> {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-line py-2.5 text-sm font-medium hover:bg-neutral-50"
          onClick={download}
        >
          <Download size={15} /> Download
        </button>
      </div>

      <label className="flex items-start gap-2 text-sm text-regantify-text">
        <input type="checkbox" className="mt-0.5" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        I saved these codes somewhere safe (not on the same phone as the app).
      </label>

      <button
        type="button"
        disabled={!saved}
        onClick={onConfirm}
        className="w-full bg-regantify-black text-white font-medium py-3 rounded-xl hover:bg-regantify-cta-dark transition-colors disabled:opacity-60"
      >
        {confirmLabel}
      </button>
    </div>
  );
}
