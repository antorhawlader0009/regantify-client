// Bangladeshi phone numbers as sellers type them: Bangla digits, +880,
// spaces and dashes all come in. Stored and shown as 01XXXXXXXXX, the
// same shape the LMS uses (server lms-phone.ts).

const BANGLA_ZERO = 0x09e6;

/** "০১৭১২" -> "01712". Other characters are left alone. */
export function toLatinDigits(value: string): string {
  return value.replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - BANGLA_ZERO));
}

/** "+880 1712-345678" or "০১৭১২৩৪৫৬৭৮" -> "01712345678"; null until it's a full BD mobile number. */
export function normalizeBdPhone(raw: string): string | null {
  let digits = toLatinDigits(raw).replace(/\D/g, '');
  if (digits.startsWith('880')) digits = digits.slice(2);
  return /^01\d{9}$/.test(digits) ? digits : null;
}

/** "01712345678" -> "8801712345678", for a wa.me link. */
export function whatsappNumber(phone: string): string {
  const digits = toLatinDigits(phone).replace(/\D/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  return digits;
}

/** The message under a phone field that isn't a full number yet. */
export const BD_PHONE_HINT = 'Use an 11-digit mobile number starting with 01, e.g. 01712345678.';
