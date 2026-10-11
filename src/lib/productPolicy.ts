import type { PolicyDefaults } from './invoiceApi';

// Warranty and return policy line for the invoice (TellMe idea 54). A product that sets nothing uses the store default;
// nothing at all = no line. Same rule as the storefront's themes/storepal/lib/policy.ts, in English.

export interface ProductPolicyFields {
  warrantyKind?: string | null;
  warrantyCustom?: string | null;
  returnDays?: number | null;
  returnCondition?: string | null;
}

const WARRANTY: Record<string, string> = {
  NONE: 'No warranty',
  D7: 'Warranty: 7 days',
  M1: 'Warranty: 1 month',
  M6: 'Warranty: 6 months',
  Y1: 'Warranty: 1 year',
};

/** "Warranty: 6 months · Return or exchange within 7 days (if the packet is unopened)", or null when nothing is set. */
export function invoicePolicyLine(product: ProductPolicyFields | null | undefined, defaults: PolicyDefaults | undefined): string | null {
  const ownWarranty = product?.warrantyKind != null;
  const ownReturn = product?.returnDays != null;
  const kind = ownWarranty ? product!.warrantyKind! : (defaults?.defaultWarrantyKind ?? null);
  const custom = ownWarranty ? product!.warrantyCustom : defaults?.defaultWarrantyCustom;
  const days = ownReturn ? product!.returnDays! : (defaults?.defaultReturnDays ?? null);
  const condition = ownReturn ? product!.returnCondition : defaults?.defaultReturnCondition;

  const parts: string[] = [];
  if (kind === 'CUSTOM') {
    if (custom) parts.push(`Warranty: ${custom}`);
  } else if (kind && WARRANTY[kind]) {
    parts.push(WARRANTY[kind]);
  }
  if (days === 0) parts.push('No returns or exchange');
  else if (days != null) parts.push(`Return or exchange within ${days} days${condition ? ` (${condition})` : ''}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}
