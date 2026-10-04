import { api } from './api';

/** Where the dashboard's "POS" nav entry lands. */
export const POS_HOME = '/vendor/pos/registers';

/** The header that says who unlocked the counter with their PIN (server pos-cashier-token.ts). */
const CASHIER_HEADER = 'X-Pos-Cashier';

/** GET /v1/pos/me — the gate every POS page shares (plan first, then "turned on"). */
export interface PosMe {
  enabled: boolean;
  userId: string;
  name: string;
  storeName: string;
  isOwner: boolean;
  /** Owner, or a staff account whose POS role is Manager: runs registers, staff and settings. */
  isManager: boolean;
  /** This account's own POS staff row, if it has one (to set its own PIN). */
  myStaffId: string | null;
}

export type PosStaffRole = 'CASHIER' | 'MANAGER';

export interface PosStaffMember {
  id: string;
  userId: string;
  displayName: string;
  role: PosStaffRole;
  isOwner: boolean;
  phone: string | null;
  hasPin: boolean;
  pinLocked: boolean;
  maxDiscountPercent: number;
  canRefund: boolean;
  canOverridePrice: boolean;
  canOpenDrawer: boolean;
  canVoid: boolean;
}

export interface PosStaffList {
  staff: PosStaffMember[];
  /** Staff accounts (Staff page) not set up for the POS yet. */
  candidates: Array<{ userId: string; name: string; staffRole: string }>;
}

export type PosStaffFields = Partial<
  Pick<PosStaffMember, 'displayName' | 'role' | 'maxDiscountPercent' | 'canRefund' | 'canOverridePrice' | 'canOpenDrawer' | 'canVoid'>
>;

/** Who's at the counter after a correct PIN. `token` goes back on every counter action. */
export interface PosUnlock {
  token: string;
  expiresAt: string;
  cashier: {
    id: string;
    displayName: string;
    role: PosStaffRole;
    maxDiscountPercent: number;
    canRefund: boolean;
    canOverridePrice: boolean;
    canOpenDrawer: boolean;
    canVoid: boolean;
  };
}

export interface PosRegister {
  id: string;
  name: string;
  active: boolean;
  openSession: {
    id: string;
    openedAt: string;
    openedByName: string;
    openingFloat: number;
    salesCount: number;
    salesTotal: number;
    expectedCash: number;
  } | null;
}

export interface PosSessionRow {
  id: string;
  status: 'OPEN' | 'CLOSED';
  register: { name: string };
  openedAt: string;
  openedByName: string;
  openingFloat: string;
  closedAt: string | null;
  closedByName: string | null;
  expectedCash: string | null;
  countedCash: string | null;
  variance: string | null;
  closingNote: string | null;
}

export interface PosClosedSession {
  id: string;
  closedAt: string;
  openingFloat: string;
  expectedCash: string;
  countedCash: string;
  variance: string;
  zReport: { salesCount: number; salesTotal: number; cashSales: number } | null;
}

const cashier = (token: string) => ({ headers: { [CASHIER_HEADER]: token } });

/** A discount typed at the counter: a % or a ৳ amount (Step 7). */
export interface PosDiscount {
  type: 'PERCENT' | 'AMOUNT';
  value: number;
  reason?: string;
}

/** One cart line. `price` asks for a new unit price; `discount` takes a % or ৳ off the whole line. */
export interface PosSaleLineInput {
  productId: string;
  variantId?: string;
  quantity: number;
  price?: number;
  discount?: PosDiscount;
}

/** POST /v1/pos/sales/quote answer: the sale's numbers before paying, and whether a manager must approve. */
export interface PosQuote {
  subtotal: number;
  cartDiscount: number;
  couponDiscount: number;
  couponCode: string | null;
  discountAmount: number;
  vatAmount: number;
  vatIncluded: boolean;
  total: number;
  approvalNeeded: { discountPercent: number; priceOverride: boolean } | null;
}

