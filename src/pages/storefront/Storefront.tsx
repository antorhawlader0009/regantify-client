import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { storefrontApi, type StorefrontListData } from '../../lib/storefrontApi';
import { MediumTheme } from './themes/medium/MediumTheme';

/**
 * Public storefront entry point — /store/:subdomain, reachable by anyone,
 * no auth. This is what the Topbar's "Visit site" link opens.
 *
 * Every store uses the default "Medium" theme for now (see MediumTheme —
 * a fuller theme than the earlier "Simple" one, covering nearly all
 * "Add Product" fields: gallery, variations, description, stock/pre-order
 * state, category filtering, search). "Simple" is kept as a lighter
 * alternative theme for later. Once the Store > Themes feature exists,
 * this is the spot to look up the vendor's chosen theme and render the
 * matching component instead.
 */
export default function Storefront() {
  const { subdomain } = useParams<{ subdomain: string }>();
  const [data, setData] = useState<StorefrontListData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!subdomain) return;
    storefrontApi
      .getStoreProducts(subdomain)
      .then(setData)
      .catch(() => setError('This store could not be found.'));
  }, [subdomain]);

  if (error) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#666' }}>
        {error}
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#999' }}>
        Loading store…
      </div>
    );
  }

  return <MediumTheme data={data} />;
}
