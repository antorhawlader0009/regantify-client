import { useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Pencil, Plus, Ruler, Trash2, X } from 'lucide-react';
import { Dialog } from '../../../components/ui/Dialog';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { EmptyState, PageHeader, PageSection, outlineBtn, primaryBtn } from '../../../components/ui/PageKit';
import { categoriesApi } from '../../../lib/categoriesApi';
import {
  MAX_GUIDE_CELL,
  MAX_GUIDE_COLUMNS,
  MAX_GUIDE_ROWS,
  SIZE_GUIDES_KEY,
  sizeGuidesApi,
  type SizeGuide,
  type SizeGuideKind,
} from '../../../lib/sizeGuidesApi';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { useCan } from '../../../lib/useStaffAccess';

const cellInput =
  'h-9 w-full min-w-[84px] rounded-md border border-line bg-white px-2 text-sm text-regantify-text focus:border-brand focus:outline-none';
const fieldClass =
  'block h-10 w-full rounded-lg border border-line bg-white px-3 text-sm font-normal text-regantify-text focus:outline-none focus:border-brand';

// A starting point for a new table: the usual sizes, measurements left for the vendor to fill in.
const STARTER_COLUMNS = ['Size', 'Chest', 'Length'];
const STARTER_ROWS = [['S', '', ''], ['M', '', ''], ['L', '', ''], ['XL', '', ''], ['XXL', '', '']];

/**
 * Product > Size Guides (TellMe idea 13): make a size table or upload a chart picture once, then use it on many
 * products (the Size guide choice on each product) and on whole categories (tick them in the guide). The store shows
 * it as a "Size guide" link beside the Size choice (StorePal theme).
 */
