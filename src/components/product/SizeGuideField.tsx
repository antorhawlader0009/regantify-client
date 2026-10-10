import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { SIZE_GUIDES_KEY, sizeGuidesApi } from '../../lib/sizeGuidesApi';
import { Field, productInputClass } from './ProductFormPieces';

/**
 * Add / Edit Product: the size guide this product shows beside its Size choice on the store (StorePal). Empty uses
 * the guide of the product's category, if that has one. Guides are made once on Product > Size Guides.
 */
export function SizeGuideField({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { data: guides = [] } = useQuery({ queryKey: SIZE_GUIDES_KEY, queryFn: sizeGuidesApi.list });

  return (
    <div className="mb-5">
      <Field
        label="Size guide"
        hint="Shown as a “Size guide” link beside the Size choice on your store. Empty uses the guide of the product’s category, if it has one."
      >
        <select value={value} onChange={(e) => onChange(e.target.value)} className={productInputClass}>
          <option value="">{guides.length === 0 ? 'No size guides yet' : 'Use the category’s guide (or none)'}</option>
          {guides.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </Field>
      <p className="mt-1.5 text-xs text-regantify-text-muted">
        <Link to="/vendor/product/size-guides" className="text-regantify-cta hover:underline">
          Make or change size guides
        </Link>
      </p>
    </div>
  );
}
