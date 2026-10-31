import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Copy } from 'lucide-react';
import { storeAppApi, type StoreAppInfo } from '../../lib/storeAppApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { outlineBtn, primaryBtn } from '../ui/PageKit';

/**
 * The store's OWN Firebase (STORE-APP-plan.md Step 14), optional, only for push notifications to the store's own app. Four plain steps: make a Firebase
 * project, add an Android app with THIS package and THIS key's SHA-1, put google-services.json here, and let Regantify send push (way A: add our
 * service account; way B: upload your own key file). Without it the app works, just without push.
 */
export function StoreAppFirebase({ app, serviceAccountEmail }: { app: StoreAppInfo; serviceAccountEmail: string | null }) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['store-app'] });
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'SERVICE_ACCOUNT_ROLE' | 'KEY_FILE'>(app.firebase.pushMode === 'KEY_FILE' ? 'KEY_FILE' : 'SERVICE_ACCOUNT_ROLE');
  const [keyFile, setKeyFile] = useState('');

  const save = useMutation({
    mutationFn: () => storeAppApi.saveFirebase(text),
    onSuccess: () => {
      toast.success('Firebase file saved');
      setText('');
      void refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the file.')),
  });
  const remove = useMutation({
    mutationFn: storeAppApi.removeFirebase,
    onSuccess: () => void refresh(),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not remove it.')),
  });
  const access = useMutation({
    mutationFn: () => storeAppApi.setPushAccess(mode, mode === 'KEY_FILE' ? keyFile : undefined),
    onSuccess: (a) => {
      if (a.firebase.pushTestOk) toast.success('Push works for your app');
      else toast.error(a.firebase.pushTestDetail ?? 'The push test did not pass.');
      void refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not test push.')),
  });
  const test = useMutation({
    mutationFn: storeAppApi.testPush,
    onSuccess: (a) => {
      if (a.firebase.pushTestOk) toast.success('Push works for your app');
      else toast.error(a.firebase.pushTestDetail ?? 'The push test did not pass.');
      void refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not test push.')),
  });

  const readFile = (file: File | undefined, set: (v: string) => void) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set(String(reader.result ?? ''));
    reader.readAsText(file);
  };
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy. Select the text and copy it yourself.');
    }
  };

  return (
    <div className="space-y-4 text-sm">
      <p className="rounded-lg bg-neutral-50 p-3 text-neutral-700">
        <strong>Good to know:</strong> in your own app, Google sign-in opens in the phone&rsquo;s browser, and notifications need your own Firebase project. Without Firebase the app works, just without notifications.
      </p>

      <ol className="list-decimal space-y-2 pl-5 text-neutral-700">
        <li>
          Go to <span className="font-medium">console.firebase.google.com</span> and create a project (or open yours).
        </li>
        <li>
          Add an <span className="font-medium">Android app</span>. Package name: <code className="rounded bg-neutral-100 px-1">{app.packageName}</code>
          {app.keys.signing.sha1 ? (
            <>
              . Certificate SHA-1: <code className="break-all rounded bg-neutral-100 px-1">{app.keys.signing.sha1}</code>
            </>
          ) : (
            <> . Make your keys first (More options, Keys) to get the SHA-1.</>
          )}
        </li>
        <li>
          Download <span className="font-medium">google-services.json</span> and add it below.
        </li>
        <li>Let Regantify send notifications through your project (below), then test.</li>
      </ol>

      <div className="space-y-2">
        <p className="font-medium text-neutral-800">google-services.json</p>
        {app.firebase.present ? (
          <p className="text-neutral-700">
            Saved for the project <code className="rounded bg-neutral-100 px-1">{app.firebase.projectId}</code>.{' '}
            <button type="button" onClick={() => remove.mutate()} className="underline">
              Remove
            </button>
          </p>
        ) : null}
        <input type="file" accept=".json,application/json" onChange={(e) => readFile(e.target.files?.[0], setText)} className="block text-sm" />
        <button type="button" disabled={!text || save.isPending} onClick={() => save.mutate()} className={primaryBtn}>
          {save.isPending ? 'Saving...' : app.firebase.present ? 'Replace the file' : 'Save the file'}
        </button>
      </div>

      {app.firebase.present && (
        <div className="space-y-3 border-t border-neutral-200 pt-4">
          <p className="font-medium text-neutral-800">How may Regantify send notifications?</p>
          <label className="flex items-start gap-2">
            <input type="radio" name="push-mode" checked={mode === 'SERVICE_ACCOUNT_ROLE'} onChange={() => setMode('SERVICE_ACCOUNT_ROLE')} className="mt-0.5 accent-neutral-900" />
            <span>
              Give Regantify&rsquo;s account the role <span className="font-medium">Firebase Cloud Messaging API Admin</span> in your project <span className="text-neutral-500">(recommended)</span>
            </span>
          </label>
          {mode === 'SERVICE_ACCOUNT_ROLE' && (
            <div className="ml-6 space-y-1 text-neutral-700">
              <p>In Google Cloud, open IAM for your project, press Grant access, paste this email and pick that role:</p>
              {serviceAccountEmail ? (
                <p className="flex flex-wrap items-center gap-2">
                  <code className="break-all rounded bg-neutral-100 px-1.5 py-0.5">{serviceAccountEmail}</code>
                  <button type="button" onClick={() => void copy(serviceAccountEmail)} className={outlineBtn}>
                    <Copy size={14} aria-hidden /> Copy
                  </button>
                </p>
              ) : (
                <p className="text-red-700">Notifications are not set up on the platform yet. Try again later.</p>
              )}
            </div>
          )}
          <label className="flex items-start gap-2">
            <input type="radio" name="push-mode" checked={mode === 'KEY_FILE'} onChange={() => setMode('KEY_FILE')} className="mt-0.5 accent-neutral-900" />
            <span>Upload a key file of a service account from your project</span>
          </label>
          {mode === 'KEY_FILE' && (
            <div className="ml-6 space-y-1 text-neutral-700">
              <p>Some Google accounts block making key files. If yours does, use the first way.</p>
              <input type="file" accept=".json,application/json" onChange={(e) => readFile(e.target.files?.[0], setKeyFile)} className="block text-sm" />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={access.isPending || (mode === 'KEY_FILE' && !keyFile)} onClick={() => access.mutate()} className={primaryBtn}>
              {access.isPending ? 'Testing...' : 'Save and test'}
            </button>
            {app.firebase.pushMode !== 'NONE' && (
              <button type="button" disabled={test.isPending} onClick={() => test.mutate()} className={outlineBtn}>
                {test.isPending ? 'Testing...' : 'Test again'}
              </button>
            )}
          </div>
          {app.firebase.pushMode !== 'NONE' && app.firebase.pushTestedAt && (
            <p className={app.firebase.pushTestOk ? 'text-green-700' : 'text-red-700'}>{app.firebase.pushTestOk ? 'Push works for your app.' : app.firebase.pushTestDetail}</p>
          )}
        </div>
      )}
    </div>
  );
}