export default function SizeGuides() {
  const queryClient = useQueryClient();
  const canEdit = useCan('products.edit');
  const { data: guides = [], isLoading } = useQuery({ queryKey: SIZE_GUIDES_KEY, queryFn: sizeGuidesApi.list });
  const [editing, setEditing] = useState<SizeGuide | 'new' | null>(null);
  const [deleting, setDeleting] = useState<SizeGuide | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => sizeGuidesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SIZE_GUIDES_KEY });
      toast.success('Size guide deleted.');
      setDeleting(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not delete the size guide.')),
  });

  const addButton = canEdit ? (
    <button onClick={() => setEditing('new')} className={primaryBtn}>
      <Plus size={15} />
      Add size guide
    </button>
  ) : undefined;

  return (
    <PageSection>
      <PageHeader
        title="Size Guides"
        description="Show what each size means (chest, length and so on) next to the Size choice on your store. Make a guide once, use it on many products."
        actions={addButton}
      />

      {isLoading ? (
        <p className="py-6 text-center text-sm text-neutral-500">Loading…</p>
      ) : guides.length === 0 ? (
        <EmptyState
          icon={Ruler}
          title="No size guides yet"
          hint="Fashion and shoe stores see fewer wrong-size returns when shoppers can check the measurements before they order."
          action={addButton}
        />
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {guides.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-regantify-text">{g.name}</p>
                <p className="text-xs text-neutral-500">
                  {g.kind === 'IMAGE' ? 'Picture' : `Table · ${g.rows.length} ${g.rows.length === 1 ? 'size' : 'sizes'}, ${g.columns.length} columns`}
                  {' · '}
                  {g._count.products} {g._count.products === 1 ? 'product' : 'products'}
                  {g.categories.length > 0 && <> · Categories: {g.categories.map((c) => c.name).join(', ')}</>}
                </p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditing(g)} className={outlineBtn}>
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button onClick={() => setDeleting(g)} className={`${outlineBtn} text-red-600`} aria-label={`Delete ${g.name}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && <SizeGuideEditor guide={editing === 'new' ? null : editing} guides={guides} onClose={() => setEditing(null)} />}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete size guide"
        message={
          deleting && (
            <>
              Delete <b>{deleting.name}</b>? Products and categories that use it will stop showing a size guide. This can’t be undone.
            </>
          )
        }
        confirmLabel="Delete size guide"
        danger
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </PageSection>
  );
}

function SizeGuideEditor({ guide, guides, onClose }: { guide: SizeGuide | null; guides: SizeGuide[]; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list() });
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(guide?.name ?? '');
  const [kind, setKind] = useState<SizeGuideKind>(guide?.kind ?? 'TABLE');
  const [columns, setColumns] = useState<string[]>(guide && guide.kind === 'TABLE' ? guide.columns : STARTER_COLUMNS);
  const [rows, setRows] = useState<string[][]>(guide && guide.kind === 'TABLE' ? guide.rows : STARTER_ROWS);
  const [imageUrl, setImageUrl] = useState(guide?.imageUrl ?? '');
  const [note, setNote] = useState(guide?.note ?? '');
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set(guide?.categories.map((c) => c.id) ?? []));
  const [uploading, setUploading] = useState(false);

  // Which other guide a category is on now, so ticking it says it will switch over.
  const otherGuideOf = useMemo(() => {
    const map = new Map<string, string>();
    for (const g of guides) if (g.id !== guide?.id) for (const c of g.categories) map.set(c.id, g.name);
    return map;
  }, [guides, guide?.id]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        name: name.trim(),
        kind,
        note: note.trim(),
        categoryIds: Array.from(categoryIds),
        ...(kind === 'TABLE' ? { columns: columns.map((c) => c.trim()), rows } : { imageUrl }),
      };
      return guide ? sizeGuidesApi.update(guide.id, body) : sizeGuidesApi.create(body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SIZE_GUIDES_KEY });
      toast.success('Size guide saved. Your store shows it shortly.');
      onClose();
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Could not save the size guide.')),
  });

  const setCell = (r: number, c: number, value: string) =>
    setRows((prev) => prev.map((row, i) => (i === r ? row.map((cell, j) => (j === c ? value : cell)) : row)));
  const setHeading = (c: number, value: string) => setColumns((prev) => prev.map((h, i) => (i === c ? value : h)));
  const addColumn = () => {
    setColumns((prev) => [...prev, '']);
    setRows((prev) => prev.map((row) => [...row, '']));
  };
  const removeColumn = (c: number) => {
    setColumns((prev) => prev.filter((_, i) => i !== c));
    setRows((prev) => prev.map((row) => row.filter((_, i) => i !== c)));
  };
  const addRow = () => setRows((prev) => [...prev, columns.map(() => '')]);
  const removeRow = (r: number) => setRows((prev) => prev.filter((_, i) => i !== r));

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      setImageUrl(await sizeGuidesApi.uploadImage(file));
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not upload the picture.'));
    } finally {
      setUploading(false);
    }
  }

  const problem = (() => {
    if (!name.trim()) return 'Give the size guide a name.';
    if (kind === 'IMAGE') return imageUrl ? null : 'Add the size chart picture.';
    if (columns.some((c) => !c.trim())) return 'Every column needs a heading.';
    if (!rows.some((row) => row.some((cell) => cell.trim()))) return 'Fill in at least one row.';
    return null;
  })();

  const toggleCategory = (id: string) =>
    setCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} title={guide ? 'Edit size guide' : 'New size guide'} maxWidth="max-w-3xl">
      <div className="space-y-5 p-6">
        <label className="block text-sm font-medium text-regantify-text">
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. Panjabi, Shirt, Women's shoes"
            className={`${fieldClass} mt-1`}
          />
        </label>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-regantify-text">Made as</legend>
          <div className="flex gap-5 text-sm text-regantify-text">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" checked={kind === 'TABLE'} onChange={() => setKind('TABLE')} className="accent-brand" />
              A table
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" checked={kind === 'IMAGE'} onChange={() => setKind('IMAGE')} className="accent-brand" />
              A picture (a chart you already have)
            </label>
          </div>
        </fieldset>

        {kind === 'TABLE' ? (
          <div>
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-neutral-50">
                    {columns.map((h, c) => (
                      <th key={c} className="p-1.5 text-left font-normal">
                        <div className="flex items-center gap-1">
                          <input
                            value={h}
                            onChange={(e) => setHeading(c, e.target.value)}
                            maxLength={MAX_GUIDE_CELL}
                            placeholder="Heading"
                            aria-label={`Column ${c + 1} heading`}
                            className={`${cellInput} font-semibold`}
                          />
                          {columns.length > 1 && (
                            <button type="button" onClick={() => removeColumn(c)} aria-label={`Remove column ${h || c + 1}`} className="rounded p-1 text-neutral-400 hover:text-red-600">
                              <X size={14} />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, r) => (
                    <tr key={r} className="border-t border-line">
                      {row.map((cell, c) => (
                        <td key={c} className="p-1.5">
                          <input
                            value={cell}
                            onChange={(e) => setCell(r, c, e.target.value)}
                            maxLength={MAX_GUIDE_CELL}
                            aria-label={`Row ${r + 1}, ${columns[c] || `column ${c + 1}`}`}
                            className={cellInput}
                          />
                        </td>
                      ))}
                      <td className="p-1.5">
                        <button type="button" onClick={() => removeRow(r)} aria-label={`Remove row ${r + 1}`} className="rounded p-1 text-neutral-400 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={addRow} disabled={rows.length >= MAX_GUIDE_ROWS} className={outlineBtn}>
                <Plus size={14} />
                Add a size
              </button>
              <button type="button" onClick={addColumn} disabled={columns.length >= MAX_GUIDE_COLUMNS} className={outlineBtn}>
                <Plus size={14} />
                Add a column
              </button>
            </div>
            <p className="mt-1.5 text-xs text-neutral-500">Write the numbers as you want shoppers to read them, like “38” or “21 in”.</p>
          </div>
        ) : (
          <div>
            {imageUrl ? (
              <div className="flex items-start gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Size chart" className="max-h-64 max-w-full rounded-lg border border-line" />
                <button type="button" onClick={() => setImageUrl('')} className={outlineBtn}>
                  <X size={14} />
                  Remove
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={outlineBtn}>
                <ImagePlus size={15} />
                {uploading ? 'Uploading…' : 'Upload the size chart picture'}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
          </div>
        )}

        <label className="block text-sm font-medium text-regantify-text">
          A line under it <span className="font-normal text-neutral-500">(optional)</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            rows={2}
            placeholder="e.g. All measurements are in inches. Measure a shirt that fits you well."
            className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-regantify-text focus:border-brand focus:outline-none"
          />
        </label>

        <div>
          <p className="text-sm font-medium text-regantify-text">Use it for whole categories</p>
          <p className="mb-2 text-xs text-neutral-500">
            Every product in a ticked category (and its subcategories) shows this guide unless the product picked its own. You can also pick a guide on each product.
          </p>
          {categories.length === 0 ? (
            <p className="text-xs text-neutral-500">You have no categories yet.</p>
          ) : (
            <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border border-line p-3">
              {categories.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 text-sm text-regantify-text">
                  <input type="checkbox" checked={categoryIds.has(c.id)} onChange={() => toggleCategory(c.id)} className="accent-brand" />
                  {c.parent ? `${c.parent.name} › ${c.name}` : c.name}
                  {categoryIds.has(c.id) && otherGuideOf.has(c.id) && (
                    <span className="text-xs text-neutral-500">(switches from “{otherGuideOf.get(c.id)}”)</span>
                  )}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line px-6 py-4">
        <p className="text-sm text-red-600">{problem}</p>
        <button
          type="button"
          onClick={() => save.mutate()}
          disabled={save.isPending || problem !== null || uploading}
          className="rounded-lg bg-brand px-5 py-2.5 font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {save.isPending ? 'Saving…' : 'Save size guide'}
        </button>
      </div>
    </Dialog>
  );
}
