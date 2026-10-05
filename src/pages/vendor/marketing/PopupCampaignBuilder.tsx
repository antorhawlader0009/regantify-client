import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  ChevronDown,
  Clock,
  Crop,
  Globe,
  ImagePlus,
  Loader2,
  Megaphone,
  Repeat,
  Save,
  Send,
  Trash2,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { SectionCard, Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { Segmented, ToggleRow } from '../../../components/product/ProductFormKit';
import { DropdownMenu, DropdownMenuItem } from '../../../components/ui/DropdownMenu';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { PopupImage } from '../../../components/campaign/PopupCard';
import { PopupPreview, STOREPAL_DEFAULT_ACCENT } from '../../../components/campaign/PopupPreview';
import { ImageCropDialog, POPUP_SHAPES } from '../../../components/campaign/ImageCropDialog';
import {
  NEW_POPUP,
  popupCampaignsApi,
  popupPhase,
  type PopupAlign,
  type PopupForm,
} from '../../../lib/popupCampaignsApi';
import { mediaApi } from '../../../lib/mediaApi';
import { getVendorBranding } from '../../../lib/vendorApi';
import { couponsApi } from '../../../lib/couponsApi';
import { productsApi } from '../../../lib/productsApi';
import { campaignsApi } from '../../../lib/campaignsApi';
import { pagesApi } from '../../../lib/pagesApi';
import { landingPagesApi } from '../../../lib/landingPagesApi';
import { toast } from '../../../lib/toast';
import { toLocalInput } from './MarketingKit';

const LIST = '/vendor/marketing/campaigns';

// ------------------------------------------------------------ small pieces

function AlignButtons({ value, onChange, label }: { value: PopupAlign; onChange: (a: PopupAlign) => void; label: string }) {
  const items: { id: PopupAlign; Icon: LucideIcon }[] = [
    { id: 'LEFT', Icon: AlignLeft },
    { id: 'CENTER', Icon: AlignCenter },
    { id: 'RIGHT', Icon: AlignRight },
  ];
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-white p-0.5">
      {items.map(({ id, Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          aria-label={id.toLowerCase()}
          onClick={() => onChange(id)}
          className={`flex h-6 w-7 items-center justify-center rounded ${value === id ? 'bg-brand-lime text-regantify-text' : 'text-neutral-500 hover:bg-neutral-100'}`}
        >
          <Icon size={13} />
        </button>
      ))}
    </div>
  );
}

function LabelRow({ label, right, counter }: { label: string; right?: ReactNode; counter?: string }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="text-sm font-medium text-regantify-text">{label}</span>
      <span className="flex items-center gap-2">
        {right}
        {counter && <span className="text-xs tabular-nums text-neutral-500">{counter}</span>}
      </span>
    </div>
  );
}

function ColorField({ value, onChange, placeholder }: { value: string | null; onChange: (v: string | null) => void; placeholder: string }) {
  const valid = !!value && /^#[0-9a-fA-F]{6}$/.test(value);
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label="Pick a colour"
        value={valid ? value! : placeholder}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-line bg-white p-1"
      />
      <input
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value.trim() ? e.target.value.trim().toUpperCase() : null)}
        placeholder={placeholder}
        maxLength={7}
        className={productInputClass}
      />
    </div>
  );
}

function RangeRow({ label, value, min, max, unit, onChange, onReset }: { label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void; onReset?: () => void }) {
  return (
    <div>
      <LabelRow
        label={label}
        right={
          <>
            <span className="text-xs tabular-nums text-neutral-500">
              {value}
              {unit}
            </span>
            {onReset && (
              <button type="button" onClick={onReset} className="text-xs font-medium text-brand hover:underline">
                Reset
              </button>
            )}
          </>
        }
      />
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-brand" />
    </div>
  );
}

/** One "Show / Where / Who / Show again" row: icon, label and a plain select on the right. */
function RuleRow({ Icon, label, children, extra }: { Icon: LucideIcon; label: string; children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="border-b border-line last:border-b-0">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-lime/50 text-brand">
          <Icon size={16} />
        </span>
        <span className="text-sm font-medium text-regantify-text">{label}</span>
        <div className="relative ml-auto">{children}</div>
      </div>
      {extra && <div className="px-3 pb-3">{extra}</div>}
    </div>
  );
}

