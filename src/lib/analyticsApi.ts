import { api } from './api';
import type { OrderStatus } from './ordersApi';

// Vendor dashboard > Analytics — mirrors server/src/analytics/analytics.service.ts.

/** A picked date range: Dhaka days "YYYY-MM-DD", both ends included. */
export interface DateRange {
  from: string;
  to: string;
}

/** The dates a report covers and the equally long range it's compared with. */
export interface AnalyticsPeriodInfo {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
}
export type AnalyticsTab = 'overview' | 'sales' | 'orders' | 'products' | 'customers' | 'marketing';
/** Trend granularity: "YYYY-MM-DD" buckets up to 90 days, "YYYY-MM" for 12 months. */
export type AnalyticsBucket = 'day' | 'month';

/** A number for the chosen period and the equally long period right before it. */
export interface Compared {
  current: number;
  previous: number;
}

/** Like Compared, for a rate that has no value when there's nothing to divide (e.g. no finished parcels). */
export interface NullableCompared {
  current: number | null;
  previous: number | null;
}

export interface TopProduct {
  productId: string | null;
  name: string;
  image: string | null;
  units: number;
  revenue: number;
  orders: number;
}

export interface SplitRow {
  key: string;
  orders: number;
  sales: number;
}

export interface OverviewAnalytics {
  period: AnalyticsPeriodInfo;
  bucket: AnalyticsBucket;
  kpis: Record<'sales' | 'orders' | 'aov', Compared> & Record<'conversionRate' | 'deliverySuccessRate', NullableCompared>;
  trend: { bucket: string; sales: number; orders: number }[];
  topProducts: TopProduct[];
  statuses: { status: OrderStatus; count: number }[];
  /** STOREFRONT / MANUAL / POS; adds up to kpis.sales (POS-system-plan.md Step 11). */
  channels: SplitRow[];
}

export interface SalesAnalytics {
  /** STOREFRONT / MANUAL / POS; adds up to kpis.sales. */
  channels: SplitRow[];
  period: AnalyticsPeriodInfo;
  bucket: AnalyticsBucket;
  kpis: Record<'sales' | 'netSales' | 'profit', Compared> & { margin: NullableCompared };
  /** Where net sales go in the period (analytics-plan.md Step 2). */
  breakdown: {
    netSales: number;
    productCost: number;
    courierFees: number;
    platformCharges: number;
    vat: number;
    /** Courier fees paid on parcels that came back. */
    returnLoss: number;
    profit: number;
    /** % of item sales whose product cost is known; below 100 the profit is too high. */
    costCoverage: number;
    /** Finance > Expenses recorded for the same days (ads, rent...). */
    expenses: number;
    profitAfterExpenses: number;
  };
  trend: { bucket: string; sales: number; profit: number }[];
  /** Best sellers with gross profit (sales − product cost); cost/profit null when a cost is missing. */
  products: { productId: string | null; name: string; image: string | null; units: number; sales: number; cost: number | null; profit: number | null; margin: number | null }[];
  /** Products sold in the period with no cost set. */
  missingCost: { productId: string; name: string }[];
  byPaymentMethod: SplitRow[];
}

export interface OrdersAnalytics {
  period: AnalyticsPeriodInfo;
  bucket: AnalyticsBucket;
  kpis: Record<'orders' | 'abandonedCheckouts', Compared> & Record<'cancelRate' | 'returnRate' | 'abandonRate', NullableCompared>;
  trend: { bucket: string; orders: number }[];
  statuses: { status: OrderStatus; count: number }[];
  byHour: { hour: number; orders: number }[];
}

export type DeliveryCourier = 'PATHAO' | 'STEADFAST' | 'REDX';

/** Delivered / returned courier parcels for one key (an area, COD vs prepaid). */
export interface DeliveryOutcome {
  key: string;
  delivered: number;
  returned: number;
  successRate: number | null;
}

/** Orders & Delivery tab's delivery half — mirrors server/src/analytics/delivery-analytics.service.ts. */
export interface DeliveryAnalytics {
  period: AnalyticsPeriodInfo;
  kpis: {
    /** Delivered out of delivered + returned; null when no parcel finished. */
    successRate: NullableCompared;
    returned: Compared;
    avgDaysToDeliver: number | null;
    /** Right now, not the period: delivered parcels whose COD the couriers haven't paid out. */
    codWithCouriers: { amount: number; count: number };
  };
  total: { booked: number; delivered: number; returned: number; inProgress: number; deliveryFees: number };
  codPaid: { amount: number; count: number };
  couriers: {
    courier: DeliveryCourier;
    booked: number;
    delivered: number;
    returned: number;
    inProgress: number;
    successRate: number | null;
    avgDaysToDeliver: number | null;
    deliveryFees: number;
  }[];
  byArea: DeliveryOutcome[];
  /** key: 'COD' | 'PREPAID'. */
  byPayment: DeliveryOutcome[];
}

