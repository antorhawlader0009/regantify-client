import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, MessageSquare, Monitor } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog } from '../ui/Dialog';
import { ToggleRow } from '../product/ProductFormKit';
import { notificationsApi, type NotificationSettings } from '../../lib/notificationsApi';
import { smsApi } from '../../lib/smsApi';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { useCan } from '../../lib/useStaffAccess';
import { ALL_ALERT_TYPES, desktopPermission, playChime, readAlertPrefs, saveAlertPrefs, type DeviceAlertPrefs } from '../../lib/notificationAlerts';
import { TYPE_LABEL } from './notificationUi';
import { PhoneNotificationsSection } from './PhoneNotificationsSection';

const SETTINGS_KEY = ['notifications', 'settings'];

function SectionTitle({ icon: Icon, title, hint }: { icon: typeof Bell; title: string; hint: string }) {
  return (
    <div className="mb-3">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-regantify-text">
        <Icon size={15} aria-hidden />
        {title}
      </h3>
      <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>
    </div>
  );
}

/**
 * Notifications > Alert settings. The bell always gets everything; this
 * decides what else happens: a sound and desktop pop-up on this device
 * (anyone, saved in this browser), and SMS to the store's phone (owner only,
 * paid from the store's SMS credits).
 */
export function AlertSettingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const isOwner = useCan('owner');
  const canSeeSms = useCan('sms.view');

  // On this device: saved as soon as it's changed.
  const [prefs, setPrefs] = useState<DeviceAlertPrefs>(readAlertPrefs);
  const [permission, setPermission] = useState(desktopPermission);
  const updatePrefs = (next: DeviceAlertPrefs) => {
    setPrefs(next);
    saveAlertPrefs(next);
  };

  const toggleDesktop = async (on: boolean) => {
    if (!on) return updatePrefs({ ...prefs, desktop: false });
    if (permission === 'unsupported') return;
    const result = permission === 'granted' ? 'granted' : await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') updatePrefs({ ...prefs, desktop: true });
    else toast.error('Your browser blocked pop-ups for this site. Allow notifications in the browser’s site settings.');
  };

  // SMS: the store's, saved with the button.
  const { data: settings } = useQuery({ queryKey: SETTINGS_KEY, queryFn: notificationsApi.getSettings, enabled: open });
  const { data: credits } = useQuery({ queryKey: ['sms', 'credits'], queryFn: smsApi.getCredits, enabled: open && canSeeSms });
  const [draft, setDraft] = useState<NotificationSettings | null>(null);
  const [phone, setPhone] = useState('');
  useEffect(() => {
    if (open && settings) {
      setDraft(settings);
      setPhone(settings.smsPhone ?? '');
    }
  }, [open, settings]);

  const save = useMutation({
    mutationFn: () =>
      notificationsApi.updateSettings({
        smsNewOrder: draft!.smsNewOrder,
        smsOrderAttention: draft!.smsOrderAttention,
        smsPlanEnding: draft!.smsPlanEnding,
        smsLowStock: draft!.smsLowStock,
        smsQuietHours: draft!.smsQuietHours,
        smsPhone: phone.trim(),
      }),
    onSuccess: (saved) => {
      queryClient.setQueryData(SETTINGS_KEY, saved);
      toast.success('SMS alerts saved.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the SMS alerts. Please try again.')),
  });

  const anySms = draft ? draft.smsNewOrder || draft.smsOrderAttention || draft.smsPlanEnding || draft.smsLowStock : false;
  const set = (patch: Partial<NotificationSettings>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Alert settings" maxWidth="max-w-lg">
      <div className="space-y-6 px-6 pb-6 pt-3">
        <p className="text-sm text-neutral-600">Everything always shows in the bell. Choose what else should get your attention.</p>

        <PhoneNotificationsSection open={open} />

        <section className="border-t border-line pt-5">
          <SectionTitle icon={Monitor} title="On this device" hint="Saved in this browser only, so the shop PC and your laptop can differ. Only while the dashboard is open; use Phone notifications above for the rest." />
          <div className="space-y-4">
            <ToggleRow
              checked={prefs.sound}
              onChange={(sound) => updatePrefs({ ...prefs, sound })}
              label="Sound for new and problem orders"
              hint="A short chime while the dashboard is open in a tab."
            />
            {prefs.sound && (
              <button type="button" onClick={playChime} className="-mt-2 text-xs font-medium text-brand hover:underline">
                Play the sound
              </button>
            )}
            {permission === 'unsupported' ? (
              <p className="text-xs text-neutral-500">This browser can’t show desktop pop-ups.</p>
            ) : (
              <ToggleRow
                checked={prefs.desktop && permission === 'granted'}
                onChange={(on) => void toggleDesktop(on)}
                label="Desktop pop-up"
                hint={
                  permission === 'denied'
                    ? 'Blocked by your browser. Allow notifications for this site in the browser’s settings first.'
                    : 'Shows even when you’re on another tab or app, while the dashboard is open.'
                }
              />
            )}
            {prefs.desktop && permission === 'granted' && (
              <fieldset className="rounded-lg border border-line px-3 py-2.5">
                <legend className="px-1 text-xs text-neutral-500">Pop up for</legend>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {ALL_ALERT_TYPES.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-sm text-regantify-text">
                      <input
                        type="checkbox"
                        checked={prefs.types.includes(t)}
                        onChange={(e) =>
                          updatePrefs({ ...prefs, types: e.target.checked ? [...prefs.types, t] : prefs.types.filter((x) => x !== t) })
                        }
                        className="h-4 w-4 rounded border-line accent-brand"
                      />
                      {TYPE_LABEL[t]}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
          </div>
        </section>

        <section className="border-t border-line pt-5">
          <SectionTitle
            icon={MessageSquare}
            title="SMS to your phone"
            hint="Reaches you even when the dashboard is closed. Each SMS uses your store’s SMS credits (1 per text, 2 if the customer’s name is in Bangla)."
          />
          {!draft ? (
            <div className="h-24 animate-pulse rounded-lg bg-neutral-100" aria-busy />
          ) : (
            <fieldset disabled={!isOwner || save.isPending} className="space-y-4 disabled:opacity-70">
              <ToggleRow checked={draft.smsNewOrder} onChange={(v) => set({ smsNewOrder: v })} label="New orders" hint="Order number, customer and total." />
              <ToggleRow
                checked={draft.smsOrderAttention}
                onChange={(v) => set({ smsOrderAttention: v })}
                label="Problem orders"
                hint="A parcel stuck or late with the courier, or an online payment that failed."
              />
              <ToggleRow checked={draft.smsPlanEnding} onChange={(v) => set({ smsPlanEnding: v })} label="Plan ending" hint="A few days before your plan ends, and when it has ended." />
              <ToggleRow
                checked={draft.smsLowStock}
                onChange={(v) => set({ smsLowStock: v })}
                label="Low stock"
                hint="When products go under their low stock limit. At most one text a day."
              />

              {anySms && (
                <>
                  <label className="block text-sm font-medium text-regantify-text">
                    Send to
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      inputMode="tel"
                      placeholder={draft.ownerPhone ?? '01XXXXXXXXX'}
                      className="mt-1.5 block h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal"
                    />
                    <span className="mt-1 block text-xs font-normal text-neutral-500">Leave empty to use your own number{draft.ownerPhone ? ` (${draft.ownerPhone})` : ''}.</span>
                  </label>
                  <ToggleRow
                    checked={draft.smsQuietHours}
                    onChange={(v) => set({ smsQuietHours: v })}
                    label="Quiet at night"
                    hint="No SMS from 10 PM to 8 AM. Those still show in the bell."
                  />
                </>
              )}

              {canSeeSms && credits && (
                <p className={`text-xs ${credits.smsCredits < 20 ? 'text-red-600' : 'text-neutral-500'}`}>
                  {credits.smsCredits.toLocaleString('en-US')} SMS credits left.{' '}
                  {isOwner && (
                    <Link to="/vendor/sms" className="font-medium text-brand hover:underline" onClick={() => onOpenChange(false)}>
                      Buy SMS
                    </Link>
                  )}
                </p>
              )}

              {isOwner ? (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => save.mutate()}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
                  >
                    {save.isPending ? 'Saving…' : 'Save SMS alerts'}
                  </button>
                </div>
              ) : (
                <p className="text-xs text-neutral-500">Only the store owner can change SMS alerts.</p>
              )}
            </fieldset>
          )}
        </section>
      </div>
    </Dialog>
  );
}
