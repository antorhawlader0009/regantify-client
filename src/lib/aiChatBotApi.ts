import { api } from './api';

// AI Usages - the store's AI Credit wallet
// (ai-token-plan.md Step 7): balance, credit packs, and history. A call
// takes credits by what it really cost on its model (server
// ai-credits/ai-credit-pricing.ts). Not to be
// confused with aiApi.ts's STORE_CHATBOT setting, which is the
// platform-wide, admin-only model picker for the storefront's
// shopper-facing AI chat widget.
export interface ChatBotPackage {
  /** A pack id from Super Admin's Packs & promos (the first five are CREDITS_1K … CREDITS_75K). */
  id: string;
  name?: string;
  creditCount: number;
  price: number;
  badge?: string | null;
}

export interface AiCreditSummary {
  /** AI Credits the store owns. */
  balance: number;
  /** Set aside for chat replies being written right now. */
  held: number;
  /** What the next replies can spend: balance - held. */
  available: number;
  /** Public products the chat sends (capped at 300). */
  productCount: number;
  /** About how many credits one chat reply takes at this store's size. */
  creditsPerReply: number;
  /** About how many more replies the balance pays for. */
  repliesLeft: number;
  /** The balance under which the seller is warned. */
  lowBalanceAt: number;
  lowBalance: boolean;
  /** Whether the wallet pays for one more reply (when not, the chat is hidden on the store). */
  canReply: boolean;
  /** The owner's monthly AI limit in credits (null = none) and what all AI used this Dhaka month. */
  monthlyCap: number | null;
  usedThisMonth: number;
  capReached: boolean;
  /** Credits the dashboard tools leave for the store chat (null = none). */
  chatReserve: number | null;
}

/** The AI tools a store pays AI Credits for (server ai-chatbot.service.ts aiToolOf). */
export type AiToolKey = 'STORE_CHAT' | 'STORE_VOICE' | 'PHOTO_SEARCH' | 'ASK_AI' | 'PRODUCT_AI' | 'CHAT_EXTENSION' | 'REPLY_DRAFTS' | 'OTHER';

export interface AiUsageReport {
  days: number;
  /** "YYYY-MM-DD", Dhaka, both included. */
  from: string;
  to: string;
  totals: { credits: number; uses: number; previousCredits: number; previousUses: number; added: number; bought: number };
  daily: Array<{ bucket: string; credits: number; uses: number }>;
  tools: Array<{ key: AiToolKey; credits: number; uses: number; previousCredits: number; previousUses: number }>;
  /** Credits a day over the last 14 days, and how long the balance (or the monthly limit, `endsBy`) lasts at that pace. */
  pace: { perDay: number; daysLeft: number | null; endsBy: 'BALANCE' | 'MONTHLY_LIMIT' };
  credits: AiCreditSummary;
  /** AI the plan gives free uses of a month instead of charging credits. limit null = unlimited, 0 = not in the plan. */
  allowances: Array<{ key: 'LANDING_PAGE' | 'LMS'; used: number; limit: number | null }>;
}

export interface AiUsageSettings {
  monthlyCap: number | null;
  chatReserve: number | null;
  /** The owner's off switches: every AI service, the store chat (with its voice call), only the voice call. */
  aiOff: boolean;
  storeChatOff: boolean;
  voiceOff: boolean;
}

export type AiCreditLedgerType = 'SIGNUP_GRANT' | 'PLAN_GRANT' | 'PURCHASE' | 'USAGE' | 'ADJUSTMENT' | 'MIGRATION';

export interface AiCreditLedgerRow {
  id: string;
  type: AiCreditLedgerType;
  /** Signed: + added, - used. */
  amount: number;
  balanceAfter: number;
  description: string;
  feature: string | null;
  planCode: string | null;
  createdAt: string;
}

export interface AiCreditLedgerPage {
  items: AiCreditLedgerRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const aiChatBotApi = {
  getCredits: () => api.get<AiCreditSummary>('/v1/ai-chatbot/credits').then((r) => r.data),

  getPackages: () => api.get<ChatBotPackage[]>('/v1/ai-chatbot/packages').then((r) => r.data),

  getLedger: (params: { page?: number; pageSize?: number; type?: AiCreditLedgerType } = {}) =>
    api.get<AiCreditLedgerPage>('/v1/ai-chatbot/ledger', { params }).then((r) => r.data),

  getUsage: (days: 7 | 30 | 90) => api.get<AiUsageReport>('/v1/ai-chatbot/usage', { params: { days } }).then((r) => r.data),

  getSettings: () => api.get<AiUsageSettings>('/v1/ai-chatbot/settings').then((r) => r.data),

  /** Owner only. null (or 0) turns a control off. */
  updateSettings: (body: Partial<AiUsageSettings>) => api.patch<AiUsageSettings>('/v1/ai-chatbot/settings', body).then((r) => r.data),
};
