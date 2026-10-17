import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';
import { SectionCard, Field, inputClass } from '../../../components/product/ProductFormPieces';
import { blogApi, type BlogStatus } from '../../../lib/blogApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { BackLink } from '../../../components/ui/BackLink';

/** `datetime-local` wants local time without a zone. */
const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Store > Magazine > Add / Edit post (TellMe idea 106). */
export default function AddPost() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: existing } = useQuery({ queryKey: ['blog', 'one', id], queryFn: () => blogApi.findOne(id!), enabled: isEdit });

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<BlogStatus>('PUBLISHED');
  const [when, setWhen] = useState(toLocalInput(new Date().toISOString()));
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const populated = useRef(false);

  if (isEdit && existing && !populated.current) {
    populated.current = true;
    setTitle(existing.title);
    setSlug(existing.slug);
    setCoverUrl(existing.coverUrl ?? '');
    setExcerpt(existing.excerpt ?? '');
    setContent(existing.content ?? '');
    setTags(existing.tags.join(', '));
    setAuthor(existing.authorName ?? '');
    setStatus(existing.status);
    setWhen(toLocalInput(existing.publishedAt));
  }

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        title: title.trim(),
        slug: slug.trim() || undefined,
        coverUrl: coverUrl || null,
        excerpt: excerpt.trim() || null,
        content: content || null,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5),
        authorName: author.trim() || null,
        status,
        publishedAt: when ? new Date(when).toISOString() : undefined,
      };
      return isEdit ? blogApi.update(id!, payload) : blogApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blog'] });
      toast.success(isEdit ? 'Post updated.' : 'Post added.');
      navigate('/vendor/store/magazine');
    },
    onError: (err) => setFormError(apiErrorMessage(err, 'Could not save the post. Please try again.')),
  });

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      setCoverUrl((await blogApi.uploadCover(file)).url);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not upload the photo.'));
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    setFormError(null);
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }
    save.mutate();
  };

  const scheduled = status === 'PUBLISHED' && when && new Date(when).getTime() > Date.now();

  return (
    <div className="max-w-3xl">
      <BackLink to="/vendor/store/magazine" label="Magazine" className="mb-3" />
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-semibold text-regantify-text">{isEdit ? 'Edit Post' : 'Add Post'}</h1>
        <select value={status} onChange={(e) => setStatus(e.target.value as BlogStatus)} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm text-regantify-text">
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>

      <div className="space-y-6">
        <SectionCard title="Title & Photo">
          <div className="space-y-5">
            <Field label="Title">
              <input type="text" maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Post URL" hint="Leave blank to make it from the title">
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Cover photo" hint="Shown on the card and at the top of the post. A wide or portrait photo of at least 1200 px works best.">
              <div className="flex items-center gap-3">
                {coverUrl && <img src={coverUrl} alt="" className="h-16 w-24 rounded object-cover" />}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={(e) => upload(e.target.files?.[0])} className="text-sm" disabled={uploading} />
                {coverUrl && (
                  <button type="button" onClick={() => setCoverUrl('')} className="text-xs text-red-600">
                    Remove
                  </button>
                )}
              </div>
              {uploading && <p className="mt-1 text-xs text-neutral-500">Uploading…</p>}
            </Field>
            <Field label="Short summary" hint="Two lines shown on the card. Leave blank to use the start of the text.">
              <textarea rows={2} maxLength={300} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} className={`${inputClass} resize-none`} />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Content">
          <RichTextEditor value={content} onChange={setContent} placeholder="Write your post here…" />
        </SectionCard>

        <SectionCard title="Details">
          <div className="space-y-5">
            <Field label="Author name" hint="Leave blank to show your store name.">
              <input type="text" maxLength={60} value={author} onChange={(e) => setAuthor(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Tags" hint="Up to 5, separated by commas.">
              <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="event, award" className={inputClass} />
            </Field>
            <Field label="Publish date" hint="A date in the future keeps the post hidden until then.">
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className={inputClass} />
            </Field>
            {scheduled && <p className="text-xs text-amber-700">This post will show on your store from the date above.</p>}
          </div>
        </SectionCard>

        {formError && <p className="text-sm text-red-500">{formError}</p>}
        <button type="button" onClick={submit} disabled={save.isPending} className="rounded-xl bg-regantify-cta px-8 py-3 font-medium text-white transition-colors hover:bg-regantify-cta-dark disabled:opacity-60">
          {save.isPending ? 'Saving…' : isEdit ? 'Update Post' : 'Add Post'}
        </button>
      </div>
    </div>
  );
}
