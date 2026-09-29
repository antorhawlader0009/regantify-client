import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { lmsApi, type LmsMe } from '../../lib/lmsApi';
import { LmsButton } from './ui';

/**
 * The one-time offer to bring in landing page leads collected before the
 * LMS was turned on. Managers only; shows nothing once they're in (or
 * when there were none).
 */
export function LandingBacklogNotice({ me, className = '' }: { me: LmsMe; className?: string }) {
  const queryClient = useQueryClient();
  const backlog = useQuery({ queryKey: ['lms', 'landing-backlog'], queryFn: lmsApi.landingBacklog, enabled: me.isManager });
  const bringIn = useMutation({
    mutationFn: lmsApi.importLandingBacklog,
    onSuccess: ({ imported }) => {
      toast.success(imported ? `${imported} lead${imported === 1 ? '' : 's'} brought in` : 'They were already in your list');
      queryClient.invalidateQueries({ queryKey: ['lms'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "The leads weren't brought in. Try again.")),
  });

  const count = backlog.data?.count ?? 0;
  if (!me.isManager || count === 0) return null;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-lms-line bg-lms-surface px-4 py-3 ${className}`}>
      <p className="text-sm">
        Your landing pages collected <span className="font-medium tabular-nums">{count}</span> lead{count === 1 ? '' : 's'} before the LMS
        was on. Bring them in so your team can follow up.
      </p>
      <LmsButton variant="primary" disabled={bringIn.isPending} onClick={() => bringIn.mutate()}>
        {bringIn.isPending ? 'Bringing them in…' : `Bring in ${count} lead${count === 1 ? '' : 's'}`}
      </LmsButton>
    </div>
  );
}
