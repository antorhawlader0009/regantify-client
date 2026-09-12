import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { SectionCard, Field, inputClass } from '../../../components/product/ProductFormPieces';
import { customersApi } from '../../../lib/customersApi';
import { toast } from '../../../lib/toast';

/**
 * Customers > click a name > "Edit Customer" — same Personal Information
 * form as Add Customer, minus a couple of things that don't make sense
 * once a customer already exists: phone is shown read-only (it's the
 * lookup key everywhere — the URL, the vendor's note, the Customer
 * account's own unique key — so changing it isn't a simple field edit),
 * and password is a "Set New Password" toggle rather than a plain text
 * field, so an existing password is never blanked out by accident just
 * from opening this form.
 */
export default function EditCustomer() {
  const { phone } = useParams<{ phone: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customers', phone],
    queryFn: () => customersApi.findOne(phone!),
    enabled: Boolean(phone),
  });

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [showPasswordField, setShowPasswordField] = useState(false);
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [zip, setZip] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  // Fills the form once the customer's current details arrive — a plain
  // one-time fill, not a controlled sync, so it never fights the
  // vendor's own edits if this query happens to refetch in the background.
  useEffect(() => {
    if (!customer) return;
    setName(customer.name);
    setEmail(customer.email ?? '');
    setAddress(customer.address ?? '');
    setCity(customer.city ?? '');
    setDistrict(customer.district ?? '');
    setZip(customer.zip ?? '');
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: () =>
      customersApi.update(phone!, {
        name: name.trim(),
        email: email.trim() || undefined,
        password: showPasswordField && password.trim() ? password.trim() : undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        zip: zip.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated.');
      navigate(`/vendor/customers/${encodeURIComponent(phone!)}`);
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Could not update this customer. Please try again.');
    },
  });

  const isValid = name.trim().length > 0 && (!showPasswordField || password.trim().length >= 6);

  const handleSubmit = () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Customer name is required.');
      return;
    }
    if (showPasswordField && password.trim().length < 6) {
      setFormError('New password must be at least 6 characters.');
      return;
    }
    updateMutation.mutate();
  };

  if (isLoading) {
    return <div className="text-sm text-regantify-text-muted">Loading…</div>;
  }

  if (!customer) {
    return <div className="text-sm text-regantify-text-muted">Customer not found.</div>;
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate(`/vendor/customers/${encodeURIComponent(phone!)}`)}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        {customer.name}
      </button>

      <h1 className="text-2xl font-semibold text-regantify-text mb-6">Edit {customer.name}</h1>

      <div className="space-y-6">
        <SectionCard title="Personal Information">
          <div className="space-y-5">
            <Field label="Name" required>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer Name"
                className={inputClass}
              />
            </Field>

            <Field label="Phone" hint="Phone number can't be changed here">
              <input type="text" value={customer.phone} disabled className={inputClass + ' opacity-60 cursor-not-allowed'} />
            </Field>

            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Valid email address"
                className={inputClass}
              />
            </Field>

            <Field label="Password">
              {showPasswordField ? (
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  autoFocus
                  className={inputClass}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPasswordField(true)}
                  className="text-sm text-regantify-cta hover:underline"
                >
                  Set New Password
                </button>
              )}
            </Field>

            <Field label="Address">
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Special instructions for this order"
                rows={3}
                className={inputClass + ' resize-y'}
              />
            </Field>

            <Field label="City/Thana">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="ie. Dhaka, Uttara, Gazipur"
                className={inputClass}
              />
            </Field>

            <Field label="District">
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="ie. Dhaka, Sylhet, Chattogram"
                className={inputClass}
              />
            </Field>

            <Field label="Zip Code">
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="####"
                className={inputClass}
              />
            </Field>
          </div>
        </SectionCard>

        {formError && <p className="text-red-500 text-sm">{formError}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!isValid || updateMutation.isPending}
          className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium
            transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {updateMutation.isPending ? 'Updating…' : 'Update Customer'}
        </button>
      </div>
    </div>
  );
}
