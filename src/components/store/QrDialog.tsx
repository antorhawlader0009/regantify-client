import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { withQrTag } from '../../lib/qrLink';
import { toast } from '../../lib/toast';

/**
 * A QR code for one link (TellMe idea 125): the store, a product page or a landing page. Drawn in the browser; download it as a PNG for a parcel, a card
 * or a banner. "Count orders from this QR" adds the tracking tags so Analytics shows how many visits and orders it brought (as the source "QR code").
 */
export function QrDialog({ open, onOpenChange, title, url, campaign }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; url: string; campaign: string }) {
  const [track, setTrack] = useState(true);
  const [png, setPng] = useState<string | null>(null);
  const link = track ? withQrTag(url, campaign) : url;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(link, { margin: 2, width: 800, errorCorrectionLevel: 'M' })
      .then((data) => !cancelled && setPng(data))
      .catch(() => !cancelled && setPng(null));
    return () => {
      cancelled = true;
    };
  }, [open, link]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied.');
    } catch {
      toast.error('Could not copy. Select the link and copy it by hand.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} maxWidth="max-w-sm">
      <div className="space-y-3 px-6 pb-6 pt-3 text-center">
        {png ? <img src={png} alt="QR code" className="mx-auto h-56 w-56" /> : <div className="mx-auto h-56 w-56 animate-pulse rounded bg-neutral-100" />}
        <label className="flex items-center justify-center gap-2 text-sm text-regantify-text">
          <input type="checkbox" checked={track} onChange={(e) => setTrack(e.target.checked)} />
          Count orders from this QR
        </label>
        <p className="break-all text-xs text-neutral-500">{link}</p>
        <div className="flex justify-center gap-2">
          {png && (
            <a href={png} download={`qr-${campaign}.png`} className={primaryBtn}>
              <Download size={14} />
              Download PNG
            </a>
          )}
          <button type="button" onClick={copy} className={outlineBtn}>
            <Copy size={14} />
            Copy link
          </button>
        </div>
      </div>
    </Dialog>
  );
}
