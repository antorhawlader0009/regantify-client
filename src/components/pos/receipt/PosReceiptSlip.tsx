import { forwardRef, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { PosReceipt, PosReceiptProfile } from '../../../lib/posApi';
import { printElement } from '../../../lib/printElement';

/*
 * The printed counter receipt (POS-system-plan.md Step 5). Drawn by the
 * browser and printed through the OS print dialog (printElement), which is
 * what makes Bangla come out right on any thermal printer with its normal
 * Windows driver: the printer receives rendered text, not its own codepage.
 * Plain black on white, no colours, sized in mm for 58 or 80 mm paper.
 */

const LABELS = {
  en: {
    receipt: 'Receipt',
    date: 'Date',
    counter: 'Counter',
    cashier: 'Cashier',
    customer: 'Customer',
    item: 'Item',
    amount: 'Amount',
    subtotal: 'Subtotal',
    discount: 'Discount',
    vatIncluded: 'Includes VAT',
    vat: 'VAT',
    total: 'Total',
    paid: 'Paid',
    change: 'Change',
    phone: 'Phone',
    bin: 'BIN',
    scan: 'Scan to see this receipt online',
    thanks: 'Thank you for shopping with us',
    dueNow: 'Your due in all',
  },
  bn: {
    receipt: 'রসিদ',
    date: 'তারিখ',
    counter: 'কাউন্টার',
    cashier: 'ক্যাশিয়ার',
    customer: 'ক্রেতা',
    item: 'পণ্য',
    amount: 'মূল্য',
    subtotal: 'উপমোট',
    discount: 'ছাড়',
    vatIncluded: 'ভ্যাট সহ',
    vat: 'ভ্যাট',
    total: 'মোট',
    paid: 'পরিশোধ',
    change: 'ফেরত',
    phone: 'ফোন',
    bin: 'বিআইএন',
    scan: 'অনলাইনে রসিদ দেখতে স্ক্যান করুন',
    thanks: 'আমাদের সাথে কেনাকাটার জন্য ধন্যবাদ',
    dueNow: 'মোট বাকি',
  },
} as const;

const METHOD = {
  en: { CASH: 'Cash', CARD: 'Card', BKASH: 'bKash', NAGAD: 'Nagad', BANGLA_QR: 'Bangla QR', BANK: 'Bank', GIFT_CARD: 'Gift card', DUE: 'Due', OTHER: 'Other' },
  bn: { CASH: 'নগদ', CARD: 'কার্ড', BKASH: 'বিকাশ', NAGAD: 'নগদ (MFS)', BANGLA_QR: 'বাংলা কিউআর', BANK: 'ব্যাংক', GIFT_CARD: 'গিফট কার্ড', DUE: 'বাকি', OTHER: 'অন্যান্য' },
} as const;

/** Taka with Latin digits (what every BD till prints); "Tk" because many thermal fonts lack the ৳ sign. */
const money = (n: number) => `Tk ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dhakaDate = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export const PosReceiptSlip = forwardRef<HTMLDivElement, { receipt: PosReceipt; profile: PosReceiptProfile }>(function PosReceiptSlip(
  { receipt, profile },
  ref,
) {
  const t = LABELS[profile.language];
  const narrow = profile.widthMm === 58;
  const [qr, setQr] = useState<string | null>(null);

  useEffect(() => {
    if (!receipt.receiptUrl) return;
    QRCode.toString(receipt.receiptUrl, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(null));
  }, [receipt.receiptUrl]);

  const rule = <div className="my-[1.5mm] border-t border-dashed border-black" />;

  return (
    <div
      ref={ref}
      className="bg-white text-black"
      style={{
        // The printable width leaves a little room either side of the paper for the print head.
        width: `${profile.widthMm - (narrow ? 6 : 8)}mm`,
        margin: '0 auto',
        padding: '2mm 0 4mm',
        fontFamily: "'Hind Siliguri', 'IBM Plex Sans', Arial, sans-serif",
        fontSize: narrow ? '8pt' : '9pt',
        lineHeight: 1.35,
      }}
    >
      <div className="text-center">
        {profile.logoUrl && <img src={profile.logoUrl} alt="" className="mx-auto mb-[1mm] max-h-[14mm] max-w-[60%] object-contain grayscale" />}
        <p style={{ fontSize: narrow ? '11pt' : '13pt' }} className="font-bold leading-tight">
          {profile.storeName}
        </p>
        {profile.header && <p className="whitespace-pre-line">{profile.header}</p>}
        {profile.phone && (
          <p>
            {t.phone}: {profile.phone}
          </p>
        )}
        {profile.binNumber && (
          <p>
            {t.bin}: {profile.binNumber}
          </p>
        )}
      </div>
      {rule}
      <div>
        <Row left={`${t.receipt}: ${receipt.publicCode ?? `#${receipt.invoiceNumber}`}`} right={`#${receipt.invoiceNumber}`} />
        <Row left={`${t.date}: ${dhakaDate(receipt.createdAt)}`} />
        {receipt.registerName && <Row left={`${t.counter}: ${receipt.registerName}`} />}
        {receipt.cashierName && <Row left={`${t.cashier}: ${receipt.cashierName}`} />}
        {receipt.customerPhone && <Row left={`${t.customer}: ${receipt.customerName} ${receipt.customerPhone}`} />}
      </div>
      {rule}
      <Row left={<b>{t.item}</b>} right={<b>{t.amount}</b>} />
      {receipt.lines.map((l, i) => (
        <div key={i} className="mt-[0.8mm]">
          <p className="break-words">
            {l.name}
            {l.options && ` (${l.options})`}
          </p>
          <Row left={`  ${l.quantity} x ${money(l.unitPrice)}`} right={money(l.lineTotal)} />
        </div>
      ))}
      {rule}
      <Row left={t.subtotal} right={money(receipt.subtotal)} />
      {receipt.discountAmount > 0 && <Row left={receipt.discountLabel ? `${t.discount} (${receipt.discountLabel})` : t.discount} right={`-${money(receipt.discountAmount)}`} />}
      {receipt.vatAmount > 0 && (
        <Row left={receipt.vatIncluded ? `${t.vatIncluded} (${profile.vatPercent}%)` : `${t.vat} ${profile.vatPercent}%`} right={money(receipt.vatAmount)} />
      )}
      <div style={{ fontSize: narrow ? '10pt' : '12pt' }} className="mt-[0.5mm] font-bold">
        <Row left={t.total} right={money(receipt.total)} />
      </div>
      {rule}
      {receipt.payments.map((p, i) => (
        <div key={i}>
          <Row left={`${t.paid} (${METHOD[profile.language][p.method as keyof (typeof METHOD)['en']] ?? p.method})`} right={money(p.tendered ?? p.amount)} />
          {p.reference && <p className="pl-[2mm]">{p.reference}</p>}
          {p.change != null && p.change > 0 && <Row left={t.change} right={money(p.change)} />}
        </div>
      ))}
      {/* Part of the sale on the customer's due (Step 9): what they owe the shop in all after it. */}
      {receipt.dueBalanceAfter != null && (
        <div className="mt-[0.5mm] font-bold">
          <Row left={t.dueNow} right={money(receipt.dueBalanceAfter)} />
        </div>
      )}
      {(profile.footer || qr) && rule}
      {qr && (
        <div className="mt-[1mm] text-center">
          <div className="mx-auto h-[22mm] w-[22mm] [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="mt-[0.5mm]" style={{ fontSize: narrow ? '7pt' : '7.5pt' }}>
            {t.scan}
          </p>
        </div>
      )}
      {profile.footer && <p className="mt-[1.5mm] whitespace-pre-line text-center">{profile.footer}</p>}
      <p className="mt-[1.5mm] text-center">{t.thanks}</p>
    </div>
  );
});

function Row({ left, right }: { left: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-[2mm]">
      <span className="min-w-0 break-words">{left}</span>
      {right !== undefined && <span className="shrink-0 tabular-nums">{right}</span>}
    </div>
  );
}

/** Opens the print dialog with just the slip, on paper as wide as the store's printer. */
export function printReceipt(el: HTMLElement, receipt: PosReceipt, profile: PosReceiptProfile) {
  return printElement(el, `Receipt ${receipt.publicCode ?? receipt.invoiceNumber}`, { size: `${profile.widthMm}mm auto`, padding: '0' });
}
