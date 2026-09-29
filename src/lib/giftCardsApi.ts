import { api } from './api';

export interface GiftCardUsage {
  id: string;
  giftCardId: string;
  amount: string;
  note: string | null;
  createdAt: string;
}

export interface GiftCard {
  id: string;
  vendorId: string;
  code: string;
  initialAmount: string;
  balance: string;
  expiresAt: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  note: string | null;
  active: boolean;
  /** Only on the single-card endpoints, newest first. */
  usages?: GiftCardUsage[];
  createdAt: string;
  updatedAt: string;
}

export interface ListGiftCardsParams {
  search?: string;
  page?: number;
  perPage?: number;
}

export interface GiftCardListResponse {
  giftCards: GiftCard[];
  total: number;
  page: number;
  perPage: number;
}

/** New Gift Card form payload — blank optional fields are left out. */
export interface CreateGiftCardPayload {
  amount: number;
  code?: string;
  expiresAt?: string;
  recipientName?: string;
  recipientPhone?: string;
  note?: string;
}

/** Edit payload — null clears an optional field. */
export interface UpdateGiftCardPayload {
  expiresAt?: string | null;
  recipientName?: string | null;
  recipientPhone?: string | null;
  note?: string | null;
  active?: boolean;
}

export const giftCardsApi = {
  list: (params: ListGiftCardsParams = {}) =>
    api.get<GiftCardListResponse>('/v1/gift-cards', { params }).then((r) => r.data),

  findOne: (id: string) => api.get<GiftCard>(`/v1/gift-cards/${id}`).then((r) => r.data),

  create: (payload: CreateGiftCardPayload) => api.post<GiftCard>('/v1/gift-cards', payload).then((r) => r.data),

  update: (id: string, payload: UpdateGiftCardPayload) =>
    api.patch<GiftCard>(`/v1/gift-cards/${id}`, payload).then((r) => r.data),

  redeem: (id: string, payload: { amount: number; note?: string }) =>
    api.post<GiftCard>(`/v1/gift-cards/${id}/redeem`, payload).then((r) => r.data),

  remove: (id: string) => api.delete<{ success: boolean }>(`/v1/gift-cards/${id}`).then((r) => r.data),
};

/** Same derived status the server documents on the GiftCard model. */
export function giftCardStatus(card: GiftCard): { label: string; className: string } {
  if (!card.active) return { label: 'Disabled', className: 'bg-black/5 text-regantify-text-muted' };
  if (card.expiresAt && new Date(card.expiresAt).getTime() <= Date.now())
    return { label: 'Expired', className: 'bg-red-50 text-red-600' };
  if (Number(card.balance) <= 0) return { label: 'Used up', className: 'bg-amber-50 text-amber-700' };
  return { label: 'Active', className: 'bg-green-50 text-green-700' };
}
