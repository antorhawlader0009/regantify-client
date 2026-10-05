/*
 * The customer-facing screen (POS-system-plan.md Step 12): the counter tab tells a second window
 * (/vendor/pos/display, on a second monitor or a tablet facing the customer, same browser) what to
 * show, over a BroadcastChannel. Nothing goes through the server.
 */

export type DisplayMessage =
  | { type: 'idle'; storeName: string }
  | {
      type: 'cart';
      storeName: string;
      lines: Array<{ name: string; options: string; quantity: number; total: number }>;
      discount: number;
      vat: number;
      vatIncluded: boolean;
      total: number;
    }
  | { type: 'pay'; storeName: string; total: number; qrImageUrl: string | null }
  | { type: 'done'; storeName: string; total: number; paid: number; change: number }
  /** The display asks the counter to send what's on screen now (it just opened). */
  | { type: 'hello' };

const CHANNEL = 'regantify-pos-display';

export function openDisplayChannel(onMessage?: (m: DisplayMessage) => void) {
  if (typeof BroadcastChannel === 'undefined') return { send: () => undefined, close: () => undefined };
  const channel = new BroadcastChannel(CHANNEL);
  if (onMessage) channel.onmessage = (e: MessageEvent<DisplayMessage>) => onMessage(e.data);
  return { send: (m: DisplayMessage) => channel.postMessage(m), close: () => channel.close() };
}

/** Open (or bring forward) the customer screen window. */
export function openCustomerDisplay() {
  const win = window.open('/vendor/pos/display', 'regantify-pos-display', 'popup,width=1024,height=768');
  win?.focus();
  return !!win;
}
