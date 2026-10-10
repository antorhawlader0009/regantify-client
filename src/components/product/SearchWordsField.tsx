import { useState } from 'react';
import { X } from 'lucide-react';
import { Field } from './ProductFormPieces';

export const MAX_SEARCH_WORDS = 20;
export const MAX_SEARCH_WORD_LENGTH = 40;

const tidy = (raw: string) => raw.replace(/\s+/g, ' ').trim().slice(0, MAX_SEARCH_WORD_LENGTH);

/**
 * Add / Edit Product: "Also found as" (TellMe idea 23). Words shoppers type for this product that aren't in its name, like
 * "kurta" or "কুর্তা" on a Panjabi. They are never shown; the store's search just also matches them. Type a word and press
 * Enter or comma (a pasted list with commas becomes several words). At most 20, each up to 40 characters, repeats ignored.
 */
export function SearchWordsField({ value, onChange }: { value: string[]; onChange: (words: string[]) => void }) {
  const [draft, setDraft] = useState('');

  const add = (raw: string) => {
    const incoming = raw
      .split(/[,،\n]/)
      .map(tidy)
      .filter(Boolean);
    if (incoming.length === 0) return;
    const next = [...value];
    for (const word of incoming) {
      if (next.length >= MAX_SEARCH_WORDS) break;
      if (!next.some((w) => w.toLowerCase() === word.toLowerCase())) next.push(word);
    }
    onChange(next);
  };

  const commit = () => {
    add(draft);
    setDraft('');
  };

  return (
    <Field
      label="Also found as"
      hint="Other names shoppers search for, like “kurta” or “কুর্তা” on a Panjabi. Nobody sees them; your store’s search just finds this product with them too."
    >
      <div className="flex min-h-[2.75rem] flex-wrap items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1.5 focus-within:border-brand">
        {value.map((word) => (
          <span key={word} className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-sm text-regantify-text">
            {word}
            <button type="button" onClick={() => onChange(value.filter((w) => w !== word))} aria-label={`Remove ${word}`} className="text-neutral-400 hover:text-red-600">
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => {
            const text = e.target.value;
            // A comma ends a word (a pasted list is split on commas too).
            if (/[,،\n]/.test(text)) {
              add(text);
              setDraft('');
            } else {
              setDraft(text);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Backspace' && !draft && value.length > 0) {
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={commit}
          disabled={value.length >= MAX_SEARCH_WORDS}
          maxLength={MAX_SEARCH_WORD_LENGTH}
          placeholder={value.length === 0 ? 'Type a word, press Enter' : value.length >= MAX_SEARCH_WORDS ? 'Most words added' : ''}
          aria-label="Add a search word"
          className="min-w-[8rem] flex-1 border-0 bg-transparent py-1 text-sm text-regantify-text outline-none placeholder:text-neutral-400"
        />
      </div>
      <p className="mt-1 text-xs text-neutral-500">
        {value.length}/{MAX_SEARCH_WORDS} words
      </p>
    </Field>
  );
}
