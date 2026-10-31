import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, KeyRound, ShieldAlert } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { storeAppApi, type StoreAppInfo } from '../../lib/storeAppApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { downloadBlob, fileToBase64 } from '../../lib/fileDownload';

const input = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none';

function Print({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <p className="break-all text-xs text-neutral-600">
      <span className="font-medium text-neutral-800">{label}</span> {value}
    </p>
  );
}

/**
 * The two signing keys of the store's own app (STORE-APP-plan.md Step 14). Plain words: Regantify makes the keys (recommended), or the store brings its own.
 * Losing the keys means the app can never be updated, so "Download my keys" is offered and asks for the password again. After the first build the keys
 * are fixed.
 */
export function StoreAppKeys({ app }: { app: StoreAppInfo }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['store-app'] });
  const locked = app.keys.locked;
  const [mode, setMode] = useState<'DEFAULT' | 'OWN'>(app.keySource);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [slot, setSlot] = useState<'signing' | 'upload'>('signing');
  const [file, setFile] = useState<File | null>(null);
  const [storePassword, setStorePassword] = useState('');
  const [alias, setAlias] = useState('');
  const [keyPassword, setKeyPassword] = useState('');

  const make = useMutation({
    mutationFn: storeAppApi.makeDefaultKeys,
    onSuccess: () => {
      toast.success('Your keys are ready');
      void refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not make the keys.')),
  });
  const own = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Pick the key file.');
      return storeAppApi.uploadKey({ slot, fileBase64: await fileToBase64(file), storePassword, keyAlias: alias.trim(), keyPassword: keyPassword || storePassword });
    },
    onSuccess: () => {
      toast.success('Key saved');
      setFile(null);
      setStorePassword('');
      setKeyPassword('');
      void refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the key.')),
  });
  const download = useMutation({
    mutationFn: () => storeAppApi.downloadKeys(password),
    onSuccess: (keys) => {
      downloadBlob(new Blob([JSON.stringify(keys, null, 2)], { type: 'application/json' }), `${app.packageName}-keys.json`);
      setDownloadOpen(false);
      setPassword('');
      toast.success('Keys downloaded. Keep the file somewhere safe and private.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not download the keys.')),
  });

  const row = (title: string, s: StoreAppInfo['keys']['signing']) => (
    <div className="rounded-lg bg-neutral-50 p-3">
      <p className="text-sm font-medium text-neutral-800">
        {title}: {s.present ? (s.checked ? 'ready' : 'being checked') : 'not made yet'}
      </p>
      <Print label="SHA-1" value={s.sha1} />
      <Print label="SHA-256" value={s.sha256} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <ShieldAlert size={16} className="mt-0.5 shrink-0" aria-hidden />
        <p>
          These keys prove the app is yours. <strong>If you lose them, the app can never be updated.</strong> Download them and keep them safe. After your first build the keys cannot be changed.
        </p>
      </div>

      <fieldset className="space-y-2 text-sm" disabled={locked}>
        <label className="flex items-start gap-2">
          <input type="radio" name="key-mode" checked={mode === 'DEFAULT'} onChange={() => setMode('DEFAULT')} className="mt-0.5 accent-neutral-900" />
          <span>
            Use the keys Regantify makes <span className="text-neutral-500">(recommended)</span>
          </span>
        </label>
        <label className="flex items-start gap-2">
          <input type="radio" name="key-mode" checked={mode === 'OWN'} onChange={() => setMode('OWN')} className="mt-0.5 accent-neutral-900" />
          <span>Use my own app signing key</span>
        </label>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        {row('App signing key', app.keys.signing)}
        {row('Upload key (for Google Play)', app.keys.upload)}
      </div>

      {mode === 'DEFAULT' && !locked && !(app.keys.signing.present && app.keys.upload.present) && (
        <button type="button" onClick={() => make.mutate()} disabled={make.isPending} className={primaryBtn}>
          <KeyRound size={15} aria-hidden /> {make.isPending ? 'Making...' : 'Make my keys now'}
        </button>
      )}

      {mode === 'OWN' && !locked && (
        <div className="space-y-3 rounded-lg border border-dashed border-neutral-300 p-3">
          <p className="text-xs text-neutral-600">Upload a .p12, .pfx, .jks or .keystore file. A .p12 is checked at once; an old .jks is checked by our builder in a few minutes.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block font-medium">Which key</span>
              <select className={input} value={slot} onChange={(e) => setSlot(e.target.value as 'signing' | 'upload')}>
                <option value="signing">App signing key (the website app)</option>
                <option value="upload">Upload key (Google Play)</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Key file</span>
              <input type="file" accept=".p12,.pfx,.jks,.keystore" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-sm" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">File password</span>
              <input type="password" autoComplete="off" className={input} value={storePassword} onChange={(e) => setStorePassword(e.target.value)} />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Key name (alias)</span>
              <input className={input} autoComplete="off" value={alias} onChange={(e) => setAlias(e.target.value)} />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Key password (leave empty if it is the same as the file password)</span>
              <input type="password" autoComplete="off" className={input} value={keyPassword} onChange={(e) => setKeyPassword(e.target.value)} />
            </label>
          </div>
          <button type="button" onClick={() => own.mutate()} disabled={own.isPending || !file || !storePassword || !alias.trim()} className={primaryBtn}>
            {own.isPending ? 'Saving...' : 'Save this key'}
          </button>
        </div>
      )}

      {locked && <p className="text-sm text-neutral-600">The keys are fixed because your first build has started.</p>}

      {(app.keys.signing.present || app.keys.upload.present) && (
        <button type="button" onClick={() => setDownloadOpen(true)} className={outlineBtn}>
          <Download size={15} aria-hidden /> Download my keys
        </button>
      )}

      <Dialog open={downloadOpen} onOpenChange={setDownloadOpen} title="Download my keys">
        <div className="space-y-3 px-6 pb-6 pt-3">
          <p className="text-sm text-neutral-600">Type your password again. The file holds your signing keys and their passwords: never share it. This download is written in your Activity Log.</p>
          <input type="password" autoComplete="current-password" className={input} placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDownloadOpen(false)} className="rounded-lg px-3 py-2 text-sm text-neutral-700">
              Cancel
            </button>
            <button type="button" disabled={!password || download.isPending} onClick={() => download.mutate()} className={primaryBtn}>
              {download.isPending ? 'Checking...' : 'Download'}
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
