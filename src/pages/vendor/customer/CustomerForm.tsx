import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { Field, SectionCard, productInputClass } from '../../../components/product/ProductFormPieces';
import { SearchableSelect } from '../../../components/ui/SearchableSelect';
import { BD_DISTRICTS } from '../../../lib/bdDistricts';
import { BD_PHONE_HINT, normalizeBdPhone, toLatinDigits } from '../../../lib/bdPhone';

// Add Customer and Edit Customer share these pieces (theme-update-plan.md
// Step 4): the same Contact / Delivery address / More options sections,
// with errors shown under each field once it has been left or Save was
// pressed.

export interface CustomerFormValues {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  district: string;
  zip: string;
}

export type CustomerField = keyof CustomerFormValues | 'password';
export type CustomerErrors = Partial<Record<CustomerField, string>>;

export const emptyCustomer: CustomerFormValues = { name: '', phone: '', email: '', address: '', city: '', district: '', zip: '' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What's wrong with the form, per field. `checkPhone` is off on Edit, where the phone can't change. */
export function validateCustomer(values: CustomerFormValues, password: string | null, checkPhone: boolean): CustomerErrors {
  const errors: CustomerErrors = {};
  if (!values.name.trim()) errors.name = 'Enter the customer’s name.';
  if (checkPhone) {
    if (!values.phone.trim()) errors.phone = 'Enter a phone number.';
    else if (!normalizeBdPhone(values.phone)) errors.phone = BD_PHONE_HINT;
  }
  if (values.email.trim() && !EMAIL_RE.test(values.email.trim())) errors.email = 'This email doesn’t look right. Check the @ and the dot.';
  if (password != null && password.trim() && password.trim().length < 6) errors.password = 'Use at least 6 characters.';
  return errors;
}

/** The payload fields every save sends: trimmed, blanks left out. */
export function customerPayload(values: CustomerFormValues) {
  return {
    name: values.name.trim(),
    email: values.email.trim() || undefined,
    address: values.address.trim() || undefined,
    city: values.city.trim() || undefined,
    district: values.district.trim() || undefined,
    zip: values.zip.trim() || undefined,
  };
}

/**
 * Touched fields + "Save was pressed": an error shows once the field was
 * left, or after the first Save, and then updates as you type.
 */
export function useShownErrors(errors: CustomerErrors) {
  const [touched, setTouched] = useState<Set<CustomerField>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const touch = (field: CustomerField) => setTouched((prev) => (prev.has(field) ? prev : new Set(prev).add(field)));
  const shown = (field: CustomerField) => (submitted || touched.has(field) ? errors[field] ?? null : null);
  return { touch, shown, submit: () => setSubmitted(true) };
}

/** "← Customers" back link plus the 15px title and one help line. */
export function CustomerFormHeader({ backTo, backLabel, title, description }: { backTo: string; backLabel: string; title: string; description: ReactNode }) {
  return (
    <div className="mb-4">
      <Link to={backTo} className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-regantify-text">
        <ChevronLeft size={16} aria-hidden />
        {backLabel}
      </Link>
      <h1 className="text-[15px] font-semibold text-regantify-text">{title}</h1>
      <p className="mt-0.5 text-sm text-neutral-500">{description}</p>
    </div>
  );
}

/** Contact + Delivery address sections. `phoneSlot` replaces the phone input (Edit shows it read-only). */
export function CustomerFields({
  values,
  onChange,
  shown,
  touch,
  phoneSlot,
  phoneNote,
}: {
  values: CustomerFormValues;
  onChange: (field: keyof CustomerFormValues, value: string) => void;
  shown: (field: CustomerField) => string | null;
  touch: (field: CustomerField) => void;
  phoneSlot?: ReactNode;
  /** Shown under the Contact fields, e.g. "Already one of your customers". */
  phoneNote?: ReactNode;
}) {
  // The 64 districts plus whatever is already saved (an old order may spell it differently).
  const districtOptions = useMemo(() => {
    const names = values.district && !BD_DISTRICTS.includes(values.district) ? [values.district, ...BD_DISTRICTS] : BD_DISTRICTS;
    return names.map((label, id) => ({ id, label }));
  }, [values.district]);
  const districtId = districtOptions.find((o) => o.label === values.district)?.id ?? null;

  return (
    <>
      <SectionCard title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          {phoneSlot ?? (
            <Field label="Phone" required error={shown('phone')}>
              <input
                value={values.phone}
                onChange={(e) => onChange('phone', toLatinDigits(e.target.value))}
                onBlur={() => touch('phone')}
                placeholder="01XXXXXXXXX"
                inputMode="tel"
                autoComplete="off"
                className={productInputClass}
              />
            </Field>
          )}
          <Field label="Name" required error={shown('name')}>
            <input
              value={values.name}
              onChange={(e) => onChange('name', e.target.value)}
              onBlur={() => touch('name')}
              placeholder="Customer’s name"
              className={productInputClass}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Email" error={shown('email')}>
              <input
                type="email"
                value={values.email}
                onChange={(e) => onChange('email', e.target.value)}
                onBlur={() => touch('email')}
                placeholder="Optional"
                className={productInputClass}
              />
            </Field>
          </div>
        </div>
        {phoneNote}
      </SectionCard>

      <SectionCard title="Delivery address" description="Filled in for you when you create an order for this customer.">
        <div className="space-y-4">
          <Field label="Address">
            <textarea
              value={values.address}
              onChange={(e) => onChange('address', e.target.value)}
              rows={2}
              placeholder="House, road, area"
              className={`${productInputClass} resize-y`}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="District">
              <SearchableSelect
                value={districtId}
                options={districtOptions}
                onChange={(id) => onChange('district', districtOptions.find((o) => o.id === id)?.label ?? '')}
                placeholder="Choose a district"
                ariaLabel="District"
                className={productInputClass}
              />
            </Field>
            <Field label="City / thana">
              <input value={values.city} onChange={(e) => onChange('city', e.target.value)} placeholder="e.g. Uttara" className={productInputClass} />
            </Field>
            <Field label="Zip code">
              <input
                value={values.zip}
                onChange={(e) => onChange('zip', toLatinDigits(e.target.value))}
                placeholder="e.g. 1230"
                inputMode="numeric"
                className={productInputClass}
              />
            </Field>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

/** A folded section for the rarely used fields. */
export function MoreOptions({ children, defaultOpen = false }: { children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-xl border border-line bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-3.5 text-left sm:px-5"
      >
        <span>
          <span className="block text-[15px] font-semibold text-regantify-text">More options</span>
          <span className="block text-sm text-neutral-500">Storefront password</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-neutral-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open && <div className="border-t border-line px-4 py-4 sm:px-5">{children}</div>}
    </section>
  );
}
