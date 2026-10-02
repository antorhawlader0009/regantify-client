import { api } from './api';

// AI & Automation > AI Chat Bot — the store's AI token wallet
// (ai-token-plan.md Step 7): balance, token packs, and history. Not to be
// confused with aiApi.ts's STORE_CHATBOT setting, which is the
// platform-wide, admin-only model picker for the storefront's
// shopper-facing AI chat widget.
export interface ChatBotPackage {
  id: 'TOKENS_200K' | 'TOKENS_500K' | 'TOKENS_1M' | 'TOKENS_5M' | 'TOKENS_15M';
  tokenCount: number;
  price: number;
}

export interface AiTokenCredits {
  /** Tokens the store owns. */
  balance: number;
  /** Set aside for chat replies being written right now. */
  held: number;
  /** What the next replies can spend: balance - held. */
  available: number;
  /** Public products the chat sends (capped at 300). */
  productCount: number;
  /** Tokens one reply uses at this store's size. */
  tokensPerReply: number;
  /** About how many more replies the balance pays for. */
  repliesLeft: number;
  /** The balance under which the seller is warned. */
  lowBalanceAt: number;
  lowBalance: boolean;
  /** Whether the wallet pays for one more reply (when not, the chat is hidden on the store). */
  canReply: boolean;
}

export type AiTokenLedgerType = 'SIGNUP_GRANT' | 'PLAN_GRANT' | 'PURCHASE' | 'USAGE' | 'ADJUSTMENT' | 'MIGRATION';

export interface AiTokenLedgerRow {
  id: string;
  type: AiTokenLedgerType;
  /** Signed: + added, - used. */
  amount: number;
  balanceAfter: number;
  description: string;
  feature: string | null;
  planCode: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
  createdAt: string;
}

export interface AiTokenLedgerPage {
  items: AiTokenLedgerRow[];
  total: number;
  page: number;
  pageSize: number;
}

export const aiChatBotApi = {
  getCredits: () => api.get<AiTokenCredits>('/v1/ai-chatbot/credits').then((r) => r.data),

  getPackages: () => api.get<ChatBotPackage[]>('/v1/ai-chatbot/packages').then((r) => r.data),

  getLedger: (params: { page?: number; pageSize?: number; type?: AiTokenLedgerType } = {}) =>
    api.get<AiTokenLedgerPage>('/v1/ai-chatbot/ledger', { params }).then((r) => r.data),
};
