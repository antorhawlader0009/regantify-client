import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Loader2 } from 'lucide-react';
import { adminHelpApi, type AdminHelpArticle, type ArticleBody } from '../../lib/helpApi';
import { apiErrorMessage } from '../../lib/api';
import { formatDhakaDate } from '../../lib/dhakaDate';
import { toast } from '../../lib/toast';
import { Dialog } from '../../components/ui/Dialog';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { RowMenu } from '../../components/admin/RowMenu';
import { HelpVideo, Markdown } from '../../components/help/Markdown';

const field = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-regantify-text focus:outline-none';
const th = 'px-4 py-2 font-normal';
const td = 'px-4 py-2.5';

/**
 * Super Admin > Reach > Help center (super-admin-new.md Step 11): articles the sellers read in the dashboard's Help drawer. An article tied to a page
 * (/vendor/orders) opens first when a seller presses Help on that page. Support replies can drop a link to any published article.
 */
export default function HelpArticles() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-help-articles'], queryFn: adminHelpApi.articles });
  const [editing, setEditing] = useState<AdminHelpArticle | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AdminHelpArticle | null>(null);
  const del = useMutation({
    mutationFn: (id: string) => adminHelpApi.deleteArticle(id),
    onSuccess: () => {
      toast.success('Deleted.');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['admin-help-articles'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete it.')),
  });
  const categories = useMemo(() => [...new Set((data ?? []).map((a) => a.category))].sort(), [data]);

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-1 text-regantify-text-muted" size={20} />
          <div>
            <h1 className="text-lg font-semibold text-regantify-text">Help center</h1>
            <p className="max-w-3xl text-sm text-regantify-text-muted">
              Articles sellers read from the Help button in their dashboard. Tie an article to a dashboard page and it opens first on that page. Drafts are seen
              only by the team.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => setEditing('new')} className="rounded-lg bg-regantify-cta px-4 py-2 text-sm font-medium text-white">
          New article
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
                <th className={th}>Title</th>
                <th className={th}>Category</th>
                <th className={th}>Pages</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Views</th>
                <th className={th}>Updated</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-regantify-text-muted">
                    No articles yet. Start with the questions support answers most.
                  </td>
                </tr>
              )}
              {(data ?? []).map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0">
                  <td className={td}>
                    <button type="button" onClick={() => setEditing(a)} className="font-medium text-regantify-text hover:underline">
                      {a.title}
                    </button>
                    <p className="console-id text-xs text-regantify-text-muted">/vendor/help/{a.slug}</p>
                  </td>
                  <td className={td}>{a.category}</td>
                  <td className={`${td} text-xs text-regantify-text-muted`}>{a.paths.length ? a.paths.join(', ') : '-'}</td>
                  <td className={td}>{a.published ? <span className="text-emerald-700">Published</span> : <span className="text-regantify-text-muted">Draft</span>}</td>
                  <td className={`${td} text-right tabular-nums`}>{a.views}</td>
                  <td className={`${td} text-xs text-regantify-text-muted`}>
                    {formatDhakaDate(a.updatedAt)}
                    {a.updatedBy ? ` by ${a.updatedBy}` : ''}
                  </td>
                  <td className={`${td} text-right`}>
                    <RowMenu items={[{ label: 'Edit', onSelect: () => setEditing(a) }, { label: 'Delete', onSelect: () => setDeleting(a), danger: true }]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ArticleDialog article={editing} categories={categories} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this article?"
        message={`"${deleting?.title ?? ''}" is removed for every seller. Links to it in old support replies will show "not found".`}
        confirmLabel="Delete article"
        danger
        busy={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id)}
      />
    </div>
  );
}

function ArticleDialog({ article, categories, onClose }: { article: AdminHelpArticle | 'new' | null; categories: string[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ArticleBody>({ title: '', category: '', body: '', videoUrl: null, paths: [], published: false, position: 0 });
  const [pathsText, setPathsText] = useState('');
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (!article) return;
    const a = article === 'new' ? null : article;
    setForm({ title: a?.title ?? '', category: a?.category ?? '', body: a?.body ?? '', videoUrl: a?.videoUrl ?? null, paths: a?.paths ?? [], published: a?.published ?? false, position: a?.position ?? 0 });
    setPathsText((a?.paths ?? []).join('\n'));
    setPreview(false);
  }, [article]);
  const save = useMutation({
    mutationFn: () => {
      const body: ArticleBody = { ...form, title: form.title.trim(), category: form.category.trim(), videoUrl: form.videoUrl?.trim() || null, paths: pathsText.split(/[\n,]+/).map((p) => p.trim()).filter(Boolean) };
      return article === 'new' ? adminHelpApi.createArticle(body) : adminHelpApi.updateArticle((article as AdminHelpArticle).id, body);
    },
    onSuccess: () => {
      toast.success('Saved.');
      qc.invalidateQueries({ queryKey: ['admin-help-articles'] });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the article.')),
  });
  const valid = form.title.trim().length >= 3 && form.category.trim() && form.body.trim();

  return (
    <Dialog open={article !== null} onOpenChange={(o) => !o && onClose()} title={article === 'new' ? 'New help article' : 'Edit help article'} maxWidth="max-w-3xl">
      <div className="space-y-4 p-6 pt-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-regantify-text">Title</label>
            <input value={form.title} maxLength={140} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="How to book a parcel with Pathao" className={field} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-regantify-text">Category</label>
            <input value={form.category} maxLength={60} list="help-categories" onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Orders" className={field} />
            <datalist id="help-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="text-sm font-medium text-regantify-text">Text</label>
            <button type="button" onClick={() => setPreview(!preview)} className="text-xs font-medium text-regantify-text hover:underline">
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>
          {preview ? (
            <div className="max-h-[50vh] space-y-4 overflow-y-auto rounded-lg border border-line p-4">
              {form.videoUrl && <HelpVideo url={form.videoUrl} />}
              <Markdown text={form.body} />
            </div>
          ) : (
            <textarea value={form.body} maxLength={20000} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={14} className={`${field} font-mono text-[13px]`} />
          )}
          <p className="mt-1 text-xs text-regantify-text-muted">
            Markdown: <code># Heading</code>, <code>**bold**</code>, <code>*italic*</code>, <code>- list</code>, <code>1. steps</code>, <code>[text](/vendor/orders)</code> or a https link.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-regantify-text">Video link (optional)</label>
            <input value={form.videoUrl ?? ''} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} placeholder="https://youtu.be/..." className={field} />
            <p className="mt-1 text-xs text-regantify-text-muted">A YouTube link plays inside the article.</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-regantify-text">Dashboard pages (optional, one per line)</label>
            <textarea value={pathsText} onChange={(e) => setPathsText(e.target.value)} rows={3} placeholder="/vendor/orders" className={`${field} font-mono text-[13px]`} />
            <p className="mt-1 text-xs text-regantify-text-muted">The article opens first when Help is pressed on these pages (and pages under them).</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-regantify-text">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm text-regantify-text">
              Order
              <input type="number" min={0} max={9999} value={form.position} onChange={(e) => setForm({ ...form, position: Math.max(0, Number(e.target.value) || 0) })} className="w-20 rounded-lg border border-line px-2 py-1 text-sm" />
            </label>
          </div>
          <button type="button" disabled={!valid || save.isPending} onClick={() => save.mutate()} className="rounded-lg bg-regantify-cta px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
            {save.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