/** A POS sale as the return screen sees it (GET /v1/pos/returns/sale/:orderId). */
export interface PosReturnableSale {
  id: string;
  publicCode: string | null;
  invoiceNumber: number;
  createdAt: string;
  status: string;
  posSessionId: string | null;
  customerName: string;
  customerPhone: string | null;
  total: number;
  /** Already given back by earlier returns. */
  refunded: number;
  paidWith: string[];
  returnableUntil: string | null;
  lines: Array<{ orderItemId: string; name: string; options: string; quantity: number; returned: number; returnable: number; unitRefund: number }>;
  returns: Array<{ id: string; kind: 'RETURN' | 'VOID'; amount: number; cashierName: string; reason: string | null; createdAt: string }>;
}

export interface CreatePosReturn {
  orderId: string;
  sessionId: string;
  kind: 'RETURN' | 'VOID';
  lines: Array<{ orderItemId: string; quantity: number; restock: boolean }>;
  refunds: Array<{ method: PosTender; amount: number; reference?: string }>;
  reason?: string;
  approvalId?: string;
}

export interface PosHeldCart {
  id: string;
  name: string;
  itemCount: number;
  createdByName: string;
  createdAt: string;
}

/** POST /v1/pos/sales body (server create-pos-sale.dto.ts). Prices are worked out by the server. */
export interface CreatePosSale {
  clientSaleId: string;
  sessionId: string;
  lines: PosSaleLineInput[];
  customer?: { name?: string; phone?: string };
  /** A discount off the whole cart, after line discounts (Step 7). */
  cartDiscount?: PosDiscount;
  couponCode?: string;
  /** A manager's approval, when the discount or a price change needs one. */
  approvalId?: string;
  /** One tender, or several for a split payment. Cash takes what the others leave and gives change. */
  payments: PosTenderInput[];
}

/** The ways a counter sale can be paid (server pos-tenders.ts). */
export const POS_TENDERS = ['CASH', 'CARD', 'BKASH', 'NAGAD', 'BANGLA_QR', 'BANK', 'GIFT_CARD', 'OTHER'] as const;
export type PosTender = (typeof POS_TENDERS)[number];

export const TENDER_LABEL: Record<PosTender, string> = {
  CASH: 'Cash',
  CARD: 'Card',
  BKASH: 'bKash',
  NAGAD: 'Nagad',
  BANGLA_QR: 'Bangla QR',
  BANK: 'Bank transfer',
  GIFT_CARD: 'Gift card',
  OTHER: 'Other',
};

export interface PosTenderInput {
  method: PosTender;
  /** Non-cash: what this tender paid. */
  amount?: number;
  /** Cash: what was handed over. */
  tendered?: number;
  /** Transaction ID / last 4 digits; the name of the method for OTHER. */
  reference?: string;
  giftCardCode?: string;
}

/** What every printed receipt needs from the store (GET /v1/pos/receipt-profile). */
export interface PosReceiptProfile {
  storeName: string;
  /** null when the store has no logo or "Print the store logo" is off. */
  logoUrl: string | null;
  phone: string | null;
  header: string | null;
  footer: string | null;
  binNumber: string | null;
  widthMm: 80 | 58;
  language: 'en' | 'bn';
  vatPercent: number;
  smsReceipt: boolean;
  /** Tenders this counter offers (always includes CASH). */
  paymentMethods: PosTender[];
  /** The store's Bangla QR sticker, shown on screen when the customer pays by QR. */
  banglaQrImageUrl: string | null;
}

/** What comes back after a sale (server pos-sales.service.ts toReceipt). */
export interface PosReceipt {
  id: string;
  publicCode: string | null;
  invoiceNumber: number;
  createdAt: string;
  registerName: string | null;
  cashierName: string | null;
  customerName: string;
  customerPhone: string | null;
  lines: Array<{ name: string; options: string; quantity: number; unitPrice: number; listPrice: number; lineTotal: number }>;
  subtotal: number;
  /** The cart discount and coupon together (line discounts are inside each line's price). */
  discountAmount: number;
  discountLabel: string | null;
  vatAmount: number;
  vatIncluded: boolean;
  total: number;
  payments: Array<{ method: string; amount: number; reference: string | null; tendered: number | null; change: number | null }>;
  trackingToken: string | null;
  /** The private order page, for the receipt's QR code and the SMS receipt. */
  receiptUrl: string | null;
  /** Returns and voids against this sale (Step 8), oldest first. */
  returns?: Array<{ kind: 'RETURN' | 'VOID'; amount: number; reason: string | null; cashierName: string; createdAt: string }>;
  /** true when this was a retry of a sale that had already gone through. */
  replayed: boolean;
  /** Items sold past their stock count (stock was set to 0): worth a stock check. */
  stockWarnings: Array<{ productName: string; wanted: number; had: number }>;
}

