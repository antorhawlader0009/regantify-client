import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserX } from 'lucide-react';
import { Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { SaveBar, useUnsavedChangesWarning } from '../../../components/product/ProductFormKit';
import { EmptyState, outlineBtn } from '../../../components/ui/PageKit';
import { customersApi, type VendorCustomerDetail } from '../../../lib/customersApi';
import { toast } from '../../../lib/toast';
import {
  CustomerFields,
  CustomerFormHeader,
  customerPayload,
  emptyCustomer,
  useShownErrors,
  validateCustomer,
  type CustomerFormValues,
} from './CustomerForm';

function valuesOf(customer: VendorCustomerDetail): CustomerFormValues {
  return {
    name: customer.name,
    phone: customer.phone,
    email: customer.email ?? '',
    address: customer.address ?? '',
    city: customer.city ?? '',
    district: customer.district ?? '',
    zip: customer.zip ?? '',
  };
}

/**
 * Customers > a customer > "Edit" — the same sections as Add Customer,
 * minus a couple of things that don't make sense once a customer
 * already exists: phone is shown read-only (it's the lookup key
 * everywhere — the URL, the vendor's note, the Customer account's own
 * unique key — so changing it isn't a simple field edit). There is no password here:
 * the shopper's login is shared by every store, so only the shopper sets it,
 * with an OTP on the store (security-findings F-20).
 */
export default function EditCustomer() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const detailPath = `/vendor/customers/${encodeURIComponent(phone ?? '')}`;

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customers', phone],
    queryFn: () => customersApi.findOne(phone!),
    enabled: Boolean(phone),
    retry: false,
  });

  const [values, setValues] = useState<CustomerFormValues>(emptyCustomer);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Fills the form once the customer's current details arrive — a plain
  // one-time fill, not a controlled sync, so it never fights the
  // vendor's own edits if this query happens to refetch in the background.
  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (!customer || filled) return;
    setValues(valuesOf(customer));
    setFilled(true);
  }, [customer, filled]);

  const errors = validateCustomer(values, false);
  const { touch, shown, submit } = useShownErrors(errors);
  const onChange = (field: keyof CustomerFormValues, value: string) => setValues((prev) => ({ ...prev, [field]: value }));

  const dirty = useMemo(() => {
    if (!customer || !filled || saved) return false;
    const start = valuesOf(customer);
    return (Object.keys(start) as (keyof CustomerFormValues)[]).some((k) => start[k].trim() !== values[k].trim());
  }, [customer, filled, saved, values]);
  useUnsavedChangesWarning(dirty);

  const updateMutation = useMutation({
    mutationFn: () =>
      customersApi.update(phone!, customerPayload(values)),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer saved');
      navigate(detailPath);
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      setFormError(
        (Array.isArray(message) ? message[0] : message) ?? 'Couldn’t save this customer. Check your connection and try again.',
      );
    },
  });

  const handleSubmit = () => {
    setFormError(null);
    submit();
    if (Object.keys(errors).length > 0) return;
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy>
        <div className="h-12 w-48 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-56 animate-pulse rounded-xl bg-neutral-100" />
        <div className="h-44 animate-pulse rounded-xl bg-neutral-100" />
      </div>
    );
  }

  if (!customer) {
    return (
      <section className="mx-auto max-w-3xl rounded-xl border border-line bg-white">
        <EmptyState
          icon={UserX}
          title="This customer isn’t in your store"
          hint="They may have been deleted, or the link has a typo."
          action={
            <Link to="/vendor/customers" className={outlineBtn}>
              Back to customers
            </Link>
          }
        />
      </section>
    );
  }

  return (
    <form
      className="mx-auto max-w-3xl"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      noValidate
    >
      <CustomerFormHeader backTo={detailPath} backLabel={customer.name} title={`Edit ${customer.name}`} description="Changes apply to this store only." />

      <div className="space-y-4">
        <CustomerFields
          values={values}
          onChange={onChange}
          shown={shown}
          touch={touch}
          phoneSlot={
            <Field label="Phone" hint="The phone number is how this customer is found, so it can’t be changed.">
              <input value={customer.phone} disabled className={productInputClass} />
            </Field>
          }
        />
      </div>

      <SaveBar message={formError ? <span className="text-red-600">{formError}</span> : dirty ? 'You have unsaved changes.' : undefined}>
        <Link to={detailPath} className={`${outlineBtn} h-10`}>
          Cancel
        </Link>
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="h-10 rounded-lg bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {updateMutation.isPending ? 'Saving…' : 'Save customer'}
        </button>
      </SaveBar>
    </form>
  );
}
