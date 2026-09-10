import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { productsApi } from '../../../lib/productsApi';

const DEFAULT_THRESHOLD = 5;

export default function LowStock() {
  const navigate = useNavigate();
  const [thresholdInput, setThresholdInput] = useState(String(DEFAULT_THRESHOLD));
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);

  const { data, isLoading } = useQuery({
    queryKey: ['products-low-stock', threshold],
    queryFn: () => productsApi.lowStock(threshold),
  });

  const products = data?.products ?? [];

  const applyThreshold = () => {
    const n = Number(thresholdInput);
    setThreshold(n > 0 ? n : DEFAULT_THRESHOLD);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">Low Stock</h1>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="p-4 border-b border-black/5 flex flex-wrap items-center gap-3">
          <label className="text-sm text-regantify-text-muted">Show products with stock below</label>
          <input
            type="number"
            min={1}
            value={thresholdInput}
            onChange={(e) => setThresholdInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyThreshold()}
            className="w-24 px-3 py-2 rounded-xl border border-black/10 text-sm text-regantify-text focus:outline-none"
          />
          <button
            onClick={applyThreshold}
            className="px-3.5 py-2 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium"
          >
            Apply
          </button>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-regantify-content text-left text-regantify-text-muted">
              <th className="px-2 py-3 font-medium">PRODUCT</th>
              <th className="px-4 py-3 font-medium">CATEGORY</th>
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">STOCK</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-regantify-text-muted">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-regantify-text-muted">
                  No products below this threshold.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="border-t border-black/5">
                <td className="px-2 py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={p.photoUrls[0] ?? ''}
                      alt=""
                      className="w-10 h-10 rounded-lg object-cover bg-regantify-content shrink-0"
                    />
                    <button
                      onClick={() => navigate(`/vendor/product/edit/${p.id}`)}
                      className="text-regantify-cta font-medium hover:underline line-clamp-2 max-w-xs text-left"
                    >
                      {p.name}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-regantify-text">{p.category ?? '—'}</td>
                <td className="px-4 py-3 text-regantify-text">{p.sku}</td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold px-2 py-1 rounded-md bg-red-100 text-red-700">
                    {p.stock}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between px-5 py-3.5 border-t border-black/5">
          <span className="text-xs text-regantify-text-muted">
            Total: {data?.total ?? 0} (threshold: {data?.threshold ?? threshold})
          </span>
        </div>
      </div>
    </div>
  );
}
