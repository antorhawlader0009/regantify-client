/** Under a required "reason" box: says why the button is still off, instead of leaving it silently disabled. */
export function ReasonNeed({ value, min = 5 }: { value: string; min?: number }) {
  const n = value.trim().length;
  if (n >= min) return null;
  return (
    <p className={`mt-1 text-xs ${n > 0 ? 'text-red-600' : 'text-regantify-text-muted'}`}>
      {n > 0 ? `Write at least ${min} letters (${min - n} more) to continue.` : `Required: at least ${min} letters.`}
    </p>
  );
}
