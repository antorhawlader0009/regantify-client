import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { smsApi } from '../../../lib/smsApi';
import { toast } from '../../../lib/toast';
import { BuySmsDialog } from './BuySmsDialog';

type Tab = 'logs' | 'settings';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ShowLogs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['sms-logs'],
    queryFn: () => smsApi.getLogs(),
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-regantify-text mb-4">Sent SMS Logs</h2>

      <div className="bg-white rounded-2xl border border-black/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-regantify-text-muted uppercase tracking-wide border-b border-black/5">
                <th className="p-4 w-10">#</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Message</th>
                <th className="p-4">SMS Count</th>
                <th className="p-4">Date and Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-regantify-text-muted">
                    Loading…
                  </td>
                </tr>
              ) : !logs || logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-regantify-text-muted">
                    No SMS sent yet.
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={log.id} className="border-b border-black/5 align-top last:border-0">
                    <td className="p-4 text-sm text-regantify-text">{i + 1}</td>
                    <td className="p-4 text-sm text-regantify-text whitespace-nowrap">{log.phone}</td>
                    <td className="p-4 text-sm text-regantify-text max-w-md">{log.message}</td>
                    <td className="p-4 text-sm text-regantify-text">{log.smsCount}</td>
                    <td className="p-4 text-sm text-regantify-text-muted whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Settings() {
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');

  const sendTestMutation = useMutation({
    mutationFn: () => smsApi.sendTest(phone.trim()),
    onSuccess: (data) => {
      queryClient.setQueryData(['sms-credits'], data);
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
      toast.success('Test SMS sent.');
      setPhone('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? 'Could not send the test SMS. Please try again.');
    },
  });

  return (
    <div>
      <h2 className="text-lg font-semibold text-regantify-text mb-4">Settings</h2>

      <div>
        <p className="text-base font-semibold text-regantify-text mb-3">SMS Testing</p>
        <div className="bg-white rounded-2xl border border-black/5 p-5 mb-4">
          <label className="block text-sm font-medium text-regantify-text mb-1.5">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            className="w-full px-3.5 py-2.5 rounded-xl bg-regantify-search text-regantify-text
              placeholder:text-regantify-text-muted/70 focus:outline-none focus:ring-2 focus:ring-regantify-black text-sm"
          />
        </div>

        <button
          onClick={() => sendTestMutation.mutate()}
          disabled={!phone.trim() || sendTestMutation.isPending}
          className="px-6 py-2.5 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium
            transition-colors disabled:opacity-60"
        >
          {sendTestMutation.isPending ? 'Sending…' : 'Send Test SMS'}
        </button>
      </div>
    </div>
  );
}

export default function Sms() {
  const [tab, setTab] = useState<Tab>('logs');
  const [buyDialogOpen, setBuyDialogOpen] = useState(false);

  const { data: creditsData } = useQuery({
    queryKey: ['sms-credits'],
    queryFn: () => smsApi.getCredits(),
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-regantify-black mb-6">SMS</h1>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-5">
          <button
            onClick={() => setTab('logs')}
            className={`text-sm font-medium ${tab === 'logs' ? 'text-regantify-text' : 'text-regantify-text-muted hover:text-regantify-text'}`}
          >
            Show Logs
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`text-sm font-medium ${tab === 'settings' ? 'text-regantify-text' : 'text-regantify-text-muted hover:text-regantify-text'}`}
          >
            Settings
          </button>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setBuyDialogOpen(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            Buy SMS
          </button>
          <span className="text-sm text-regantify-text">SMS Left: {creditsData?.smsCredits ?? 0}</span>
        </div>
      </div>

      {tab === 'logs' ? <ShowLogs /> : <Settings />}

      <BuySmsDialog open={buyDialogOpen} onOpenChange={setBuyDialogOpen} />
    </div>
  );
}
