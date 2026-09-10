import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { StorefrontListData } from '../../../../lib/storefrontApi';
import { ProductCard } from './ProductCard';

interface MediumThemeProps {
  data: StorefrontListData;
}

// Static trust badges + placeholder reviews — decorative only, matching
// the level of polish common BD storefronts show (see storepal.com.bd),
// until real review/trust-content features exist.
const TRUST_BADGES = [
  { title: 'Fast Delivery', text: 'Quick delivery to your doorstep, nationwide.' },
  { title: 'Genuine Products', text: 'Quality-checked items you can trust.' },
  { title: 'Cash on Delivery', text: 'Pay when your order arrives at your door.' },
];

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

/**
 * "Medium" — a fuller default storefront theme than "Simple". Header with
 * search + category chips, hero, category-grouped product sections on
 * the default (unfiltered) view — falling back to a flat filtered grid
 * once the vendor's shopper searches or picks one category — trust
 * badges, and a static reviews section. Cards link through to a full
 * product page (see ProductPage.tsx) covering nearly everything the
 * "Add Product" form captures, plus Buy Now / Add to Cart (UI-only for
 * now). Still theme-agnostic data in, so a future Store > Themes picker
 * can swap this out per vendor.
 */
export function MediumTheme({ data }: MediumThemeProps) {
  const { store, products, categories } = data;
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(searchParams.get('category'));

  // Keep in sync if the category comes in via URL (e.g. a link back from
  // a product page's category chip) after the component already mounted.
  useEffect(() => {
    const fromUrl = searchParams.get('category');
    if (fromUrl !== activeCategory) setActiveCategory(fromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const selectCategory = (cat: string | null) => {
    setActiveCategory(cat);
    if (cat) setSearchParams({ category: cat });
    else setSearchParams({});
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch = search.trim()
        ? p.name.toLowerCase().includes(search.trim().toLowerCase())
        : true;
      const matchesCategory = activeCategory ? p.category === activeCategory : true;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, activeCategory]);

  // When nothing is filtered/searched, group products by category so the
  // homepage reads as sectioned browsing (like "CASUAL SHOES", "BAGS", …)
  // rather than one long undifferentiated grid.
  const grouped = useMemo(() => {
    if (search.trim() || activeCategory) return null;
    const groups = new Map<string, typeof products>();
    const uncategorized: typeof products = [];
    for (const p of products) {
      if (p.category) {
        if (!groups.has(p.category)) groups.set(p.category, []);
        groups.get(p.category)!.push(p);
      } else {
        uncategorized.push(p);
      }
    }
    const sections = Array.from(groups.entries()).map(([name, items]) => ({ name, items }));
    if (uncategorized.length > 0) sections.push({ name: 'More Products', items: uncategorized });
    return sections;
  }, [products, search, activeCategory]);

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', color: '#1a1a1a', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #ececec',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '18px 32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '24px',
            flexWrap: 'wrap',
          }}
        >
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{store.storeName}</h1>

          <div style={{ flex: 1, maxWidth: '420px', minWidth: '220px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products"
              style={{
                width: '100%',
                padding: '9px 14px',
                borderRadius: '999px',
                border: '1px solid #e2e2e2',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
          </div>
        </div>

        {categories.length > 0 && (
          <div
            style={{
              maxWidth: '1200px',
              margin: '0 auto',
              padding: '0 32px 14px',
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
            }}
          >
            <button
              onClick={() => selectCategory(null)}
              style={{
                padding: '6px 14px',
                borderRadius: '999px',
                fontSize: '13px',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: activeCategory === null ? '2px solid #1a1a1a' : '1px solid #ddd',
                background: activeCategory === null ? '#1a1a1a' : '#fff',
                color: activeCategory === null ? '#fff' : '#333',
              }}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => selectCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '999px',
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer',
                  border: activeCategory === cat ? '2px solid #1a1a1a' : '1px solid #ddd',
                  background: activeCategory === cat ? '#1a1a1a' : '#fff',
                  color: activeCategory === cat ? '#fff' : '#333',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Hero */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1a1a1a, #3a3a3a)',
          color: '#fff',
          padding: '48px 32px',
          textAlign: 'center',
        }}
      >
        <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px' }}>{store.storeName}</h2>
        <p style={{ margin: 0, color: '#ddd', fontSize: '14px' }}>
          {products.length} {products.length === 1 ? 'product' : 'products'} available
        </p>
      </div>

      {/* Product grid / sections */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '36px 32px' }}>
        {products.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '60px 0' }}>No products available yet. Check back soon.</p>
        ) : grouped ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '44px' }}>
            {grouped.map((section) => (
              <div key={section.name}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '17px', fontWeight: 700, margin: 0, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                    {section.name}
                  </h3>
                  {section.name !== 'More Products' && (
                    <button
                      onClick={() => selectCategory(section.name)}
                      style={{ fontSize: '12.5px', color: '#1a5fd0', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      View all →
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '20px' }}>
                  {section.items.slice(0, 8).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '60px 0' }}>No products match your search.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '20px' }}>
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      {/* Trust badges */}
      <section style={{ background: '#fff', borderTop: '1px solid #ececec', borderBottom: '1px solid #ececec', padding: '36px 32px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
          {TRUST_BADGES.map((badge) => (
            <div key={badge.title} style={{ textAlign: 'center' }}>
              <p style={{ fontWeight: 700, fontSize: '14.5px', margin: '0 0 6px' }}>{badge.title}</p>
              <p style={{ fontSize: '12.5px', color: '#888', margin: 0 }}>{badge.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Customer reviews — static placeholder content */}
      <section style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 32px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', textAlign: 'center' }}>Customer Reviews</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px' }}>
          {PLACEHOLDER_REVIEWS.map((r, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #ececec', borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '13.5px' }}>{r.name}</span>
                <Stars count={r.rating} />
              </div>
              <p style={{ margin: 0, fontSize: '13px', color: '#666' }}>{r.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '24px', color: '#aaa', fontSize: '12px' }}>
        © {new Date().getFullYear()} {store.storeName}
      </footer>
    </div>
  );
}
