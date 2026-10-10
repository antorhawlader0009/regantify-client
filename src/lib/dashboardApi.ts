import { api } from './api';
import type { OrderStatus } from './ordersApi';
import type { Compared, TopProduct } from './analyticsApi';
import type { PlanCode } from './plansApi';

// Vendor dashboard home — mirrors server/src/dashboard/dashboard.service.ts (dashboard-plan.md Step 1).

export interface DashboardTodo {
  pendingOrders: number;
  /** COD Guard: ON_HOLD orders waiting for the shopper's SMS code. */
  codVerification: number;
  /** Processing orders not booked with a courier. */
  notBooked: number;
  bookingFailed: number;
  incompletePayment: number;
  /** Parcels that turned RETURN in the last `recentDays`. */
  returnedRecently: number;
  /** Returned parcels not counted in at the shop yet (Orders > Return check-in). */
  returnsToCheck: number;
  abandonedCarts: number;
  lowStock: number;
  /** Products running out within 14 days at the last 30 days' pace. */
  sellingOutSoon: number;
  /** The product running out first (for the daily brief). */
  sellingOutFirst: { name: string; daysLeft: number } | null;
  /** 1-2★ reviews in the last `recentDays`. */
  badReviews: number;
  supportUnread: number;
  /** Set only when credits are under the threshold. */
  smsLow: { credits: number; threshold: number } | null;
  /** Null when the store doesn't use the LMS; staff get only their own. */
  lmsTasks: { overdue: number; today: number } | null;
  /** Set only when a paid plan ends within 7 days. */
  planExpiresAt: string | null;
  recentDays: number;
}

export interface DashboardRecentOrder {
  id: string;
  invoiceNumber: number;
  publicCode?: string | null;
  customerName: string;
  customerPhone: string;
  status: OrderStatus;
  paymentMethod: string;
  /** The vendor's total (a customer-paid online gateway fee left out). */
  total: number;
  createdAt: string;
  itemCount: number;
  firstItem: { name: string; image: string | null } | null;
}

export interface DashboardSummary {
  generatedAt: string;
  today: {
    /** Dhaka day "YYYY-MM-DD". */
    day: string;
    /** Today so far vs yesterday up to the same time. */
    sales: Compared;
    orders: Compared;
    aov: Compared;
    /** Today so far; stored per day, so no same-hour comparison. */
    visitors: number;
  } | null; // null for a staff role without dashboard.view (trend and topProducts come empty, pos null; rule-plan.md Step 7)
  /** Last 30 Dhaka days, oldest first. */
  trend: { bucket: string; sales: number; orders: number }[];
  /** Orders per status, placed in the last 7 / 30 days (all statuses, biggest first). */
  statuses: { last7: { status: OrderStatus; count: number }[]; last30: { status: OrderStatus; count: number }[] };
  todo: DashboardTodo;
  /** Owner only; null for staff. */
  money: {
    balance: number;
    codWithCouriers: { amount: number; count: number };
    withdrawInProgress: { amount: number; count: number };
  } | null;
  delivery: { courierConnected: boolean; days: number; successRate: number | null; returnRate: number | null };
  /** Last 7 days. */
  topProducts: TopProduct[];
  recentOrders: DashboardRecentOrder[];
  plan: { code: PlanCode; name: string; expiresAt: string | null };
  setup: {
    hasProduct: boolean;
    hasLogo: boolean;
    deliveryChargeSet: boolean;
    courierConnected: boolean;
    storeVisited: boolean;
    hasOrder: boolean;
  };
  /** "Today in store" (POS); null without the POS (plan or turned off). */
  pos: {
    sales: number;
    orders: number;
    cashInDrawer: number;
    openRegisters: Array<{ name: string; openedByName: string; cashInDrawer: number }>;
  } | null;
}

export const dashboardApi = {
  summary: () => api.get<DashboardSummary>('/v1/dashboard').then((r) => r.data),
};
