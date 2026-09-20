import { api } from './api';

// AI & Automation > AI Chat Bot — mirrors smsApi.ts's own shape (Buy
// Credits flow), against the vendor's chatBotCredits balance instead of
// smsCredits. Not to be confused with aiApi.ts's STORE_CHATBOT setting,
// which is the platform-wide, admin-only model picker for the
// storefront's shopper-facing AI chat widget.
export interface ChatBotPackage {
  id: 'TRIAL' | 'STARTER' | 'STANDARD' | 'BULK' | 'MEGA';
  messageCount: number;
  price: number;
}

export const aiChatBotApi = {
  getCredits: () => api.get<{ chatBotCredits: number }>('/v1/ai-chatbot/credits').then((r) => r.data),

  getPackages: () => api.get<ChatBotPackage[]>('/v1/ai-chatbot/packages').then((r) => r.data),
};
