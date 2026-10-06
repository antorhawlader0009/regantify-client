import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Lock, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Dialog } from '../../../components/ui/Dialog';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { PermissionMatrix } from '../../../components/staff/PermissionMatrix';
import { AccessCard } from '../../../components/staff/AccessCard';
import { staffApi, type StaffCustomRole } from '../../../lib/staffApi';
import {
  STAFF_ROLE_KEYS,
  STAFF_ROLE_MIN_TIER,
  STAFF_ROLES,
  accessAreas,
  permissionsFor,
  roleAllowedOnTier,
  type PresetRoleKey,
  type StaffPermission,
} from '../../../lib/staffPermissions';
import { toast } from '../../../lib/toast';

const TIER_PLAN = ['Free', 'Basic', 'Starter', 'Advance'];
const PRESETS = STAFF_ROLE_KEYS.filter((k): k is PresetRoleKey => k !== 'CUSTOM');

const errorText = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return (Array.isArray(message) ? message[0] : typeof message === 'string' ? message : null) ?? fallback;
};

function Chips({ permissions }: { permissions: readonly StaffPermission[] }) {
  const areas = accessAreas(permissions);
  if (!areas.length) return <p className="text-xs text-neutral-500">Can’t open anything yet.</p>;
  return (
    <ul className="flex flex-wrap gap-1">
      {areas.map((a) => (
        <li key={a.key} className="rounded-full border border-line bg-white px-2 py-0.5 text-[11px] text-neutral-700">
          {a.label}
        </li>
      ))}
    </ul>
  );
}

type Draft = { id?: string; name: string; description: string; permissions: StaffPermission[] };

/**
 * Staff > Roles (rule-plan.md Step 9): the ready-made roles (read-only, with
 * "Duplicate" to start a custom one from them) and the store's saved custom
 * roles (edit, duplicate, delete). Custom roles are on the Advance plan.
 */
