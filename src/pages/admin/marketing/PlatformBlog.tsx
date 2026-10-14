import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, ImagePlus, Loader2 } from 'lucide-react';
import { marketingCmsApi, type PlatformBlogPost, type PlatformBlogPostBody } from '../../../lib/marketingCmsApi';
import { apiErrorMessage } from '../../../lib/api';
import { formatDhakaDate } from '../../../lib/dhakaDate';
import { dhakaInputToIso, isoToDhakaInput } from '../../../lib/dhakaInput';
import { toast } from '../../../lib/toast';
import { Dialog } from '../../../components/ui/Dialog';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { RowMenu } from '../../../components/admin/RowMenu';
import { Markdown } from '../../../components/help/Markdown';

const field = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-regantify-text focus:outline-none';
const th = 'px-4 py-2 font-normal';
const td = 'px-4 py-2.5';

/**
 * Admin > Marketing > Blog (super-admin-new.md Step 14): the platform's own articles at /blog on the marketing site (tips for sellers, news), separate from
 * each store's Magazine. Markdown text; a future date schedules a post.
 */
export function PlatformBlog() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin-platform-blog'], queryFn: marketingCmsApi.posts });
  const [editing, setEditing] = useState<PlatformBlogPost | 'new' | null>(null);
  const [deleting, setDeleting] = useState<PlatformBlogPost | null>(null);
  const del = useMutation({
    mutationFn: (id: string) => marketingCmsApi.deletePost(id),
    onSuccess: () => {
      toast.success('Deleted.');
      setDeleting(null);
      qc.invalidateQueries({ queryKey: ['admin-platform-blog'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete it.')),
  });
  const now = Date.now();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-regantify-text-muted">
          Articles at{' '}
          <a href="/blog" target="_blank" rel="noopener noreferrer" className="font-medium text-regantify-text underline">
            /blog
          </a>{' '}
          on the public site. A link to the blog shows in the site menu once one post is live.
        </p>
        <button type="button" onClick={() => setEditing('new')} className="rounded-lg bg-regantify-cta px-4 py-2 text-sm font-medium text-white">
          New post
        </button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-neutral-400" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-regantify-text-muted">
                <th className={th}>Title</th>
                <th className={th}>State</th>
                <th className={`${th} text-right`}>Views</th>
                <th className={th}>Updated</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {(data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-regantify-text-muted">
                    No posts yet.
                  </td>
                </tr>
              )}
              {(data ?? []).map((p) => {
                const live = p.status === 'PUBLISHED' && p.publishedAt && new Date(p.publishedAt).getTime() <= now;
                return (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className={td}>
                      <button type="button" onClick={() => setEditing(p)} className="text-left font-medium text-regantify-text hover:underline">
                        {p.title}
                      </button>
                      <p className="console-id text-xs text-regantify-text-muted">/blog/{p.slug}</p>
                    </td>
                    <td className={td}>
                      {p.status === 'DRAFT' ? (
                        <span className="text-regantify-text-muted">Draft</span>
                      ) : live ? (
                        <span className="text-emerald-700">Live since {formatDhakaDate(p.publishedAt!)}</span>
                      ) : (
                        <span className="text-amber-700">Scheduled {p.publishedAt ? formatDhakaDate(p.publishedAt) : ''}</span>
                      )}
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{p.views}</td>
                    <td className={`${td} text-xs text-regantify-text-muted`}>
                      {formatDhakaDate(p.updatedAt)}
                      {p.updatedBy ? ` by ${p.updatedBy}` : ''}
                    </td>
                    <td className={`${td} text-right`}>
                      <RowMenu
                        items={[
                          { label: 'Edit', onSelect: () => setEditing(p) },
                          ...(live ? [{ label: 'Open on the site', onSelect: () => window.open(`/blog/${p.slug}`, '_blank', 'noopener') }] : []),
                          { label: 'Delete', onSelect: () => setDeleting(p), danger: true },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <PostDialog post={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this post?"
        message={`"${deleting?.title ?? ''}" is removed from the site. Links to it will show "not found".`}
        confirmLabel="Delete post"
        danger
        busy={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id)}
      />
    </div>
  );
}

function PostDialog({ post, onClose }: { post: PlatformBlogPost | 'new' | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<PlatformBlogPostBody>({ title: '', excerpt: '', body: '', coverUrl: null, tags: [], status: 'DRAFT', publishedAt: null, seoTitle: '', seoDescription: '' });
  const [slug, setSlug] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [when, setWhen] = useState('');
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!post) return;
    const p = post === 'new' ? null : post;
    setForm({
      title: p?.title ?? '',
      excerpt: p?.excerpt ?? '',
      body: p?.body ?? '',
      coverUrl: p?.coverUrl ?? null,
      tags: p?.tags ?? [],
      status: p?.status ?? 'DRAFT',
      publishedAt: p?.publishedAt ?? null,
      seoTitle: p?.seoTitle ?? '',
      seoDescription: p?.seoDescription ?? '',
    });
    setSlug(p?.slug ?? '');
    setTagsText((p?.tags ?? []).join(', '));
    setWhen(p?.publishedAt ? isoToDhakaInput(p.publishedAt) : '');
    setPreview(false);
  }, [post]);
  const save = useMutation({
    mutationFn: () => {
      const body: PlatformBlogPostBody = {
        ...form,
        title: form.title.trim(),
        excerpt: form.excerpt?.trim() || null,
        seoTitle: form.seoTitle?.trim() || null,
        seoDescription: form.seoDescription?.trim() || null,
        tags: tagsText.split(',').map((t) => t.trim()).filter(Boolean),
        publishedAt: when ? dhakaInputToIso(when) : null,
        ...(slug.trim() && { slug: slug.trim() }),
      };
      return post === 'new' ? marketingCmsApi.createPost(body) : marketingCmsApi.updatePost((post as PlatformBlogPost).id, body);
    },
    onSuccess: () => {
      toast.success('Saved.');
      qc.invalidateQueries({ queryKey: ['admin-platform-blog'] });
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the post.')),
  });
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      setForm((f) => ({ ...f, coverUrl: null }));
      const url = await marketingCmsApi.upload(file, 'blog');
      setForm((f) => ({ ...f, coverUrl: url }));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not upload the picture.'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={post !== null} onOpenChange={(o) => !o && onClose()} title={post === 'new' ? 'New blog post' : 'Edit blog post'} maxWidth="max-w-3xl">
      <div className="space-y-4 p-6 pt-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm font-medium text-regantify-text sm:col-span-2">
            Title
            <input className={`${field} mt-1 font-normal`} value={form.title} maxLength={160} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="block text-sm font-medium text-regantify-text">
            Address (optional)
            <input className={`${field} mt-1 font-normal`} value={slug} maxLength={80} placeholder="made from the title" onChange={(e) => setSlug(e.target.value)} />
          </label>
        </div>
        <label className="block text-sm font-medium text-regantify-text">
          Short summary (shown in the list)
          <textarea className={`${field} mt-1 font-normal`} rows={2} value={form.excerpt ?? ''} maxLength={300} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} />
        </label>
        <div className="flex flex-wrap items-start gap-4">
          <div>
            <p className="mb-1 text-sm font-medium text-regantify-text">Cover picture</p>
            <button type="button" onClick={() => fileRef.current?.click()} className="grid h-24 w-44 place-items-center overflow-hidden rounded-lg border border-dashed border-line bg-regantify-search text-regantify-text-muted">
              {uploading ? <Loader2 size={18} className="animate-spin" /> : form.coverUrl ? <img src={form.coverUrl} alt="" className="h-full w-full object-cover" /> : <ImagePlus size={20} />}
            </button>
            {form.coverUrl && (
              <button type="button" onClick={() => setForm({ ...form, coverUrl: null })} className="text-xs text-regantify-text-muted hover:text-red-600">
                Remove picture
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
          </div>
          <label className="block min-w-[14rem] flex-1 text-sm font-medium text-regantify-text">
            Tags (comma between)
            <input className={`${field} mt-1 font-normal`} value={tagsText} onChange={(e) => setTagsText(e.target.value)} placeholder="Selling tips, Facebook, Courier" />
          </label>
        </div>
        <div>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm font-medium text-regantify-text">Article</p>
            <button type="button" onClick={() => setPreview(!preview)} className="text-xs font-medium hover:underline">
              {preview ? 'Edit' : 'Preview'}
            </button>
          </div>
          {preview ? (
            <div className="max-h-[45vh] overflow-y-auto rounded-lg border border-line p-4">
              <Markdown text={form.body} />
            </div>
          ) : (
            <textarea className={`${field} font-mono text-[13px]`} rows={14} value={form.body} maxLength={50000} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          )}
          <p className="mt-1 text-xs text-regantify-text-muted">
            Markdown: <code># Heading</code>, <code>**bold**</code>, <code>- list</code>, <code>[text](https://...)</code>.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-regantify-text">
            Google title (optional)
            <input className={`${field} mt-1 font-normal`} value={form.seoTitle ?? ''} maxLength={70} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} />
          </label>
          <label className="block text-sm font-medium text-regantify-text">
            Google description (optional)
            <input className={`${field} mt-1 font-normal`} value={form.seoDescription ?? ''} maxLength={170} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} />
          </label>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex gap-1 rounded-lg bg-regantify-search p-1">
              {(['DRAFT', 'PUBLISHED'] as const).map((s) => (
                <button key={s} type="button" onClick={() => setForm({ ...form, status: s })} className={`rounded-md px-3 py-1.5 text-sm ${form.status === s ? 'bg-white font-medium text-regantify-text shadow-sm' : 'text-regantify-text-muted'}`}>
                  {s === 'DRAFT' ? 'Draft' : 'Published'}
                </button>
              ))}
            </div>
            {form.status === 'PUBLISHED' && (
              <label className="block text-xs text-regantify-text-muted">
                Goes live (Dhaka time; empty = now)
                <input type="datetime-local" className={`${field} mt-1`} value={when} onChange={(e) => setWhen(e.target.value)} />
              </label>
            )}
          </div>
          <div className="flex items-center gap-3">
            {post !== 'new' && post?.status === 'PUBLISHED' && (
              <a href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text">
                Open <ExternalLink size={12} />
              </a>
            )}
            <button type="button" disabled={form.title.trim().length < 3 || !form.body.trim() || uploading || save.isPending} onClick={() => save.mutate()} className="rounded-lg bg-regantify-cta px-5 py-2 text-sm font-medium text-white disabled:opacity-50">
              {save.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
