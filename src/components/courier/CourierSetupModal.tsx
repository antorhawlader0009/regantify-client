import { Dialog } from '../ui/Dialog';
import { SteadfastConnectForm } from './SteadfastConnectForm';
import { PathaoConnectForm } from './PathaoConnectForm';
import { RedxConnectForm } from './RedxConnectForm';
import type { CourierAccountProvider } from '../../lib/courierApi';

const PROVIDER_LABELS: Record<CourierAccountProvider, string> = {
  PATHAO: 'Pathao Courier',
  STEADFAST: 'SteadFast Courier',
  REDX: 'RedX Courier',
};

// Copy shown above each provider's connect form — Pathao and RedX both
// need a follow-up "pick a pickup store" step in Settings that this
// modal can't do inline (needs a valid token first), so their copy
// mentions it; SteadFast is connect-and-done.
const PROVIDER_INTRO: Record<CourierAccountProvider, string> = {
  STEADFAST: 'Connect your SteadFast merchant account to book real deliveries from the Orders page.',
  PATHAO:
    'Connect your Pathao merchant account. After connecting, finish setup on Courier Integration > Pathao by selecting a pickup store.',
  REDX: 'Connect your RedX merchant account. After connecting, finish setup on the Courier Integration page by selecting a pickup store.',
};

interface CourierSetupModalProps {
  /** Which provider to show the connect form for — null closes the modal. Set either by the Courier Integration page's own "Connect" button, or by an Orders-page entry point (dropdown item, "Book with {Provider}") that discovered the vendor isn't connected yet — see COURIER-PLAN.md §5.2. */
  provider: CourierAccountProvider | null;
  onOpenChange: (open: boolean) => void;
  /** Called once the account is connected. The Courier Integration page just closes the modal; an Orders-page caller also re-runs whatever action (courier selection, booking) triggered this popup, so the vendor never has to re-click. */
  onConnected: () => void;
}

/**
 * The one Courier Integration connect dialog, used from BOTH entry
 * points per COURIER-PLAN.md §5.2: the Courier Integration page's own
 * "Connect" button, and the Orders page's "not connected yet" popup.
 * Same dialog, same connect-form components inside it — never an inline
 * expanding form on the page, so the two entry points can never drift
 * into looking like different flows.
 *
 * Pathao and RedX each need one extra step this modal can't do inline:
 * picking a pickup store (the Pathao page's Pickup Store card / RedxStorePicker), which
 * needs a valid token and so can only happen AFTER connecting — this
 * modal's onConnected still fires immediately (so an Orders-page retry
 * proceeds), but PROVIDER_INTRO's copy tells the vendor to finish store
 * selection in Settings.
 */
export function CourierSetupModal({ provider, onOpenChange, onConnected }: CourierSetupModalProps) {
  const footer = (submitting: boolean) => (
    <div className="flex justify-end gap-3 pt-2">
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="px-4 py-2 rounded-xl bg-regantify-content text-regantify-text text-sm font-medium hover:bg-black/10"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="px-4 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium disabled:opacity-60"
      >
        {submitting ? 'Connecting…' : 'Connect'}
      </button>
    </div>
  );

  return (
    <Dialog
      open={Boolean(provider)}
      onOpenChange={onOpenChange}
      title={provider ? `Connect ${PROVIDER_LABELS[provider]}` : undefined}
      maxWidth="max-w-sm"
    >
      <div className="p-6 pt-4">
        {provider && (
          <p className="text-sm text-regantify-text-muted mb-4">{PROVIDER_INTRO[provider]}</p>
        )}
        {provider === 'STEADFAST' && <SteadfastConnectForm onConnected={onConnected} footer={footer} />}
        {provider === 'PATHAO' && <PathaoConnectForm onConnected={onConnected} footer={footer} />}
        {provider === 'REDX' && <RedxConnectForm onConnected={onConnected} footer={footer} />}
      </div>
    </Dialog>
  );
}
