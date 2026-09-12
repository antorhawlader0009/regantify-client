import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { SectionCard, Field, inputClass } from '../../../components/product/ProductFormPieces';
import { staffApi } from '../../../lib/staffApi';
import { toast } from '../../../lib/toast';

const ROLE_OPTIONS = ['Admin', 'Shop Manager', 'Customer Support'];

const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
function generateSuggestedPassword(): string {
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += PASSWORD_ALPHABET[Math.floor(Math.random() * PASSWORD_ALPHABET.length)];
  }
  return password;
}

/**
 * Staff > "+ Add New" — owner-only (see StaffController), matches the
 * reference Add Member form. The password field is pre-filled with a
 * random suggestion the vendor can edit or regenerate — there's no
 * email service in this app to actually deliver it (see
 * StaffService.create's own comment), so after creating the member the
 * vendor sees this same password one more time in a confirmation
 * screen and is expected to relay it themselves, rather than the
 * reference form's "This password will be mailed to the user" actually
 * happening automatically.
 */
export default function AddStaffMember() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(() => generateSuggestedPassword());
  const [role, setRole] = useState(ROLE_OPTIONS[2]);
  const [allowedIp, setAllowedIp] = useState('');

  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; password: string } | null>(null);

  const createMutation = useMutation({
    mutationFn: () =>
      staffApi.create({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        role,
        password: password.trim() || undefined,
        allowedIp: allowedIp.trim() || undefined,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      setCreated({ name: result.name, password: result.temporaryPassword });
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Could not add this team member. Please try again.');
    },
  });

  const isValid = name.trim().length > 0 && phone.trim().length > 0 && password.trim().length >= 6;

  const handleSubmit = () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Name is required.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Phone number is required.');
      return;
    }
    if (password.trim().length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }
    createMutation.mutate();
  };

  if (created) {
    return (
      <div className="max-w-2xl">
        <div className="bg-white rounded-2xl border border-black/5 p-6">
          <h1 className="text-xl font-semibold text-regantify-text mb-2">{created.name} has been added</h1>
          <p className="text-sm text-regantify-text-muted mb-4">
            There's no email service set up yet to send this automatically — please share these sign-in details with{' '}
            {created.name} yourself.
          </p>
          <div className="rounded-xl bg-regantify-content p-4 mb-5">
            <p className="text-xs text-regantify-text-muted mb-1">Password</p>
            <p className="text-sm font-mono text-regantify-text">{created.password}</p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/vendor/staff')}
            className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white text-sm font-medium transition-colors"
          >
            Back to Staff
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/vendor/staff')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Staffs
      </button>

      <h1 className="text-2xl font-semibold text-regantify-text mb-6">Add Member</h1>

      <div className="space-y-6">
        <SectionCard title="Account Details">
          <div className="space-y-5">
            <Field label="Name">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" className={inputClass} />
            </Field>

            <Field label="Phone">
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

            <Field label="Password" hint="Shared with the new member after creation — there's no email service to send it automatically">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
                <button
                  type="button"
                  onClick={() => setPassword(generateSuggestedPassword())}
                  className="px-4 py-2.5 rounded-xl border border-black/10 text-sm text-regantify-text hover:bg-regantify-content whitespace-nowrap"
                >
                  Regenerate
                </button>
              </div>
            </Field>

            <Field label="Role">
              <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Allowed IP Address" hint="Restrict access from a single IP Address">
              <input
                type="text"
                value={allowedIp}
                onChange={(e) => setAllowedIp(e.target.value)}
                placeholder="Restrict access from a single IP Address"
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
          {createMutation.isPending ? 'Adding…' : 'Add Member'}
        </button>
      </div>
    </div>
  );
}
