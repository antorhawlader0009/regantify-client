import { api } from './api';
import type { AiCreditSummary } from './aiChatBotApi';
import type { DailyCaps } from './dailyLimits';

export type PlanCode = 'FREE' | 'BASIC' | 'STARTER' | 'ADVANCE';

// "Fee From" — who pays this fee. CUSTOMER (default): added to the
// order total, the shopper pays it (shown/folded per codFeeHidden etc).
// VENDOR: never added to the order total or shown to the shopper
// anywhere — comes out of the vendor's own payout at completion instead,
// shown only on the vendor's own invoice. Mirrors server's
// PaymentFeePayer enum.
export type PaymentFeePayer = 'CUSTOMER' | 'VENDOR';

// "৳10 + 2%", "৳10", "2%" — a fee's flat and percentage parts as one
// label, dropping whichever part is 0 (a fully-zero fee shows "৳0").
export function formatFeeParts(flat: string, percent: string): string {
  const flatValue = Number(flat);
  const percentValue = Number(percent);
  const flatText = `৳${flatValue.toLocaleString('en-US')}`;
  if (percentValue === 0) return flatText;
  if (flatValue === 0) return `${percentValue}%`;
  return `${flatText} + ${percentValue}%`;
}

export interface Plan {
  id: string;
  code: PlanCode;
  name: string;
  priceMonthly: string;
  /** Daily caps (products, orders and image uploads are unlimited in total). Only Super Admin's plan list has them; the vendor
   *  answers leave them out, because the number is never shown to a store (lib/dailyLimits.ts). null = no daily cap. */
  productLimitPerDay?: number | null;
  orderLimitPerDay?: number | null;
  imageUploadLimitPerDay?: number | null;
  monthlyVisitLimit: number | null;
  themeAllowance: number | null;
  /** AI Credits the plan gives once, when it's bought. Free: once at sign-up. */
  aiCreditGrant: number | null;
  staffLimit: number | null;
  /** Which staff roles the plan may assign: 0 Admin only … 3 + Custom roles (rule-plan.md 5.5). */
  staffRoleTier: number;
  customDomainAllowed: boolean;
  customPaymentGatewayAllowed: boolean;
  lmsEnabled: boolean;
  posEnabled: boolean;
  // Each fee = flat BDT part + percent (0-100) of the order total
  // (incl. delivery, VAT and the flat part), both applied together — see server's Plan.codGatewayFeeBdt comment.
  codGatewayFeeBdt: string;
  codGatewayFeePercent: string;
  codGatewayFeePayer: PaymentFeePayer;
  // The online* fee fields below only come from /v1/admin/plans (Super
  // Admin). The vendor's /v1/plans and /v1/plans/usage leave them out: the
  // Online Payment fee is hidden from vendors (server's orders/hidden-fee.ts).
  onlinePaymentGatewayFeeBdt: string;
  onlinePaymentGatewayFeePercent: string;
  onlinePaymentGatewayFeePayer: PaymentFeePayer;
  // Fee on a COD order's delivery-charge advance (flat ৳ + %): added on top of what the shopper pays on the
  // payment page, never shown at checkout. Admin-only like the online fee above.
  codAdvanceFeeBdt?: string;
  codAdvanceFeePercent?: string;
  /** Display-only — hides that fee from checkout's line items/total. The fee itself is still charged server-side regardless. */
  codFeeHidden: boolean;
  onlinePaymentFeeHidden: boolean;
  /** Billing marks this plan "Most popular" (Super Admin > Plans). */
  mostPopular?: boolean;
  /** Not offered to stores that are not on it already. */
  hiddenFromSignup?: boolean;
}

interface UsageStat {
  used: number;
  limit: number | null;
}

export interface VendorPlanUsage {
  plan: Plan;
  /** ISO date the paid plan ends and the store goes back to Free; null on Free. */
  planExpiresAt: string | null;
  /** After the end date a paid plan keeps working until graceEndsAt; the "renew now" bar shows meanwhile (Step 9). */
  planGrace?: { inGrace: boolean; graceEndsAt: string | null };
  usage: {
    /** Products in the store (limit always null: unlimited). */
    products: UsageStat;
    staff: UsageStat;
    /** Orders today (limit always null: unlimited; the daily cap is in `daily`). */
    ordersToday: UsageStat;
    monthlyVisits: UsageStat;
  };
  /** The daily caps, without their numbers: how many are left once 5 or fewer remain, and whether today's is used up. */
  daily: DailyCaps;
  /** The store's AI Credit wallet. */
  aiCredits: AiCreditSummary;
}

export type PlanUpgradeRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PlanUpgradeRequest {
  id: string;
  vendorId: string;
  requestedPlanId: string;
  requestedPlan: Plan;
  status: PlanUpgradeRequestStatus;
  note: string | null;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** All 4 tiers, public — see PlansController.findAll. */
export async function getPlans(): Promise<Plan[]> {
  const { data } = await api.get<Plan[]>('/v1/plans');
  return data;
}

/** The current vendor's plan + usage against every count-style limit — see PlansController.getUsage (PLAN.md Step 5). */
export async function getVendorPlanUsage(): Promise<VendorPlanUsage> {
  const { data } = await api.get<VendorPlanUsage>('/v1/plans/usage');
  return data;
}

// -- Billing page's "Request Upgrade" flow (PLAN.md Step 14) --

/** Creates a new pending upgrade request — see PlansController.createRequest. Throws (400) if a request is already pending, or the requested plan is the vendor's current one. */
export async function requestPlanUpgrade(requestedPlanCode: PlanCode, note?: string): Promise<PlanUpgradeRequest> {
  const { data } = await api.post<PlanUpgradeRequest>('/v1/plans/requests', { requestedPlanCode, note });
  return data;
}

/** The vendor's own request history, most recent first. */
export async function getOwnPlanRequests(): Promise<PlanUpgradeRequest[]> {
  const { data } = await api.get<PlanUpgradeRequest[]>('/v1/plans/requests');
  return data;
}
