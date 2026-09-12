import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';
import { SectionCard, Field, inputClass } from '../../../components/product/ProductFormPieces';
import { pagesApi, type PageStatus } from '../../../lib/pagesApi';
import { toast } from '../../../lib/toast';

export default function AddPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing } = useQuery({
    queryKey: ['pages', id],
    queryFn: () => pagesApi.findOne(id!),
    enabled: isEdit,
  });

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<PageStatus>('PUBLISHED');

  const [formError, setFormError] = useState<string | null>(null);
  const populatedRef = useRef(false);

  // Populate the form once, when editing an existing page.
  if (isEdit && existing && !populatedRef.current) {
    populatedRef.current = true;
    setTitle(existing.title);
    setSlug(existing.slug);
    setContent(existing.content ?? '');
    setStatus(existing.status);
  }

  const saveMutation = useMutation({
    mutationFn: () => (isEdit ? pagesApi.update(id!, buildPayload()) : pagesApi.create(buildPayload())),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      toast.success(isEdit ? 'Page updated.' : 'Page created.');
      navigate('/vendor/store/pages');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Could not save the page. Please try again.');
    },
  });

  function buildPayload() {
    return {
      title: title.trim(),
      slug: slug.trim() || undefined,
      content: content || undefined,
      status,
    };
  }

  const handleSubmit = () => {
    setFormError(null);
    if (!title.trim()) {
      setFormError('Title is required.');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/vendor/store/pages')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Pages
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-semibold text-regantify-text">{isEdit ? 'Edit Page' : 'Add Page'}</h1>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as PageStatus)}
          className="px-3 py-1.5 rounded-lg border border-black/10 bg-white text-sm text-regantify-text"
        >
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </select>
      </div>

      <div className="space-y-6">
        <SectionCard title="Title & Link">
          <div className="space-y-5">
            <Field label="Title">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
            </Field>

            <Field label="Page URL" hint="Leave blank to auto-generate from the title">
              <div className="flex items-center rounded-xl bg-regantify-search overflow-hidden">
                <span className="pl-3.5 pr-1 text-sm text-regantify-text-muted whitespace-nowrap">
                  https://storepal.com.bd/page/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1 py-2.5 pr-3.5 bg-transparent text-regantify-text text-sm focus:outline-none"
                />
              </div>
            </Field>

            {isEdit && existing && (
              <a
                href={`https://storepal.com.bd/page/${existing.slug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm text-regantify-cta hover:underline"
              >
                Preview
              </a>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Content">
          <RichTextEditor value={content} onChange={setContent} placeholder="Enter text here…" />
        </SectionCard>

        {formError && <p className="text-red-500 text-sm">{formError}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="px-8 py-3 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium transition-colors disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update Page' : 'Add Page'}
        </button>
      </div>
    </div>
  );
}
