import type { StorefrontListData } from '../../../../lib/storefrontApi';

interface SimpleThemeProps {
  data: StorefrontListData;
}

/**
 * "Simple" — the default storefront theme. Deliberately minimal: a
 * header with the store name and a plain product grid. This is the
 * theme every new vendor store uses until a Themes feature lets them
 * pick/customize something else (see navConfig: Store > Themes).
 *
 * Kept self-contained (its own inline styles, not the admin panel's
 * tailwind theme tokens) since a storefront theme is a separate visual
 * surface from the admin dashboard and shouldn't inherit its branding.
 */
export function SimpleTheme({ data }: SimpleThemeProps) {
  const { store, products } = data;

  const formatPrice = (value: string) =>
    `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#1a1a1a', fontFamily: 'sans-serif' }}>
      <header
        style={{
          borderBottom: '1px solid #e5e5e5',
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{store.storeName}</h1>
      </header>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '40px 32px' }}>
        {products.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center', padding: '60px 0' }}>
            No products available yet. Check back soon.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '24px',
            }}
          >
            {products.map((product) => (
              <div key={product.id} style={{ border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
                <div
                  style={{
                    aspectRatio: '1 / 1',
                    background: '#f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {product.photoUrls[0] ? (
                    <img
                      src={product.photoUrls[0]}
                      alt={product.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ color: '#bbb', fontSize: '13px' }}>No image</span>
                  )}
                </div>
                <div style={{ padding: '14px' }}>
                  <p style={{ margin: '0 0 6px', fontWeight: 600, fontSize: '15px' }}>{product.name}</p>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'baseline' }}>
                    {product.discountPrice ? (
                      <>
                        <span style={{ fontWeight: 600 }}>{formatPrice(product.discountPrice)}</span>
                        <span style={{ color: '#999', textDecoration: 'line-through', fontSize: '13px' }}>
                          {formatPrice(product.price)}
                        </span>
                      </>
                    ) : (
                      <span style={{ fontWeight: 600 }}>{formatPrice(product.price)}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
