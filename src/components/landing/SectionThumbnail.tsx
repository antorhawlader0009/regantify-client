/**
 * Tiny abstract previews of each section type's layout, drawn with plain
 * divs rather than screenshots — they stay correct when a section's real
 * styling changes, and cost nothing to ship. Used by the "Add Section"
 * picker (landing-plan.md §4.2) so vendors recognise a layout by shape
 * instead of by reading its name.
 */

const bar = 'rounded-[2px] bg-slate-400/35';
const block = 'rounded-[3px] bg-slate-400/25';
const accent = 'rounded-[2px] bg-violet-400/60';

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full w-full flex-col items-center justify-center gap-1.5">{children}</div>;
}

export function SectionThumbnail({ type }: { type: string }) {
  switch (type) {
    case 'heading':
      return (
        <Frame>
          <div className={`h-2 w-3/5 ${bar}`} />
        </Frame>
      );

    case 'text':
      return (
        <Frame>
          <div className={`h-1.5 w-4/5 ${bar}`} />
          <div className={`h-1.5 w-full ${bar}`} />
          <div className={`h-1.5 w-2/3 ${bar}`} />
        </Frame>
      );

    case 'image':
      return (
        <Frame>
          <div className={`h-12 w-4/5 ${block}`} />
        </Frame>
      );

    case 'spacer':
      return (
        <Frame>
          <div className={`h-px w-4/5 bg-slate-400/40`} />
        </Frame>
      );

    case 'button':
      return (
        <Frame>
          <div className={`h-4 w-20 ${accent}`} />
        </Frame>
      );

    case 'hero-slider':
      return (
        <Frame>
          <div className={`relative flex h-14 w-4/5 flex-col items-center justify-center gap-1 ${block}`}>
            <div className={`h-1.5 w-1/2 ${bar}`} />
            <div className={`h-3 w-12 ${accent}`} />
          </div>
          <div className="flex gap-1">
            <div className="h-1 w-1 rounded-full bg-violet-400/70" />
            <div className="h-1 w-1 rounded-full bg-slate-400/40" />
            <div className="h-1 w-1 rounded-full bg-slate-400/40" />
          </div>
        </Frame>
      );

    case 'banner-video':
      return (
        <Frame>
          <div className={`flex h-14 w-4/5 items-center justify-center ${block}`}>
            <div className="ml-0.5 h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-violet-400/70" />
          </div>
        </Frame>
      );

    case 'two-column':
      return (
        <Frame>
          <div className="flex w-4/5 gap-1.5">
            <div className={`h-12 flex-1 ${block}`} />
            <div className="flex flex-1 flex-col justify-center gap-1">
              <div className={`h-1.5 w-full ${bar}`} />
              <div className={`h-1.5 w-2/3 ${bar}`} />
            </div>
          </div>
        </Frame>
      );

    case 'select-products':
      return (
        <Frame>
          <div className="flex w-4/5 gap-1.5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-1 flex-col gap-1">
                <div className={`h-8 w-full ${block}`} />
                <div className={`h-1 w-full ${bar}`} />
                <div className={`h-1 w-1/2 ${accent}`} />
              </div>
            ))}
          </div>
        </Frame>
      );

    case 'price-offer':
      return (
        <Frame>
          <div className={`h-1.5 w-12 ${bar}`} />
          <div className={`h-3 w-16 ${accent}`} />
          <div className={`h-3 w-14 ${block}`} />
        </Frame>
      );

    case 'countdown-timer':
      return (
        <Frame>
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`h-6 w-5 ${accent}`} />
            ))}
          </div>
        </Frame>
      );

    case 'sticky-order-bar':
      return (
        <Frame>
          <div className={`h-10 w-4/5 ${block}`} />
          <div className={`h-4 w-4/5 ${accent}`} />
        </Frame>
      );

    case 'customer-reviews':
      return (
        <Frame>
          <div className="flex w-4/5 gap-1.5">
            {[0, 1].map((i) => (
              <div key={i} className={`flex flex-1 flex-col gap-1 p-1.5 ${block}`}>
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-slate-400/45" />
                  <div className={`h-1 flex-1 ${bar}`} />
                </div>
                <div className={`h-1 w-full ${bar}`} />
                <div className={`h-1 w-2/3 ${bar}`} />
              </div>
            ))}
          </div>
        </Frame>
      );

    case 'trust-badges':
      return (
        <Frame>
          <div className="flex w-4/5 items-center justify-center gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className={`h-6 w-6 rounded-full ${block}`} />
            ))}
          </div>
        </Frame>
      );

    case 'stats':
      return (
        <Frame>
          <div className="flex w-4/5 justify-around">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`h-3 w-7 ${accent}`} />
                <div className={`h-1 w-9 ${bar}`} />
              </div>
            ))}
          </div>
        </Frame>
      );

    case 'faq':
      return (
        <Frame>
          {[0, 1, 2].map((i) => (
            <div key={i} className={`flex h-4 w-4/5 items-center justify-between px-1.5 ${block}`}>
              <div className={`h-1 w-1/2 ${bar}`} />
              <div className="h-1 w-1 rotate-45 border-b border-r border-slate-400/50" />
            </div>
          ))}
        </Frame>
      );

    case 'feature-grid':
      return (
        <Frame>
          <div className="grid w-4/5 grid-cols-3 gap-1.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-5 w-full ${block}`} />
            ))}
          </div>
        </Frame>
      );

    case 'carousel':
      return (
        <Frame>
          <div className="flex w-4/5 items-center gap-1">
            <div className="h-1.5 w-1.5 -rotate-45 border-b border-l border-slate-400/50" />
            <div className={`h-11 flex-1 ${block}`} />
            <div className={`h-11 flex-1 ${block}`} />
            <div className="h-1.5 w-1.5 rotate-[135deg] border-b border-l border-slate-400/50" />
          </div>
        </Frame>
      );

    case 'checkout-form':
      return (
        <Frame>
          <div className="flex w-4/5 flex-col gap-1">
            <div className={`h-3 w-full ${block}`} />
            <div className={`h-3 w-full ${block}`} />
            <div className={`h-3 w-full ${block}`} />
            <div className={`h-3.5 w-full ${accent}`} />
          </div>
        </Frame>
      );

    case 'lead-form':
      return (
        <Frame>
          <div className="flex w-4/5 flex-col gap-1">
            <div className={`h-3 w-full ${block}`} />
            <div className={`h-3 w-full ${block}`} />
            <div className={`h-3.5 w-1/2 ${accent}`} />
          </div>
        </Frame>
      );

    default:
      return (
        <Frame>
          <div className={`h-10 w-4/5 ${block}`} />
        </Frame>
      );
  }
}
