import { useState } from 'react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2 } from 'lucide-react';
import type { FooterLink } from '../../../../lib/footerApi';

interface FooterLinkListEditorProps {
  links: FooterLink[];
  onChange: (links: FooterLink[]) => void;
}

/**
 * Add/remove/reorder editor for one footer link column (Store > Footer's
 * "Menu"/"Information" columns — both share this exact component, same
 * label+url shape). Reorder uses @dnd-kit, same pattern as the Landing
 * Page builder's SectionList (client/src/components/landing/
 * SectionList.tsx) — pointer sensor with a small activation distance so
 * a plain click on an input still works, keyboard sensor for
 * accessibility.
 */
export function FooterLinkListEditor({ links, onChange }: FooterLinkListEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Stable per-row id for dnd-kit — links themselves have no id (just
  // label+url), so index-based keys would break dnd-kit's identity
  // tracking across a reorder. Generated once per row via a WeakMap-like
  // approach isn't possible for plain objects here, so this uses a
  // simple counter-based id list kept in sync with `links` by index.
  const [rowIds] = useState<string[]>(() => links.map(() => crypto.randomUUID()));
  while (rowIds.length < links.length) rowIds.push(crypto.randomUUID());

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = rowIds.indexOf(active.id as string);
    const to = rowIds.indexOf(over.id as string);
    if (from === -1 || to === -1) return;
    onChange(arrayMove(links, from, to));
    rowIds.splice(0, rowIds.length, ...arrayMove(rowIds, from, to));
  };

  const updateRow = (index: number, patch: Partial<FooterLink>) => {
    onChange(links.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  };

  const removeRow = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
    rowIds.splice(index, 1);
  };

  const addRow = () => {
    rowIds.push(crypto.randomUUID());
    onChange([...links, { label: '', url: '' }]);
  };

  return (
    <div className="space-y-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={rowIds.slice(0, links.length)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {links.map((link, i) => (
              <SortableLinkRow
                key={rowIds[i]}
                id={rowIds[i]}
                link={link}
                onChange={(patch) => updateRow(i, patch)}
                onRemove={() => removeRow(i)}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-1.5 text-sm font-medium text-regantify-cta hover:underline"
      >
        <Plus size={14} />
        Add Link
      </button>
    </div>
  );
}

function SortableLinkRow({
  id,
  link,
  onChange,
  onRemove,
}: {
  id: string;
  link: FooterLink;
  onChange: (patch: Partial<FooterLink>) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-xl border border-black/10 bg-white p-2 ${isDragging ? 'z-10 opacity-80 shadow-lg' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab touch-none rounded p-1 text-regantify-text-muted hover:text-regantify-text active:cursor-grabbing"
        aria-label="Reorder link"
      >
        <GripVertical size={14} />
      </button>
      <input
        type="text"
        value={link.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="Label"
        className="w-1/3 min-w-0 px-2.5 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text
          placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors"
      />
      <input
        type="text"
        value={link.url}
        onChange={(e) => onChange({ url: e.target.value })}
        placeholder="/page/about-us or https://…"
        className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-black/10 text-sm text-regantify-text
          placeholder:text-regantify-text-muted focus:outline-none focus:border-regantify-cta transition-colors"
      />
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 rounded p-1.5 text-regantify-text-muted hover:text-red-500 transition-colors"
        aria-label="Remove link"
      >
        <Trash2 size={14} />
      </button>
    </li>
  );
}
