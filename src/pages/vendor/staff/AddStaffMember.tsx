import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronLeft, Copy, MessageSquare, Shuffle } from 'lucide-react';
import { SectionCard, Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { SaveBar, useUnsavedChangesWarning } from '../../../components/product/ProductFormKit';
import { outlineBtn } from '../../../components/ui/PageKit';
import { RolePicker } from '../../../components/staff/RolePicker';
import { AccessCard } from '../../../components/staff/AccessCard';
import { PermissionMatrix } from '../../../components/staff/PermissionMatrix';
import { staffApi, type CreateStaffMemberResponse, type UpdateStaffMemberPayload } from '../../../lib/staffApi';
import { permissionsFor, roleAllowedOnTier, type StaffPermission, type StaffRoleKey } from '../../../lib/staffPermissions';
import { BD_PHONE_HINT, normalizeBdPhone, toLatinDigits } from '../../../lib/bdPhone';
import { toast } from '../../../lib/toast';
import { isPlanLocked } from '../../../lib/api';

/** The custom-role select's "make a new one" choice. */
const NEW_ROLE = '__new__';
const WELCOME_MAX = 500;

const PASSWORD_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
function generateSuggestedPassword(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (n) => PASSWORD_ALPHABET[n % PASSWORD_ALPHABET.length]).join('');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// IPv4, or IPv6 written with colons.
const IP_RE = /^(\d{1,3}(\.\d{1,3}){3}|[0-9a-fA-F:]{2,39})$/;

async function copy(text: string, what: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied`);
  } catch {
    toast.error('Couldn’t copy. Select the text and copy it yourself.');
  }
}

/**
 * Staff > "Add staff" and "Edit staff" (/vendor/staff/:id/edit), owner-only
 * (rule-plan.md Step 8). The role picker shows what the plan unlocks; the
 * "Dashboard access" card shows what the picked role opens; "Custom" picks a
 * saved custom role or builds a new one with the permission table. On add,
 * the password is pre-filled with a random suggestion, kept so the owner can
 * see it again, and (by default) texted to them with their role.
 */
export default function AddStaffMember() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const rolesQuery = useQuery({ queryKey: ['staff-roles'], queryFn: staffApi.roles });
  const memberQuery = useQuery({ queryKey: ['staff', id], queryFn: () => staffApi.get(id!), enabled: isEdit });
  const roleTier = rolesQuery.data?.roleTier ?? 0;
  const customRoles = useMemo(() => rolesQuery.data?.customRoles ?? [], [rolesQuery.data]);
  const member = memberQuery.data;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(() => generateSuggestedPassword());
  const [allowedIp, setAllowedIp] = useState('');
  const [roleKey, setRoleKey] = useState<StaffRoleKey | null>(null); // set once we know the plan (add) or the member (edit)
  const [customChoice, setCustomChoice] = useState(''); // a saved custom role's id, or NEW_ROLE
  const [newRoleName, setNewRoleName] = useState('');
  const [newRolePerms, setNewRolePerms] = useState<StaffPermission[]>([]);
  const [welcome, setWelcome] = useState('');
  const [sendSms, setSendSms] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [upgradeNeeded, setUpgradeNeeded] = useState(false);
  const [created, setCreated] = useState<CreateStaffMemberResponse | null>(null);

  // Edit: fill the form once the member is loaded.
  useEffect(() => {
    if (!isEdit || !member || roleKey !== null) return;
    setName(member.name);
    setPhone(member.phone ?? '');
    setEmail(member.email ?? '');
    setAllowedIp(member.allowedIp ?? '');
    setWelcome(member.welcomeMessage ?? '');
    setCustomChoice(member.customRoleId ?? '');
    setRoleKey(member.roleKey ?? 'ADMIN');
  }, [isEdit, member, roleKey]);

  // Add: start from the least access the plan offers (Staff), else Admin on Free.
  useEffect(() => {
    if (isEdit || roleKey !== null || !rolesQuery.data) return;
    setRoleKey(roleAllowedOnTier('STAFF', rolesQuery.data.roleTier) ? 'STAFF' : 'ADMIN');
  }, [isEdit, roleKey, rolesQuery.data]);

  // Custom with no saved roles yet: go straight to making one.
  useEffect(() => {
    if (roleKey === 'CUSTOM' && !customChoice && rolesQuery.data) setCustomChoice(customRoles.length ? customRoles[0].id : NEW_ROLE);
  }, [roleKey, customChoice, customRoles, rolesQuery.data]);

  const role: StaffRoleKey = roleKey ?? 'ADMIN';
  const savedCustom = customRoles.find((r) => r.id === customChoice);
  const permissions: StaffPermission[] =
    role !== 'CUSTOM' ? permissionsFor({ roleKey: role }) : customChoice === NEW_ROLE ? newRolePerms : (savedCustom?.permissions ?? []);

  const normalizedPhone = normalizeBdPhone(phone);
  const errors = {
    name: !name.trim() ? 'Enter their name.' : null,
    phone: isEdit ? null : !phone.trim() ? 'Enter their phone number. They sign in with it.' : !normalizedPhone ? BD_PHONE_HINT : null,
    email: email.trim() && !EMAIL_RE.test(email.trim()) ? 'This email doesn’t look right. Check the @ and the dot.' : null,
    password: !isEdit && password.trim().length < 6 ? 'Use at least 6 characters.' : null,
    allowedIp: allowedIp.trim() && !IP_RE.test(allowedIp.trim()) ? 'Enter an IP like 103.112.54.10, or leave it empty.' : null,
    customRole:
      role !== 'CUSTOM'
        ? null
        : !customChoice
          ? 'Pick a custom role.'
          : customChoice === NEW_ROLE && !newRoleName.trim()
            ? 'Give the new role a name.'
            : customChoice === NEW_ROLE && newRolePerms.length === 0
              ? 'Tick at least one thing they can do.'
              : null,
  };
  const shown = (k: keyof typeof errors) => (submitted ? errors[k] : null);
  const valid = Object.values(errors).every((e) => !e);

  // Edit: only what changed is sent.
  const editChanges = useMemo((): UpdateStaffMemberPayload => {
    if (!isEdit || !member || roleKey === null) return {};
    const out: UpdateStaffMemberPayload = {};
    if (name.trim() !== member.name) out.name = name.trim();
    if (email.trim() !== (member.email ?? '')) out.email = email.trim() || null;
    if (allowedIp.trim() !== (member.allowedIp ?? '')) out.allowedIp = allowedIp.trim() || null;
    if (welcome.trim() !== (member.welcomeMessage ?? '')) out.welcomeMessage = welcome.trim() || null;
    if (roleKey !== member.roleKey || (roleKey === 'CUSTOM' && customChoice !== (member.customRoleId ?? ''))) out.roleKey = roleKey;
    return out;
  }, [isEdit, member, roleKey, name, email, allowedIp, welcome, customChoice]);
  const dirty = isEdit
    ? Object.keys(editChanges).length > 0 || (role === 'CUSTOM' && customChoice === NEW_ROLE)
    : !created && Boolean(name || phone || email || allowedIp || welcome);
  useUnsavedChangesWarning(dirty);

  const save = useMutation({
    mutationFn: async () => {
      let customRoleId: string | undefined;
      if (role === 'CUSTOM') {
        if (customChoice === NEW_ROLE) {
          const made = await staffApi.createRole({ name: newRoleName.trim(), permissions: newRolePerms });
          // Saved even if the next call fails, so a retry uses it instead of making it twice.
          setCustomChoice(made.id);
          queryClient.invalidateQueries({ queryKey: ['staff-roles'] });
          customRoleId = made.id;
        } else {
          customRoleId = customChoice;
        }
      }
      if (isEdit) {
        const payload: UpdateStaffMemberPayload = { ...editChanges };
        if (role === 'CUSTOM' && customRoleId !== (member?.customRoleId ?? undefined)) Object.assign(payload, { roleKey: role, customRoleId });
        return { kind: 'edit' as const, member: await staffApi.update(id!, payload) };
      }
      return {
        kind: 'add' as const,
        created: await staffApi.create({
          name: name.trim(),
          phone: normalizedPhone ?? phone.trim(),
          email: email.trim() || undefined,
          roleKey: role,
          customRoleId,
          password: password.trim(),
          allowedIp: allowedIp.trim() || undefined,
          welcomeMessage: welcome.trim() || undefined,
          sendLoginSms: sendSms,
        }),
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['staff-roles'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-plan-usage'] });
      if (result.kind === 'add') {
        setCreated(result.created);
      } else {
        toast.success(`${result.member.name} saved`);
        navigate('/vendor/staff');
      }
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      setFormError((Array.isArray(message) ? message[0] : message) ?? 'Couldn’t save. Check your connection and try again.');
      // A role (or seat) the plan doesn't include: offer the way to it (rule-plan.md Step 11).
      setUpgradeNeeded(isPlanLocked(err));
    },
  });

  if (created) return <AddedScreen created={created} onDone={() => navigate('/vendor/staff')} />;

  if (isEdit && (memberQuery.isLoading || (member && roleKey === null))) {
    return <p className="mx-auto max-w-3xl py-10 text-center text-sm text-neutral-500">Loading…</p>;
  }
  if (isEdit && !member) {
    return (
      <div className="mx-auto max-w-3xl py-10 text-center text-sm text-neutral-600">
        Couldn’t load this staff member.{' '}
        <Link to="/vendor/staff" className="font-medium text-brand underline-offset-2 hover:underline">
          Back to Staff
        </Link>
      </div>
    );
  }

  return (
    <form
      className="mx-auto max-w-3xl"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        setSubmitted(true);
        if (valid) save.mutate();
      }}
    >
      <div className="mb-4">
        <Link to="/vendor/staff" className="mb-2 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-regantify-text">
          <ChevronLeft size={16} aria-hidden />
          Staff
        </Link>
        <h1 className="text-[15px] font-semibold text-regantify-text">{isEdit ? `Edit ${member?.name ?? 'staff'}` : 'Add staff'}</h1>
        <p className="mt-0.5 text-sm text-neutral-500">
          {isEdit ? 'Changes apply the next time they click anything.' : 'They get their own sign-in to your store’s dashboard.'}
        </p>
      </div>

      <div className="space-y-4">
        <SectionCard title="Who they are">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" required error={shown('name')}>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahim" className={productInputClass} />
            </Field>
            {isEdit ? (
              <Field label="Phone" hint="Their sign-in number. To use another one, remove them and add them again.">
                <input type="text" value={phone} readOnly className={`${productInputClass} bg-neutral-50 text-neutral-600`} />
              </Field>
            ) : (
              <Field label="Phone" required error={shown('phone')} hint="They sign in with this number.">
                <input
                  type="text"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(toLatinDigits(e.target.value))}
                  placeholder="01XXXXXXXXX"
                  className={productInputClass}
                />
              </Field>
            )}
            <div className="sm:col-span-2">
              <Field label="Email" error={shown('email')}>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Optional" className={productInputClass} />
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Role" description="Pick what they do. You can change it any time.">
          {!rolesQuery.data ? (
            <p className="text-sm text-neutral-500">{rolesQuery.isError ? 'Couldn’t load the roles. Reload the page.' : 'Loading roles…'}</p>
          ) : (
            <div className="space-y-4">
              <RolePicker value={role} onChange={setRoleKey} roleTier={roleTier} />

              {role === 'CUSTOM' && (
                <div className="space-y-4 rounded-xl border border-line p-4">
                  <Field label="Custom role" error={shown('customRole')}>
                    <select value={customChoice} onChange={(e) => setCustomChoice(e.target.value)} className={productInputClass}>
                      {customRoles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                      <option value={NEW_ROLE}>New custom role…</option>
                    </select>
                  </Field>
                  {customChoice === NEW_ROLE ? (
                    <>
                      <Field label="Role name" hint="Saved for your store, so you can give it to others too.">
                        <input
                          type="text"
                          value={newRoleName}
                          maxLength={40}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          placeholder="e.g. Night shift"
                          className={productInputClass}
                        />
                      </Field>
                      <PermissionMatrix value={newRolePerms} onChange={setNewRolePerms} />
                    </>
                  ) : (
                    savedCustom && (
                      <p className="text-xs text-neutral-500">
                        {savedCustom.staffCount > 0 ? `${savedCustom.staffCount} on your team ${savedCustom.staffCount === 1 ? 'has' : 'have'} this role. ` : ''}
                        Changing a saved role changes it for everyone on it.
                      </p>
                    )
                  )}
                </div>
              )}

              <AccessCard permissions={permissions} />
            </div>
          )}
        </SectionCard>

        <SectionCard title="Sign-in">
          <div className="space-y-4">
            {!isEdit && (
              <Field label="Password" required error={shown('password')} hint="You can see it again later from the Staff page.">
                <div className="flex gap-2">
                  <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className={`${productInputClass} font-mono`} />
                  <button type="button" onClick={() => setPassword(generateSuggestedPassword())} className={`${outlineBtn} h-[42px] shrink-0`}>
                    <Shuffle size={14} aria-hidden />
                    New
                  </button>
                </div>
              </Field>
            )}
            <Field label="Allowed IP address" error={shown('allowedIp')} hint="Optional. They can sign in only from this internet connection, e.g. your shop’s.">
              <input type="text" value={allowedIp} onChange={(e) => setAllowedIp(e.target.value.trim())} placeholder="e.g. 103.112.54.10" className={productInputClass} />
            </Field>
            {!isEdit && (
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3">
                <input type="checkbox" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} className="mt-0.5 h-4 w-4 cursor-pointer accent-brand" />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-regantify-text">
                    <MessageSquare size={14} aria-hidden />
                    Send login details by SMS
                  </span>
                  <span className="mt-0.5 block text-xs text-neutral-500">
                    Their role, the login page, phone and password, to the number above. Free, it doesn’t use your SMS credits.
                  </span>
                </span>
              </label>
            )}
            {isEdit && <p className="text-xs text-neutral-500">Their password and login SMS are under Login details on the Staff page.</p>}
          </div>
        </SectionCard>

        <SectionCard title="Welcome message" description="Optional. They see it once, the next time they sign in.">
          <textarea
            value={welcome}
            maxLength={WELCOME_MAX}
            onChange={(e) => setWelcome(e.target.value)}
            rows={3}
            placeholder="Add a personal note…"
            className={`${productInputClass} min-h-[84px] py-2.5`}
          />
          <p className="mt-1 text-right text-xs tabular-nums text-neutral-400">
            {welcome.length}/{WELCOME_MAX}
          </p>
        </SectionCard>
      </div>

      <SaveBar
        message={
          formError ? (
            <span className="text-red-600">
              {formError}
              {upgradeNeeded && (
                <Link to="/vendor/billing" className="ml-2 font-medium text-brand underline-offset-2 hover:underline">
                  See plans
                </Link>
              )}
            </span>
          ) : submitted && !valid ? (
            <span className="text-red-600">Fix the fields marked in red.</span>
          ) : undefined
        }
      >
        <Link to="/vendor/staff" className={`${outlineBtn} h-10`}>
          Cancel
        </Link>
        <button
          type="submit"
          disabled={save.isPending || (isEdit && !dirty)}
          className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {save.isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add staff'}
        </button>
      </SaveBar>
    </form>
  );
}

/** After adding: the sign-in details to pass on, and whether the SMS went out. */
function AddedScreen({ created, onDone }: { created: CreateStaffMemberResponse; onDone: () => void }) {
  const loginUrl = `${window.location.origin}/vendor/login`;
  const details = `Role: ${created.role}\nLogin: ${loginUrl}\nPhone: ${created.phone ?? ''}\nPassword: ${created.temporaryPassword}`;
  const smsLine = created.smsSent
    ? `We sent their role and login details by SMS to ${created.phone}.`
    : created.smsError
      ? `The SMS didn’t go out (${created.smsError}). Send them these details yourself.`
      : 'No SMS was sent. Send them these details yourself (by message or in person).';
  return (
    <section className="mx-auto max-w-xl rounded-xl border border-line bg-white p-5">
      <CheckCircle2 className="text-emerald-600" size={28} aria-hidden />
      <h1 className="mt-2 text-[15px] font-semibold text-regantify-text">
        {created.name} is on your team as {created.role}
      </h1>
      <p className={`mt-1 text-sm ${created.smsError ? 'text-amber-700' : 'text-neutral-600'}`}>{smsLine}</p>
      <dl className="mt-4 space-y-2 rounded-lg border border-line bg-neutral-50 p-3 text-sm">
        {[
          ['Login page', loginUrl, false],
          ['Phone', created.phone ?? '', true],
          ['Password', created.temporaryPassword, true],
        ].map(([label, value, mono]) => (
          <div key={label as string} className="flex justify-between gap-3">
            <dt className="text-neutral-500">{label}</dt>
            <dd className={`min-w-0 break-all text-right ${mono ? 'font-mono tabular-nums' : ''}`}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-neutral-500">You can see the password again from Login details on the Staff page.</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button type="button" onClick={() => copy(details, 'Sign-in details')} className={`${outlineBtn} h-10`}>
          <Copy size={14} aria-hidden />
          Copy sign-in details
        </button>
        <button
          type="button"
          onClick={onDone}
          className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
        >
          Done
        </button>
      </div>
    </section>
  );
}
