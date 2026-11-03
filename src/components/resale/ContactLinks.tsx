import { MessageCircle, Phone } from 'lucide-react';

/** 01XXXXXXXXX (or +8801...) to the 8801XXXXXXXXX form wa.me needs. */
function waNumber(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  return digits.startsWith('88') ? digits : `88${digits}`;
}

/**
 * The other store's phone with Call and WhatsApp links (reseller system, 2026-11-03): suppliers and resellers agree on terms and settle
 * money directly, so each side can always reach the other.
 */
export function ContactLinks({ phone, label = 'Contact', compact = false }: { phone: string | null | undefined; label?: string; compact?: boolean }) {
  if (!phone) return null;
  const link = 'inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs font-medium text-regantify-text hover:bg-neutral-50';
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {!compact && <span className="text-xs text-neutral-500">{label}:</span>}
      <span className="text-xs font-medium text-regantify-text">{phone}</span>
      <a href={`tel:${phone}`} className={link}>
        <Phone size={12} aria-hidden /> Call
      </a>
      <a href={`https://wa.me/${waNumber(phone)}`} target="_blank" rel="noreferrer" className={link}>
        <MessageCircle size={12} aria-hidden /> WhatsApp
      </a>
    </span>
  );
}
