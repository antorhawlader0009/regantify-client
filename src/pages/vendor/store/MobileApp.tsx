import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Download, ExternalLink, ImagePlus, Loader2, Smartphone } from 'lucide-react';
import { SectionCard, Field } from '../../../components/product/ProductFormPieces';
import { PageHeader, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { Checkbox } from '../../../components/ui/Checkbox';
import { AdvancedPanel } from '../../../components/ui/AdvancedToggle';
import { LockedFeatureCard } from '../../../components/ui/UpgradePrompt';
import { AppIconPreview } from '../../../components/app/AppIconPreview';
import { StoreAppKeys } from '../../../components/app/StoreAppKeys';
import { StoreAppFirebase } from '../../../components/app/StoreAppFirebase';
import { storeAppApi, type BuildStatus, type StoreAppBuildInfo } from '../../../lib/storeAppApi';
import { getVendorSettings } from '../../../lib/vendorApi';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import { mediaApi } from '../../../lib/mediaApi';
import { downloadBlob } from '../../../lib/fileDownload';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const input = 'w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none';
const active: BuildStatus[] = ['QUEUED', 'WAITING_FOR_QUIET', 'BUILDING'];

const STATUS_TEXT: Record<BuildStatus, string> = {
  QUEUED: 'Waiting',
  WAITING_FOR_QUIET: 'Waiting for a quiet moment',
  BUILDING: 'Building now',
  DONE: 'Ready',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

function when(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '';
}

const mb = (bytes: number | null) => (bytes ? `${(bytes / 1048576).toFixed(1)} MB` : '');

/** A square QR code picture for an address. */
function Qr({ value, size = 160 }: { value: string; size?: number }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(value, { margin: 1, width: size * 3, errorCorrectionLevel: 'M' }).then((url) => !cancelled && setSrc(url), () => undefined);
    return () => {
      cancelled = true;
    };
  }, [value, size]);
  return src ? <img src={src} alt="QR code" width={size} height={size} className="rounded-lg border border-neutral-200 bg-white p-1" /> : <div style={{ width: size, height: size }} className="rounded-lg bg-neutral-100" />;
}

