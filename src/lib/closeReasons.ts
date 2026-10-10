/**
 * Why an order was cancelled, returned or failed: the same catalog as server/src/orders/close-reasons.ts, kept in
 * step by hand. The server stores the code on the closing step; Analytics > Orders groups by it.
 */
export type CloseReasonCode =
  | 'UNREACHABLE'
  | 'REFUSED'
  | 'CHANGED_MIND'
  | 'WRONG_ADDRESS'
  | 'FAKE_ORDER'
  | 'DUPLICATE'
  | 'PRICE'
  | 'DELAYED'
  | 'OUT_OF_STOCK'
  | 'DAMAGED'
  | 'OTHER'
  | 'ORDERED_BY_MISTAKE'
  | 'BOUGHT_ELSEWHERE'
  | 'NOT_VERIFIED'
  | 'UNPAID'
  | 'COURIER_RETURN';

export const CLOSE_REASON_LABEL: Record<CloseReasonCode, string> = {
  UNREACHABLE: 'Phone not answered',
  REFUSED: 'Customer refused at the door',
  CHANGED_MIND: 'Customer changed their mind',
  WRONG_ADDRESS: 'Wrong or incomplete address',
  FAKE_ORDER: 'Fake or test order',
  DUPLICATE: 'Duplicate order',
  PRICE: 'Price felt too high',
  DELAYED: 'Delivery took too long',
  OUT_OF_STOCK: 'Out of stock',
  DAMAGED: 'Product damaged or wrong item',
  OTHER: 'Other',
  // Picked by the shopper on the "Cancel my order" button.
  ORDERED_BY_MISTAKE: 'Ordered by mistake',
  BOUGHT_ELSEWHERE: 'Bought from somewhere else',
  NOT_VERIFIED: 'SMS code not entered in time',
  UNPAID: 'Online payment not completed',
  COURIER_RETURN: 'Returned by the courier (reason not known)',
};

/** What a person can pick when cancelling an order (before it went out). */
export const CANCEL_REASONS: CloseReasonCode[] = ['UNREACHABLE', 'CHANGED_MIND', 'WRONG_ADDRESS', 'FAKE_ORDER', 'DUPLICATE', 'PRICE', 'DELAYED', 'OUT_OF_STOCK', 'OTHER'];

/** What a person can pick when a parcel came back. */
export const RETURN_REASONS: CloseReasonCode[] = ['REFUSED', 'UNREACHABLE', 'WRONG_ADDRESS', 'FAKE_ORDER', 'DAMAGED', 'PRICE', 'DELAYED', 'OTHER'];

/** The reasons to offer for a step, or null when that step has none (only Cancelled and Return ask). */
export function reasonChoices(status: string): CloseReasonCode[] | null {
  if (status === 'CANCELLED') return CANCEL_REASONS;
  if (status === 'RETURN') return RETURN_REASONS;
  return null;
}

/** An order's reason as the order detail answer carries it; null while the order isn't cancelled, returned or failed. */
export interface OrderCloseReason {
  code: CloseReasonCode | null;
  label: string | null;
}
