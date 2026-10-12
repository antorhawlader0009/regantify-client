import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, ImagePlus, ShieldCheck } from 'lucide-react';
import { PageHeader, PageSection, primaryBtn } from '../../components/ui/PageKit';
import { kycApi, type KycKind } from '../../lib/kycApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { useCan } from '../../lib/useStaffAccess';

const inputClass = 'h-10 w-full rounded-lg border border-line bg-white px-3 text-sm text-regantify-text focus:border-brand focus:outline-none';
const MAX_SIDE = 1600;

/** Shrinks a photo to at most 1600 px on its long side as a JPEG, so a phone picture of a few MB goes up as a few hundred KB. */
async function shrink(file: File): Promise<File> {
  if (!/^image\/(jpe?g|png|webp)$/.test(file.type)) throw new Error('Pick a JPG, PNG or WebP picture.');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  const blob: Blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read the picture.'))), 'image/jpeg', 0.85));
  return new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
}

function PicturePicker({ label, hint, file, onPick, required }: { label: string; hint: string; file: File | null; onPick: (f: File | null) => void; required: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  return (
    <div className="rounded-lg border border-line p-3">
      <p className="text-sm font-medium text-regantify-text">
        {label} {required ? <span className="text-red-600">*</span> : <span className="font-normal text-neutral-500">(optional)</span>}
      </p>
      <p className="mb-2 text-xs text-neutral-500">{hint}</p>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            const small = await shrink(f);
            if (preview) URL.revokeObjectURL(preview);
            setPreview(URL.createObjectURL(small));
            onPick(small);
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Could not use that picture.');
          }
        }}
      />
      {file && preview ? (
        <div className="flex items-center gap-3">
          <img src={preview} alt="" className="h-20 w-28 rounded object-cover" />
          <button type="button" onClick={() => ref.current?.click()} className="text-sm text-brand hover:underline">
            Change
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-dashed border-neutral-300 px-3 text-sm text-neutral-600 hover:bg-neutral-50">
          <ImagePlus size={16} /> Add a picture
        </button>
      )}
    </div>
  );
}

/**
 * Dashboard > Verification (TellMe idea 160). Only used when Super Admin asked this store to verify itself. The owner sends a name, the ID number and
 * pictures; Super Admin reads them. The pictures are kept private, read only by Super Admin, and deleted after the check.
 */