function RuleSelect({ value, onChange, children, label }: { value: string; onChange: (v: string) => void; children: ReactNode; label: string }) {
  return (
    <>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none rounded-md bg-transparent py-1.5 pl-2 pr-6 text-right text-sm text-neutral-600 outline-none hover:bg-neutral-50 focus:ring-2 focus:ring-brand/15"
      >
        {children}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-1 top-2.5 text-neutral-400" aria-hidden />
    </>
  );
}

// ------------------------------------------------------------ button link

type LinkKind = 'HOME' | 'CART' | 'PRODUCT' | 'CAMPAIGN' | 'PAGE' | 'LANDING' | 'CUSTOM';

function linkKindOf(link: string | null): { kind: LinkKind; slug: string } {
  if (!link || link === '/') return { kind: 'HOME', slug: '' };
  if (link === '/cart') return { kind: 'CART', slug: '' };
  const m = /^\/(product|campaigns|page|l)\/(.+)$/.exec(link);
  if (m) return { kind: ({ product: 'PRODUCT', campaigns: 'CAMPAIGN', page: 'PAGE', l: 'LANDING' } as const)[m[1] as 'product'], slug: m[2] };
  return { kind: 'CUSTOM', slug: '' };
}

/**
 * Finds one product by typing, for a store with hundreds: the search runs on
 * the server (name or SKU) a moment after typing stops and shows the first
 * matches, instead of loading a giant list into a dropdown.
 */
