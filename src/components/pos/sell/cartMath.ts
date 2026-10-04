import type { PosDiscount, PosSaleLineInput, PosSettings } from '../../../lib/posApi';

/*
 * The counter cart and its totals (POS-system-plan.md Steps 4 and 7). The same rules as the
 * server's priceSale, so the screen shows what will be charged: a typed price, then a line
 * discount spread over the units, then the cart discount, then VAT on what's left. A coupon's
 * amount only comes from the server (the quote).
 */

export interface CartLine {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  options: string;
  /** The regular counter price from the catalog. */
  price: number;
  listPrice: number;
  quantity: number;
  /** null = unlimited or pre-order (no count to warn about). */
  stock: number | null;
  /** A new unit price typed at the counter. */
  customPrice?: number;
  discount?: PosDiscount;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** What one line will cost, and what it would have cost at the regular price. */
export function lineAmounts(l: CartLine) {
  const regularTotal = round2(l.price * l.quantity);
  let unit = l.customPrice !== undefined ? round2(l.customPrice) : l.price;
  let total = round2(unit * l.quantity);
  if (l.discount && l.discount.value > 0) {
    const off = l.discount.type === 'PERCENT' ? (total * Math.min(l.discount.value, 100)) / 100 : Math.min(l.discount.value, total);
    unit = round2((total - off) / l.quantity);
    total = round2(unit * l.quantity);
  }
  return { unit, total, regularTotal };
}

export function cartTotals(lines: CartLine[], settings: PosSettings | undefined, cartDiscount?: PosDiscount, couponDiscount = 0) {
  const gross = round2(lines.reduce((s, l) => s + lineAmounts(l).regularTotal, 0));
  const subtotal = round2(lines.reduce((s, l) => s + lineAmounts(l).total, 0));
  const cartOff = !cartDiscount || cartDiscount.value <= 0 ? 0 : round2(cartDiscount.type === 'PERCENT' ? (subtotal * Math.min(cartDiscount.value, 100)) / 100 : Math.min(cartDiscount.value, subtotal));
  const coupon = Math.min(couponDiscount, round2(subtotal - cartOff));
  const net = round2(subtotal - cartOff - coupon);
  const rate = settings?.vatPercent ?? 0;
  const includes = settings?.pricesIncludeVat ?? true;
  const vat = rate <= 0 ? 0 : includes ? round2((net * rate) / (100 + rate)) : round2((net * rate) / 100);
  // Everything typed at the counter below the regular prices, as % of them (a coupon doesn't count).
  const manual = round2(Math.max(0, gross - subtotal) + cartOff);
  return {
    gross,
    subtotal,
    cartOff,
    coupon,
    vat,
    vatIncluded: includes,
    total: includes ? net : round2(net + vat),
    items: lines.reduce((s, l) => s + l.quantity, 0),
    manualPercent: gross > 0 ? round2((manual / gross) * 100) : 0,
    priceChanged: lines.some((l) => l.customPrice !== undefined && round2(l.customPrice) !== l.price),
  };
}

/** The sale's lines as the server takes them. */
export function toSaleLines(lines: CartLine[]): PosSaleLineInput[] {
  return lines.map((l) => ({
    productId: l.productId,
    variantId: l.variantId ?? undefined,
    quantity: l.quantity,
    ...(l.customPrice !== undefined && round2(l.customPrice) !== l.price ? { price: round2(l.customPrice) } : {}),
    ...(l.discount && l.discount.value > 0 ? { discount: l.discount } : {}),
  }));
}
