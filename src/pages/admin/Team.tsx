import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { adminTeamApi, type TeamMember } from '../../lib/adminTeamApi';
import { ADMIN_ROLE_LABEL } from '../../lib/adminPermissions';
import { useAuthStore } from '../../store/authStore';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { formatDhakaDateTime } from '../../lib/dhakaDate';
import { Dialog } from '../../components/ui/Dialog';

const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm text-regantify-text focus:outline-none';
const label = 'mb-1.5 block text-sm font-medium text-regantify-text';
type Role3 = 'MANAGER' | 'FINANCE' | 'SUPPORT';

/** A temporary password is shown once, here, so it can be handed over. */
function PasswordShown({ who, password, onClose }: { who: string; password: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!password} onOpenChange={(o) => !o && onClose()} maxWidth="max-w-md">
      <div className="space-y-4 p-6">
        <h2 className="font-semibold text-regantify-text">Temporary password for {who}</h2>
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-center font-mono text-lg tracking-wider text-amber-900">{password}</p>
        <p className="text-xs text-regantify-text-muted">This is shown only now. Give it to {who} privately. At the first sign-in they set up their authenticator app, then should change this password in Settings &gt; Security.</p>
        <button type="button" onClick={() => password && navigator.clipboard.writeText(password).then(() => toast.success('Copied.'))} className="w-full rounded-xl border border-black/10 py-2.5 text-sm">Copy</button>
        <button type="button" onClick={onClose} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white">Done</button>
      </div>
    </Dialog>
  );
}