function BuildRow({ b, onCancel, cancelling }: { b: StoreAppBuildInfo; onCancel: () => void; cancelling: boolean }) {
  const [showQr, setShowQr] = useState(false);
  const [busy, setBusy] = useState<'aab' | 'mapping' | 'zip' | null>(null);
  const getZip = async () => {
    setBusy('zip');
    try {
      downloadBlob(await storeAppApi.playZip(b.id), `play-package-${b.versionName}.zip`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not download the Google Play package.'));
    } finally {
      setBusy(null);
    }
  };
  const get = async (kind: 'aab' | 'mapping') => {
    setBusy(kind);
    try {
      const blob = await storeAppApi.file(b.id, kind);
      downloadBlob(blob, kind === 'aab' ? `app-${b.versionName}.aab` : `mapping-${b.versionName}.txt`);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not download the file.'));
    } finally {
      setBusy(null);
    }
  };
  const isKeyCheck = b.kind === 'KEY_CHECK';
  return (
    <li className="space-y-1.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{isKeyCheck ? 'Key check' : `Version ${b.versionName}`}</p>
        <span className={`rounded-full px-2 py-0.5 text-xs ${b.status === 'FAILED' ? 'bg-red-50 text-red-700' : b.status === 'DONE' ? 'bg-green-50 text-green-700' : 'bg-neutral-100 text-neutral-700'}`}>{STATUS_TEXT[b.status]}</span>
      </div>
      <p className="text-xs text-neutral-500">Asked {when(b.queuedAt)}{b.finishedAt ? `, finished ${when(b.finishedAt)}` : ''}</p>
      {b.status === 'FAILED' && (
        <div className="text-xs text-red-700">
          <p>{b.error ?? 'The build failed.'} It does not count against your builds this month.</p>
          {b.log && (
            <details className="mt-1 text-neutral-600">
              <summary className="cursor-pointer">Show the log</summary>
              <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-neutral-50 p-2 text-[11px]">{b.log}</pre>
            </details>
          )}
        </div>
      )}
      {b.status === 'DONE' && !isKeyCheck && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {b.apkUrl && (
              <a href={b.apkUrl} className={outlineBtn}>
                <Download size={14} aria-hidden /> App file (APK) {mb(b.apkSize)}
              </a>
            )}
            {b.hasBundle && (
              <button type="button" disabled={busy === 'aab'} onClick={() => void get('aab')} className={outlineBtn}>
                <Download size={14} aria-hidden /> Google Play file {mb(b.aabSize)}
              </button>
            )}
            {b.hasBundle && (
              <button type="button" disabled={busy === 'zip'} onClick={() => void getZip()} className={outlineBtn}>
                <Download size={14} aria-hidden /> {busy === 'zip' ? 'Preparing...' : 'Google Play package (ZIP, with guide)'}
              </button>
            )}
            {b.hasMapping && (
              <button type="button" disabled={busy === 'mapping'} onClick={() => void get('mapping')} className="text-xs text-neutral-600 underline">
                Crash-report file
              </button>
            )}
            {b.apkUrl && (
              <button type="button" onClick={() => setShowQr((v) => !v)} className="text-xs text-neutral-600 underline">
                {showQr ? 'Hide QR code' : 'Show QR code'}
              </button>
            )}
          </div>
          {showQr && b.apkUrl && (
            <div className="flex items-center gap-3">
              <Qr value={b.apkUrl} />
              <p className="text-xs text-neutral-600">Scan with a phone to download the app file. To install it, the phone may ask to allow installing from the browser.</p>
            </div>
          )}
          {b.certSha256 && <p className="break-all text-[11px] text-neutral-400">Signed with certificate {b.certSha256}</p>}
        </div>
      )}
      {(b.status === 'QUEUED' || b.status === 'WAITING_FOR_QUIET') && (
        <button type="button" disabled={cancelling} onClick={onCancel} className="text-xs text-neutral-700 underline">
          Cancel this build
        </button>
      )}
    </li>
  );
}

/**
 * Store > Mobile App (STORE-APP-plan.md Step 14), opened from Main Menu > App. Top: the Regantify app is already on for every store's shoppers (the link,
 * a QR code, the poster and the app notification tools). Below: the store's OWN app (Advance plan): name, logo and colour with a live preview, the keys,
 * its own Firebase for push, and "Build my app". Owner only (the keys are in here).
 */
