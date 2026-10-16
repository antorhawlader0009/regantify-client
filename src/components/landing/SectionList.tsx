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
import { useEffect, useRef, useState } from 'react';
import { Copy, GripVertical, MoreHorizontal, Monitor, Smartphone, Trash2 } from 'lucide-react';
import type { LandingPageSection } from '../../lib/landingPagesApi';
import { sectionLabel } from '../../lib/landingSections';

interface SectionListProps {
  sections: LandingPageSection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (sections: LandingPageSection[]) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string, device: 'desktop' | 'mobile') => void;
}

export function SectionList({
  sections,
  selectedId,
  onSelect,
  onReorder,
  onDuplicate,
  onDelete,
  onToggleVisibility,
}: SectionListProps) {
  // Pointer sensor with a small activation distance so a plain click
  // still selects a section instead of starting a drag; keyboard sensor
  // comes along for free and is why @dnd-kit was chosen over the
  // unmaintained react-beautiful-dnd (landing-plan.md §1.3).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = sections.findIndex((s) => s.id === active.id);
    const to = sections.findIndex((s) => s.id === over.id);
    if (from === -1 || to === -1) return;
    onReorder(arrayMove(sections, from, to));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ul className="flex flex-col gap-1.5">
          {sections.map((section) => (
            <SortableSectionRow
              key={section.id}
              section={section}
              selected={section.id === selectedId}
              onSelect={() => onSelect(section.id)}
              onDuplicate={() => onDuplicate(section.id)}
              onDelete={() => onDelete(section.id)}
              onToggleVisibility={(device) => onToggleVisibility(section.id, device)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableSectionRow({
  section,
  selected,
  onSelect,
  onDuplicate,
  onDelete,
  onToggleVisibility,
}: {
  section: LandingPageSection;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onToggleVisibility: (device: 'desktop' | 'mobile') => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickAway = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, [menuOpen]);

  const hiddenDesktop = section.visibility?.desktop === false;
  const hiddenMobile = section.visibility?.mobile === false;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`group relative flex items-center gap-1 rounded-lg border px-1.5 py-2 transition-colors ${
        selected
          ? 'border-violet-400/50 bg-violet-500/10'
          : 'border-white/10 bg-white/[0.04] hover:border-white/20'
      } ${isDragging ? 'z-10 opacity-80 shadow-lg shadow-black/40' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab touch-none rounded p-0.5 text-slate-600 hover:text-slate-300 active:cursor-grabbing"
        aria-label={`Reorder ${sectionLabel(section.type)}`}
      >
        <GripVertical size={14} />
      </button>

      <button onClick={onSelect} className="min-w-0 flex-1 truncate text-left text-[12.5px] text-slate-200">
        {sectionLabel(section.type)}
      </button>

      {(hiddenDesktop || hiddenMobile) && (
        <span
          className="shrink-0 text-slate-600"
          title={hiddenDesktop && hiddenMobile ? 'Hidden everywhere' : hiddenDesktop ? 'Hidden on desktop' : 'Hidden on mobile'}
        >
          {hiddenDesktop && !hiddenMobile ? <Monitor size={12} /> : <Smartphone size={12} />}
        </span>
      )}

      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="rounded p-0.5 text-slate-500 opacity-0 transition-opacity hover:text-slate-200
            focus:opacity-100 group-hover:opacity-100"
          aria-label="Section actions"
        >
          <MoreHorizontal size={15} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#1B1B24] py-1 shadow-xl shadow-black/50">
            <button
              onClick={() => {
                setMenuOpen(false);
                onDuplicate();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-slate-200 hover:bg-white/5"
            >
              <Copy size={13} />
              Make a copy
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onToggleVisibility('desktop');
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-slate-200 hover:bg-white/5"
            >
              <Monitor size={13} />
              {hiddenDesktop ? 'Show on desktop' : 'Hide on desktop'}
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onToggleVisibility('mobile');
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-slate-200 hover:bg-white/5"
            >
              <Smartphone size={13} />
              {hiddenMobile ? 'Show on mobile' : 'Hide on mobile'}
            </button>
            <button
              onClick={() => {
                setMenuOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-[12px] text-red-400 hover:bg-red-500/10"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
