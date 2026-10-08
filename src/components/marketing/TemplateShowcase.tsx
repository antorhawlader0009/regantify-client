import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// "Ready-made store designs": a grid of store previews as tall, frosted-glass
// cards. Each card shows a tall screenshot of a storefront inside a portrait
// window; hovering the card scrolls the screenshot from top to bottom, like
// browsing the page.
//
// The cards are translucent (backdrop blur), so the section behind them needs
// something to blur: Home puts soft colour blobs there. The look follows the
// `dark` class on the page root (day / night).
//
// The screenshots are our own: drop them in public/templates/ (see Home.tsx).
// A card whose picture is missing shows a neutral placeholder instead of a
// broken image.
// ---------------------------------------------------------------------------

export type ShowcaseTemplate = {
  name: string;
  /** A tall (full-page) screenshot, e.g. /templates/fashion.png */
  image: string;
};

type Props = {
  templates: ShowcaseTemplate[];
  ctaLabel: string;
  onCta: () => void;
};

function PreviewPlaceholder() {
  return (
    <div className="absolute inset-0 flex flex-col gap-2 p-3" aria-hidden="true">
      <div className="h-2 w-1/3 rounded bg-black/10 dark:bg-white/15" />
      <div className="h-28 rounded bg-black/[0.07] dark:bg-white/10" />
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="aspect-square rounded bg-black/[0.07] dark:bg-white/10" />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ template, ctaLabel, onCta }: { template: ShowcaseTemplate; ctaLabel: string; onCta: () => void }) {
  const [failed, setFailed] = useState(false);
  return (
    <article
      className="group flex flex-col border border-white/70 bg-white/35 p-2 backdrop-blur-xl
        shadow-[0_10px_30px_-10px_rgba(30,60,20,0.25)] transition-all duration-300
        hover:-translate-y-1 hover:bg-white/55 hover:shadow-[0_16px_38px_-10px_rgba(30,60,20,0.32)]
        dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.7)]
        dark:hover:bg-white/10 dark:hover:shadow-[0_16px_38px_-10px_rgba(0,0,0,0.8)]"
    >
      {/* The window: a portrait shape, the screenshot inside it is taller and slides up on hover. */}
      <div
        className="relative aspect-[3/4] overflow-hidden bg-white/60 ring-1 ring-black/5
          [container-type:size] dark:bg-black/30 dark:ring-white/10"
      >
        {failed ? (
          <PreviewPlaceholder />
        ) : (
          <img
            src={template.image}
            alt={template.name}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={() => setFailed(true)}
            className="absolute left-0 top-0 block h-auto w-full transition-transform duration-[6000ms] ease-linear
              group-hover:[transform:translateY(calc(-100%_+_100cqh))]
              motion-reduce:transition-none motion-reduce:group-hover:transform-none"
          />
        )}
      </div>

      <h3 className="px-1 pb-2 pt-2.5 text-sm font-semibold leading-snug text-[#1A1A1A] dark:text-white">
        {template.name}
      </h3>

      <button
        type="button"
        onClick={onCta}
        className="inline-flex w-full items-center justify-center gap-1.5 bg-[#95BF47] py-2 text-[13px]
          font-semibold text-[#1A1A1A] transition-colors hover:bg-[#84AD3D]"
      >
        {ctaLabel}
        <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </button>
    </article>
  );
}

export default function TemplateShowcase({ templates, ctaLabel, onCta }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {templates.map((tpl) => (
        <TemplateCard key={tpl.name} template={tpl} ctaLabel={ctaLabel} onCta={onCta} />
      ))}
    </div>
  );
}