export interface ProductsAnalytics {
  period: AnalyticsPeriodInfo;
  kpis: Record<'unitsSold' | 'productsSold', Compared>;
  notSellingCount: number;
  /** Best sellers, with product page views (shopper sessions) in the period. */
  topProducts: (TopProduct & { views: number })[];
  /** When product views started being recorded (analytics-plan.md Step 4); null until the first one. */
  viewsTrackedSince: string | null;
  /** Most viewed products in the period, with add-to-carts and units sold. */
  mostViewed: { productId: string; name: string; image: string | null; views: number; carts: number; units: number }[];
  /** Products that run out within 14 days at the last 30 days' pace (independent of the period). */
  sellingOutSoon: { productId: string; name: string; image: string | null; stock: number; perDay: number; daysLeft: number }[];
  notSelling: { id: string; name: string; image: string | null; stock: number | null; createdAt: string }[];
}

export interface CustomersAnalytics {
  period: AnalyticsPeriodInfo;
  bucket: AnalyticsBucket;
  kpis: Record<'customers' | 'newCustomers' | 'returningCustomers', Compared>;
  /** All-time, not the chosen period. */
  repeatRate: { customers: number; repeatCustomers: number };
  trend: { bucket: string; newCustomers: number; returningCustomers: number }[];
  topCustomers: { phone: string; name: string; district: string | null; orders: number; spent: number; lastOrderAt: string }[];
}

/** 'untracked' = visits/orders recorded before attribution existed. */
export type TrafficChannel = 'facebook' | 'instagram' | 'google' | 'tiktok' | 'youtube' | 'whatsapp' | 'direct' | 'other' | 'untracked';

/** Visits, online-store orders and sales for one channel or campaign in the period. */
export interface MarketingRow {
  key: string;
  /** Campaign rows only: the utm_source it ran on. */
  source?: string | null;
  visits: number;
  orders: number;
  sales: number;
  /** Orders out of visits; null with no visits. */
  conversionRate: number | null;
}

/** Marketing tab (analytics-plan.md Step 3) — mirrors AnalyticsService.marketing. */
export interface MarketingAnalytics {
  period: AnalyticsPeriodInfo;
  bucket: AnalyticsBucket;
  kpis: Record<'visits' | 'storefrontOrders', Compared> & { conversionRate: NullableCompared };
  trend: { bucket: string; visits: number; orders: number }[];
  channels: MarketingRow[];
  campaigns: MarketingRow[];
  coupons: { code: string; orders: number; discount: number; sales: number }[];
  /**
   * Shopper sessions at each shopping step (analytics-plan.md Step 4), then
   * online orders. `since` is set when recording started inside the period.
   * Null until the store has any step recorded.
   */
  funnel: { since: string | null; visitors: number; productViews: number; addToCart: number; checkout: number; orders: number } | null;
  landingPages: { id: string; title: string; slug: string; visitors: number; checkouts: number }[];
}

const get = <T,>(report: AnalyticsTab | 'delivery' | 'searches') => async (range: DateRange) =>
  (await api.get<T>(`/v1/analytics/${report}`, { params: { from: range.from, to: range.to } })).data;

/** One reason an order ended without a sale (server/src/analytics/failed-orders-analytics.service.ts). */
export interface FailedReasonRow {
  /** Null = "No reason recorded". */
  code: string | null;
  label: string;
  orders: number;
  value: number;
  previousOrders: number;
  cancelled: number;
  returned: number;
  paymentFailed: number;
}

export interface FailedOrdersAnalytics {
  period: AnalyticsPeriodInfo;
  total: { current: { orders: number; value: number }; previous: { orders: number; value: number } };
  cancelled: number;
  returned: number;
  paymentFailed: number;
  /** Orders in the period that still have no reason: the share the owner can fix by adding one on the order. */
  noReason: number;
  reasons: FailedReasonRow[];
  /** Customers with two or more cancelled or returned orders in the period. */
  repeaters: { phone: string; name: string; orders: number; value: number; reasons: { code: string; label: string }[]; blacklisted: boolean }[];
}

/** Analytics > Products > "What shoppers search for" (server/src/analytics/searches-analytics.service.ts). */
export interface SearchedWord {
  term: string;
  searches: number;
  /** How many of those searches found no product. */
  noResults: number;
}

export interface SearchesAnalytics {
  totals: { searches: number; previousSearches: number; noResults: number; previousNoResults: number; words: number };
  top: SearchedWord[];
  notFound: SearchedWord[];
  /** The words are removed after this many days. */
  keptDays: number;
  /** First day a search was recorded, null when none yet. */
  trackedSince: string | null;
}

export const analyticsApi = {
  searches: get<SearchesAnalytics>('searches'),
  failedOrders: async (range: DateRange) =>
    (await api.get<FailedOrdersAnalytics>('/v1/analytics/failed-orders', { params: { from: range.from, to: range.to } })).data,
  overview: get<OverviewAnalytics>('overview'),
  sales: get<SalesAnalytics>('sales'),
  orders: get<OrdersAnalytics>('orders'),
  delivery: get<DeliveryAnalytics>('delivery'),
  products: get<ProductsAnalytics>('products'),
  customers: get<CustomersAnalytics>('customers'),
  marketing: get<MarketingAnalytics>('marketing'),
};
