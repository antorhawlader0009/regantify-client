import { api } from './api';
import type { Plan, PlanUpgradeRequest, PlanUpgradeRequestStatus, PaymentFeePayer } from './plansApi';

// Mirrors server/src/admin/{admin-plans,admin-plan-requests}.controller.ts
// — Super Admin > Plans + Plan Requests (PLAN.md Step 15).

/**
 * Every field optional — a PATCH only sends what the admin actually
 * changed. An explicit `null` on a "*Limit"/"*Allowance" field means
 * "set to unlimited" (see server's UpdatePlanDto for the full
 * omitted-vs-null convention); `undefined`/omitted means "leave this
 * field alone".
 */
export interface UpdatePlanPayload {
  name?: string;
  priceMonthly?: number;
  productLimit?: number | null;
  orderLimitPerDay?: number | null;
  monthlyVisitLimit?: number | null;
  themeAllowance?: number | null;
  imageUploadLimit?: number | null;
  aiChatMessageLimitPerDay?: number | null;
  staffLimit?: number | null;
  customDomainAllowed?: boolean;
  customPaymentGatewayAllowed?: boolean;
  lmsEnabled?: boolean;
  posEnabled?: boolean;
  // Flat BDT part + percent (0-100) of the order total — see Plan in plansApi.ts.
  codGatewayFeeBdt?: number;
  codGatewayFeePercent?: number;
  codGatewayFeePayer?: PaymentFeePayer;
  onlinePaymentGatewayFeeBdt?: number;
  onlinePaymentGatewayFeePercent?: number;
  onlinePaymentGatewayFeePayer?: PaymentFeePayer;
  codFeeHidden?: boolean;
  onlinePaymentFeeHidden?: boolean;
}

export const adminPlansApi = {
  listPlans: () => api.get<Plan[]>('/v1/admin/plans').then((r) => r.data),

  updatePlan: (planId: string, payload: UpdatePlanPayload) =>
    api.patch<Plan>(`/v1/admin/plans/${planId}`, payload).then((r) => r.data),
};

export interface AdminPlanRequest extends PlanUpgradeRequest {
  vendor: { id: string; storeName: string; subdomain: string };
}

export const adminPlanRequestsApi = {
  // Defaults to nothing (all statuses) — the page itself defaults its
  // own filter to PENDING, same "server stays flexible, client picks a
  // sane default" split used elsewhere (e.g. Orders' status tabs).
  list: (status?: PlanUpgradeRequestStatus) =>
    api.get<AdminPlanRequest[]>('/v1/admin/plan-requests', { params: { status } }).then((r) => r.data),

  resolve: (id: string, decision: 'APPROVED' | 'REJECTED') =>
    api.patch<AdminPlanRequest>(`/v1/admin/plan-requests/${id}`, { decision }).then((r) => r.data),
};
