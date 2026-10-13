import { AdminActivityLog } from '../../components/admin/AdminActivityLog';
import { PlatformSwitches } from '../../components/admin/PlatformSwitches';
import { ContactSection, KeysSection, MaintenanceSection, MoneySection, SignupSection, TermsSection } from '../../components/admin/PlatformConfig';
import ReceiptDetails from './ReceiptDetails';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, KeyRound, LogOut, MonitorSmartphone } from 'lucide-react';
import { authApi } from '../../lib/authApi';
import { useAuthStore } from '../../store/authStore';
import { RecoveryCodes } from '../../components/admin/RecoveryCodes';
import { ChangePasswordCard } from '../../components/admin/ChangePasswordCard';
import { adminCan, useAdminViewer } from '../../lib/adminPermissions';

// Admin > Settings (super-admin-plan.md). Step 1 creates the page with its Security tab; later steps add their own tabs
// (Activity log, Platform, Receipt details...) to TABS.
const TABS = [
  { id: 'security', label: 'Security' },
  { id: 'company', label: 'Company' },
  { id: 'contact', label: 'Contact' },
  { id: 'signup', label: 'Sign-up' },
  { id: 'money', label: 'Money' },
  { id: 'terms', label: 'Terms' },
  { id: 'maintenance', label: 'Maintenance' },
  { id: 'keys', label: 'Keys' },
  { id: 'switches', label: 'Switches' },
  { id: 'activity', label: 'Activity log' },
] as const;

export default function AdminSettings() {
  const [tab, setTab] = useState<(typeof TABS)[number]['id']>('security');
  const viewer = useAdminViewer();
  // The action log is for people whose role includes it (super-admin-plan.md Step 13).
  const tabs = TABS.filter((t) => (t.id !== 'activity' || adminCan(viewer, 'audit.view')) && (t.id === 'security' || t.id === 'activity' || adminCan(viewer, 'settings.manage')));

  return (
    <div className={tab === 'activity' ? 'max-w-5xl' : 'max-w-3xl'}>
      <h1 className="text-2xl font-semibold text-regantify-text">Settings</h1>
      <p className="text-regantify-text-muted mt-1">Platform settings for Super Admin.</p>

      <div className="mt-5 flex gap-1 overflow-x-auto border-b border-black/5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`whitespace-nowrap px-4 py-2 text-sm font-medium -mb-px border-b-2 ${
              tab === t.id ? 'border-regantify-black text-regantify-text' : 'border-transparent text-regantify-text-muted hover:text-regantify-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">{tab === 'security' && <SecurityTab />}
        {tab === 'company' && <ReceiptDetails />}
        {tab === 'contact' && <ContactSection />}
        {tab === 'signup' && <SignupSection />}
        {tab === 'money' && <MoneySection />}
        {tab === 'terms' && <TermsSection />}
        {tab === 'maintenance' && <MaintenanceSection />}
        {tab === 'keys' && <KeysSection />}
        {tab === 'switches' && <PlatformSwitches />}
        {tab === 'activity' && <AdminActivityLog />}</div>
    </div>
  );
}

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Dhaka' });

