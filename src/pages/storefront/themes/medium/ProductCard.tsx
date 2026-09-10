import { useParams, useNavigate } from 'react-router-dom';
import type { StorefrontProduct } from '../../../../lib/storefrontApi';

interface ProductCardProps {
  product: StorefrontProduct;
}

export function formatPrice(value: string) {
  return `৳${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

/** Whether a product (no variants) is out of stock — pre-order items are never "out of stock". */
export function isOutOfStock(product: StorefrontProduct) {
  if (product.isPreOrder) return false;
  if (product.variants.length > 0) {
    return product.variants.every((v) => v.stock <= 0);
  }
  return (product.stockQuantity ?? 0) <= 0;
}

export function ProductCard({ product }: ProductCardProps) {
  const outOfStock = isOutOfStock(product);
  const { subdomain } = useParams<{ subdomain: string }>();
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/store/${subdomain}/product/${product.slug}`)}
      style={{
        textAlign: 'left',
        border: '1px solid #ececec',
        borderRadius: '10px',
        overflow: 'hidden',
        background: '#fff',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'none';
      }}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: product.photoSize === 'PORTRAIT' ? '3 / 4' : '1 / 1',
          background: '#f6f6f6',
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

        {product.discountPrice && (
          <span
            style={{
              position: 'absolute',
              top: '10px',
              left: '10px',
              background: '#e4572e',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '999px',
            }}
          >
            SALE
          </span>
        )}

        {product.isPreOrder && (
          <span
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: '#1a1a1a',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              padding: '3px 8px',
              borderRadius: '999px',
            }}
          >
            Pre-order
          </span>
        )}

        {outOfStock && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span
              style={{
                background: '#1a1a1a',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '6px',
              }}
            >
              Out of stock
            </span>
          </div>
        )}
      </div>

      <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
        {product.brand && (
          <span style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            {product.brand}
          </span>
        )}
        <p style={{ margin: 0, fontWeight: 600, fontSize: '14.5px', color: '#1a1a1a', lineHeight: 1.3 }}>
          {product.name}
        </p>
        {product.summary && (
          <p
            style={{
              margin: 0,
              fontSize: '12.5px',
              color: '#888',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {product.summary}
          </p>
        )}
        <div style={{ marginTop: 'auto', paddingTop: '8px', display: 'flex', gap: '8px', alignItems: 'baseline' }}>
          {product.discountPrice ? (
            <>
              <span style={{ fontWeight: 700, fontSize: '15px' }}>{formatPrice(product.discountPrice)}</span>
              <span style={{ color: '#aaa', textDecoration: 'line-through', fontSize: '12.5px' }}>
                {formatPrice(product.price)}
              </span>
            </>
          ) : (
            <span style={{ fontWeight: 700, fontSize: '15px' }}>{formatPrice(product.price)}</span>
          )}
        </div>
      </div>
    </button>
  );
}
