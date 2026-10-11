import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { Copy, Download, Printer } from 'lucide-react';
import { getVendorBranding, getVendorSettings, getVendorSocialLinks } from '../../../lib/vendorApi';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import { withQrTag } from '../../../lib/qrLink';
import { printElement } from '../../../lib/printElement';
import { toast } from '../../../lib/toast';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';

const TEXT = {
  en: { scan: 'Scan to order', visit: 'or visit' },
  bn: { scan: 'স্ক্যান করে অর্ডার করুন', visit: 'অথবা যান' },
} as const;

/**
 * Store > Share & QR (TellMe idea 125): the store's link as a QR code (download a PNG), and an A5 poster to print for the shop, a parcel or a banner: the logo,
 * the store's name, the QR, "Scan to order" (English or Bangla), the phone and the social links. Drawn in the browser and printed through printElement. With "Count
 * orders from this QR" the link carries tracking tags, so Analytics shows how many visits and orders the QR brought (as the source "QR code").
 */
export default function ShareQr() {
  const { data: settings } = useQuery({ queryKey: ['vendor-settings'], queryFn: getVendorSettings });
  const { data: branding } = useQuery({ queryKey: ['vendor-branding'], queryFn: getVendorBranding });
  const { data: social } = useQuery({ queryKey: ['vendor-social-links'], queryFn: getVendorSocialLinks });
  const [track, setTrack] = useState(true);
  const [lang, setLang] = useState<'en' | 'bn'>('en');
  const [showPhone, setShowPhone] = useState(true);
  const [showSocial, setShowSocial] = useState(true);
  const [png, setPng] = useState<string | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  const base = settings ? storefrontStoreUrl(settings.subdomain) : '';
  const link = base ? (track ? withQrTag(base, 'store') : base) : '';

  useEffect(() => {
    if (!link) return;
    let cancelled = false;
    QRCode.toDataURL(link, { margin: 1, width: 900, errorCorrectionLevel: 'M' })
      .then((data) => !cancelled && setPng(data))
      .catch(() => !cancelled && setPng(null));
    return () => {
      cancelled = true;
    };
  }, [link]);

  const socialLinks = social ? Object.entries(social).filter(([, v]) => typeof v === 'string' && v.trim()).map(([k, v]) => ({ key: k.replace(/Url$/, ''), url: String(v).replace(/^https?:\/\//, '').replace(/\/$/, '') })) : [];
  const t = TEXT[lang];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success('Link copied.');
    } catch {
      toast.error('Could not copy. Select the link and copy it by hand.');
    }
  };

  const print = async () => {
    if (!posterRef.current) return;
    try {
      await printElement(posterRef.current, 'Store poster', { size: 'A5', padding: '0' });
    } catch {
      toast.error('Could not open the print window. Please try again.');
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold text-regantify-text">Share &amp; QR</h1>
      <p className="mb-6 text-sm text-neutral-600">Put your store’s QR code on parcels, visiting cards, banners and ads. Customers scan it and land on your store.</p>

      {!settings ? (
        <p className="text-sm text-neutral-500">Loading…</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <div className="space-y-3 text-center">
            {png ? <img src={png} alt="QR code of your store" className="mx-auto h-56 w-56 rounded-lg border border-line" /> : <div className="mx-auto h-56 w-56 animate-pulse rounded bg-neutral-100" />}
            <div className="flex justify-center gap-2">
              {png && (
                <a href={png} download="store-qr.png" className={outlineBtn}>
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

          <div className="space-y-4">
            <label className="flex items-start gap-2 text-sm text-regantify-text">
              <input type="checkbox" checked={track} onChange={(e) => setTrack(e.target.checked)} className="mt-1" />
              <span>
                Count orders from this QR
                <span className="block text-xs text-neutral-500">Adds tracking tags to the link, so Analytics &gt; Marketing shows the visits and orders it brought as “QR code”.</span>
              </span>
            </label>
            <p className="break-all rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">{link}</p>

            <div className="rounded-xl border border-line p-4">
              <p className="mb-2 text-sm font-medium text-regantify-text">Poster (A5)</p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-regantify-text">
                <label className="flex items-center gap-1.5">
                  Language
                  <select value={lang} onChange={(e) => setLang(e.target.value as 'en' | 'bn')} className="rounded-lg border border-line px-2 py-1.5 text-sm">
                    <option value="en">English</option>
                    <option value="bn">বাংলা</option>
                  </select>
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={showPhone} onChange={(e) => setShowPhone(e.target.checked)} />
                  Phone number
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={showSocial} onChange={(e) => setShowSocial(e.target.checked)} disabled={socialLinks.length === 0} />
                  Social links
                </label>
              </div>
              <button type="button" onClick={print} disabled={!png} className={`${primaryBtn} mt-3`}>
                <Printer size={14} />
                Print the poster
              </button>
              <p className="mt-2 text-xs text-neutral-500">The logo comes from Store &gt; Branding, the phone from your profile and the social links from Store &gt; Social.</p>
            </div>
          </div>
        </div>
      )}

      {/* The poster: kept off screen and printed through printElement (A5, 148 x 210 mm). */}
      <div aria-hidden className="pointer-events-none fixed left-[-10000px] top-0">
        <div ref={posterRef}>
          <div className="flex flex-col items-center justify-between bg-white text-center text-black" style={{ width: '148mm', height: '210mm', padding: '14mm', fontFamily: "'IBM Plex Sans', 'Hind Siliguri', sans-serif" }}>
            <div className="flex flex-col items-center gap-3">
              {branding?.logoUrl && <img src={branding.logoUrl} alt="" style={{ maxHeight: '28mm', maxWidth: '90mm', objectFit: 'contain' }} />}
              <p className="text-[26pt] font-bold leading-tight">{settings?.storeName}</p>
            </div>
            <div className="flex flex-col items-center gap-3">
              {png && <img src={png} alt="" style={{ width: '90mm', height: '90mm' }} />}
              <p className="text-[22pt] font-bold">{t.scan}</p>
              <p className="text-[10pt]">
                {t.visit} {base.replace(/^https?:\/\//, '')}
              </p>
            </div>
            <div className="space-y-1 text-[11pt]">
              {showPhone && settings?.phone && <p className="font-semibold">{settings.phone}</p>}
              {showSocial && socialLinks.length > 0 && (
                <p className="text-[9pt]">
                  {socialLinks.slice(0, 4).map((s) => `${s.key}: ${s.url}`).join('   ·   ')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
