import { useEffect, useState } from 'react';
import type { StorefrontProduct } from '../../../../lib/storefrontApi';
import { formatPrice, isOutOfStock } from './ProductCard';

interface ProductModalProps {
  product: StorefrontProduct;
  onClose: () => void;
}

export function ProductModal({ product, onClose }: ProductModalProps) {
  const [activePhoto, setActivePhoto] = useState(0);
  // One selected value per variation option, keyed by option name.
  const [selected, setSelected] = useState<Record<string, string>>({});

  const outOfStock = isOutOfStock(product);

  // Once every option has a selection, try to resolve the matching variant
  // so its own price/stock can override the base product's.
  const matchedVariant =
    product.variationOptions.length > 0 &&
    product.variationOptions.every((opt) => selected[opt.name])
      ? product.variants.find((v) =>
          product.variationOptions.every((opt) => v.optionValues[opt.name] === selected[opt.name]),
        )
      : undefined;

  const displayPrice = matchedVariant?.discountPrice ?? matchedVariant?.listPrice ?? product.discountPrice ?? product.price;
  const displayOriginalPrice =
    matchedVariant?.discountPrice && matchedVariant?.listPrice
      ? matchedVariant.listPrice
      : !matchedVariant && product.discountPrice
        ? product.price
        : null;

  // Which single variation option (if any) has its own photo sets — see
  // the same derivation in ProductPurchasePanel.tsx (real storefront) and
  // ProductPage.tsx (full preview page), kept consistent here too.
  // Defensive: normalize since older cached API responses (or an
  // in-flight backend deploy) could omit variationPhotos entirely.
  // Matching is case/whitespace-insensitive so a stray casing difference
  // between VariationOption.name and VariationValuePhoto.optionName/
  // optionValue can never silently break the "jump to this photo"
  // behavior (see the same helper in ProductPurchasePanel.tsx).
  const variationPhotos = product.variationPhotos ?? [];
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
    ? product.variationOptions.find((o) => normalize(o.name) === normalize(firstPhotoEntry.optionName))?.name
    : undefined;

  // Full combined gallery: base photos, then every value's photos in
  // that option's own value order (e.g. base photos, then Black's
  // photos, then Blue's photos) — always shown in full, not filtered
  // down to just the selected value.
  const allPhotos = (() => {
    const ordered = [...product.photoUrls];
    if (photoOptionName) {
      const option = product.variationOptions.find((o) => o.name === photoOptionName);
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

  // Jump to the selected value's first photo whenever the selection
  // changes — the thumbnail strip still shows every photo. activePhoto
  // (the index) stays the single source of truth for what's displayed.
  useEffect(() => {
    if (!photoOptionName) return;
    const value = selected[photoOptionName];
    if (!value || !selectedValuePhoto) return;
    const index = allPhotos.indexOf(selectedValuePhoto);
    if (index !== -1) setActivePhoto(index);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoOptionName, selected[photoOptionName ?? '']]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '14px',
          maxWidth: '920px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
        }}
      >
        {/* Gallery */}
        <div style={{ padding: '24px', borderRight: '1px solid #f0f0f0' }}>
          <div
            style={{
              aspectRatio: product.photoSize === 'PORTRAIT' ? '3 / 4' : '1 / 1',
              background: '#f6f6f6',
              borderRadius: '10px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '12px',
            }}
          >
            {allPhotos[activePhoto] ? (
              <img
                src={allPhotos[activePhoto]}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span style={{ color: '#bbb', fontSize: '13px' }}>No image</span>
            )}
          </div>
          {allPhotos.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {allPhotos.map((url, i) => (
                <button
                  key={url + i}
                  onClick={() => setActivePhoto(i)}
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '6px',
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
            <a
              href={product.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-block', marginTop: '12px', fontSize: '13px', color: '#1a5fd0' }}
            >
              Watch product video ↗
            </a>
          )}
        </div>

        {/* Info */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <button
            onClick={onClose}
            style={{
              alignSelf: 'flex-end',
              border: 'none',
              background: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#999',
              lineHeight: 1,
            }}
            aria-label="Close"
          >
            ×
          </button>

          {product.brand && (
            <span style={{ fontSize: '11px', color: '#999', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {product.brand}
            </span>
          )}
          <h2 style={{ margin: '4px 0 8px', fontSize: '22px', fontWeight: 700 }}>{product.name}</h2>

          {product.category && (
            <span style={{ fontSize: '12px', color: '#777', marginBottom: '10px' }}>
              Category: {product.category}
            </span>
          )}

          <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline', margin: '10px 0' }}>
            <span style={{ fontWeight: 700, fontSize: '22px' }}>{formatPrice(displayPrice)}</span>
            {displayOriginalPrice && (
              <span style={{ color: '#aaa', textDecoration: 'line-through', fontSize: '15px' }}>
                {formatPrice(displayOriginalPrice)}
              </span>
            )}
          </div>

          {product.isPreOrder && (
            <span
              style={{
                alignSelf: 'flex-start',
                background: '#1a1a1a',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: '6px',
                marginBottom: '10px',
              }}
            >
              Available for pre-order
            </span>
          )}
          {!product.isPreOrder && (
            <span
              style={{
                alignSelf: 'flex-start',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '10px',
                color: outOfStock ? '#c73f1b' : '#1a8a4a',
              }}
            >
              {matchedVariant
                ? matchedVariant.stock > 0
                  ? `${matchedVariant.stock} in stock`
                  : 'Out of stock'
                : outOfStock
                  ? 'Out of stock'
                  : 'In stock'}
            </span>
          )}

          {product.variationOptions.map((opt) => (
            <div key={opt.id} style={{ marginBottom: '14px' }}>
              <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600, color: '#333' }}>{opt.name}</p>
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
                        padding: swatchPhoto ? '4px 14px 4px 4px' : '6px 14px',
                        borderRadius: '999px',
                        fontSize: '13px',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #1a1a1a' : '1px solid #ddd',
                        background: isSelected ? '#1a1a1a' : '#fff',
                        color: isSelected ? '#fff' : '#333',
                      }}
                    >
                      {swatchPhoto && (
                        <span style={{ width: '22px', height: '22px', borderRadius: '5px', overflow: 'hidden', flexShrink: 0, background: '#f0f0f0' }}>
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

          {product.summary && (
            <p style={{ fontSize: '13.5px', color: '#555', lineHeight: 1.6, marginTop: '6px' }}>{product.summary}</p>
          )}

          {product.description && (
            <div style={{ marginTop: '14px', borderTop: '1px solid #f0f0f0', paddingTop: '14px' }}>
              <p style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600, color: '#333' }}>Description</p>
              {/* Description is stored as HTML from the vendor's rich text editor. */}
              <div
                style={{ fontSize: '13.5px', color: '#555', lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          )}

          {product.weight && (
            <p style={{ fontSize: '12.5px', color: '#999', marginTop: '14px' }}>
              Weight: {product.weight} {product.weightUnit.toLowerCase()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
