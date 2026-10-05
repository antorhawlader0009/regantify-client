import type { CreatePosSale, PosDiscount, PosReceipt, PosTenderInput } from '../../../lib/posApi';
import { nextLocalNumber } from '../../../lib/posOffline';
import { lineAmounts, round2, type CartLine, type cartTotals } from './cartMath';

/*
 * A sale made with no internet (POS-system-plan.md Step 13): the body that will be sent later
 * and the receipt printed now, worked out the same way the server will (cartMath). Only what
 * needs no server can be sold offline: regular prices, no discount or coupon, no gift card or due.
 */

/** Why this cart can't be sold offline, or null when it can. */
export function offlineBlocker(cart: CartLine[], cartDiscount: PosDiscount | undefined, couponCode: string | null, payments?: PosTenderInput[]) {
  if (couponCode) return 'Coupons need the internet. Remove the coupon to sell offline.';
  if (cartDiscount && cartDiscount.value > 0) return 'Discounts need the internet. Remove the discount to sell offline.';
  if (cart.some((l) => (l.discount && l.discount.value > 0) || (l.customPrice !== undefined && round2(l.customPrice) !== l.price))) {
    return 'Changed prices and line discounts need the internet. Set the lines back to their price to sell offline.';
  }
  if (payments?.some((p) => p.method === 'GIFT_CARD' || p.method === 'DUE')) return 'Gift cards and due need the internet. Take another payment.';
  return null;
}

export function buildOfflineSale(a: {
  clientSaleId: string;
  sessionId: string;
  registerId: string;
  registerName: string;
  cashier: { id: string; displayName: string };
  cart: CartLine[];
  totals: ReturnType<typeof cartTotals>;
  customer: { name: string; phone: string };
  payments: PosTenderInput[];
}): { sale: CreatePosSale; receipt: PosReceipt } {
  const soldAt = new Date().toISOString();
  const localNumber = nextLocalNumber(a.registerId);
  const total = a.totals.total;

  // The tenders as the server will record them: others pay their amount, cash the rest with change.
  const others = a.payments.filter((p) => p.method !== 'CASH').map((p) => ({ method: p.method, amount: round2(p.amount ?? 0), reference: p.reference ?? null, tendered: null, change: null }));
  const cashDue = round2(total - others.reduce((s, p) => s + p.amount, 0));
  const cash = a.payments.find((p) => p.method === 'CASH');
  const tendered = round2(cash?.tendered ?? cashDue);
  const payments = [...(cash && cashDue > 0 ? [{ method: 'CASH', amount: cashDue, reference: null, tendered, change: round2(Math.max(0, tendered - cashDue)) }] : []), ...others];

  const name = a.customer.name.trim();
  const phone = a.customer.phone.trim();
  const sale: CreatePosSale = {
    clientSaleId: a.clientSaleId,
    sessionId: a.sessionId,
    // Every line carries the price it was sold at, so the server keeps it if the price moves before the sync.
    lines: a.cart.map((l) => ({ productId: l.productId, variantId: l.variantId ?? undefined, quantity: l.quantity, price: l.price })),
    customer: name || phone ? { name: name || undefined, phone: phone || undefined } : undefined,
    payments: a.payments,
    offline: { soldAt, localNumber, total, cashierId: a.cashier.id },
  };

  const receipt: PosReceipt = {
    id: a.clientSaleId,
    publicCode: localNumber,
    invoiceNumber: 0,
    createdAt: soldAt,
    registerName: a.registerName,
    cashierName: a.cashier.displayName,
    customerName: name || 'Walk-in customer',
    customerPhone: phone || null,
    lines: a.cart.map((l) => {
      const amounts = lineAmounts(l);
      return { name: l.name, options: l.options, quantity: l.quantity, unitPrice: amounts.unit, listPrice: Math.max(l.listPrice, l.price), lineTotal: amounts.total };
    }),
    subtotal: a.totals.subtotal,
    discountAmount: 0,
    discountLabel: null,
    vatAmount: a.totals.vat,
    vatIncluded: a.totals.vatIncluded,
    total,
    payments,
    trackingToken: null,
    receiptUrl: null,
    localNumber,
    offline: true,
    replayed: false,
    stockWarnings: [],
  };
  return { sale, receipt };
}
