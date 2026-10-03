import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Bike, Check, Loader2 } from 'lucide-react';
import { api, apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import type { Order } from '../../lib/ordersApi';
import { outlineBtn, primaryBtn } from '../ui/PageKit';
import { productInputClass } from '../product/ProductFormPieces';

// Order Detail > Delivery, for an order that is NOT booked with Pathao, SteadFast or RedX
// (tracking-plan.md Step 6): an own rider or a courier with no integration. The vendor says who has
// the parcel, then moves it along; the shopper's tracking page, timeline and texts follow.

type Action = 'shipped' | 'out_for_delivery' | 'failed' | 'delivered';

const OWN_RIDER = 'Own rider';
// Offered by name; "Other" lets the vendor type any courier.
const COURIERS = ['Paperfly', 'Sundarban Courier', 'SA Paribahan', 'E-Courier', 'Janani Courier', 'Karatoa', OWN_RIDER];
const OTHER = '__other__';

const STAGE_LABEL: Record<string, string> = {
  shipped: 'Handed over',
  out_for_delivery: 'Out for delivery',
  failed: 'Delivery attempt failed',
  delivered: 'Delivered',
};

const shipmentApi = {
  save: (orderId: string, body: { courierName: string; trackingId?: string; trackingUrl?: string; riderName?: string; riderPhone?: string }) =>
    api.put(`/v1/courier/manual/orders/${orderId}/shipment`, body).then((r) => r.data),
  act: (orderId: string, action: Action) => api.post(`/v1/courier/manual/orders/${orderId}/delivery`, { action }).then((r) => r.data),
};

const field = `${productInputClass} h-9`;

export function ManualDeliveryCard({ order, onChanged }: { order: Order; onChanged: () => void }) {
  const finished = ['COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status);
  const saved = Boolean(order.manualCourierName);

  const [choice, setChoice] = useState(COURIERS[0]);
  const [otherName, setOtherName] = useState('');
  const [trackingId, setTrackingId] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [editing, setEditing] = useState(!saved);

  // Fill the form from what is saved on the order.
  useEffect(() => {
    const name = order.manualCourierName ?? '';
    if (name) {
      const known = COURIERS.includes(name);
      setChoice(known ? name : OTHER);
      setOtherName(known ? '' : name);
    }
    setTrackingId(order.manualTrackingId ?? '');
    setTrackingUrl(order.manualTrackingUrl ?? '');
    setRiderName(order.manualRiderName ?? '');
    setRiderPhone(order.manualRiderPhone ?? '');
    setEditing(!name);
  }, [order.manualCourierName, order.manualTrackingId, order.manualTrackingUrl, order.manualRiderName, order.manualRiderPhone]);

  const ownRider = choice === OWN_RIDER;
  const courierName = choice === OTHER ? otherName.trim() : choice;

  const save = useMutation({
    mutationFn: () =>
      shipmentApi.save(order.id, {
        courierName,
        trackingId: ownRider ? '' : trackingId,
        trackingUrl: ownRider ? '' : trackingUrl,
        riderName: ownRider ? riderName : '',
        riderPhone: ownRider ? riderPhone : '',
      }),
    onSuccess: () => {
      toast.success('Delivery details saved.');
      setEditing(false);
      onChanged();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the delivery details.')),
  });

  const act = useMutation({
    mutationFn: (action: Action) => shipmentApi.act(order.id, action),
    onSuccess: (_d, action) => {
      toast.success(`Marked: ${STAGE_LABEL[action].toLowerCase()}.`);
      onChanged();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not update the delivery.')),
  });

  const stage = order.manualStage ?? null;
  const canAct = saved && !finished && !editing;

  return (
    <div className="mt-4 border-t border-line pt-4">
      <p className="flex items-center gap-1.5 text-sm font-medium text-regantify-text">
        <Bike size={15} />
        Deliver it yourself, or with another courier
      </p>
      <p className="mt-0.5 text-xs text-neutral-500">
        For your own rider or a courier we do not connect to. Your customer gets a tracking page, and the texts you switched on in Store &gt; Order Tracking.
      </p>

      {saved && !editing ? (
        <div className="mt-3 rounded-lg border border-line bg-neutral-50 px-3 py-2.5 text-sm">
          <p className="font-medium text-regantify-text">{order.manualCourierName}</p>
          {order.manualTrackingId && <p className="text-xs text-neutral-600">Tracking ID: {order.manualTrackingId}</p>}
          {order.manualRiderName && (
            <p className="text-xs text-neutral-600">
              Rider: {order.manualRiderName}
              {order.manualRiderPhone ? ` · ${order.manualRiderPhone}` : ''}
            </p>
          )}
          <p className="mt-1 text-xs text-neutral-500">Status: {stage ? STAGE_LABEL[stage] : 'Not handed over yet'}</p>
          {!finished && (
            <button type="button" onClick={() => setEditing(true)} className="mt-1.5 text-xs text-brand hover:underline">
              Change details
            </button>
          )}
        </div>
      ) : (
        !finished && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-neutral-600">
              Who delivers it
              <select value={choice} onChange={(e) => setChoice(e.target.value)} className={`${field} mt-1`}>
                {COURIERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                <option value={OTHER}>Other courier…</option>
              </select>
            </label>
            {choice === OTHER && (
              <label className="block text-xs text-neutral-600">
                Courier name
                <input value={otherName} maxLength={60} onChange={(e) => setOtherName(e.target.value)} className={`${field} mt-1`} />
              </label>
            )}
            {ownRider ? (
              <>
                <label className="block text-xs text-neutral-600">
                  Rider name
                  <input value={riderName} maxLength={80} onChange={(e) => setRiderName(e.target.value)} className={`${field} mt-1`} />
                </label>
                <label className="block text-xs text-neutral-600">
                  Rider phone
                  <input value={riderPhone} maxLength={30} inputMode="tel" placeholder="01XXXXXXXXX" onChange={(e) => setRiderPhone(e.target.value)} className={`${field} mt-1`} />
                </label>
              </>
            ) : (
              <>
                <label className="block text-xs text-neutral-600">
                  Tracking ID (optional)
                  <input value={trackingId} maxLength={80} onChange={(e) => setTrackingId(e.target.value)} className={`${field} mt-1`} />
                </label>
                <label className="block text-xs text-neutral-600 sm:col-span-2">
                  Tracking link (optional)
                  <input value={trackingUrl} maxLength={500} placeholder="https://" onChange={(e) => setTrackingUrl(e.target.value)} className={`${field} mt-1`} />
                </label>
              </>
            )}
            <div className="flex gap-2 sm:col-span-2">
              <button type="button" disabled={save.isPending || !courierName} onClick={() => save.mutate()} className={primaryBtn}>
                {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Save details
              </button>
              {saved && (
                <button type="button" onClick={() => setEditing(false)} className={outlineBtn}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        )
      )}

      {canAct && (
        <div className="mt-3 flex flex-wrap gap-2">
          {stage !== 'shipped' && stage !== 'out_for_delivery' && stage !== 'failed' && (
            <button type="button" disabled={act.isPending} onClick={() => act.mutate('shipped')} className={primaryBtn}>
              Mark handed over
            </button>
          )}
          {stage && stage !== 'out_for_delivery' && (
            <button type="button" disabled={act.isPending} onClick={() => act.mutate('out_for_delivery')} className={outlineBtn}>
              Out for delivery
            </button>
          )}
          {(stage === 'out_for_delivery' || stage === 'failed') && (
            <button type="button" disabled={act.isPending} onClick={() => act.mutate('failed')} className={outlineBtn}>
              Delivery failed
            </button>
          )}
          {stage && (
            <button type="button" disabled={act.isPending} onClick={() => act.mutate('delivered')} className={primaryBtn}>
              Mark delivered
            </button>
          )}
        </div>
      )}
    </div>
  );
}
