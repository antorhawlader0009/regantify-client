import { api } from './api';

/** Reward points (server RewardsService): the store's rules plus how many points it has handed out and taken. */
export interface RewardSettings {
  enabled: boolean;
  earnPerBdt: number;
  maxRedeemPercent: number;
  totalEarned: number;
  totalSpent: number;
}

export interface RewardEntry {
  id: string;
  type: 'EARN' | 'SPEND' | 'REFUND_SPEND' | 'REVERSE_EARN';
  points: number;
  note: string | null;
  createdAt: string;
}

export const rewardsApi = {
  getSettings: () => api.get<RewardSettings>('/v1/rewards/settings').then((r) => r.data),
  updateSettings: (payload: Partial<Pick<RewardSettings, 'enabled' | 'earnPerBdt' | 'maxRedeemPercent'>>) =>
    api.put<RewardSettings>('/v1/rewards/settings', payload).then((r) => r.data),
  customerLedger: (phone: string) =>
    api.get<{ balance: number; entries: RewardEntry[] }>(`/v1/rewards/customers/${encodeURIComponent(phone)}`).then((r) => r.data),
};
