import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Info, Megaphone, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { announcementsApi, type AnnouncementTone, type VendorAnnouncement } from '../lib/announcementsApi';

export const ANNOUNCEMENTS_KEY = ['announcements'];

const TONE: Record<AnnouncementTone, { box: string; Icon: typeof Info }> = {
  INFO: { box: 'border-sky-200 bg-sky-50 text-sky-900', Icon: Info },
  WARNING: { box: 'border-amber-300 bg-amber-50 text-amber-900', Icon: AlertTriangle },
  URGENT: { box: 'border-red-300 bg-red-50 text-red-900', Icon: Megaphone },
};

/** The announcement's button: an in-app path stays in the app, a full address opens in a new tab. */
export function AnnouncementLink({ a, className }: { a: VendorAnnouncement; className?: string }) {
  if (!a.linkUrl) return null;
  const label = a.linkLabel || 'Learn more';
  return a.linkUrl.startsWith('/') ? (
    <Link to={a.linkUrl} className={className}>
      {label}
    </Link>
  ) : (
    <a href={a.linkUrl} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
    </a>
  );
}

/**
 * Super Admin's announcements (TellMe idea 131) as a thin strip at the top of the dashboard: the ones this store has
 * not closed. Closing is saved on the server, so it stays closed on every device. The bell keeps the closed ones too.
 */
export function AnnouncementBanner() {
  const queryClient = useQueryClient();
  const { data = [] } = useQuery({ queryKey: ANNOUNCEMENTS_KEY, queryFn: announcementsApi.forMe, refetchInterval: 5 * 60_000, retry: false });
  const dismiss = useMutation({
    mutationFn: announcementsApi.dismiss,
    onMutate: (id) => queryClient.setQueryData<VendorAnnouncement[]>(ANNOUNCEMENTS_KEY, (old) => old?.map((a) => (a.id === id ? { ...a, dismissed: true } : a))),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ANNOUNCEMENTS_KEY }),
  });
  const open = data.filter((a) => !a.dismissed);
  if (open.length === 0) return null;
  return (
    <div className="space-y-1.5 px-3 pt-3 sm:px-6">
      {open.map((a) => {
        const { box, Icon } = TONE[a.tone];
        return (
          <div key={a.id} role="status" className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm ${box}`}>
            <Icon size={16} className="mt-0.5 shrink-0" />
            <p className="m-0 min-w-0 flex-1 whitespace-pre-line">
              <span className="font-semibold">{a.title}</span> {a.body}{' '}
              <AnnouncementLink a={a} className="font-medium underline underline-offset-2" />
            </p>
            <button type="button" aria-label="Close" onClick={() => dismiss.mutate(a.id)} className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100">
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