export function StaffRolesTab() {
  const queryClient = useQueryClient();
  const rolesQuery = useQuery({ queryKey: ['staff-roles'], queryFn: staffApi.roles });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<StaffCustomRole | null>(null);

  const roleTier = rolesQuery.data?.roleTier ?? 0;
  const customRoles = rolesQuery.data?.customRoles ?? [];
  const canCustom = roleAllowedOnTier('CUSTOM', roleTier);
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['staff-roles'] });
    queryClient.invalidateQueries({ queryKey: ['staff'] });
  };

  const duplicate = useMutation({
    mutationFn: (id: string) => staffApi.duplicateRole(id),
    onSuccess: (r) => {
      refresh();
      toast.success(`Made “${r.name}”`);
    },
    onError: (err) => toast.error(errorText(err, 'Couldn’t duplicate this role.')),
  });
  const remove = useMutation({
    mutationFn: (id: string) => staffApi.deleteRole(id),
    onSuccess: () => {
      refresh();
      toast.success(`Deleted “${deleting?.name}”`);
      setDeleting(null);
    },
    onError: (err) => toast.error(errorText(err, 'Couldn’t delete this role.')),
  });

  if (rolesQuery.isLoading) return <p className="py-8 text-center text-sm text-neutral-500">Loading roles…</p>;
  if (rolesQuery.isError) return <p className="py-8 text-center text-sm text-neutral-600">Couldn’t load the roles. Reload the page.</p>;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-regantify-text">Your custom roles</h2>
            <p className="mt-0.5 text-sm text-neutral-500">Pick exactly what someone can do, save it once and give it to anyone.</p>
          </div>
          {canCustom ? (
            <button type="button" onClick={() => setDraft({ name: '', description: '', permissions: [] })} className={primaryBtn}>
              <Plus size={15} aria-hidden />
              New custom role
            </button>
          ) : (
            <Link to="/vendor/billing" className={`${outlineBtn} text-brand`}>
              <Sparkles size={14} aria-hidden />
              Upgrade to {TIER_PLAN[STAFF_ROLE_MIN_TIER.CUSTOM]} for custom roles
            </Link>
          )}
        </div>
        {customRoles.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line px-3 py-5 text-center text-sm text-neutral-600">
            {canCustom ? 'No custom roles yet. Make one, or duplicate a ready-made role below and change it.' : 'Custom roles come with the Advance plan.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {customRoles.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start gap-3 rounded-lg border border-line p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-regantify-text">
                    {r.name}
                    <span className="ml-2 text-xs font-normal text-neutral-500">
                      {r.staffCount === 0 ? 'No one has it yet' : `${r.staffCount} on your team`}
                    </span>
                  </p>
                  {r.description && <p className="mt-0.5 text-xs text-neutral-500">{r.description}</p>}
                  <div className="mt-2">
                    <Chips permissions={r.permissions} />
                  </div>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDraft({ id: r.id, name: r.name, description: r.description ?? '', permissions: r.permissions })}
                    className={outlineBtn}
                  >
                    <Pencil size={14} aria-hidden />
                    Edit
                  </button>
                  <button type="button" disabled={!canCustom || duplicate.isPending} onClick={() => duplicate.mutate(r.id)} className={`${outlineBtn} disabled:opacity-50`}>
                    <Copy size={14} aria-hidden />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    disabled={r.staffCount > 0}
                    title={r.staffCount > 0 ? 'Give the people on this role another role first' : undefined}
                    onClick={() => setDeleting(r)}
                    aria-label={`Delete ${r.name}`}
                    className={`${outlineBtn} text-red-600 disabled:opacity-40`}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
        <h2 className="text-[15px] font-semibold text-regantify-text">Ready-made roles</h2>
        <p className="mt-0.5 text-sm text-neutral-500">Kept up to date for you. To change one, duplicate it as a custom role.</p>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {PRESETS.map((key) => {
            const role = STAFF_ROLES[key];
            const Icon = role.icon;
            const locked = !roleAllowedOnTier(key, roleTier);
            return (
              <li key={key} className="flex flex-col gap-2 rounded-lg border border-line p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line text-regantify-text">
                    <Icon size={17} strokeWidth={1.8} aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-medium text-regantify-text">
                      {role.name}
                      {locked && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-normal text-neutral-500">
                          <Lock size={11} aria-hidden />
                          {TIER_PLAN[STAFF_ROLE_MIN_TIER[key]]} plan
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-neutral-500">{role.description}</p>
                  </div>
                </div>
                <Chips permissions={permissionsFor({ roleKey: key })} />
                {canCustom && (
                  <button
                    type="button"
                    onClick={() => setDraft({ name: `${role.name} (custom)`, description: '', permissions: permissionsFor({ roleKey: key }) })}
                    className="self-start text-xs font-medium text-brand underline-offset-2 hover:underline"
                  >
                    Duplicate as a custom role
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <RoleDialog draft={draft} onClose={() => setDraft(null)} onSaved={refresh} />

      <ConfirmDialog
        open={deleting != null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `Delete “${deleting.name}”?` : ''}
        message="It’s gone for good. No one has this role, so no one loses access."
        confirmLabel="Delete role"
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        busy={remove.isPending}
        danger
      />
    </div>
  );
}

/** New or edit custom role: name, note, the permission table, and the access card it adds up to. */
function RoleDialog({ draft, onClose, onSaved }: { draft: Draft | null; onClose: () => void; onSaved: () => void }) {
  return (
    <Dialog open={draft != null} onOpenChange={(open) => !open && onClose()} title={draft?.id ? `Edit “${draft.name}”` : 'New custom role'} maxWidth="max-w-4xl">
      {draft && <RoleForm key={draft.id ?? 'new'} draft={draft} onClose={onClose} onSaved={onSaved} />}
    </Dialog>
  );
}

function RoleForm({ draft, onClose, onSaved }: { draft: Draft; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(draft.name);
  const [description, setDescription] = useState(draft.description);
  const [permissions, setPermissions] = useState<StaffPermission[]>(draft.permissions);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      draft.id
        ? staffApi.updateRole(draft.id, { name: name.trim(), description: description.trim() || null, permissions })
        : staffApi.createRole({ name: name.trim(), description: description.trim() || undefined, permissions }),
    onSuccess: (r) => {
      onSaved();
      toast.success(draft.id ? `Saved “${r.name}”` : `Made “${r.name}”`);
      onClose();
    },
    onError: (err) => setError(errorText(err, 'Couldn’t save this role.')),
  });

  return (
    <form
      className="space-y-4 px-6 pb-6 pt-3"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        if (!name.trim()) return setError('Give the role a name.');
        if (!permissions.length) return setError('Tick at least one thing this role can do.');
        save.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Role name" required>
          <input type="text" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. Night shift" className={productInputClass} />
        </Field>
        <Field label="Note" hint="Optional. For you, e.g. who it’s for.">
          <input type="text" value={description} maxLength={200} onChange={(e) => setDescription(e.target.value)} className={productInputClass} />
        </Field>
      </div>
      <PermissionMatrix value={permissions} onChange={setPermissions} />
      <AccessCard permissions={permissions} />
      {draft.id && <p className="text-xs text-neutral-500">Changes apply to everyone on this role the next time they click anything.</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className={outlineBtn}>
          Cancel
        </button>
        <button type="submit" disabled={save.isPending} className={`${primaryBtn} disabled:opacity-60`}>
          {save.isPending ? 'Saving…' : draft.id ? 'Save role' : 'Make role'}
        </button>
      </div>
    </form>
  );
}