export default function MobileApp() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ['vendor-settings'], queryFn: getVendorSettings });
  const view = useQuery({
    queryKey: ['store-app'],
    queryFn: storeAppApi.view,
    refetchInterval: (q) => (q.state.data?.builds.some((b) => active.includes(b.status)) ? 8000 : false),
  });
  const data = view.data;
  const app = data?.app ?? null;

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [packageName, setPackageName] = useState('');
  const [color, setColor] = useState('#16A34A');
  const [footerSwitch, setFooterSwitch] = useState(true);
  const [mine, setMine] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (!data) return;
    setName(app?.name ?? data.defaults.name);
    setShortName(app?.shortName ?? data.defaults.shortName);
    setPackageName(app?.packageName ?? data.defaults.packageName);
    setColor(app?.primaryColor ?? '#16A34A');
    setFooterSwitch(app?.footerSwitch ?? true);
  }, [data, app?.name, app?.shortName, app?.packageName, app?.primaryColor, app?.footerSwitch]);

  const sharedLink = settings.data ? `${storefrontStoreUrl(settings.data.subdomain)}/app` : '';
  const open = data?.builds.some((b) => b.kind === 'BUILD' && active.includes(b.status)) ?? false;
  const builderDown = !!data && (!data.builderSeenAt || Date.now() - new Date(data.builderSeenAt).getTime() > 10 * 60_000);

  const dirty = !!app && (name !== app.name || shortName !== app.shortName || packageName !== app.packageName || color.toUpperCase() !== app.primaryColor || footerSwitch !== app.footerSwitch);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['store-app'] });

  const save = useMutation({
    mutationFn: () => storeAppApi.update({ name, shortName, primaryColor: color, footerSwitch, ...(app?.packageLocked ? {} : { packageName }) }),
    onSuccess: () => {
      toast.success('Saved');
      void refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save. Try again.')),
  });
  const build = useMutation({
    mutationFn: async () => {
      if (dirty) await storeAppApi.update({ name, shortName, primaryColor: color, footerSwitch, ...(app?.packageLocked ? {} : { packageName }) });
      return storeAppApi.build();
    },
    onSuccess: () => {
      toast.success('Your app is in the queue. You will get a notification when it is ready.');
      void refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not start the build.')),
  });
  const cancel = useMutation({
    mutationFn: (id: string) => storeAppApi.cancel(id),
    onSuccess: () => void refresh(),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not cancel.')),
  });

  async function pickLogo(file: File) {
    setUploading(true);
    try {
      // The icon is made from this picture: it must be square and big enough to stay sharp on a big phone.
      const bitmap = await createImageBitmap(file);
      const ratio = bitmap.width / bitmap.height;
      bitmap.close();
      if (bitmap.width < 512 || bitmap.height < 512 || ratio < 0.9 || ratio > 1.1) {
        toast.error('Use a square picture (PNG is best) of at least 512 x 512 pixels.');
        return;
      }
      const { url } = await mediaApi.upload(file);
      await storeAppApi.update({ logoUrl: url });
      void refresh();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not use that picture.'));
    } finally {
      setUploading(false);
    }
  }

  // Regantify makes the keys itself at the first build; only a store that chose its own key must have uploaded it first.
  const keysReady = useMemo(() => !app || app.keySource === 'DEFAULT' || app.keys.signing.present, [app]);

  if (view.isLoading || !data) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Mobile App" back={{ to: '/vendor/app', label: 'App' }} />
        <div className="flex justify-center p-10">{view.isError ? <p className="text-sm text-red-700">Could not load this page. Try again.</p> : <Loader2 className="animate-spin text-neutral-400" />}</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PageHeader title="Mobile App" description="The Regantify app for your shoppers, and your own app." back={{ to: '/vendor/app', label: 'App' }} />

      <SectionCard title="The Regantify app is already on for your shoppers">
        <div className="space-y-4">
          <p className="text-sm text-neutral-700">
            Your shoppers can open your shop in the Regantify app, follow their orders and get notifications. Every store has this, for free. A &ldquo;Get the Regantify app&rdquo; link is already in your store&rsquo;s footer.
          </p>
          {sharedLink && (
            <div className="flex flex-wrap items-center gap-4">
              <Qr value={sharedLink} size={120} />
              <div className="space-y-2 text-sm">
                <p className="break-all text-neutral-600">{sharedLink}</p>
                <div className="flex flex-wrap gap-2">
                  <a href={sharedLink} target="_blank" rel="noopener noreferrer" className={outlineBtn}>
                    <ExternalLink size={14} aria-hidden /> Open the page
                  </a>
                  <Link to="/vendor/store/share" className={outlineBtn}>
                    Print a poster
                  </Link>
                  <Link to="/vendor/marketing/app-notifications" className={outlineBtn}>
                    Send app notifications
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Want your own app?">
        {!data.allowed ? (
          <LockedFeatureCard
            title="Your own app is part of the Advance plan"
            message="With your own app your shoppers get an app with your name, your logo and your colours, and nothing else inside it. Upgrade to Advance to build it."
            action={{ label: 'See plans', onClick: () => navigate('/vendor/billing') }}
          />
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-neutral-700">An app with your name, logo and colours that opens only your shop. You build it here, then install it or put it on Google Play from your own account.</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="App name" hint="Up to 30 letters. Shown on Google Play.">
                <input className={input} maxLength={30} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Colour" hint="The icon background and the opening screen.">
                <div className="flex items-center gap-2">
                  <input type="color" value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#16A34A'} onChange={(e) => setColor(e.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded border border-neutral-300" aria-label="Pick a colour" />
                  <input className={`${input} max-w-[120px] font-mono`} maxLength={7} value={color} onChange={(e) => setColor(e.target.value.toUpperCase())} />
                </div>
              </Field>
            </div>

            <Field label="Logo" hint="A square picture, 512 x 512 pixels or more. A PNG with a clear background looks best.">
              <div className="space-y-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 py-2 text-sm text-neutral-700">
                  {uploading ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                  {uploading ? 'Uploading...' : app?.logoUrl ? 'Change the logo' : 'Add the logo'}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && void pickLogo(e.target.files[0])} />
                </label>
                <AppIconPreview logoUrl={app?.logoUrl ?? null} color={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#16A34A'} name={name} />
              </div>
            </Field>

            {dirty && (
              <button type="button" onClick={() => save.mutate()} disabled={save.isPending} className={primaryBtn}>
                {save.isPending ? 'Saving...' : 'Save changes'}
              </button>
            )}
            {!dirty && data.changesNotBuilt.length > 0 && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                Changes not built yet: {data.changesNotBuilt.join(', ')}. Your installed app still shows the old version. Press Build my app below to make a new one.
              </p>
            )}

            <AdvancedPanel id="mobile-app" what="Package name, the name under the icon, signing keys, your own Firebase for notifications, the footer link">
              <div className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name under the icon" hint="Up to 12 letters.">
                    <input className={input} maxLength={12} value={shortName} onChange={(e) => setShortName(e.target.value)} />
                  </Field>
                  <Field label="Package name" hint={app?.packageLocked ? 'Fixed: your first build has started.' : 'Can be changed until your first build. After that it is fixed for ever.'}>
                    <input className={`${input} font-mono`} disabled={!!app?.packageLocked} value={packageName} onChange={(e) => setPackageName(e.target.value.toLowerCase())} />
                  </Field>
                </div>
                <Checkbox checked={footerSwitch} onChange={setFooterSwitch} label="Show my own app in my store's footer" hint="Instead of the Regantify app link, once my app is built." />
                {app && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Keys</h3>
                    <StoreAppKeys key={`${app.keySource}-${app.keys.signing.present}-${app.keys.upload.present}`} app={app} />
                  </section>
                )}
                {app && (
                  <section>
                    <h3 className="mb-2 text-sm font-semibold">Notifications (your own Firebase)</h3>
                    <StoreAppFirebase key={`${app.firebase.projectId}-${app.firebase.pushMode}`} app={app} serviceAccountEmail={data.platformServiceAccountEmail} />
                  </section>
                )}
              </div>
            </AdvancedPanel>

            <section className="space-y-3 border-t border-neutral-200 pt-5">
              <h3 className="text-sm font-semibold">Build my app</h3>
              <p className="text-sm text-neutral-700">
                Your app is built when our server is quiet, usually within a few hours. You will get a notification when it is ready or if something goes wrong. {data.buildsLeft} of {data.buildsPerMonth} builds left this month; a failed build does not count.
              </p>
              {builderDown && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">Our app builder is not running right now. You can still ask for a build; it will wait until the builder is back.</p>}
              <Checkbox checked={mine} onChange={setMine} label="This name and logo belong to my business" hint="You are responsible for them, and for putting the app on Google Play from your own account." />
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => build.mutate()}
                  disabled={build.isPending || !mine || open || data.buildsLeft === 0 || !app?.logoUrl || !keysReady}
                  title={!app?.logoUrl ? 'Add the logo first' : !mine ? 'Tick the box first' : undefined}
                  className={primaryBtn}
                >
                  <Smartphone size={15} aria-hidden /> {build.isPending ? 'Asking...' : open ? 'A build is already in the queue' : 'Build my app'}
                </button>
              </div>
            </section>

            {data.builds.length > 0 && (
              <section>
                <h3 className="mb-1 text-sm font-semibold">Your builds</h3>
                <ul className="divide-y divide-neutral-200">
                  {data.builds.map((b) => (
                    <BuildRow key={b.id} b={b} onCancel={() => cancel.mutate(b.id)} cancelling={cancel.isPending} />
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
