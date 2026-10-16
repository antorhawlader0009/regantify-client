import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { DISPUTE_STATUS_LABEL, resaleDisputesApi, type Dispute } from '../../lib/resaleDisputesApi';

const MAX_PHOTOS = 6;
const day = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Up to 6 photos as evidence (uploaded at once; only their links are sent with the report or answer). */
export function DisputePhotoPicker({ photos, onChange }: { photos: string[]; onChange: (next: string[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const pick = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const room = MAX_PHOTOS - photos.length;
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, room)) urls.push(await resaleDisputesApi.uploadPhoto(f));
      onChange([...photos, ...urls]);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not upload the photo.'));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <div className="flex flex-wrap gap-2">
      {photos.map((url) => (
        <div key={url} className="relative h-16 w-16 overflow-hidden rounded-md border border-line">
          <img src={url} alt="" className="h-full w-full object-cover" />
          <button type="button" onClick={() => onChange(photos.filter((u) => u !== url))} className="absolute right-0.5 top-0.5 rounded bg-white/90 p-0.5" aria-label="Remove photo">
            <X size={12} />
          </button>
        </div>
      ))}
      {photos.length < MAX_PHOTOS && (
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="flex h-16 w-16 flex-col items-center justify-center rounded-md border border-dashed border-line text-xs text-neutral-500">
          <ImagePlus size={16} aria-hidden />
          {busy ? '…' : 'Photo'}
        </button>
      )}
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => void pick(e.target.files)} />
    </div>
  );
}

function Photos({ urls }: { urls: string[] }) {
  if (urls.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1.5">
      {urls.map((u) => (
        <a key={u} href={u} target="_blank" rel="noreferrer">
          <img src={u} alt="" className="h-14 w-14 rounded border border-line object-cover" />
        </a>
      ))}
    </div>
  );
}

/** Both sides of a dispute and the decision, as every page shows it. */
export function DisputeBody({ d }: { d: Dispute }) {
  return (
    <div className="space-y-2 text-sm">
      <div>
        <p className="text-xs text-neutral-500">
          The reseller · {day(d.createdAt)}
          {d.reason === 'MISSING' && d.checkedWithCustomer ? ' · checked with the customer' : ''}
        </p>
        <p className="whitespace-pre-line text-regantify-text">{d.details}</p>
        <Photos urls={d.photos} />
      </div>
      {d.supplierAnswer ? (
        <div className="border-t border-line pt-2">
          <p className="text-xs text-neutral-500">The supplier · {day(d.answeredAt)}</p>
          <p className="whitespace-pre-line text-regantify-text">{d.supplierAnswer}</p>
          <Photos urls={d.supplierPhotos} />
        </div>
      ) : (
        d.status === 'OPEN' && <p className="text-xs text-neutral-500">The supplier has not answered yet.</p>
      )}
      {d.status === 'DECIDED' && (
        <div className={`rounded-lg px-3 py-2 ${d.decision === 'FOR_RESELLER' ? 'bg-emerald-50 text-emerald-800' : 'bg-neutral-100 text-neutral-700'}`}>
          <p className="font-medium">{d.decision === 'FOR_RESELLER' ? 'Decided for the reseller' : 'Decided for the supplier'} · {day(d.decidedAt)}</p>
          {d.decisionNote && <p className="whitespace-pre-line">{d.decisionNote}</p>}
          {d.compensation ? (
            <p className="mt-0.5 text-xs">
              Compensation ৳{d.compensation.toLocaleString('en-US')}: {d.compensationStatus === 'PAID' ? 'paid' : 'waiting for the supplier’s wallet'}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function DisputeStatusChip({ status }: { status: Dispute['status'] }) {
  const color = status === 'DECIDED' ? 'bg-emerald-50 text-emerald-700' : status === 'WITHDRAWN' ? 'bg-neutral-100 text-neutral-500' : 'bg-amber-50 text-amber-800';
  return <span className={`rounded px-1.5 py-0.5 text-xs ${color}`}>{DISPUTE_STATUS_LABEL[status]}</span>;
}