function ProductSearch({ slug, onPick }: { slug: string; onPick: (slug: string) => void }) {
  type Hit = { name: string; slug?: string; sku?: string; photoUrls?: string[] };
  const [text, setText] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 250);
    return () => clearTimeout(t);
  }, [text]);

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);

  const results = useQuery({
    queryKey: ['popup-product-search', debounced],
    enabled: open,
    placeholderData: keepPreviousData,
    queryFn: async () => (await productsApi.list({ search: debounced || undefined, perPage: 12 })).products as unknown as Hit[],
  });

  // A saved link only holds the slug: look the name up so the field can show it.
  useQuery({
    queryKey: ['popup-product-label', slug],
    enabled: !!slug && !label,
    queryFn: async () => {
      const found = ((await productsApi.list({ search: slug.replace(/-/g, ' '), perPage: 10 })).products as unknown as Hit[]).find((p) => p.slug === slug);
      if (found) setLabel(found.name);
      return found?.name ?? null;
    },
  });

  const hits = results.data ?? [];
  return (
    <div ref={boxRef} className="relative">
      <input
        value={open ? text : (label ?? slug.replace(/-/g, ' '))}
        onFocus={() => {
          setOpen(true);
          setText('');
        }}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search your products by name or SKU…"
        aria-label="Search products"
        className={productInputClass}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-lg">
          {results.isLoading && <li className="px-3 py-2 text-sm text-neutral-500">Searching…</li>}
          {!results.isLoading && hits.length === 0 && <li className="px-3 py-2 text-sm text-neutral-500">No product matches “{debounced}”.</li>}
          {hits
            .filter((p) => p.slug)
            .map((p) => (
              <li key={p.slug}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(p.slug!);
                    setLabel(p.name);
                    setOpen(false);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-neutral-50"
                >
                  {p.photoUrls?.[0] ? <img src={p.photoUrls[0]} alt="" className="h-8 w-8 shrink-0 rounded object-cover" /> : <span className="h-8 w-8 shrink-0 rounded bg-neutral-100" />}
                  <span className="min-w-0">
                    <span className="block truncate">{p.name}</span>
                    {p.sku && <span className="block truncate text-xs text-neutral-500">{p.sku}</span>}
                  </span>
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}

function LinkPicker({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const initial = useMemo(() => linkKindOf(value), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [kind, setKind] = useState<LinkKind>(initial.kind);

  const needsList = kind === 'PRODUCT' || kind === 'CAMPAIGN' || kind === 'PAGE' || kind === 'LANDING';
  const { data: options = [], isLoading } = useQuery({
    queryKey: ['popup-link-options', kind],
    // Products have their own search box below (a store can have hundreds).
    enabled: needsList && kind !== 'PRODUCT',
    queryFn: async (): Promise<{ slug: string; label: string }[]> => {
      if (kind === 'CAMPAIGN') return (await campaignsApi.list()).map((c) => ({ slug: c.slug, label: c.name }));
      if (kind === 'PAGE') return (await pagesApi.list()).map((p) => ({ slug: p.slug, label: p.title }));
      return (await landingPagesApi.list()).map((p) => ({ slug: p.slug, label: p.title }));
    },
  });

  const prefix = { PRODUCT: '/product/', CAMPAIGN: '/campaigns/', PAGE: '/page/', LANDING: '/l/' } as const;
  const chooseKind = (k: LinkKind) => {
    setKind(k);
    if (k === 'HOME') onChange('/');
    else if (k === 'CART') onChange('/cart');
    else if (k === 'CUSTOM') onChange('');
  };
  const current = needsList ? (value ?? '').replace(prefix[kind as keyof typeof prefix] ?? '', '') : '';

  return (
    <div className="space-y-2">
      <div className="relative">
        <select value={kind} onChange={(e) => chooseKind(e.target.value as LinkKind)} className={`${productInputClass} appearance-none pr-8`} aria-label="Button goes to">
          <option value="HOME">Homepage (/)</option>
          <option value="CART">Cart</option>
          <option value="PRODUCT">A product</option>
          <option value="CAMPAIGN">A campaign page</option>
          <option value="PAGE">A page</option>
          <option value="LANDING">A landing page</option>
          <option value="CUSTOM">Another link</option>
        </select>
        <ChevronDown size={14} className="pointer-events-none absolute right-3 top-3.5 text-neutral-400" aria-hidden />
      </div>
      {kind === 'PRODUCT' && <ProductSearch slug={current} onPick={(s) => onChange(`/product/${s}`)} />}
      {needsList && kind !== 'PRODUCT' && (
        <select
          value={current}
          onChange={(e) => onChange(e.target.value ? `${prefix[kind as keyof typeof prefix]}${e.target.value}` : '')}
          className={productInputClass}
          aria-label="Choose one"
        >
          <option value="">{isLoading ? 'Loading…' : options.length ? 'Choose one…' : 'Nothing here yet'}</option>
          {options.filter((o) => o.slug).map((o) => (
            <option key={o.slug} value={o.slug}>
              {o.label}
            </option>
          ))}
        </select>
      )}
      {kind === 'CUSTOM' && (
        <input value={value ?? ''} onChange={(e) => onChange(e.target.value.trim())} placeholder="/product/my-shoe or https://…" className={productInputClass} />
      )}
    </div>
  );
}

// ------------------------------------------------------------ media picker

function LibraryPicker({ onClose, onPick }: { onClose: () => void; onPick: (url: string) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ['media', 'popup-picker'], queryFn: () => mediaApi.list({ type: 'image', perPage: 60 }) });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[80vh] w-full max-w-3xl overflow-hidden rounded-xl border border-line bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h3 className="text-[15px] font-semibold">Media library</h3>
          <button type="button" onClick={onClose} aria-label="Close" className="text-neutral-500 hover:text-regantify-text">
            <X size={17} />
          </button>
        </div>
        <div className="max-h-[calc(80vh-56px)] overflow-y-auto p-4">
          {isLoading && <p className="py-10 text-center text-sm text-neutral-500">Loading…</p>}
          {!isLoading && (data?.items.length ?? 0) === 0 && <p className="py-10 text-center text-sm text-neutral-500">Nothing in your library yet. Upload a picture instead.</p>}
          <div className="grid grid-cols-4 gap-2.5 sm:grid-cols-6">
            {data?.items.map((a) => (
              <button key={a.id} type="button" onClick={() => onPick(a.url)} className="overflow-hidden rounded-lg border border-line hover:border-brand">
                <img src={a.url} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ the builder

export default function PopupCampaignBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<PopupForm>(NEW_POPUP);
  const [saved, setSaved] = useState<string>(JSON.stringify(NEW_POPUP));
  const [recordId, setRecordId] = useState<string | undefined>(id);
  const [uploading, setUploading] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const existing = useQuery({ queryKey: ['popup-campaign', id], queryFn: () => popupCampaignsApi.findOne(id!), enabled: !!id });
  const branding = useQuery({ queryKey: ['vendor-branding'], queryFn: getVendorBranding });
  const coupons = useQuery({ queryKey: ['coupons', 'popup-picker'], queryFn: () => couponsApi.list({ perPage: 50 }) });

  useEffect(() => {
    if (!existing.data) return;
    const { id: _i, vendorId: _v, impressions: _im, clicks: _c, createdAt: _ca, updatedAt: _u, ...rest } = existing.data;
    setForm(rest);
    setSaved(JSON.stringify(rest));
  }, [existing.data]);

  const set = <K extends keyof PopupForm>(key: K, value: PopupForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const dirty = JSON.stringify(form) !== saved;
  const accent = branding.data?.accentColor || STOREPAL_DEFAULT_ACCENT;
  const phase = popupPhase(form);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = useMutation({
    mutationFn: async (status: PopupForm['status']) => {
      const payload = { ...form, status };
      return recordId ? popupCampaignsApi.update(recordId, payload) : popupCampaignsApi.create(payload);
    },
    onSuccess: (row, status) => {
      queryClient.invalidateQueries({ queryKey: ['popup-campaigns'] });
      queryClient.setQueryData(['popup-campaign', row.id], row);
      const { id: _i, vendorId: _v, impressions: _im, clicks: _c, createdAt: _ca, updatedAt: _u, ...rest } = row;
      setForm(rest);
      setSaved(JSON.stringify(rest));
      toast.success(status === 'PUBLISHED' ? 'Campaign is live' : 'Draft saved');
      if (!recordId) {
        setRecordId(row.id);
        navigate(`${LIST}/popup/${row.id}/edit`, { replace: true });
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      toast.error((Array.isArray(msg) ? msg[0] : msg) ?? 'Couldn’t save this campaign. Try again in a minute.');
    },
  });

  const submit = (status: PopupForm['status']) => {
    if (!form.name.trim()) {
      setNameError('Give the campaign a name');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setNameError(null);
    save.mutate(status);
  };

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await mediaApi.upload(file);
      setForm((f) => ({ ...f, imageUrl: url, imageCrop: null }));
      setCropOpen(true);
    } catch {
      toast.error('Couldn’t upload that picture. Try again.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const back = () => (dirty ? setLeaving(true) : navigate(LIST));
  const openSchedule = () => {
    setMoreOpen(true);
    setTimeout(() => moreRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  };

  const isToast = form.format === 'TOAST';
  const alignBlock = (key: 'headlineAlign' | 'messageAlign' | 'buttonAlign') => (
    <AlignButtons label="Align" value={form[key] ?? form.align} onChange={(a) => set(key, a)} />
  );

  if (id && existing.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-regantify-content">
        <Loader2 className="animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-regantify-content">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-line bg-white px-4 py-2.5">
        <button type="button" onClick={back} aria-label="Back to campaigns" className="flex h-9 w-9 items-center justify-center rounded-lg border border-line hover:bg-neutral-50">
          <ArrowLeft size={16} />
        </button>
        <span className="hidden h-9 w-9 items-center justify-center rounded-lg bg-brand-lime/60 text-brand sm:flex">
          <Megaphone size={17} />
        </span>
        <div className="min-w-0">
          <div className="truncate text-[15px] font-semibold text-regantify-text">{form.name.trim() || 'New campaign'}</div>
          <div className="text-xs text-neutral-500">{dirty ? 'Unsaved changes' : 'All changes saved'}</div>
        </div>
        <span className="ml-1 hidden rounded-full border border-line bg-neutral-50 px-2 py-0.5 text-[11px] text-neutral-600 sm:inline">{phase}</span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => submit('DRAFT')} disabled={save.isPending} className={outlineBtn}>
            <Save size={14} aria-hidden />
            <span className="hidden sm:inline">{form.status === 'PUBLISHED' ? 'Unpublish' : 'Save draft'}</span>
          </button>
          <div className="flex">
            <button type="button" onClick={() => submit('PUBLISHED')} disabled={save.isPending} className={`${primaryBtn} rounded-r-none`}>
              {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} aria-hidden />}
              {form.status === 'PUBLISHED' ? 'Save changes' : 'Create campaign'}
            </button>
            <DropdownMenu
              trigger={
                <button type="button" aria-label="More ways to publish" className={`${primaryBtn} rounded-l-none border-l border-white/20 px-2`}>
                  <ChevronDown size={14} />
                </button>
              }
            >
              <DropdownMenuItem onSelect={() => submit('DRAFT')}>Save as draft</DropdownMenuItem>
              <DropdownMenuItem onSelect={openSchedule}>Schedule for later…</DropdownMenuItem>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1400px] gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* ---------------- form */}
        <div className="space-y-4">
          <SectionCard title="1. Campaign name" description="Only you see this. It is how you will find the campaign in your list.">
            <Field label="Name" required error={nameError} hint="An internal label. Shoppers never see it.">
              <input value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={120} className={productInputClass} placeholder="Eid sale" />
            </Field>
          </SectionCard>

          <SectionCard title="2. Format" description="What kind of message this is. Everything below follows from it.">
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  { id: 'DIALOG', title: 'Centred dialog', hint: 'Takes over the screen. Best for offers you want read.' },
                  { id: 'TOAST', title: 'Corner toast', hint: 'Sits in a corner. Best for news that can be ignored.' },
                ] as const
              ).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={form.format === o.id}
                  onClick={() => set('format', o.id)}
                  className={`rounded-xl border p-3.5 text-left transition-colors ${form.format === o.id ? 'border-brand bg-brand-lime/30' : 'border-line hover:bg-neutral-50'}`}
                >
                  <div className="text-sm font-semibold text-regantify-text">{o.title}</div>
                  <div className="mt-0.5 text-xs text-neutral-500">{o.hint}</div>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="3. Content">
            <div className="space-y-5">
              <div>
                <LabelRow label="Banner shape" />
                <div className="flex flex-wrap gap-1.5">
                  {POPUP_SHAPES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      aria-pressed={form.imageShape === s.id}
                      onClick={() => setForm((f) => ({ ...f, imageShape: s.id, imageCrop: null }))}
                      className={`h-8 rounded-full border px-3 text-[13px] ${form.imageShape === s.id ? 'border-brand bg-brand-lime/60 font-medium' : 'border-line text-neutral-600 hover:bg-neutral-50'}`}
                    >
                      {s.label} <span className="text-neutral-500">{s.ratio}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-neutral-500">Sets the crop the picture is fitted to. Wider shapes leave more room for your text.</p>
              </div>

              <div>
                <LabelRow label="Image" counter="optional" />
                {form.imageUrl ? (
                  <div className="space-y-2">
                    <div className="flex items-start gap-3">
                      <div className="w-32 shrink-0 overflow-hidden rounded-lg border border-line">
                        <PopupImage url={form.imageUrl} alt={form.imageAlt} shape={form.imageShape} crop={form.imageCrop} />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => setCropOpen(true)} className={outlineBtn}>
                          <Crop size={14} aria-hidden />
                          Adjust
                        </button>
                        <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={outlineBtn}>
                          Replace image
                        </button>
                        <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: null, imageCrop: null, imageAlt: null }))} className={`${outlineBtn} text-red-600`}>
                          <Trash2 size={14} aria-hidden />
                          Remove
                        </button>
                      </div>
                    </div>
                    <input value={form.imageAlt ?? ''} onChange={(e) => set('imageAlt', e.target.value)} maxLength={200} placeholder="Describe the picture (for screen readers)" className={productInputClass} />
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 py-6 text-sm text-neutral-600 hover:bg-neutral-50"
                    >
                      {uploading ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
                      <span className="font-medium text-regantify-text">{uploading ? 'Uploading…' : 'Upload image'}</span>
                      <span className="text-xs text-neutral-500">PNG, JPG or WEBP. Pick the shape while cropping.</span>
                    </button>
                    <button type="button" onClick={() => setLibraryOpen(true)} className={`${outlineBtn} h-auto px-4`}>
                      Library
                    </button>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void upload(f);
                  }}
                />
              </div>

              <div>
                <LabelRow label="Headline" right={alignBlock('headlineAlign')} counter={`${form.headline.length} / 80`} />
                <input value={form.headline} onChange={(e) => set('headline', e.target.value)} maxLength={80} className={productInputClass} placeholder="Eid sale: up to 40% off" />
              </div>

              <div>
                <LabelRow label="Message" right={alignBlock('messageAlign')} counter={`${form.message.length} / 200`} />
                <textarea value={form.message} onChange={(e) => set('message', e.target.value)} maxLength={200} rows={3} className={productInputClass} placeholder="Tell shoppers what the offer is and until when." />
              </div>

              <div className="rounded-xl border border-line p-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Text placement</span>
                  <Segmented
                    ariaLabel="Text placement"
                    value={form.textPlacement}
                    onChange={(v) => set('textPlacement', v)}
                    options={[
                      { id: 'BELOW_IMAGE', label: 'Below image' },
                      { id: 'ON_IMAGE', label: 'On image' },
                    ]}
                  />
                </div>
                {form.textPlacement === 'ON_IMAGE' && !form.imageUrl && <p className="mt-2 text-xs text-amber-700">Add an image first. Without one the text sits below.</p>}
                <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
                  <span className="text-sm text-neutral-600">Align text</span>
                  <AlignButtons label="Align text" value={form.align} onChange={(a) => setForm((f) => ({ ...f, align: a, headlineAlign: null, messageAlign: null, buttonAlign: null }))} />
                </div>
                <p className="mt-2 text-xs text-neutral-500">The popup’s alignment. Every block follows it until you give that block one of its own, with the buttons beside each field.</p>
              </div>

              {!isToast && (
                <div className="rounded-xl border border-line p-3.5">
                  <RangeRow label="Popup width" value={form.width} min={280} max={640} unit="px" onChange={(v) => set('width', v)} onReset={() => set('width', 460)} />
                  <p className="mt-1.5 text-xs text-neutral-500">The widest it will ever draw. Narrower screens shrink it to fit, so even 640px stays inside a phone.</p>
                </div>
              )}

              <div className="rounded-xl border border-line p-3.5">
                <ToggleRow label="Show a coupon code" hint="Reveals a code the shopper can copy." checked={form.couponEnabled} onChange={(v) => set('couponEnabled', v)} />
                {form.couponEnabled && (
                  <div className="mt-3">
                    <input
                      list="popup-coupons"
                      value={form.couponCode ?? ''}
                      onChange={(e) => set('couponCode', e.target.value.toUpperCase())}
                      maxLength={40}
                      placeholder="EID20"
                      className={productInputClass}
                    />
                    <datalist id="popup-coupons">
                      {coupons.data?.coupons.map((c) => (
                        <option key={c.id} value={c.code} />
                      ))}
                    </datalist>
                    <p className="mt-1.5 text-xs text-neutral-500">Pick one of your coupons, or type a code. Create the coupon under Marketing &gt; Coupons first so it works at checkout.</p>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-line p-3.5">
                <ToggleRow label="Add a button" hint="Give shoppers something to click: a page, a product, a campaign." checked={form.buttonEnabled} onChange={(v) => set('buttonEnabled', v)} />
                {form.buttonEnabled && (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <LabelRow label="Button text" right={alignBlock('buttonAlign')} />
                        <input value={form.buttonText ?? ''} onChange={(e) => set('buttonText', e.target.value)} maxLength={40} className={productInputClass} />
                      </div>
                      <div>
                        <LabelRow label="Button goes to" />
                        <LinkPicker value={form.buttonLink} onChange={(v) => set('buttonLink', v)} />
                      </div>
                    </div>
                    <div>
                      <LabelRow label="Button colour" />
                      <ColorField value={form.buttonColor} onChange={(v) => set('buttonColor', v)} placeholder={accent.startsWith('#') ? accent.toUpperCase() : STOREPAL_DEFAULT_ACCENT} />
                      <p className="mt-1.5 text-xs text-neutral-500">Blank follows your store theme ({accent.toUpperCase()}).</p>
                    </div>
                    <div>
                      <LabelRow label="Button style" />
                      <Segmented
                        ariaLabel="Button style"
                        value={form.buttonStyle}
                        onChange={(v) => set('buttonStyle', v)}
                        options={[
                          { id: 'SOLID', label: 'Solid' },
                          { id: 'OUTLINE', label: 'Outline' },
                          { id: 'TEXT', label: 'Text' },
                        ]}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="4. When and who sees it">
            <div className="overflow-hidden rounded-xl border border-line">
              <RuleRow
                Icon={Clock}
                label="Show"
                extra={
                  form.trigger === 'DELAY' ? (
                    <label className="flex items-center gap-2 text-sm text-neutral-600">
                      After
                      <input type="number" min={0} max={120} value={form.triggerSeconds} onChange={(e) => set('triggerSeconds', Math.min(120, Math.max(0, Number(e.target.value) || 0)))} className={`${productInputClass} w-20`} />
                      seconds
                    </label>
                  ) : form.trigger === 'SCROLL' ? (
                    <label className="flex items-center gap-2 text-sm text-neutral-600">
                      After scrolling
                      <input type="number" min={5} max={100} value={form.triggerScrollPercent} onChange={(e) => set('triggerScrollPercent', Math.min(100, Math.max(5, Number(e.target.value) || 5)))} className={`${productInputClass} w-20`} />
                      % of the page
                    </label>
                  ) : form.trigger === 'EXIT_INTENT' ? (
                    <p className="text-xs text-neutral-500">When the mouse leaves through the top of the window. Phones and tablets never show it.</p>
                  ) : undefined
                }
              >
                <RuleSelect label="Show" value={form.trigger} onChange={(v) => set('trigger', v as PopupForm['trigger'])}>
                  <option value="IMMEDIATE">Right away</option>
                  <option value="DELAY">After a few seconds</option>
                  <option value="SCROLL">After scrolling</option>
                  <option value="EXIT_INTENT">When leaving (desktop)</option>
                </RuleSelect>
              </RuleRow>
              <RuleRow
                Icon={Globe}
                label="Where"
                extra={
                  form.pageScope === 'SPECIFIC' ? (
                    <div>
                      <textarea
                        value={form.pagePaths.join('\n')}
                        onChange={(e) => set('pagePaths', e.target.value.split('\n').map((l) => l.trim()).filter(Boolean))}
                        rows={3}
                        placeholder={'/product/my-shoe\n/campaigns/*'}
                        className={productInputClass}
                      />
                      <p className="mt-1.5 text-xs text-neutral-500">One page per line, starting with /. End with * to match everything under it.</p>
                    </div>
                  ) : undefined
                }
              >
                <RuleSelect label="Where" value={form.pageScope} onChange={(v) => set('pageScope', v as PopupForm['pageScope'])}>
                  <option value="ALL">All pages</option>
                  <option value="HOME">Homepage only</option>
                  <option value="PRODUCT">Product pages</option>
                  <option value="CART">Cart page</option>
                  <option value="SPECIFIC">Specific pages</option>
                </RuleSelect>
              </RuleRow>
              <RuleRow Icon={Users} label="Who sees it">
                <RuleSelect label="Who sees it" value={form.audience} onChange={(v) => set('audience', v as PopupForm['audience'])}>
                  <option value="EVERYONE">Everyone</option>
                  <option value="NEW">New visitors</option>
                  <option value="RETURNING">Returning visitors</option>
                </RuleSelect>
              </RuleRow>
              <RuleRow Icon={Repeat} label="Show again">
                <RuleSelect label="Show again" value={form.frequency} onChange={(v) => set('frequency', v as PopupForm['frequency'])}>
                  <option value="ONCE_EVER">Once, ever</option>
                  <option value="ONCE_PER_SESSION">Once per visit</option>
                  <option value="ONCE_PER_DAY">Once a day</option>
                  <option value="ONCE_PER_WEEK">Once a week</option>
                  <option value="EVERY_PAGE">On every page</option>
                </RuleSelect>
              </RuleRow>
            </div>
            <p className="mt-2 text-xs text-neutral-500">Never shown on checkout, payment, account or landing pages. Shown on StorePal stores only.</p>
          </SectionCard>
        </div>

        {/* ---------------- preview */}
        <div className="space-y-4 lg:sticky lg:top-[72px] lg:self-start">
          <div className="rounded-xl border border-line bg-white p-4">
            <PopupPreview popup={form} accent={accent} headingFont={branding.data?.brandHeadingFont} bodyFont={branding.data?.brandBodyFont} />
          </div>

          <div ref={moreRef} className="rounded-xl border border-line bg-white">
            <button type="button" onClick={() => setMoreOpen((o) => !o)} aria-expanded={moreOpen} className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-regantify-text">
              More options
              <ChevronDown size={16} className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>
            {moreOpen && (
              <div className="space-y-5 border-t border-line p-4">
                <div>
                  <LabelRow label="Schedule" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Starts" hint="Blank starts as soon as it is created.">
                      <input type="datetime-local" value={toLocalInput(form.startsAt)} onChange={(e) => set('startsAt', e.target.value ? new Date(e.target.value).toISOString() : null)} className={productInputClass} />
                    </Field>
                    <Field label="Ends" hint="Blank keeps it running.">
                      <input type="datetime-local" value={toLocalInput(form.endsAt)} onChange={(e) => set('endsAt', e.target.value ? new Date(e.target.value).toISOString() : null)} className={productInputClass} />
                    </Field>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <LabelRow label="Background colour" />
                    <ColorField value={form.backgroundColor} onChange={(v) => set('backgroundColor', v)} placeholder="#FFFFFF" />
                  </div>
                  <div>
                    <LabelRow label="Text colour" />
                    <ColorField value={form.textColor} onChange={(v) => set('textColor', v)} placeholder="#1A1A1A" />
                  </div>
                </div>
                <RangeRow label="Corner roundness" value={form.cornerRadius} min={0} max={32} unit="px" onChange={(v) => set('cornerRadius', v)} onReset={() => set('cornerRadius', 12)} />
                {!isToast ? (
                  <RangeRow label="Dim the page behind" value={form.overlayOpacity} min={0} max={90} unit="%" onChange={(v) => set('overlayOpacity', v)} onReset={() => set('overlayOpacity', 50)} />
                ) : (
                  <div>
                    <LabelRow label="Corner" />
                    <Segmented
                      ariaLabel="Toast corner"
                      value={form.toastCorner}
                      onChange={(v) => set('toastCorner', v)}
                      options={[
                        { id: 'BOTTOM_LEFT', label: 'Bottom left' },
                        { id: 'BOTTOM_RIGHT', label: 'Bottom right' },
                      ]}
                    />
                  </div>
                )}
                <div>
                  <ToggleRow label="Close by itself" hint="Hide the popup after a few seconds." checked={form.autoCloseSeconds !== null} onChange={(v) => set('autoCloseSeconds', v ? 10 : null)} />
                  {form.autoCloseSeconds !== null && (
                    <label className="mt-2 flex items-center gap-2 text-sm text-neutral-600">
                      After
                      <input type="number" min={2} max={120} value={form.autoCloseSeconds} onChange={(e) => set('autoCloseSeconds', Math.min(120, Math.max(2, Number(e.target.value) || 2)))} className={`${productInputClass} w-20`} />
                      seconds
                    </label>
                  )}
                </div>
                <div>
                  <LabelRow label="Devices" />
                  <Segmented
                    ariaLabel="Devices"
                    value={form.devices}
                    onChange={(v) => set('devices', v)}
                    options={[
                      { id: 'ALL', label: 'All' },
                      { id: 'DESKTOP', label: 'Desktop' },
                      { id: 'MOBILE', label: 'Phones' },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {form.imageUrl && (
        <ImageCropDialog
          open={cropOpen}
          imageUrl={form.imageUrl}
          shape={form.imageShape}
          crop={form.imageCrop}
          onClose={() => setCropOpen(false)}
          onApply={(shape, crop) => {
            setForm((f) => ({ ...f, imageShape: shape, imageCrop: crop }));
            setCropOpen(false);
          }}
        />
      )}
      {libraryOpen && (
        <LibraryPicker
          onClose={() => setLibraryOpen(false)}
          onPick={(url) => {
            setForm((f) => ({ ...f, imageUrl: url, imageCrop: null }));
            setLibraryOpen(false);
            setCropOpen(true);
          }}
        />
      )}
      <ConfirmDialog
        open={leaving}
        onOpenChange={setLeaving}
        title="Leave without saving?"
        message="Your changes to this campaign will be lost."
        confirmLabel="Leave"
        onConfirm={() => navigate(LIST)}
        danger
      />
    </div>
  );
}
