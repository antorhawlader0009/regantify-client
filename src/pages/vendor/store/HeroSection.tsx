import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ImagePlus, Images, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { SectionCard } from '../../../components/product/ProductFormPieces';
import { MediaLibraryPicker } from '../../../components/landing/ImageField';
import { heroSlidesApi, type HeroPlanCode, type HeroSlide } from '../../../lib/heroSlidesApi';
import { mediaApi } from '../../../lib/mediaApi';
import { productsApi } from '../../../lib/productsApi';
import { categoriesApi } from '../../../lib/categoriesApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';

const inputClass =
  'h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-sm text-regantify-text focus:outline-none focus:ring-2 focus:ring-regantify-cta/30';
const PLAN_NAMES: Record<HeroPlanCode, string> = { FREE: 'Free', BASIC: 'Basic', STARTER: 'Starter', ADVANCE: 'Advance' };
const PLAN_ORDER: HeroPlanCode[] = ['FREE', 'BASIC', 'STARTER', 'ADVANCE'];

type LinkKind = 'NONE' | 'PRODUCT' | 'CATEGORY' | 'URL';

function linkKindOf(link: string): LinkKind {
  if (!link) return 'NONE';
  if (link.startsWith('/p/')) return 'PRODUCT';
  if (link.startsWith('/?category=')) return 'CATEGORY';
  return 'URL';
}

