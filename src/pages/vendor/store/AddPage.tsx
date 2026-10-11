import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';
import { SectionCard, Field, inputClass } from '../../../components/product/ProductFormPieces';
import { pagesApi, type PageStatus } from '../../../lib/pagesApi';
import { toast } from '../../../lib/toast';
import { getBusinessHours, getVendorDeliveryCharges, getVendorSettings } from '../../../lib/vendorApi';
import { storeSettingsApi } from '../../../lib/storeSettingsApi';
import { POLICY_KINDS, policyHtml, policyTitle, type PolicyFacts, type PolicyKind, type PolicyLang } from '../../../lib/policyTemplates';

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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

  // "Start from a ready text" (TellMe idea 80): a sample policy with the store's own facts filled in, opened as a Draft.
  const [tplKind, setTplKind] = useState<PolicyKind>('RETURN');
  const [tplLang, setTplLang] = useState<PolicyLang>('en');
  const [tplBusy, setTplBusy] = useState(false);

  async function useTemplate() {
    if (content.trim() && !window.confirm('Replace what is in the editor with the ready text?')) return;
    setTplBusy(true);
    try {
      const [settings, charges, stock, hours] = await Promise.all([
        getVendorSettings(),
        getVendorDeliveryCharges(),
        storeSettingsApi.getStock().catch(() => null),
        getBusinessHours().catch(() => ({ businessHours: null })),
      ]);
      const hoursText = hours.businessHours
        ? Object.entries(hours.businessHours)
            .filter(([, d]) => d.open)
            .map(([k, d]) => `${DAY_SHORT[Number(k)]} ${d.from}-${d.to}`)
            .join(', ')
        : '';
      const facts: PolicyFacts = {
        storeName: settings.storeName,
        address: settings.address,
        phone: settings.phone ?? null,
        returnDays: stock?.defaultReturnDays ?? null,
        returnCondition: stock?.defaultReturnCondition ?? null,
        insideCharge: Number(charges.insideDhakaCharge),
        outsideCharge: Number(charges.outsideDhakaCharge),
        insideDays: charges.insideDhakaDays,
        outsideDays: charges.outsideDhakaDays,
        hours: hoursText || null,
      };
      setContent(policyHtml(tplKind, tplLang, facts));
      if (!title.trim()) setTitle(policyTitle(tplKind, tplLang));
      if (!isEdit) setStatus('DRAFT');
      toast.success('Ready text added. Read it, change what does not fit, then save.');
    } catch {
      toast.error('Could not load your store details. Please try again.');
    } finally {
      setTplBusy(false);
    }
  }

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

        <SectionCard title="Start from a ready text">
          <div className="space-y-3">
            <p className="text-sm text-neutral-600">
              Pick a policy and your store name, address, phone, return days, delivery charge and hours are filled in. It is only a general sample, not legal advice. A new page stays a Draft until you publish it, and you add its link to the footer yourself.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select value={tplKind} onChange={(e) => setTplKind(e.target.value as PolicyKind)} className="h-10 rounded-lg border border-line bg-white px-3 text-sm">
                {POLICY_KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
              <select value={tplLang} onChange={(e) => setTplLang(e.target.value as PolicyLang)} className="h-10 rounded-lg border border-line bg-white px-3 text-sm">
                <option value="en">English</option>
                <option value="bn">বাংলা</option>
              </select>
              <button type="button" onClick={useTemplate} disabled={tplBusy} className="h-10 rounded-lg border border-line bg-white px-4 text-sm font-medium text-regantify-text hover:bg-neutral-50 disabled:opacity-60">
                {tplBusy ? 'Loading…' : 'Use this text'}
              </button>
            </div>
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
