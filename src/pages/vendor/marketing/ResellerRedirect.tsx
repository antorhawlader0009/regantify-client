import { Navigate, useLocation } from 'react-router-dom';

/**
 * The reseller pages moved to Marketing > Reseller on 2026-11-03. Old addresses (bookmarks, older bell notes, the Shop's "Sell this in
 * your store" link) land on the right part and keep their query (?tab=, ?offer=).
 */
export default function ResellerRedirect({ view }: { view: 'sell' | 'supply' | 'money' }) {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.delete('view');
  if (view !== 'sell') params.set('view', view);
  const q = params.toString();
  return <Navigate to={`/vendor/marketing/reseller${q ? `?${q}` : ''}`} replace />;
}
