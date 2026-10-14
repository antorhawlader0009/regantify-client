import { api } from './api';

export type SmsGatewayProvider = 'ISMSPLUS' | 'MIM_SMS';

export interface OwnSmsGatewayInfo {
  provider: SmsGatewayProvider;
  senderId: string;
  userName: string | null;
  /** False while Regantify has the add-on turned off (texts then use credits). */
  active: boolean;
  lastError: string | null;
  lastErrorAt: string | null;
  connectedAt: string;
}

export interface SmsLog {
  id: string;
  vendorId: string;
  phone: string;
  message: string;
  smsCount: number;
  createdAt: string;
}

export interface SmsPackage {
  /** A pack id from Super Admin's Packs & promos (the first three are STARTER, STANDARD and BULK). */
  id: string;
  name?: string;
  smsCount: number;
  price: number;
  /** A short label such as "Best value". */
  badge?: string | null;
}

export interface BirthdaySmsSettings {
  enabled: boolean;
  birthdayMessage: string;
  specialMessage: string;
  couponCode: string;
  defaultBirthdayMessage: string;
  defaultSpecialMessage: string;
}

export const smsApi = {
  /** SMS > Birthday wishes (TellMe idea 49). */
  getBirthday: () => api.get<BirthdaySmsSettings>('/v1/sms/birthday').then((r) => r.data),
  updateBirthday: (payload: Partial<Pick<BirthdaySmsSettings, 'enabled' | 'birthdayMessage' | 'specialMessage' | 'couponCode'>>) =>
    api.patch<BirthdaySmsSettings>('/v1/sms/birthday', payload).then((r) => r.data),

  /** `ownGateway`: the store's own SMS gateway sends its texts (Add-ons), so credits aren't used. */
  getCredits: () => api.get<{ smsCredits: number; ownGateway: SmsGatewayProvider | null }>('/v1/sms/credits').then((r) => r.data),

  /** Add-ons > iSMSplus / MIM SMS: the store's own gateway (never its keys). */
  getGateway: () => api.get<{ gateway: OwnSmsGatewayInfo | null }>('/v1/sms/gateway').then((r) => r.data),
  /** Owner only. A test text goes to testPhone through it first; saved only if that works. */
  connectGateway: (body: { provider: SmsGatewayProvider; senderId: string; testPhone: string; apiToken?: string; userName?: string; apiKey?: string }) =>
    api.post<{ gateway: OwnSmsGatewayInfo | null }>('/v1/sms/gateway', body).then((r) => r.data),
  disconnectGateway: () => api.delete<{ gateway: null }>('/v1/sms/gateway').then((r) => r.data),

  getLogs: () => api.get<SmsLog[]>('/v1/sms/logs').then((r) => r.data),

  sendTest: (phone: string) =>
    api.post<{ smsCredits: number }>('/v1/sms/test', { phone }).then((r) => r.data),

  getPackages: () => api.get<SmsPackage[]>('/v1/sms/packages').then((r) => r.data),

  /** How many customers a campaign reaches and the credits it takes. */
  previewCampaign: (target: SmsCampaignTarget & { message?: string }) =>
    api.post<SmsCampaignPreview>('/v1/sms/campaign/preview', target).then((r) => r.data),

  /** Sends to every customer in the audience (in the background on the server). */
  sendCampaign: (target: SmsCampaignTarget & { message: string; couponTemplateId?: string }) =>
    api.post<{ queued: number; totalCredits: number }>('/v1/sms/campaign', target).then((r) => r.data),

  /** "Send later": saved to go out at `sendAt` (an ISO time, 8 AM to 10 PM Dhaka). Nothing is sent or charged now. */
  scheduleCampaign: (target: SmsCampaignTarget & { message: string; sendAt: string }) =>
    api.post<{ scheduled: true; id: string; sendAt: string; recipients: number; totalCredits: number }>('/v1/sms/campaign', target).then((r) => r.data),

  /** Upcoming campaigns first, then what already went out. */
  listScheduled: () => api.get<ScheduledSms[]>('/v1/sms/campaign/scheduled').then((r) => r.data),

  /** Cancels a campaign that hasn't started. */
  cancelScheduled: (id: string) => api.delete(`/v1/sms/campaign/scheduled/${id}`).then((r) => r.data),

  /** One SMS to one customer (Order detail). `orderId` makes {order} and {name} in the text that order's. */
  sendSingle: (phone: string, message: string, orderId?: string) =>
    api.post<{ smsCredits: number }>('/v1/sms/send', { phone, message, orderId }).then((r) => r.data),

  /** Messages the store saved to use again (at most 20). */
  listTemplates: () => api.get<SmsTemplate[]>('/v1/sms/templates').then((r) => r.data),

  createTemplate: (name: string, body: string) => api.post<SmsTemplate>('/v1/sms/templates', { name, body }).then((r) => r.data),

  updateTemplate: (id: string, name: string, body: string) => api.patch<SmsTemplate>(`/v1/sms/templates/${id}`, { name, body }).then((r) => r.data),

  deleteTemplate: (id: string) => api.delete(`/v1/sms/templates/${id}`).then((r) => r.data),
};

/** A saved message. The text may hold {name}, {order} and {store}, filled in per customer when it is sent. */
export interface SmsTemplate {
  id: string;
  name: string;
  body: string;
  updatedAt: string;
}

/** The words a message can hold (server sms-template.ts). */
export const SMS_WORDS: { word: string; hint: string }[] = [
  { word: '{name}', hint: 'The customer’s name' },
  { word: '{order}', hint: 'Their latest order number' },
  { word: '{store}', hint: 'Your store’s name' },
  // Only filled when the message is sent from an order (Order detail); left out in a campaign (TellMe idea 107).
  { word: '{total}', hint: 'The order’s total (from an order)' },
  { word: '{items}', hint: 'The products, shortened (from an order)' },
  { word: '{address}', hint: 'The delivery address (from an order)' },
  { word: '{tracking}', hint: 'The tracking link (from an order)' },
  { word: '{cod}', hint: 'The cash to collect (from an order)' },
];

/** Who an SMS campaign goes to (SMS_AUDIENCES on the server). */
export type SmsAudience = 'ALL' | 'RECENT' | 'INACTIVE' | 'SELECTED' | 'TAG' | 'VIP' | 'RETURNING' | 'OPEN_ORDERS';

export type ScheduledSmsStatus = 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED' | 'CANCELLED';

/** A campaign saved for later (or already out). `recipients` and `sentCount` are filled in when it goes out. */
export interface ScheduledSms {
  id: string;
  message: string;
  audience: SmsAudience;
  days: number | null;
  tag: string | null;
  /** How many hand-picked customers (audience SELECTED). */
  selectedCount: number;
  sendAt: string;
  status: ScheduledSmsStatus;
  recipients: number | null;
  sentCount: number | null;
  error: string | null;
  sentAt: string | null;
}

export interface SmsCampaignTarget {
  audience: SmsAudience;
  days?: number;
  phones?: string[];
  /** TAG: customers carrying this tag (Customers > note and tags). */
  tag?: string;
  /** OPEN_ORDERS (TellMe idea 148): only this delivery zone, this courier, or orders older than N days. */
  openZone?: 'DHAKA' | 'AROUND_DHAKA' | 'OUTSIDE_DHAKA';
  openCourier?: 'NONE' | 'PATHAO' | 'STEADFAST' | 'REDX' | 'CARRYBEE';
  openOlderDays?: number;
}

export interface SmsCampaignPreview {
  recipients: number;
  smsPerMessage: number;
  totalCredits: number;
  smsCredits: number;
}