const newId = () => `h${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;

/**
 * Store > Hero Section: the pictures the home page hero shows, in this order (the owner's rule 2026-11-17: category covers no longer appear
 * in the hero). Free 3, Basic 5, Starter 8, Advance 10 pictures. Each picture can carry optional words, a button and a link to a product, a
 * category or any web address. Saved as a whole list; the store updates within a minute.
 */
export default function HeroSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['hero-slides'], queryFn: heroSlidesApi.get });
  const [rows, setRows] = useState<HeroSlide[]>([]);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (data) {
      setRows(data.items);
      setDirty(false);
    }
  }, [data]);

  const limit = data?.limit ?? 3;
  const over = rows.length > limit;

  const save = useMutation({
    mutationFn: () => heroSlidesApi.save(rows),
    onSuccess: (saved) => {
      queryClient.setQueryData(['hero-slides'], saved);
      setRows(saved.items);
      setDirty(false);
      toast.success('Hero section saved. Your store will show it shortly.');
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the hero section. Please try again.')),
  });

  const update = (next: HeroSlide[]) => {
    setRows(next);
    setDirty(true);
  };
  const set = (i: number, patch: Partial<HeroSlide>) => update(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const move = (i: number, by: number) => {
    const j = i + by;
    if (j < 0 || j >= rows.length) return;
    const next = [...rows];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };
  const remove = (i: number) => update(rows.filter((_, idx) => idx !== i));
  const addPicture = (url: string) => {
    if (rows.length >= limit) {
      toast.error(`Your plan allows ${limit} hero pictures.`);
      return;
    }
    update([...rows, { id: newId(), imageUrl: url, title: '', text: '', buttonText: '', link: '' }]);
  };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold text-regantify-text">Hero Section</h1>
      <p className="mb-6 text-sm text-neutral-600">
        The big pictures at the top of your store’s home page. They show one by one, in the order below. Upload new pictures or pick ones already in your Media library.
      </p>

      <SectionCard title="Your plan">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {PLAN_ORDER.map((code) => (
            <span
              key={code}
              className={`rounded-full border px-3 py-1 ${
                data?.planCode === code ? 'border-regantify-text bg-regantify-text text-white' : 'border-black/10 text-neutral-600'
              }`}
            >
              {PLAN_NAMES[code]}: {data?.limits?.[code] ?? '-'} pictures
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm text-neutral-600">
          You are using {Math.min(rows.length, limit)} of {limit}.{' '}
          {data?.planCode !== 'ADVANCE' && (
            <Link to="/vendor/billing?tab=plan" className="font-medium text-regantify-cta hover:underline">
              Upgrade for more
            </Link>
          )}
        </p>
        {over && (
          <p className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-sm text-white">
            Your plan shows only the first {limit} pictures. Remove {rows.length - limit} to save, or upgrade your plan.
          </p>
        )}
      </SectionCard>

      <div className="mt-5 space-y-4">
        {isLoading && <p className="py-8 text-center text-sm text-neutral-400">Loading…</p>}
        {!isLoading && rows.length === 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center">
            <p className="text-sm font-medium text-regantify-text">No hero pictures yet</p>
            <p className="mt-1 text-sm text-neutral-500">Your home page starts without a hero until you add one.</p>
          </div>
        )}
        {rows.map((row, i) => (
          <SlideCard
            key={row.id}
            row={row}
            index={i}
            count={rows.length}
            hidden={i >= limit}
            onChange={(patch) => set(i, patch)}
            onMove={(by) => move(i, by)}
            onRemove={() => remove(i)}
          />
        ))}
      </div>

      <div className="mt-4">
        <AddPicture disabled={rows.length >= limit} onAdd={addPicture} />
        <p className="mt-2 text-xs text-neutral-500">
          Best size: 2100 x 900 px (a wide 21:9 picture). Keep the important part in the middle, the edges are cut on some screens. 3 to 5 pictures work best: shoppers rarely wait for more.
        </p>
      </div>

      <div className="sticky bottom-0 mt-6 flex justify-end gap-2 border-t border-black/5 bg-white/90 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => data && (setRows(data.items), setDirty(false))}
          disabled={!dirty || save.isPending}
          className="h-10 rounded-xl border border-black/10 px-4 text-sm text-regantify-text disabled:opacity-40"
        >
          Undo changes
        </button>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={!dirty || over || save.isPending}
          className="flex h-10 items-center gap-2 rounded-xl bg-regantify-cta px-5 text-sm font-medium text-white disabled:opacity-40"
        >
          {save.isPending && <Loader2 size={15} className="animate-spin" />}
          Save
        </button>
      </div>
    </div>
  );
}

/** Upload a new picture or pick one from the Media library. */
function AddPicture({ disabled, onAdd, label = 'Add picture' }: { disabled?: boolean; onAdd: (url: string) => void; label?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const { url } = await mediaApi.upload(file);
      onAdd(url);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not upload that picture. Please try again.'));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={disabled || uploading}
        className="flex h-10 items-center gap-2 rounded-xl border border-dashed border-neutral-400 bg-white px-4 text-sm text-regantify-text hover:border-neutral-600 disabled:opacity-40"
      >
        {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
        {uploading ? 'Uploading…' : `${label}: upload`}
      </button>
      <button
        type="button"
        onClick={() => setLibraryOpen(true)}
        disabled={disabled || uploading}
        className="flex h-10 items-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm text-regantify-text hover:border-neutral-400 disabled:opacity-40"
      >
        <Images size={15} />
        Pick from Media library
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {libraryOpen && (
        <MediaLibraryPicker
          onClose={() => setLibraryOpen(false)}
          onPick={(url) => {
            onAdd(url);
            setLibraryOpen(false);
          }}
        />
      )}
    </div>
  );
}

function SlideCard({
  row,
  index,
  count,
  hidden,
  onChange,
  onMove,
  onRemove,
}: {
  row: HeroSlide;
  index: number;
  count: number;
  hidden: boolean;
  onChange: (patch: Partial<HeroSlide>) => void;
  onMove: (by: number) => void;
  onRemove: () => void;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [replacing, setReplacing] = useState(false);
  const small = size && size.w < 1200;

  return (
    <div className={`rounded-2xl border bg-white p-4 ${hidden ? 'border-red-300 opacity-70' : 'border-black/10'}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-regantify-text">
          Picture {index + 1}
          {hidden && <span className="ml-2 text-xs font-normal text-red-600">Not shown on your plan</span>}
        </span>
        <div className="flex items-center gap-1">
          <IconButton label="Move up" disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp size={15} />
          </IconButton>
          <IconButton label="Move down" disabled={index === count - 1} onClick={() => onMove(1)}>
            <ArrowDown size={15} />
          </IconButton>
          <IconButton label="Change picture" onClick={() => setReplacing((v) => !v)}>
            <RefreshCw size={15} />
          </IconButton>
          <IconButton label="Remove" onClick={onRemove}>
            <Trash2 size={15} />
          </IconButton>
        </div>
      </div>

      {/* Same 21:9 crop the store uses, so the owner sees what shoppers see. */}
      <div className="relative aspect-[21/9] overflow-hidden rounded-xl bg-neutral-100">
        <img
          src={row.imageUrl}
          alt=""
          className="h-full w-full object-cover"
          onLoad={(e) => setSize({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
        />
        {(row.title || row.text) && (
          <div className="pointer-events-none absolute inset-0 flex items-center bg-gradient-to-r from-black/55 via-black/20 to-transparent">
            <div className="max-w-[60%] p-4 text-white sm:p-6">
              {row.title && <p className="text-base font-bold leading-tight sm:text-2xl">{row.title}</p>}
              {row.text && <p className="mt-1 text-xs text-white/90 sm:text-sm">{row.text}</p>}
              {row.link && row.buttonText && <span className="mt-3 inline-block rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900">{row.buttonText}</span>}
            </div>
          </div>
        )}
      </div>
      {small && (
        <p className="mt-2 rounded-lg bg-red-600 px-3 py-1.5 text-xs text-white">
          This picture is small ({size.w} x {size.h} px) and may look blurry on big screens. Use one at least 1600 px wide.
        </p>
      )}
      {replacing && (
        <div className="mt-3">
          <AddPicture
            label="New picture"
            onAdd={(url) => {
              onChange({ imageUrl: url });
              setReplacing(false);
            }}
          />
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Heading (optional)</span>
          <input className={inputClass} maxLength={80} value={row.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="e.g. Eid collection is here" />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Short line (optional)</span>
          <input className={inputClass} maxLength={160} value={row.text} onChange={(e) => onChange({ text: e.target.value })} placeholder="e.g. New arrivals every week" />
        </label>
        <LinkPicker link={row.link} onChange={(link) => onChange({ link })} />
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-600">Button text (optional)</span>
          <input
            className={inputClass}
            maxLength={30}
            value={row.buttonText}
            disabled={!row.link}
            onChange={(e) => onChange({ buttonText: e.target.value })}
            placeholder={row.link ? 'e.g. Shop now' : 'Add a link first'}
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-neutral-500">Words show only on templates that put text over the hero picture; leave them empty for a picture alone.</p>
    </div>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-regantify-text disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Where a tap on the picture goes: nowhere, a product, a category or a web address. */
function LinkPicker({ link, onChange }: { link: string; onChange: (link: string) => void }) {
  const [kind, setKind] = useState<LinkKind>(linkKindOf(link));
  const [search, setSearch] = useState('');
  const products = useQuery({
    queryKey: ['hero-products', search],
    queryFn: () => productsApi.list({ search: search || undefined, perPage: 30, visibility: 'PUBLIC' }),
    enabled: kind === 'PRODUCT',
  });
  const categories = useQuery({ queryKey: ['hero-categories'], queryFn: () => categoriesApi.list('PUBLIC'), enabled: kind === 'CATEGORY' });

  const productSlug = link.startsWith('/p/') ? decodeURIComponent(link.slice(3)) : '';
  const categoryName = link.startsWith('/?category=') ? decodeURIComponent(link.slice('/?category='.length)) : '';
  const productOptions = useMemo(() => {
    const list = products.data?.products ?? [];
    const has = list.some((p) => p.slug === productSlug);
    return { list, missing: productSlug && !has ? productSlug : null };
  }, [products.data, productSlug]);

  const pickKind = (k: LinkKind) => {
    setKind(k);
    if (k !== linkKindOf(link)) onChange('');
  };

  return (
    <div className="block">
      <span className="mb-1 block text-xs font-medium text-neutral-600">When tapped, open</span>
      <select className={inputClass} value={kind} onChange={(e) => pickKind(e.target.value as LinkKind)}>
        <option value="NONE">Nothing (picture only)</option>
        <option value="PRODUCT">A product</option>
        <option value="CATEGORY">A category</option>
        <option value="URL">A web address</option>
      </select>
      {kind === 'PRODUCT' && (
        <div className="mt-2 space-y-2">
          <input className={inputClass} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products" />
          <select className={inputClass} value={productSlug} onChange={(e) => onChange(e.target.value ? `/p/${encodeURIComponent(e.target.value)}` : '')}>
            <option value="">{products.isLoading ? 'Loading…' : 'Choose a product'}</option>
            {productOptions.missing && <option value={productOptions.missing}>{productOptions.missing}</option>}
            {productOptions.list.map((p) => (
              <option key={p.id} value={p.slug}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {kind === 'CATEGORY' && (
        <select
          className={`${inputClass} mt-2`}
          value={categoryName}
          onChange={(e) => onChange(e.target.value ? `/?category=${encodeURIComponent(e.target.value)}` : '')}
        >
          <option value="">{categories.isLoading ? 'Loading…' : 'Choose a category'}</option>
          {categoryName && !(categories.data ?? []).some((c) => c.name === categoryName) && <option value={categoryName}>{categoryName}</option>}
          {(categories.data ?? []).map((c) => (
            <option key={c.id} value={c.name}>
              {c.parent ? `${c.parent.name} › ${c.name}` : c.name}
            </option>
          ))}
        </select>
      )}
      {kind === 'URL' && (
        <input
          className={`${inputClass} mt-2`}
          value={link}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder="https://… or a page of your store like /blog"
        />
      )}
    </div>
  );
}
