import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Smartphone, Trash2 } from 'lucide-react';
import { notificationsApi, type PushDevice, type PushTopic } from '../../lib/notificationsApi';
import { PUSH_TOPICS, currentSubscription, disablePush, enablePush, pushPermission, pushSupport } from '../../lib/pushNotifications';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { useAuthStore } from '../../store/authStore';
import { ToggleRow } from '../product/ProductFormKit';

const CONFIG_KEY = ['notifications', 'push', 'config'];
const DEVICES_KEY = ['notifications', 'push', 'devices'];

/**
 * Notifications > Alert settings > "Phone notifications": the server pushes new orders and problems to this
 * phone or computer even when the dashboard is closed. Free (no SMS credits). Each device chooses for itself
 * which kinds it wants; anyone who can see the bell can turn it on for their own devices.
 */
export function PhoneNotificationsSection({ open }: { open: boolean }) {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const support = pushSupport();

  const { data: config } = useQuery({ queryKey: CONFIG_KEY, queryFn: notificationsApi.pushConfig, enabled: open && support === 'supported', retry: false });
  const { data: devices } = useQuery({ queryKey: DEVICES_KEY, queryFn: notificationsApi.pushDevices, enabled: open && support === 'supported' && config?.enabled === true });

  // This browser's own address, to tell which row in the list is this device.
  const [endpoint, setEndpoint] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    void currentSubscription().then((s) => setEndpoint(s?.endpoint ?? null));
  }, [open, devices]);
  const mine = devices?.find((d) => d.endpoint === endpoint) ?? null;
  const others = (devices ?? []).filter((d) => d.endpoint !== endpoint);
  const permission = pushPermission();

  const refresh = () => queryClient.invalidateQueries({ queryKey: DEVICES_KEY });

  const turnOn = useMutation({
    mutationFn: () => enablePush(userId!),
    onSuccess: () => {
      toast.success('Phone notifications are on for this device.');
      void refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not turn on phone notifications.')),
  });
  const turnOff = useMutation({
    mutationFn: () => disablePush(userId!),
    onSuccess: () => {
      setEndpoint(null);
      void refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not turn off phone notifications.')),
  });
  const topicsMutation = useMutation({
    mutationFn: (topics: PushTopic[]) => notificationsApi.pushTopics(mine!.endpoint, topics),
    onMutate: (topics) => {
      queryClient.setQueryData<PushDevice[]>(DEVICES_KEY, (old) => old?.map((d) => (d.endpoint === mine?.endpoint ? { ...d, topics } : d)));
    },
    onError: (err) => {
      toast.error(apiErrorMessage(err, 'Could not save your choice.'));
      void refresh();
    },
  });
  const test = useMutation({
    mutationFn: notificationsApi.pushTest,
    onSuccess: (res) =>
      res.sent > 0
        ? toast.success(`Sent to ${res.sent} ${res.sent === 1 ? 'device' : 'devices'}. It should show up in a moment.`)
        : toast.error('No device could be reached. Turn it off and on again for this device.'),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not send the test.')),
  });
  const removeOther = useMutation({
    mutationFn: (device: PushDevice) => notificationsApi.pushUnsubscribe(device.endpoint),
    onSuccess: () => void refresh(),
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not remove that device.')),
  });

  let body;
  if (support === 'needs-install') {
    body = (
      <p className="rounded-lg bg-neutral-50 px-3 py-2.5 text-xs text-neutral-600">
        On an iPhone or iPad, add Regantify to your Home Screen first: open this page in Safari, tap the Share button, choose{' '}
        <b>Add to Home Screen</b>, then open Regantify from the Home Screen and come back here to turn this on.
      </p>
    );
  } else if (support === 'unsupported') {
    body = <p className="text-xs text-neutral-500">This browser can’t receive phone notifications. Chrome, Edge, Firefox and Safari (added to the Home Screen) can.</p>;
  } else if (config && !config.enabled) {
    body = <p className="text-xs text-neutral-500">Phone notifications are not switched on for this server yet.</p>;
  } else {
    body = (
      <div className="space-y-4">
        <fieldset disabled={turnOn.isPending || turnOff.isPending || !userId} className="disabled:opacity-70">
          <ToggleRow
            checked={mine !== null}
            onChange={(on) => (on ? turnOn.mutate() : turnOff.mutate())}
            label="Notify this device"
            hint={
              permission === 'denied'
                ? 'Blocked by your browser. Allow notifications for this site in the browser’s settings first.'
                : 'New orders and problems show up on this device’s screen, even when the dashboard is closed.'
            }
          />
        </fieldset>

        {mine && (
          <>
            <fieldset className="rounded-lg border border-line px-3 py-2.5">
              <legend className="px-1 text-xs text-neutral-500">Tell this device about</legend>
              <div className="space-y-2">
                {PUSH_TOPICS.map(({ topic, label, hint }) => (
                  <label key={topic} className="flex items-start gap-2 text-sm text-regantify-text">
                    <input
                      type="checkbox"
                      checked={mine.topics.includes(topic)}
                      onChange={(e) => topicsMutation.mutate(e.target.checked ? [...mine.topics, topic] : mine.topics.filter((t) => t !== topic))}
                      className="mt-0.5 h-4 w-4 rounded border-line accent-brand"
                    />
                    <span>
                      {label}
                      <span className="block text-xs text-neutral-500">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="button"
              onClick={() => test.mutate()}
              disabled={test.isPending}
              className="text-xs font-medium text-brand hover:underline disabled:opacity-60"
            >
              {test.isPending ? 'Sending…' : 'Send a test notification'}
            </button>
          </>
        )}

        {others.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-neutral-600">Your other devices</p>
            <ul className="divide-y divide-line rounded-lg border border-line">
              {others.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">
                    {d.deviceName ?? 'Device'}
                    <span className="ml-2 text-xs text-neutral-500">since {new Date(d.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeOther.mutate(d)}
                    disabled={removeOther.isPending}
                    aria-label={`Stop notifying ${d.deviceName ?? 'this device'}`}
                    className="shrink-0 text-neutral-500 hover:text-red-600 disabled:opacity-60"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <section>
      <div className="mb-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-regantify-text">
          <Smartphone size={15} aria-hidden />
          Phone notifications
        </h3>
        <p className="mt-0.5 text-xs text-neutral-500">Free, and works with the browser closed. Choose which of your devices should be told.</p>
      </div>
      {body}
    </section>
  );
}
