import { api } from './api';

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
  productLimit: number | null;
  orderLimitPerDay: number | null;
  monthlyVisitLimit: number | null;
  themeAllowance: number | null;
  imageUploadLimit: number | null;
  aiChatMessageLimitPerDay: number | null;
  staffLimit: number | null;
  customDomainAllowed: boolean;
  customPaymentGatewayAllowed: boolean;
  lmsEnabled: boolean;
  posEnabled: boolean;
  // Each fee = flat BDT part + percent (0-100) of the order total
  // (incl. delivery, VAT and the flat part), both applied together — see server's Plan.codGatewayFeeBdt comment.
  codGatewayFeeBdt: string;
  codGatewayFeePercent: string;
  codGatewayFeePayer: PaymentFeePayer;
  onlinePaymentGatewayFeeBdt: string;
  onlinePaymentGatewayFeePercent: string;
  onlinePaymentGatewayFeePayer: PaymentFeePayer;
  /** Display-only — hides that fee from checkout's line items/total. The fee itself is still charged server-side regardless. */
  codFeeHidden: boolean;
  onlinePaymentFeeHidden: boolean;
}

interface UsageStat {
  used: number;
  limit: number | null;
}

export interface VendorPlanUsage {
  plan: Plan;
  usage: {
    products: UsageStat;
    staff: UsageStat;
    ordersToday: UsageStat;
    monthlyVisits: UsageStat;
    aiChatMessagesToday: UsageStat;
  };
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
