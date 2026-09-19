import { Dialog } from '../../../components/ui/Dialog';
import { StatusBadge } from './StatusBadge';
import { storefrontStoreUrl } from '../../../lib/storefrontUrl';
import type { AdminVendor } from '../../../lib/adminApi';

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-black/5 last:border-0">
      <span className="text-sm text-regantify-text-muted">{label}</span>
      <span className="text-sm text-regantify-text text-right">{value}</span>
    </div>
  );
}

/** Store name click target — full vendor details, including Joined/Last Login (moved out of the table). */
export function VendorDetailsDialog({
  vendor,
  onOpenChange,
}: {
  vendor: AdminVendor | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={vendor !== null} onOpenChange={onOpenChange} title={vendor?.storeName ?? ''} maxWidth="max-w-lg">
      {vendor && (
        <div className="px-6 pb-6 pt-4">
          <Row label="Vendor ID" value={<span className="font-mono text-xs">{vendor.id}</span>} />
          <Row
            label="Store URL"
            value={
              <a
                href={storefrontStoreUrl(vendor.subdomain)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-regantify-cta hover:underline"
              >
                {vendor.subdomain}
              </a>
            }
          />
          <Row label="Status" value={<StatusBadge status={vendor.status} />} />
          <Row label="Plan" value={vendor.planName} />
          <Row label="Owner" value={vendor.ownerName ?? '—'} />
          <Row label="Phone" value={vendor.phone ?? '—'} />
          <Row label="Email" value={vendor.email ?? '—'} />
          <Row label="Address" value={vendor.address ?? '—'} />
          <Row label="Balance" value={`৳${Number(vendor.balance).toLocaleString('en-US')}`} />
          <Row label="SMS Left" value={vendor.smsCredits} />
          <Row label="Products" value={vendor.productCount} />
          <Row label="Orders" value={vendor.orderCount} />
          <Row label="Joined" value={formatDateTime(vendor.createdAt)} />
          <Row label="Last Login" value={formatDateTime(vendor.lastLoginAt)} />
        </div>
      )}
    </Dialog>
  );
}