/** Super Admin > Staff (super-admin-plan.md Step 13): the Regantify team and what each role may do. Owner only. */
export default function Team() {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user?.id);
  const { data, isLoading } = useQuery({ queryKey: ['admin-team'], queryFn: adminTeamApi.list });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-team'] });

  const [inviting, setInviting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role3>('SUPPORT');
  const [code, setCode] = useState('');
  const [shown, setShown] = useState<{ who: string; password: string } | null>(null);
  const [needCode, setNeedCode] = useState<{ member: TeamMember; kind: 'reset' | 'password' } | null>(null);

  const invite = useMutation({
    mutationFn: () => adminTeamApi.invite({ name: name.trim(), email: email.trim(), role, code }),
    onSuccess: (r) => {
      setShown({ who: name.trim(), password: r.temporaryPassword });
      setInviting(false);
      setName('');
      setEmail('');
      setCode('');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not add the person.')),
  });
  const setRoleM = useMutation({ mutationFn: (v: { id: string; role: Role3 }) => adminTeamApi.setRole(v.id, v.role), onSuccess: () => { toast.success('Role changed.'); refresh(); }, onError: (err) => toast.error(apiErrorMessage(err, 'Could not change it.')) });
  const statusM = useMutation({ mutationFn: (v: { id: string; status: 'ACTIVE' | 'SUSPENDED' }) => adminTeamApi.setStatus(v.id, v.status), onSuccess: () => { toast.success('Saved.'); refresh(); }, onError: (err) => toast.error(apiErrorMessage(err, 'Could not change it.')) });
  const sensitive = useMutation({
    mutationFn: async () => {
      if (!needCode) return null;
      if (needCode.kind === 'reset') {
        await adminTeamApi.resetTwoFactor(needCode.member.userId, code);
        return null;
      }
      return (await adminTeamApi.newPassword(needCode.member.userId, code)).temporaryPassword;
    },
    onSuccess: (password) => {
      const member = needCode!.member;
      if (password) setShown({ who: member.name, password });
      else toast.success('Their authenticator is reset. They set it up again at their next sign-in.');
      setNeedCode(null);
      setCode('');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'That did not work.')),
  });

  if (isLoading || !data) return <Loader2 className="mx-auto mt-16 animate-spin text-neutral-400" />;
  return (
    <div className="max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-regantify-text">Staff</h1>
          <p className="mt-1 text-sm text-regantify-text-muted">The Regantify team. Each person signs in with their own email, password and authenticator app, and sees only what their role allows. Everything they change is in the admin log.</p>
        </div>
        <button type="button" disabled={data.members.length >= data.max} onClick={() => setInviting(true)} className="rounded-xl bg-regantify-cta px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          Add a person
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        {data.roles.map((r) => (
          <div key={r.key} className="rounded-xl border border-black/5 bg-white p-4">
            <p className="text-sm font-semibold text-regantify-text">{r.label}</p>
            <p className="mt-1 text-xs text-regantify-text-muted">{r.description}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-regantify-content text-left text-xs font-semibold uppercase tracking-wide text-regantify-text-muted">
              <th className="px-4 py-3">Person</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Two-step sign-in</th>
              <th className="px-4 py-3">Last sign-in</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {data.members.map((m) => {
              const owner = m.role === 'OWNER';
              const self = m.userId === me;
              return (
                <tr key={m.userId} className={`border-t border-black/5 ${m.status === 'SUSPENDED' ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-regantify-text">{m.name}{self && <span className="ml-2 text-xs text-regantify-text-muted">(you)</span>}</p>
                    <p className="text-xs text-regantify-text-muted">{m.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    {owner || self ? (
                      ADMIN_ROLE_LABEL[m.role]
                    ) : (
                      <select value={m.role} onChange={(e) => setRoleM.mutate({ id: m.userId, role: e.target.value as Role3 })} disabled={setRoleM.isPending} className="rounded-lg bg-regantify-content px-2 py-1.5 text-sm focus:outline-none">
                        <option value="MANAGER">Manager</option>
                        <option value="FINANCE">Finance</option>
                        <option value="SUPPORT">Support</option>
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">{m.twoFactorOn ? 'On' : <span className="text-amber-700">Not set up yet</span>}</td>
                  <td className="whitespace-nowrap px-4 py-3">{m.lastLoginAt ? formatDhakaDateTime(m.lastLoginAt) : 'Never'}</td>
                  <td className="px-4 py-3">{m.status === 'ACTIVE' ? 'Active' : 'Suspended'}</td>
                  <td className="px-4 py-3">
                    {!owner && !self && (
                      <div className="flex flex-wrap justify-end gap-2 text-xs">
                        <button type="button" onClick={() => statusM.mutate({ id: m.userId, status: m.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' })} className="rounded-lg border border-black/10 px-2.5 py-1 hover:bg-regantify-content">
                          {m.status === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
                        </button>
                        <button type="button" onClick={() => setNeedCode({ member: m, kind: 'reset' })} className="rounded-lg border border-black/10 px-2.5 py-1 hover:bg-regantify-content">Reset 2FA</button>
                        <button type="button" onClick={() => setNeedCode({ member: m, kind: 'password' })} className="rounded-lg border border-black/10 px-2.5 py-1 hover:bg-regantify-content">New password</button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-regantify-text-muted">The owner can’t be demoted, suspended or removed. A suspended person is signed out at once. Nobody is deleted, so the admin log always makes sense. Up to {data.max} people.</p>

      <Dialog open={inviting} onOpenChange={(o) => !o && setInviting(false)} maxWidth="max-w-md">
        <div className="space-y-4 p-6">
          <h2 className="font-semibold text-regantify-text">Add a person to the team</h2>
          <div>
            <label className={label}>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={field} />
          </div>
          <div>
            <label className={label}>Email (they sign in with it)</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} className={field} />
          </div>
          <div>
            <label className={label}>Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value as Role3)} className={field}>
              {data.roles.filter((r) => r.key !== 'OWNER').map((r) => (
                <option key={r.key} value={r.key}>{r.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-regantify-text-muted">{data.roles.find((r) => r.key === role)?.description}</p>
          </div>
          <div>
            <label className={label}>Your authenticator code</label>
            <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6 digits" className={field} />
          </div>
          <button type="button" disabled={name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email.trim()) || code.length !== 6 || invite.isPending} onClick={() => invite.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {invite.isPending ? 'Adding…' : 'Add and show a temporary password'}
          </button>
        </div>
      </Dialog>

      <Dialog open={!!needCode} onOpenChange={(o) => !o && (setNeedCode(null), setCode(''))} maxWidth="max-w-sm">
        <div className="space-y-4 p-6">
          <h2 className="font-semibold text-regantify-text">{needCode?.kind === 'reset' ? `Reset the authenticator of ${needCode.member.name}` : `New temporary password for ${needCode?.member.name}`}</h2>
          <p className="text-xs text-regantify-text-muted">{needCode?.kind === 'reset' ? 'They are signed out and set the authenticator up again at their next sign-in.' : 'They are signed out. The new password is shown once.'} Type a fresh code from your own authenticator app to confirm.</p>
          <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6 digits" className={field} autoFocus />
          <button type="button" disabled={code.length !== 6 || sensitive.isPending} onClick={() => sensitive.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
            Confirm
          </button>
        </div>
      </Dialog>

      <PasswordShown who={shown?.who ?? ''} password={shown?.password ?? null} onClose={() => setShown(null)} />
    </div>
  );
}
