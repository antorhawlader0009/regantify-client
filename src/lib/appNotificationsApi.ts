import { api } from './api';

// Mirrors server/src/app-campaigns: Marketing > App notifications (STORE-APP-plan.md Step 7).

export const APP_AUDIENCE_OPTIONS = [
  { value: 'FOLLOWERS', label: 'Followers of my shop', hint: 'Shoppers who turned on this shop\'s offers in the app.' },
  { value: 'ALL', label: 'Everyone who ordered', hint: 'Every customer with an order.' },
  { value: 'RECENT', label: 'Ordered recently', hint: 'Customers who ordered in the last N days.' },
  { value: 'INACTIVE', label: 'Haven\'t ordered for a while', hint: 'Bought before, but not in the last N days.' },
  { value: 'TAG', label: 'Customers with a tag', hint: 'A tag you added in Customers.' },
  { value: 'VIP', label: 'VIP customers', hint: 'The automatic VIP group.' },
  { value: 'RETURNING', label: 'Returning customers', hint: 'The automatic returning group.' },
  { value: 'CART', label: 'Left items in the cart', hint: 'Started a checkout in the last 7 days and did not order.' },
] as const;

export type AppAudience = (typeof APP_AUDIENCE_OPTIONS)[number]['value'];
export type AppCampaignStatus = 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

export interface AppCampaign {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  link: string | null;
  audience: AppAudience;
  days: number | null;
  tag: string | null;
  sendAt: string;
  status: AppCampaignStatus;
  /** Shoppers with the app in the audience; progress is `processed` of this. */
  recipients: number | null;
  processed: number;
  /** Phones the notification was handed to (one shopper can have several). */
  devicesQueued: number;
  /** People in the audience who did not get it: no app, or they muted the shop. */
  noApp: number;
  error: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface AppCampaignList {
  campaigns: AppCampaign[];
  /** The most a store may send on one day. */
  perDay: number;
  leftToday: number;
  /** False until the platform has push set up. */
  pushOn: boolean;
}

export interface AppCampaignInput {
  audience: AppAudience;
  days?: number;
  tag?: string;
  title: string;
  body: string;
  imageUrl?: string;
  /** A page of the shop as a path, "/p/blue-shirt"; empty opens the shop's home page. */
  linkPath?: string;
  /** ISO time; absent = send now. */
  sendAt?: string;
}

export const appNotificationsApi = {
  list: () => api.get<AppCampaignList>('/v1/app-notifications').then((r) => r.data),
  preview: (body: { audience: AppAudience; days?: number; tag?: string }) =>
    api.post<{ audience: number; withApp: number }>('/v1/app-notifications/preview', body).then((r) => r.data),
  create: (body: AppCampaignInput) => api.post<AppCampaign>('/v1/app-notifications', body).then((r) => r.data),
  cancel: (id: string) => api.post<{ cancelled: true }>(`/v1/app-notifications/${id}/cancel`).then((r) => r.data),
  hasApp: (phone: string) => api.get<{ hasApp: boolean }>('/v1/app-notifications/has-app', { params: { phone } }).then((r) => r.data.hasApp),
  sendOne: (body: { phone: string; message: string; orderId?: string }) =>
    api.post<{ sent: number }>('/v1/app-notifications/send-one', body).then((r) => r.data),
};
