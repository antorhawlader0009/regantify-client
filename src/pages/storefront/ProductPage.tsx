import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { storefrontApi, type StorefrontDetailData, type StorefrontProduct } from '../../lib/storefrontApi';
import { formatPrice, isOutOfStock, ProductCard } from './themes/medium/ProductCard';
import type { CheckoutNavigationState } from './CheckoutPage';

const PLACEHOLDER_REVIEWS = [
  { name: 'Rafiul Islam', rating: 5, text: 'Product ekdom jevabe chilo review-e, valo lagse.' },
  { name: 'Sadia Akter', rating: 5, text: 'Quality onujayi price ta thik e mone hoise. Recommended.' },
  { name: 'Tanvir Ahmed', rating: 4, text: 'Delivery te ektu deri hoise but product ta valo.' },
];

function Stars({ count }: { count: number }) {
  return (
    <span style={{ color: '#f5a623', fontSize: '13px', letterSpacing: '1px' }}>
      {'★'.repeat(count)}
      <span style={{ color: '#ddd' }}>{'★'.repeat(5 - count)}</span>
    </span>
  );
}

export default function ProductPage() {
  const { subdomain, slug } = useParams<{ subdomain: string; slug: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<StorefrontDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [related, setRelated] = useState<StorefrontProduct[]>([]);

  const [activePhoto, setActivePhoto] = useState(0);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');

  useEffect(() => {
    if (!subdomain || !slug) return;
    setData(null);
    setError(null);
    setActivePhoto(0);
    setSelected({});
    setQuantity(1);
    setAddedMessage(null);
    setActiveTab('description');
    window.scrollTo(0, 0);
    storefrontApi
      .getStoreProduct(subdomain, slug)
      .then(setData)
      .catch(() => setError('This product could not be found.'));
  }, [subdomain, slug]);

  useEffect(() => {
    if (!subdomain || !data) return;
    storefrontApi
      .getStoreProducts(subdomain)
      .then((list) => {
        const pool = data.product.category
          ? list.products.filter((p) => p.category === data.product.category)
          : list.products;
        setRelated(pool.filter((p) => p.slug !== data.product.slug).slice(0, 4));
      })
      .catch(() => setRelated([]));
  }, [subdomain, data]);

  // Which single variation option (if any) has its own photo sets, and
  // the full combined gallery (base photos + every value's photos, in
  // that option's value order) — computed here (above the early returns
  // below) so the reset effect that depends on it always runs in the
  // same hook order every render. `data` may not be loaded yet, and
  // older cached API responses (or an in-flight backend deploy) could
  // omit variationPhotos entirely, so every step here is null-safe.
  //
  // Matching is case/whitespace-insensitive (see the same helper in the
  // real storefront's ProductPurchasePanel.tsx) so a stray casing
  // difference between VariationOption.name and
  // VariationValuePhoto.optionName/optionValue can never silently break
  // the "jump to this photo" behavior even if a swatch icon still shows
  // correctly by coincidence.
  const variationPhotos = data?.product.variationPhotos ?? [];
  const normalize = (s: string) => s.trim().toLowerCase();
  const findVariationPhoto = (optionName: string, optionValue: string) =>
    variationPhotos.find(
      (vp) => normalize(vp.optionName) === normalize(optionName) && normalize(vp.optionValue) === normalize(optionValue),
    );
  // Looks for the first entry that actually HAS photos — not just the
  // array's first entry, which could be a stale empty one (see the same
  // fix in ProductPurchasePanel.tsx for why).
  const firstPhotoEntry = variationPhotos.find((vp) => vp.photoUrls.length > 0);
  const photoOptionName = firstPhotoEntry
    ? data?.product.variationOptions.find((o) => normalize(o.name) === normalize(firstPhotoEntry.optionName))?.name
    : undefined;
  const allPhotos = (() => {
    const base = data?.product.photoUrls ?? [];
    const ordered = [...base];
    if (photoOptionName) {
      const option = data?.product.variationOptions.find((o) => o.name === photoOptionName);
      for (const value of option?.values ?? []) {
        const photos = findVariationPhoto(photoOptionName, value)?.photoUrls;
        for (const url of photos ?? []) {
          if (!ordered.includes(url)) ordered.push(url);
        }
      }
    }
    return ordered;
  })();

  // The selected value's own first photo, if it has one.
  const selectedValuePhoto = photoOptionName
    ? findVariationPhoto(photoOptionName, selected[photoOptionName] ?? '')?.photoUrls[0]
    : undefined;

  // Jump to the selected value's first photo (if it has one) whenever the
  // selection changes — the thumbnail strip still shows every photo, this
  // just picks a sensible default. activePhoto (the index) stays the
  // single source of truth for what's displayed; a manual thumbnail
  // click afterward is left alone until the selection changes again.
  useEffect(() => {
    if (!photoOptionName) return;
    const value = selected[photoOptionName];
    if (!value || !selectedValuePhoto) return;
    const index = allPhotos.indexOf(selectedValuePhoto);
    if (index !== -1) setActivePhoto(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoOptionName, selected[photoOptionName ?? '']]);

  if (error) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', fontFamily: 'sans-serif' }}>
        <p style={{ color: '#666' }}>{error}</p>
        <Link to={`/store/${subdomain}`} style={{ color: '#1a5fd0', fontSize: '14px' }}>
          ← Back to store
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999', fontFamily: 'sans-serif' }}>
        Loading product…
      </div>
    );
  }

  const { store, product } = data;
  const outOfStock = isOutOfStock(product);

  const matchedVariant =
    product.variationOptions.length > 0 && product.variationOptions.every((opt) => selected[opt.name])
      ? product.variants.find((v) =>
          product.variationOptions.every((opt) => v.optionValues[opt.name] === selected[opt.name]),
        )
      : undefined;

  const needsVariantSelection = product.variationOptions.length > 0 && !matchedVariant;

  const displayPrice = matchedVariant?.discountPrice ?? matchedVariant?.listPrice ?? product.discountPrice ?? product.price;
  const displayOriginalPrice =
    matchedVariant?.discountPrice && matchedVariant?.listPrice
      ? matchedVariant.listPrice
      : !matchedVariant && product.discountPrice
        ? product.price
        : null;

  const availableStock = matchedVariant ? matchedVariant.stock : product.stockQuantity ?? undefined;
  // A matched variant with its own zero stock must block purchase even
  // though the product as a whole isn't out of stock — see the same fix
  // in ProductPurchasePanel.tsx (real storefront) for why.
  const selectedVariantOutOfStock = !product.isPreOrder && matchedVariant !== undefined && matchedVariant.stock <= 0;
  const canPurchase = product.isPreOrder || (!outOfStock && !selectedVariantOutOfStock);

  const handleAddToCart = () => {
    if (needsVariantSelection) {
      setAddedMessage('Please select an option above first.');
      return;
    }
    setAddedMessage(`Added to cart: ${quantity} × "${product.name}"`);
  };

  const handleBuyNow = () => {
    if (needsVariantSelection) {
      setAddedMessage('Please select an option above first.');
      return;
    }
    if (!canPurchase) return;

    const checkoutState: CheckoutNavigationState = {
      store: { subdomain: subdomain!, storeName: store.storeName },
      item: {
        productSlug: product.slug,
        name: product.name,
        image: allPhotos[activePhoto] ?? allPhotos[0],
        unitPrice: displayPrice,
        originalUnitPrice: displayOriginalPrice ?? undefined,
        quantity,
        selectedOptions: selected,
        isPreOrder: product.isPreOrder,
      },
    };

    navigate(`/store/${subdomain}/checkout`, { state: checkoutState });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', color: '#1a1a1a', fontFamily: 'sans-serif', paddingBottom: '70px' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #ececec' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '16px 32px' }}>
          <Link to={`/store/${subdomain}`} style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', textDecoration: 'none' }}>
            ← {store.storeName}
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '14px 32px 0', fontSize: '12.5px', color: '#888' }}>
        <Link to={`/store/${subdomain}`} style={{ color: '#888', textDecoration: 'none' }}>
          Shop
        </Link>
        {product.category && (
          <>
            {' / '}
            <button
              onClick={() => navigate(`/store/${subdomain}?category=${encodeURIComponent(product.category!)}`)}
              style={{ border: 'none', background: 'none', padding: 0, color: '#888', cursor: 'pointer', fontSize: '12.5px' }}
            >
              {product.category}
            </button>
          </>
        )}
        {' / '}
        <span style={{ color: '#333' }}>{product.name}</span>
      </div>

      <main style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 32px 32px', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '40px' }}>
        {/* Gallery */}
        <div>
          <div
            style={{
              aspectRatio: product.photoSize === 'PORTRAIT' ? '3 / 4' : '1 / 1',
              background: '#f0f0f0',
              borderRadius: '12px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '14px',
            }}
          >
            {allPhotos[activePhoto] ? (
              <img src={allPhotos[activePhoto]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ color: '#bbb', fontSize: '13px' }}>No image</span>
            )}
          </div>
          {allPhotos.length > 1 && (
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {allPhotos.map((url, i) => (
                <button
                  key={url + i}
                  onClick={() => setActivePhoto(i)}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: i === activePhoto ? '2px solid #1a1a1a' : '1px solid #eee',
                    padding: 0,
                    cursor: 'pointer',
                    background: '#f6f6f6',
                  }}
                >
                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
          {product.videoUrl && (
            <a href={product.videoUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: '14px', fontSize: '13px', color: '#1a5fd0' }}>
              Watch product video ↗
            </a>
          )}
        </div>

        {/* Info & Purchase */}
        <div>
          {product.brand && (
            <span style={{ fontSize: '12px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{product.brand}</span>
          )}
          <h1 style={{ margin: '6px 0 10px', fontSize: '26px', fontWeight: 700 }}>{product.name}</h1>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
            {product.category && (
              <button
                onClick={() => navigate(`/store/${subdomain}?category=${encodeURIComponent(product.category!)}`)}
                style={{ fontSize: '12px', color: '#666', background: '#eee', border: 'none', borderRadius: '999px', padding: '4px 10px', cursor: 'pointer' }}
              >
                {product.category}
              </button>
            )}
            {product.secondaryCategories.map((c) => (
              <span key={c} style={{ fontSize: '12px', color: '#888', background: '#f2f2f2', borderRadius: '999px', padding: '4px 10px' }}>
                {c}
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', margin: '14px 0' }}>
            <span style={{ fontWeight: 700, fontSize: '26px' }}>{formatPrice(displayPrice)}</span>
            {displayOriginalPrice && (
              <span style={{ color: '#aaa', textDecoration: 'line-through', fontSize: '16px' }}>{formatPrice(displayOriginalPrice)}</span>
            )}
          </div>

          {product.isPreOrder ? (
            <span style={{ display: 'inline-block', background: '#1a1a1a', color: '#fff', fontSize: '12px', fontWeight: 600, padding: '4px 10px', borderRadius: '6px', marginBottom: '10px' }}>
              Available for pre-order
            </span>
          ) : (
            <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 600, marginBottom: '10px', color: outOfStock ? '#c73f1b' : '#1a8a4a' }}>
              {availableStock === undefined
                ? 'In stock'
                : availableStock > 0
                  ? `${availableStock} in stock`
                  : 'Out of stock'}
            </span>
          )}

          <div style={{ background: '#fff7ed', border: '1px solid #fde4c9', borderRadius: '8px', padding: '10px 14px', fontSize: '12.5px', color: '#8a5a1c', marginBottom: '18px' }}>
            {product.isPreOrder
              ? 'Pre-order item — delivery in 20–25 days. Cash on delivery available.'
              : 'Fast delivery available. Cash on delivery available all over Bangladesh.'}
          </div>

          {product.variationOptions.map((opt) => (
            <div key={opt.id} style={{ marginBottom: '16px' }}>
              <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#333' }}>{opt.name}</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {opt.values.map((val) => {
                  const swatchPhoto =
                    opt.name === photoOptionName ? findVariationPhoto(opt.name, val)?.photoUrls[0] : undefined;
                  const isSelected = selected[opt.name] === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setSelected((prev) => ({ ...prev, [opt.name]: val }))}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: swatchPhoto ? '5px 16px 5px 5px' : '7px 16px',
                        borderRadius: '999px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #1a1a1a' : '1px solid #ddd',
                        background: isSelected ? '#1a1a1a' : '#fff',
                        color: isSelected ? '#fff' : '#333',
                      }}
                    >
                      {swatchPhoto && (
                        <span style={{ width: '24px', height: '24px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: '#f0f0f0' }}>
                          <img src={swatchPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </span>
                      )}
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Quantity */}
          <div style={{ marginBottom: '20px' }}>
            <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 600, color: '#333' }}>Quantity</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #ddd', borderRadius: '999px', overflow: 'hidden' }}>
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                style={{ width: '34px', height: '34px', border: 'none', background: '#fff', cursor: 'pointer', fontSize: '16px' }}
              >
                −
              </button>
              <span style={{ width: '36px', textAlign: 'center', fontSize: '14px' }}>{quantity}</span>
              <button
                onClick={() => setQuantity((q) => q + 1)}
                style={{ width: '34px', height: '34px', border: 'none', background: '#fff', cursor: 'pointer', fontSize: '16px' }}
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '10px' }}>
            <button
              disabled={!canPurchase}
              onClick={handleAddToCart}
              style={{
                flex: 1,
                padding: '13px',
                borderRadius: '10px',
                border: '2px solid #1a1a1a',
                background: '#fff',
                color: '#1a1a1a',
                fontWeight: 600,
                fontSize: '14px',
                cursor: canPurchase ? 'pointer' : 'not-allowed',
                opacity: canPurchase ? 1 : 0.5,
              }}
            >
              Add to Cart
            </button>
            <button
              disabled={!canPurchase}
              onClick={handleBuyNow}
              style={{
                flex: 1,
                padding: '13px',
                borderRadius: '10px',
                border: 'none',
                background: canPurchase ? '#e4572e' : '#eee',
                color: canPurchase ? '#fff' : '#aaa',
                fontWeight: 600,
                fontSize: '14px',
                cursor: canPurchase ? 'pointer' : 'not-allowed',
              }}
            >
              Buy Now
            </button>
          </div>
          {addedMessage && <p style={{ fontSize: '12.5px', color: '#777', marginTop: '4px' }}>{addedMessage}</p>}

          {product.summary && <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.6, marginTop: '18px' }}>{product.summary}</p>}

          {product.weight && (
            <p style={{ fontSize: '12.5px', color: '#999', marginTop: '16px' }}>
              Weight: {product.weight} {product.weightUnit.toLowerCase()}
            </p>
          )}
        </div>
      </main>

      {/* Description & Reviews */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 32px 40px' }}>
        <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
          {(['description', 'reviews'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '10px 2px',
                background: 'none',
                border: 'none',
                borderBottom: activeTab === tab ? '2px solid #1a1a1a' : '2px solid transparent',
                fontWeight: 700,
                fontSize: '14px',
                color: activeTab === tab ? '#1a1a1a' : '#999',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {tab === 'reviews' ? `Reviews (${PLACEHOLDER_REVIEWS.length})` : 'Description'}
            </button>
          ))}
        </div>

        {activeTab === 'description' ? (
          product.description ? (
            <div style={{ fontSize: '14px', color: '#555', lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: product.description }} />
          ) : (
            <p style={{ fontSize: '14px', color: '#999' }}>No description provided for this product.</p>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {PLACEHOLDER_REVIEWS.map((r, i) => (
              <div key={i} style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13.5px' }}>{r.name}</span>
                  <Stars count={r.rating} />
                </div>
                <p style={{ margin: 0, fontSize: '13.5px', color: '#666' }}>{r.text}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 32px 40px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>Related Products</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* Sticky Mobile Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          borderTop: '1px solid #eee',
          padding: '10px 16px',
          display: 'none',
          gap: '10px',
        }}
        className="storefront-sticky-bar"
      >
        <button
          disabled={!canPurchase}
          onClick={handleAddToCart}
          style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid #1a1a1a', background: '#fff', fontWeight: 600, fontSize: '13.5px' }}
        >
          Add to Cart
        </button>
        <button
          disabled={!canPurchase}
          onClick={handleBuyNow}
          style={{ flex: 1, padding: '12px', borderRadius: '10px', border: 'none', background: '#e4572e', color: '#fff', fontWeight: 600, fontSize: '13.5px' }}
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}