/** POS > Settings (server/src/pos/pos-settings.service.ts ResolvedPosSettings). */
export interface PosSettings {
  enabled: boolean;
  receiptHeader: string | null;
  receiptFooter: string | null;
  receiptPhone: string | null;
  showLogo: boolean;
  binNumber: string | null;
  receiptWidthMm: 80 | 58;
  receiptLanguage: 'en' | 'bn';
  vatPercent: number;
  pricesIncludeVat: boolean;
  useFlashSalePrices: boolean;
  blockOutOfStock: boolean;
  smsReceipt: boolean;
  paymentMethods: PosTender[];
  banglaQrImageUrl: string | null;
  /** Days a sale's items can be returned; null = any time. */
  returnDays: number | null;
}

/** Only what's sent changes; an empty string clears a text field. */
export type UpdatePosSettings = Partial<{
  [K in keyof PosSettings]: PosSettings[K] extends string | null ? string : PosSettings[K];
}>;

/** One sellable product for the sell screen (server pos-catalog.service.ts): prices already worked out, no cost. */
export interface PosCatalogProduct {
  id: string;
  name: string;
  photo: string | null;
  sku: string;
  barcode: string | null;
  category: string | null;
  visibility: 'PUBLIC' | 'DRAFT';
  isPreOrder: boolean;
  price: number;
  listPrice: number;
  /** null = unlimited (or per variant when it has variants). */
  stock: number | null;
  variants: Array<{
    id: string;
    sku: string;
    barcode: string | null;
    optionValues: Record<string, string>;
    price: number;
    listPrice: number;
    stock: number;
  }>;
  updatedAt: string;
}

export interface PosCatalog {
  /** Send back as `updatedSince` to get only what changed. */
  serverTime: string;
  full: boolean;
  products: PosCatalogProduct[];
}

