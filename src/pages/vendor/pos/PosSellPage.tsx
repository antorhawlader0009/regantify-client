import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { apiErrorMessage, isPlanLocked } from '../../../lib/api';
import { posApi } from '../../../lib/posApi';
import { unlockValid, useCounter } from '../../../lib/posCounter';
import { LockScreen } from '../../../components/pos/sell/LockScreen';
import { SellScreen } from '../../../components/pos/sell/SellScreen';
import { taka } from '../../../components/pos/ui';
import './pos-theme.css';

/**
 * The counter (POS-system-plan.md Step 4), full screen, outside the
 * dashboard's sidebar and top bar. In order: plan and "POS on", which
 * register this screen sells on (it must have an open shift), who's at the
 * counter (PIN), then selling.
 */
export default function PosSellPage() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ['pos', 'me'], queryFn: posApi.me, retry: false });
  const enabled = me.isSuccess && me.data.enabled;
  const settings = useQuery({ queryKey: ['pos', 'settings'], queryFn: posApi.getSettings, enabled });
  const registers = useQuery({ queryKey: ['pos', 'registers'], queryFn: posApi.registers, enabled });
  const { registerId, unlock, setRegister, setUnlock, lock } = useCounter();

  useEffect(() => {
    const previous = document.title;
    document.title = 'POS';
    return () => {
      document.title = previous;
    };
  }, []);

  const openRegisters = registers.data?.filter((r) => r.active && r.openSession) ?? [];
  const register = openRegisters.find((r) => r.id === registerId) ?? null;

  let body: React.ReactNode;
  if (me.isPending || (enabled && registers.isPending)) {
    body = <Centered>Loading…</Centered>;
  } else if (me.isError) {
    body = (
      <Centered>
        {isPlanLocked(me.error) ? 'The POS is part of the Advance plan.' : apiErrorMessage(me.error, "The POS couldn't load. Refresh the page to try again.")}
        <BackLink />
      </Centered>
    );
  } else if (!enabled) {
    body = (
      <Centered>
        The POS is turned off for this store.
        <BackLink />
      </Centered>
    );
  } else if (registers.isError) {
    body = (
      <Centered>
        {apiErrorMessage(registers.error, "Registers couldn't load. Refresh the page to try again.")}
        <BackLink />
      </Centered>
    );
  } else if (!register) {
    body = (
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-sm rounded-[14px] border border-pos-line bg-pos-surface p-6">
          <h1 className="text-lg font-semibold">Which register is this?</h1>
          {openRegisters.length === 0 ? (
            <p className="mt-3 text-sm text-pos-muted">
              No register is open. Open one with the cash in the drawer under{' '}
              <Link to="/vendor/pos/registers" className="font-medium text-pos-ink underline">
                POS &gt; Registers
              </Link>
              , then come back.
            </p>
          ) : (
            <div className="mt-4 grid gap-2">
              {openRegisters.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRegister(r.id)}
                  className="flex h-14 items-center justify-between rounded-lg border border-pos-line px-4 text-left hover:bg-pos-page"
                >
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-pos-muted">float {taka(r.openSession!.openingFloat)}</span>
                </button>
              ))}
            </div>
          )}
          <BackLink />
        </div>
      </div>
    );
  } else if (!unlockValid(unlock)) {
    body = <LockScreen registerName={register.name} onUnlock={setUnlock} />;
  } else {
    body = (
      <SellScreen
        storeName={me.data.storeName}
        registerName={register.name}
        sessionId={register.openSession!.id}
        unlock={unlock}
        settings={settings.data}
        onLock={lock}
        onRegisterClosed={() => {
          setRegister(null);
          void queryClient.invalidateQueries({ queryKey: ['pos', 'registers'] });
        }}
      />
    );
  }

  return <div className="pos-root h-dvh overflow-hidden bg-pos-page">{body}</div>;
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center text-sm">{children}</div>;
}

function BackLink() {
  return (
    <Link
      to="/vendor/pos/registers"
      className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-md px-4 text-sm font-medium text-pos-ink hover:bg-pos-page"
    >
      <ArrowLeft size={15} aria-hidden />
      Back to the dashboard
    </Link>
  );
}
