import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCheck } from 'lucide-react';
import { Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { SaveBar, useUnsavedChangesWarning } from '../../../components/product/ProductFormKit';
import { outlineBtn } from '../../../components/ui/PageKit';
import { customersApi } from '../../../lib/customersApi';
import { normalizeBdPhone } from '../../../lib/bdPhone';
import { toast } from '../../../lib/toast';
import {
  CustomerFields,
  CustomerFormHeader,
  MoreOptions,
  customerPayload,
  emptyCustomer,
  useShownErrors,
  validateCustomer,
  type CustomerFormValues,
} from './CustomerForm';

function useDebounced<T>(value: T, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * Customers > "+ Add New" — a vendor registering a customer directly,
 * with no order involved. Only Name and Phone are required.
 * See CustomersService.create on the backend for what actually happens
 * on submit: this creates the customer's platform-wide login account
 * (if the phone doesn't have one yet) plus this vendor's own note of
 * their profile, which is what makes them show up on this vendor's
 * Customers list even before any order exists. Saving an existing
 * customer's phone replaces their saved details, so the page says so
 * as soon as a full number is typed.
 */
export default function AddCustomer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [values, setValues] = useState<CustomerFormValues>(emptyCustomer);
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const errors = validateCustomer(values, password, true);
  const { touch, shown, submit } = useShownErrors(errors);
  const onChange = (field: keyof CustomerFormValues, value: string) => setValues((prev) => ({ ...prev, [field]: value }));

  const dirty = !saved && Object.values(values).some((v) => v.trim() !== '');
  useUnsavedChangesWarning(dirty);

  // A full number that's already one of this store's customers.
  const phone = normalizeBdPhone(values.phone);
  const debouncedPhone = useDebounced(phone, 400);
  const { data: existing } = useQuery({
    queryKey: ['customers', debouncedPhone],
    queryFn: () => customersApi.findOne(debouncedPhone!),
    enabled: Boolean(debouncedPhone),
    retry: false,
  });
  const alreadyCustomer = existing && phone === debouncedPhone ? existing : null;

  const createMutation = useMutation({
    mutationFn: () => customersApi.create({ ...customerPayload(values), phone: phone!, password: password.trim() || undefined }),
    onSuccess: (customer) => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer added');
      navigate(`/vendor/customers/${encodeURIComponent(customer.phone)}`);
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      setFormError(
        (Array.isArray(message) ? message[0] : message) ?? 'Couldn’t add this customer. Check your connection and try again.',
      );
    },
  });

  const handleSubmit = () => {
    setFormError(null);
    submit();
    if (Object.keys(errors).length > 0) return;
    createMutation.mutate();
  };

  return (
    <form
      className="mx-auto max-w-3xl"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
      noValidate
    >
      <CustomerFormHeader
        backTo="/vendor/customers"
        backLabel="Customers"
        title="Add customer"
        description="For someone who orders by phone, Facebook or in the shop. Name and phone are enough."
      />

      <div className="space-y-4">
        <CustomerFields
          values={values}
          onChange={onChange}
          shown={shown}
          touch={touch}
          phoneNote={
            alreadyCustomer && (
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-brand-lime bg-brand-lime/25 px-3 py-2.5 text-sm">
                <UserCheck size={16} className="shrink-0 text-brand" aria-hidden />
                <span className="text-regantify-text">
                  Already one of your customers:{' '}
                  <Link to={`/vendor/customers/${encodeURIComponent(alreadyCustomer.phone)}`} className="font-medium underline-offset-2 hover:underline">
                    {alreadyCustomer.name}
                  </Link>
                  . Saving here replaces their saved details.
                </span>
              </div>
            )
          }
        />

        <MoreOptions>
          <Field
            label="Storefront password"
            error={shown('password')}
            hint="Only if they want to log in to your store now. They can also set one later with their phone number."
          >
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => touch('password')}
              placeholder="At least 6 characters"
              autoComplete="new-password"
              className={productInputClass}
            />
          </Field>
        </MoreOptions>
      </div>

      <SaveBar message={formError ? <span className="text-red-600">{formError}</span> : 'Name and phone are required.'}>
        <Link to="/vendor/customers" className={`${outlineBtn} h-10`}>
          Cancel
        </Link>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="h-10 rounded-lg bg-brand px-4 text-sm font-medium text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {createMutation.isPending ? 'Adding…' : 'Add customer'}
        </button>
      </SaveBar>
    </form>
  );
}
