import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot } from 'lucide-react';
import { aiChatBotApi } from '../../../lib/aiChatBotApi';
import { BuyChatBotDialog } from './BuyChatBotDialog';

/**
 * AI & Automation > AI Chat Bot — sub-category page. For now this is just
 * the credit balance + Buy Credits flow (mirrors SMS's "Buy SMS" — see
 * pages/vendor/sms/Sms.tsx); actually wiring a bot up to spend these
 * credits is a separate, later task.
 */
export default function AiChatBot() {
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);

  const { data: creditsData } = useQuery({
    queryKey: ['chatbot-credits'],
    queryFn: () => aiChatBotApi.getCredits(),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-regantify-black">AI Chat Bot</h1>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setBuyDialogOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            Buy Messages
          </button>
          <span className="text-sm text-regantify-text">Messages Left: {creditsData?.chatBotCredits ?? 0}</span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 p-10 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-regantify-content flex items-center justify-center">
          <Bot size={22} className="text-regantify-text-muted" />
        </div>
        <p className="text-base font-semibold text-regantify-text">Your AI Chat Bot is not set up yet</p>
        <p className="text-sm text-regantify-text-muted max-w-md">
          Buy message credits now so they're ready to go the moment your bot is live.
        </p>
      </div>

      <BuyChatBotDialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen} />
    </div>
  );
}
