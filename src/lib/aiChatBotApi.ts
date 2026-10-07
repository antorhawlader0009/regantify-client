import { api } from './api';

// AI & Automation > AI Chat Bot — the store's AI Credit wallet
// (ai-token-plan.md Step 7): balance, credit packs, and history. A call
// takes credits by what it really cost on its model (server
// ai-credits/ai-credit-pricing.ts). Not to be
// confused with aiApi.ts's STORE_CHATBOT setting, which is the
// platform-wide, admin-only model picker for the storefront's
// shopper-facing AI chat widget.
export interface ChatBotPackage {
  id: 'CREDITS_1K' | 'CREDITS_2500' | 'CREDITS_5K' | 'CREDITS_25K' | 'CREDITS_75K';
  creditCount: number;
  price: number;
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
};