export default function Verification() {
  const queryClient = useQueryClient();
  const isOwner = useCan('owner');
  const { data, isLoading } = useQuery({ queryKey: ['kyc-me'], queryFn: kycApi.mine });
  const [fullName, setFullName] = useState('');
  const [nid, setNid] = useState('');
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<Partial<Record<KycKind, File | null>>>({});

  const send = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.set('fullName', fullName);
      form.set('nidNumber', nid);
      if (dob) form.set('dateOfBirth', dob);
      if (address) form.set('address', address);
      if (note) form.set('note', note);
      (['NID_FRONT', 'NID_BACK', 'SELFIE', 'TRADE_LICENSE'] as KycKind[]).forEach((k) => {
        const f = files[k];
        if (f) form.set(k, f);
      });
      return kycApi.submit(form);
    },
    onSuccess: () => {
      toast.success('Sent. Super Admin will check your documents.');
      void queryClient.invalidateQueries({ queryKey: ['kyc-me'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send your documents.')),
  });

  if (isLoading || !data) return <p className="py-10 text-center text-sm text-neutral-500">Loading…</p>;

  const needsForm = data.state === 'REQUESTED' || data.state === 'REJECTED';
  const ready = fullName.trim().length >= 3 && nid.replace(/\s/g, '').length >= 6 && files.NID_FRONT && files.NID_BACK && files.SELFIE && (!data.requireTradeLicense || files.TRADE_LICENSE);
  return (
    <PageSection>
      <PageHeader title="Verification" description="Sometimes we ask a store to prove who is behind it, to keep sellers and customers safe." />

      {data.state === 'NONE' && (
        <div className="rounded-xl border border-line bg-white p-5 text-sm text-neutral-700">
          <ShieldCheck className="mb-2 text-green-600" size={22} />
          Nothing is needed from you. If we ever need to verify your store, it will be shown here and on your dashboard.
        </div>
      )}
      {data.state === 'APPROVED' && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-sm text-green-900">
          <CheckCircle2 className="mb-2" size={22} />
          Your store is verified. Nothing else is needed.
        </div>
      )}
      {data.state === 'SUBMITTED' && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
          <Clock className="mb-2" size={22} />
          Your documents were sent and Super Admin is checking them. Withdrawals stay paused until they are approved. You will be told here and on your dashboard.
        </div>
      )}

      {needsForm && (
        <div className="space-y-4">
          <div className={`rounded-xl border p-4 text-sm ${data.restricted ? 'border-red-300 bg-red-50 text-red-900' : 'border-amber-300 bg-amber-50 text-amber-900'}`}>
            {data.restricted ? (
              <p className="font-medium">Your store is paused: new orders and new products are switched off. Send your documents and they come back on while we check them.</p>
            ) : (
              <p className="font-medium">
                Please send your documents by {data.dueDay}. If they are not here by then, new orders and new products will be switched off. Orders you already have keep working.
              </p>
            )}
            {data.state === 'REJECTED' && data.rejectReason && <p className="mt-1">Last time they were not accepted: {data.rejectReason}</p>}
            {data.note && <p className="mt-1">Message from Super Admin: {data.note}</p>}
            <p className="mt-1">Withdrawals are paused until you are verified.</p>
          </div>

          {!isOwner ? (
            <p className="rounded-lg border border-line bg-white p-4 text-sm text-neutral-700">Only the store owner can send these documents. Please ask the owner to open Verification.</p>
          ) : (
            <div className="space-y-4 rounded-xl border border-line bg-white p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm text-neutral-600">
                  Full name (as on the ID card) <span className="text-red-600">*</span>
                  <input className={`${inputClass} mt-1`} value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} />
                </label>
                <label className="text-sm text-neutral-600">
                  ID card number (NID or passport) <span className="text-red-600">*</span>
                  <input className={`${inputClass} mt-1`} value={nid} onChange={(e) => setNid(e.target.value)} maxLength={30} inputMode="text" />
                </label>
                <label className="text-sm text-neutral-600">
                  Date of birth (optional)
                  <input type="date" className={`${inputClass} mt-1`} value={dob} onChange={(e) => setDob(e.target.value)} />
                </label>
                <label className="text-sm text-neutral-600">
                  Address (optional)
                  <input className={`${inputClass} mt-1`} value={address} onChange={(e) => setAddress(e.target.value)} maxLength={300} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <PicturePicker label="ID card, front" hint="All four corners and the writing must be clear." file={files.NID_FRONT ?? null} onPick={(f) => setFiles((s) => ({ ...s, NID_FRONT: f }))} required />
                <PicturePicker label="ID card, back" hint="The same, from the back." file={files.NID_BACK ?? null} onPick={(f) => setFiles((s) => ({ ...s, NID_BACK: f }))} required />
                <PicturePicker label="Selfie holding the ID card" hint="Your face and the card in the same picture." file={files.SELFIE ?? null} onPick={(f) => setFiles((s) => ({ ...s, SELFIE: f }))} required />
                <PicturePicker label="Trade licence" hint="If your business has one." file={files.TRADE_LICENSE ?? null} onPick={(f) => setFiles((s) => ({ ...s, TRADE_LICENSE: f }))} required={Boolean(data.requireTradeLicense)} />
              </div>
              <label className="block text-sm text-neutral-600">
                Anything we should know (optional)
                <input className={`${inputClass} mt-1`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
              </label>
              <p className="text-xs text-neutral-500">
                Your pictures are kept private. Only Super Admin can open them, only to check you, and they are deleted after the check. They are never shown to customers or other sellers.
              </p>
              <button type="button" onClick={() => send.mutate()} disabled={!ready || send.isPending} className={primaryBtn}>
                {send.isPending ? 'Sending…' : 'Send for checking'}
              </button>
            </div>
          )}
        </div>
      )}
    </PageSection>
  );
}
