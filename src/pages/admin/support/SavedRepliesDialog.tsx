import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { adminSupportApi } from '../../../lib/supportApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { Dialog } from '../../../components/ui/Dialog';

/** Add, edit and delete the replies the support team reuses. {store} and {name} are filled in when one is used (super-admin-plan.md Step 11). */
export function SavedRepliesDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['admin-support-saved'], queryFn: adminSupportApi.savedReplies, enabled: open });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-support-saved'] });
  const save = useMutation({
    mutationFn: () => adminSupportApi.saveReply(editingId, title.trim(), body.trim()),
    onSuccess: () => {
      setEditingId(null);
      setTitle('');
      setBody('');
      refresh();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save it.')),
  });
  const del = useMutation({ mutationFn: (rid: string) => adminSupportApi.deleteReply(rid), onSuccess: refresh });
  const field = 'w-full rounded-xl bg-regantify-search px-3.5 py-2.5 text-sm focus:outline-none';
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()} maxWidth="max-w-lg">
      <div className="space-y-4 p-6">
        <h2 className="font-semibold text-regantify-text">Saved replies</h2>
        <p className="text-xs text-regantify-text-muted">Pick one above a reply box to drop it in. {'{store}'} and {'{name}'} are filled in.</p>
        <div className="max-h-52 space-y-1 overflow-y-auto">
          {(data ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg bg-regantify-content px-3 py-2 text-sm">
              <span className="truncate">{r.title}</span>
              <span className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(r.id);
                    setTitle(r.title);
                    setBody(r.body);
                  }}
                  className="underline"
                >
                  Edit
                </button>
                <button type="button" onClick={() => window.confirm('Delete this saved reply?') && del.mutate(r.id)} className="text-red-600 underline">
                  Delete
                </button>
              </span>
            </div>
          ))}
          {data?.length === 0 && <p className="text-sm text-regantify-text-muted">None yet.</p>}
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} placeholder="Title" className={field} />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={4} placeholder="Hello {name}, …" className={field} />
        <button type="button" disabled={title.trim().length < 2 || body.trim().length < 2 || save.isPending} onClick={() => save.mutate()} className="w-full rounded-xl bg-regantify-cta py-2.5 text-sm font-medium text-white disabled:opacity-50">
          {editingId ? 'Save changes' : 'Add the saved reply'}
        </button>
      </div>
    </Dialog>
  );
}
