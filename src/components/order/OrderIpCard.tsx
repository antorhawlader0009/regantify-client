import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Globe, MapPin } from 'lucide-react';
import { ordersApi, type IpNetwork } from '../../lib/ordersApi';
import { orderStatusLabel } from '../../pages/vendor/order/orderStatus';

const NETWORK_TEXT: Record<IpNetwork, string> = {
  MOBILE: 'Mobile data',
  BROADBAND: 'Home or office internet',
  HOSTING: 'Data center or VPN',
  UNKNOWN: 'Unknown network',
};

/**
 * Order detail: where a store order came from by its IP (server ip-geo/, data by DB-IP Lite, which must be credited with a link).
 * A mobile connection's place is the operator's gateway (Grameenphone often shows Dhaka or a far district), so it gets no map and a plain
 * warning. In Simple mode the card only shows when there is something to look at (VPN, outside Bangladesh, other orders from the line).
 */
export function OrderIpCard({ orderId, simple }: { orderId: string; simple: boolean }) {
  const q = useQuery({ queryKey: ['order-ip-info', orderId], queryFn: () => ordersApi.ipInfo(orderId), staleTime: 5 * 60_000 });
  const info = q.data?.info;
  if (!info) return null;
  const abroad = !!info.country && info.country !== 'BD';
  const worthALook = info.network === 'HOSTING' || abroad || info.sameConnection.length > 0;
  if (simple && !worthALook) return null;

  const place = [info.city, info.region && info.region !== info.city ? info.region : null, info.countryName].filter(Boolean).join(', ');
  return (
    <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-neutral-500">
          <Globe size={15} aria-hidden />
        </span>
        <h2 className="text-[15px] font-semibold text-regantify-text">Where the order came from</h2>
      </div>

      <dl className="space-y-1.5 text-sm">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-neutral-500">Network</dt>
          <dd className={info.network === 'HOSTING' ? 'font-medium text-red-700' : 'text-regantify-text'}>
            {NETWORK_TEXT[info.network]}
            {info.isp ? ` · ${info.isp}` : ''}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-neutral-500">Place</dt>
          <dd className={abroad ? 'font-medium text-red-700' : 'text-regantify-text'}>{place || 'Unknown'}</dd>
        </div>
        {info.ip && (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-neutral-500">IP</dt>
            <dd className="font-mono text-xs leading-5 text-neutral-700 break-all">{info.ip}</dd>
          </div>
        )}
      </dl>

      {info.network === 'MOBILE' ? (
        <p className="mt-2.5 rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          On mobile data the place is where {info.isp ?? 'the operator'} connects to the internet, often far from the customer. Don’t compare it with the delivery address.
        </p>
      ) : (
        info.point && (
          <a
            href={`https://www.google.com/maps?q=${info.point.lat},${info.point.lon}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-regantify-cta hover:underline"
          >
            <MapPin size={13} aria-hidden /> Rough area on the map (a few km, not the house)
          </a>
        )
      )}

      {info.sameConnection.length > 0 && (
        <div className="mt-3 border-t border-black/5 pt-3">
          <p className="text-xs font-medium text-red-700">
            {info.sameConnection.length} other {info.sameConnection.length === 1 ? 'order' : 'orders'} from this same connection in the last 30 days
          </p>
          <ul className="mt-1.5 space-y-1">
            {info.sameConnection.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-2 text-xs">
                <Link to={`/vendor/orders/${o.id}`} className="font-medium text-regantify-cta hover:underline">
                  {o.ref}
                </Link>
                <span className="text-neutral-700">{o.customerName}</span>
                <span className="text-neutral-500">{orderStatusLabel(o.status)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-3 text-[11px] text-neutral-400">
        A guide only, from the customer’s internet address.{' '}
        <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" className="underline">
          IP Geolocation by DB-IP
        </a>
      </p>
    </section>
  );
}
