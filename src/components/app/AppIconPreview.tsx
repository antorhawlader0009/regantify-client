/**
 * A live look at the store's own app (STORE-APP-plan.md Step 14): the launcher icon, the round icon and the splash screen, drawn from the logo and the
 * colour the owner picked, so there are no surprises after the build. This is only a preview: the real icons are made by the builder (app/builder/lib/icons.mjs):
 * the logo sits inside the middle of a square of the colour, a circle of the colour, and the splash screen's colour.
 */
export function AppIconPreview({ logoUrl, color, name }: { logoUrl: string | null; color: string; name: string }) {
  const mark = logoUrl ? (
    <img src={logoUrl} alt="" className="h-full w-full object-contain" />
  ) : (
    <span className="text-lg font-semibold text-white">{name.trim().charAt(0).toUpperCase() || 'A'}</span>
  );
  return (
    <div className="flex flex-wrap items-end gap-6">
      <figure className="text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-[22%] p-3.5 shadow-sm" style={{ backgroundColor: color }}>
          {mark}
        </div>
        <figcaption className="mt-1.5 text-xs text-neutral-500">Icon</figcaption>
      </figure>
      <figure className="text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full p-4 shadow-sm" style={{ backgroundColor: color }}>
          {mark}
        </div>
        <figcaption className="mt-1.5 text-xs text-neutral-500">Round icon</figcaption>
      </figure>
      <figure className="text-center">
        <div className="flex h-36 w-20 items-center justify-center rounded-xl border border-black/10 p-3 shadow-sm" style={{ backgroundColor: color }}>
          <div className="flex h-12 w-12 items-center justify-center">{mark}</div>
        </div>
        <figcaption className="mt-1.5 text-xs text-neutral-500">Opening screen</figcaption>
      </figure>
    </div>
  );
}