export const posApi = {
  me: () => api.get<PosMe>('/v1/pos/me').then((r) => r.data),
  catalog: (updatedSince?: string) =>
    api.get<PosCatalog>('/v1/pos/catalog', { params: updatedSince ? { updatedSince } : {} }).then((r) => r.data),
  /** A scan or a typed SKU; 404 when nothing matches. */
  lookup: (code: string) =>
    api.get<{ product: PosCatalogProduct; variantId: string | null }>('/v1/pos/lookup', { params: { code } }).then((r) => r.data),
  getSettings: () => api.get<PosSettings>('/v1/pos/settings').then((r) => r.data),
  updateSettings: (dto: UpdatePosSettings) => api.put<PosSettings>('/v1/pos/settings', dto).then((r) => r.data),

  // POS > Staff (managers).
  staff: () => api.get<PosStaffList>('/v1/pos/staff').then((r) => r.data),
  addStaff: (dto: PosStaffFields & { userId: string }) => api.post<PosStaffMember>('/v1/pos/staff', dto).then((r) => r.data),
  updateStaff: (id: string, dto: PosStaffFields) => api.patch<PosStaffMember>(`/v1/pos/staff/${id}`, dto).then((r) => r.data),
  removeStaff: (id: string) => api.delete(`/v1/pos/staff/${id}`).then((r) => r.data),
  setPin: (id: string, pin: string) => api.put<PosStaffMember>(`/v1/pos/staff/${id}/pin`, { pin }).then((r) => r.data),

  // The counter: who can unlock it, and the unlock itself.
  cashiers: () =>
    api.get<{ cashiers: Array<{ id: string; displayName: string; role: PosStaffRole }> }>('/v1/pos/cashiers').then((r) => r.data.cashiers),
  pinCheck: (staffId: string, pin: string) => api.post<PosUnlock>('/v1/pos/pin-check', { staffId, pin }).then((r) => r.data),

  // POS > Registers and their shifts. Opening and closing need the unlock token.
  registers: () => api.get<{ registers: PosRegister[] }>('/v1/pos/registers').then((r) => r.data.registers),
  addRegister: (name: string) => api.post('/v1/pos/registers', { name }).then((r) => r.data),
  updateRegister: (id: string, dto: { name?: string; active?: boolean }) => api.patch(`/v1/pos/registers/${id}`, dto).then((r) => r.data),
  openSession: (registerId: string, openingFloat: number, token: string) =>
    api.post('/v1/pos/sessions/open', { registerId, openingFloat }, cashier(token)).then((r) => r.data),
  closeSession: (id: string, countedCash: number, note: string, token: string) =>
    api.post<PosClosedSession>(`/v1/pos/sessions/${id}/close`, { countedCash, note: note || undefined }, cashier(token)).then((r) => r.data),
  // A sale at the counter, and one sale's receipt.
  createSale: (dto: CreatePosSale, token: string) => api.post<PosReceipt>('/v1/pos/sales', dto, cashier(token)).then((r) => r.data),
  sale: (id: string) => api.get<PosReceipt>(`/v1/pos/sales/${id}`).then((r) => r.data),
  quote: (dto: Pick<CreatePosSale, 'lines' | 'customer' | 'cartDiscount' | 'couponCode'>, token: string) =>
    api.post<PosQuote>('/v1/pos/sales/quote', dto, cashier(token)).then((r) => r.data),
  /** A manager's PIN for a discount over the cashier's limit or a changed price. */
  approve: (dto: { managerId: string; pin: string; discountPercent: number; priceOverride: boolean; refund?: boolean; voidSale?: boolean }, token: string) =>
    api.post<{ approvalId: string; managerName: string }>('/v1/pos/approvals', dto, cashier(token)).then((r) => r.data),
  // Returns, exchanges and voids (Step 8).
  findSales: (q: string, token: string) =>
    api
      .get<{ sales: Array<{ id: string; publicCode: string | null; invoiceNumber: number; createdAt: string; total: number; customerName: string; status: string }> }>(
        '/v1/pos/returns/find',
        { params: { q }, ...cashier(token) },
      )
      .then((r) => r.data.sales),
  returnableSale: (orderId: string, token: string) => api.get<PosReturnableSale>(`/v1/pos/returns/sale/${orderId}`, cashier(token)).then((r) => r.data),
  createReturn: (dto: CreatePosReturn, token: string) =>
    api
      .post<{ returnId: string; amount: number; status: string; storeCredit: Array<{ code: string; amount: number }> }>('/v1/pos/returns', dto, cashier(token))
      .then((r) => r.data),
  heldCarts: (token: string) => api.get<{ carts: PosHeldCart[] }>('/v1/pos/held', cashier(token)).then((r) => r.data.carts),
  holdCart: (dto: { name: string; payload: Record<string, unknown>; itemCount: number }, token: string) =>
    api.post<PosHeldCart>('/v1/pos/held', dto, cashier(token)).then((r) => r.data),
  resumeCart: (id: string, token: string) =>
    api.post<{ name: string; payload: Record<string, unknown> }>(`/v1/pos/held/${id}/resume`, {}, cashier(token)).then((r) => r.data),
  discardCart: (id: string, token: string) => api.delete(`/v1/pos/held/${id}`, cashier(token)).then((r) => r.data),
  /** Text the receipt link to the customer; `phone` when the sale has none or it's another number. */
  smsReceipt: (id: string, phone: string | undefined, token: string) =>
    api.post<{ sent: true; phone: string }>(`/v1/pos/sales/${id}/sms-receipt`, { phone: phone || undefined }, cashier(token)).then((r) => r.data),
  receiptProfile: () => api.get<PosReceiptProfile>('/v1/pos/receipt-profile').then((r) => r.data),

  sessions: (params: { registerId?: string; page?: number; perPage?: number } = {}) =>
    api
      .get<{ sessions: PosSessionRow[]; total: number; page: number; perPage: number }>('/v1/pos/sessions', { params })
      .then((r) => r.data),
};