function SecurityTab() {
  const navigate = useNavigate();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'security'], queryFn: () => authApi.adminSecurity() });

  const [asking, setAsking] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newCodes, setNewCodes] = useState<string[] | null>(null);
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const makeCodes = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await authApi.adminNewRecoveryCodes(code.trim());
      setNewCodes(res.recoveryCodes);
      setAsking(false);
      setCode('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'security'] });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'That code is not right.');
    } finally {
      setBusy(false);
    }
  };

  const signOutAll = async () => {
    setBusy(true);
    try {
      await authApi.adminSignOutEverywhere();
    } finally {
      clearAuth();
      navigate('/admin/login', { replace: true });
    }
  };

  const cardClass = 'bg-white rounded-2xl border border-black/5 p-5';

  return (
    <div className="space-y-5">
      <section className={cardClass}>
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="mt-0.5 text-regantify-text-muted" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-regantify-text">Two-step sign-in</p>
            {isLoading ? (
              <p className="text-sm text-regantify-text-muted mt-1">Loading…</p>
            ) : (
              <p className="text-sm text-regantify-text-muted mt-1">
                {data?.totpEnabled ? `On since ${formatWhen(data.totpEnabledAt!)}.` : 'Off.'} Every sign-in needs a code from your authenticator app.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-start gap-3">
          <KeyRound size={20} className="mt-0.5 text-regantify-text-muted" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-regantify-text">Recovery codes</p>
            <p className="text-sm text-regantify-text-muted mt-1">
              {data ? `${data.recoveryCodesLeft} of 10 unused.` : ''} Use one if you lose your phone. Making new codes stops the old ones working.
              {data && data.recoveryCodesLeft <= 3 && <span className="text-amber-600"> Running low — make new codes.</span>}
            </p>

            {newCodes ? (
              <div className="mt-4">
                <RecoveryCodes codes={newCodes} confirmLabel="Done" onConfirm={() => setNewCodes(null)} />
              </div>
            ) : asking ? (
              <form onSubmit={makeCodes} className="mt-4 flex flex-wrap items-center gap-2">
                <input
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  placeholder="Code from the app"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))}
                  className="px-3 py-2 rounded-lg bg-regantify-search text-sm tracking-widest focus:outline-none focus:ring-2 focus:ring-regantify-black"
                />
                <button
                  type="submit"
                  disabled={busy || code.replace(/\s/g, '').length !== 6}
                  className="px-4 py-2 rounded-lg bg-regantify-black text-white text-sm font-medium disabled:opacity-60"
                >
                  Make new codes
                </button>
                <button type="button" className="text-sm text-regantify-text-muted" onClick={() => { setAsking(false); setError(null); }}>
                  Cancel
                </button>
                {error && <p className="w-full text-red-500 text-sm">{error}</p>}
              </form>
            ) : (
              <button
                type="button"
                className="mt-4 px-4 py-2 rounded-lg border border-line text-sm font-medium hover:bg-neutral-50"
                onClick={() => setAsking(true)}
              >
                Make new recovery codes
              </button>
            )}
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-start gap-3">
          <MonitorSmartphone size={20} className="mt-0.5 text-regantify-text-muted" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-regantify-text">Recent sign-ins</p>
            <p className="text-sm text-regantify-text-muted mt-1">The last 20 in the past 90 days. A sign-in from a new device is marked and texted to the alert phone.</p>
            {isLoading ? null : !data?.signIns.length ? (
              <p className="text-sm text-regantify-text-muted mt-3">Nothing yet.</p>
            ) : (
              <table className="w-full mt-3 text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-regantify-text-muted">
                    <th className="py-2 pr-3">When (Dhaka)</th>
                    <th className="py-2 pr-3">Device</th>
                    <th className="py-2">Address</th>
                  </tr>
                </thead>
                <tbody>
                  {data.signIns.map((s) => (
                    <tr key={s.id} className="border-t border-black/5">
                      <td className="py-2 pr-3 text-regantify-text">{formatWhen(s.at)}</td>
                      <td className="py-2 pr-3 text-regantify-text">
                        {s.browser}
                        {s.newDevice && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">New device</span>}
                      </td>
                      <td className="py-2 text-regantify-text-muted">{s.ip ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <div className="flex items-start gap-3">
          <LogOut size={20} className="mt-0.5 text-regantify-text-muted" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-regantify-text">Sign out everywhere</p>
            <p className="text-sm text-regantify-text-muted mt-1">Ends every Super Admin session on every device at once, including this one. Use it if a device is lost or a sign-in looks wrong.</p>
            {confirmSignOut ? (
              <div className="mt-4 flex items-center gap-2">
                <button type="button" disabled={busy} onClick={signOutAll} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-60">
                  Yes, sign out everywhere
                </button>
                <button type="button" className="text-sm text-regantify-text-muted" onClick={() => setConfirmSignOut(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="mt-4 px-4 py-2 rounded-lg border border-line text-sm font-medium hover:bg-neutral-50" onClick={() => setConfirmSignOut(true)}>
                Sign out of every device
              </button>
            )}
          </div>
        </div>
      </section>

      <ChangePasswordCard />
    </div>
  );
}
