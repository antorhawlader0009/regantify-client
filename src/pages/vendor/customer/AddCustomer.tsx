import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { SectionCard, Field, inputClass } from '../../../components/product/ProductFormPieces';
import { customersApi } from '../../../lib/customersApi';
import { toast } from '../../../lib/toast';

/**
 * Customers > "+ Add New" — a vendor registering a customer directly,
 * with no order involved. Only Name and Phone are required (matches the
 * reference form, where every other field is a plain optional input).
 * See CustomersService.create on the backend for what actually happens
 * on submit: this creates the customer's platform-wide login account
 * (if the phone doesn't have one yet) plus this vendor's own note of
 * their profile, which is what makes them show up on this vendor's
 * Customers list even before any order exists.
 */
export default function AddCustomer() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [zip, setZip] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      customersApi.create({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        password: password.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        district: district.trim() || undefined,
        zip: zip.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer added.');
      navigate('/vendor/customers');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Could not add this customer. Please try again.');
    },
  });

  const isValid = name.trim().length > 0 && phone.trim().length > 0;

  const handleSubmit = () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Customer name is required.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Phone number is required.');
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/vendor/customers')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Customers
      </button>

      <h1 className="text-2xl font-semibold text-regantify-text mb-6">Add Customer</h1>

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

            <Field label="Phone" required>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Mobile phone number"
                className={inputClass}
              />
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

            <Field label="Password" hint="Optional — leave blank if this customer will set their own later">
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className={inputClass}
              />
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
          disabled={!isValid || createMutation.isPending}
          className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium
            transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {createMutation.isPending ? 'Adding…' : 'Add Customer'}
        </button>
      </div>
    </div>
  );
}
