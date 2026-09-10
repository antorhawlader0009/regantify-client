import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../../lib/categoriesApi';
import { inputClass } from './ProductFormPieces';

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Category names to exclude from suggestions (e.g. already picked as secondary categories, or the primary category). */
  exclude?: string[];
  /**
   * When provided, Enter (or clicking a suggestion) calls this with the
   * chosen name instead of leaving it in the input — used for "add to a
   * chip list" fields like Secondary Categories, where the input should
   * clear after each pick. Without it, Enter/click just fills `value` in
   * place (the single-category field's behavior).
   */
  onSubmit?: (name: string) => void;
}

/**
 * Type-to-search category picker, backed by the vendor's real categories
 * (the same list shown on the Categories page — see categoriesApi.list).
 * Category is still a plain-text field on Product (see schema notes: "a
 * real Category relation now exists but Product isn't linked to it yet"),
 * so this intentionally still allows freely typing a brand-new name —
 * it's a fast way to reuse an existing category, not a hard foreign key
 * picker. Matching is case-insensitive substring, capped at 8 suggestions.
 */
export function CategoryCombobox({ value, onChange, placeholder, exclude = [], onSubmit }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list(),
    staleTime: 60_000,
  });

  const suggestions = useMemo(() => {
    const excludeSet = new Set(exclude.map((c) => c.toLowerCase()));
    const query = value.trim().toLowerCase();
    return categories
      .map((c) => c.name)
      .filter((name, i, arr) => arr.indexOf(name) === i) // de-dupe by name
      .filter((name) => !excludeSet.has(name.toLowerCase()))
      .filter((name) => !query || name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [categories, value, exclude]);

  useEffect(() => {
    setHighlighted(0);
  }, [suggestions.length, open]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const choose = (name: string) => {
    if (onSubmit) {
      onSubmit(name);
    } else {
      onChange(name);
    }
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            if (open && suggestions.length > 0) {
              choose(suggestions[highlighted]);
            } else if (onSubmit && value.trim()) {
              // No matching suggestion (or dropdown closed) — still let a
              // freely-typed new category name be added, since Category
              // isn't a strict foreign key (see component doc comment).
              choose(value.trim());
            }
            return;
          }
          if (!open || suggestions.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlighted((h) => Math.max(h - 1, 0));
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder={placeholder ?? 'Search or type a category'}
        className={inputClass}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1.5 w-full rounded-xl border border-black/10 bg-white shadow-lg overflow-hidden">
          {suggestions.map((name, i) => (
            <button
              key={name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(name)}
              className={`w-full text-left px-3.5 py-2.5 text-sm text-regantify-text ${
                i === highlighted ? 'bg-regantify-content' : 'hover:bg-regantify-content'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
