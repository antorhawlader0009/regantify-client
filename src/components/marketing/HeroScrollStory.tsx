import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// The hero's picture carousel ("cover flow": the chosen picture big in the
// middle, its neighbours smaller, softer and fading out towards the page edges).
//
//  - The carousel pins under the header and SCROLLING moves it: every STEP px of
//    scroll brings the next picture. After the last one the page carries on.
//  - The pinned box is exactly as tall as its content, so there is no empty band.
//  - Arrows, dots, swipe and the arrow keys scroll the page to that picture.
// ---------------------------------------------------------------------------

export type ScrollStorySlide = {
  image: string;
  alt: string;
  title: string;
  detail: string;
  /** Short bullet points shown under the detail (optional). */
  points?: string[];
};

type Props = {
  slides: ScrollStorySlide[];
  /** Accessible name of the whole carousel. */
  label: string;
};

/** Every picture is landscape (the border-free crops are about 2.2:1). */
const RATIO = 2.2;
/** Scroll distance (px) that brings the next picture. */
const STEP = 240;
/** Space kept for the fixed site header while pinned. */
const PIN_TOP = 84;
/** Width of the centre card: nearly the full screen on a phone, capped on desktop. */
const CARD_W = 'min(80vw, 640px)';

/** Look of a card by its distance from the centre (0 = chosen, 1 = next to it, ...). */
function cardStyle(offset: number) {
  const a = Math.abs(offset);
  const dir = Math.sign(offset);
  const shown = a <= 2;
  // Sideways shift is a share of the card width, so it scales with the screen.
  const shift = a === 0 ? 0 : a === 1 ? 0.78 : 1.2;
  const scale = a === 0 ? 1 : a === 1 ? 0.8 : 0.62;
  return {
    transform: `translate(-50%, -50%) translateX(calc(${CARD_W} * ${(dir * shift).toFixed(2)})) scale(${scale})`,
    opacity: a === 0 ? 1 : a === 1 ? 0.55 : shown ? 0.2 : 0,
    filter: a === 0 ? 'none' : a === 1 ? 'blur(1px) saturate(0.9)' : 'blur(2px) saturate(0.8)',
    zIndex: 10 - a,
    pointerEvents: shown ? ('auto' as const) : ('none' as const),
    visibility: shown ? ('visible' as const) : ('hidden' as const),
  };
}

/** Shortest signed distance of slide `i` from `sel` on a loop of `n`. */
function loopOffset(i: number, sel: number, n: number) {
  let d = i - sel;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

export default function HeroScrollStory({ slides, label }: Props) {
  const n = slides.length;
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);
  const [h, setH] = useState(0);
  const [pinTop, setPinTop] = useState(PIN_TOP);
  const dragX = useRef<number | null>(null);
  const moved = useRef(false);
  const outerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Height of the content (the pinned box is exactly this tall) and where it pins.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const ch = el.offsetHeight;
      setH(ch);
      setPinTop(Math.max(PIN_TOP, Math.round((window.innerHeight - ch) / 2)));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [n]);

  // Scroll picks the picture.
  useEffect(() => {
    if (n < 2) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      const outer = outerRef.current;
      if (!outer) return;
      const rel = pinTop - outer.getBoundingClientRect().top;
      const k = Math.min(n - 1, Math.max(0, Math.floor(rel / STEP)));
      if (k !== idxRef.current) {
        idxRef.current = k;
        setIdx(k);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [n, pinTop, h]);

  // Arrows / dots / swipe: scroll the page to that picture's stretch.
  const go = useCallback(
    (next: number) => {
      const outer = outerRef.current;
      if (n === 0 || !outer) return;
      const k = Math.min(n - 1, Math.max(0, next));
      const top = outer.getBoundingClientRect().top + window.scrollY - pinTop;
      window.scrollTo({ top: top + k * STEP + STEP / 2, behavior: 'smooth' });
    },
    [n, pinTop],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragX.current = e.clientX;
    moved.current = false;
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragX.current === null) return;
    const dx = e.clientX - dragX.current;
    dragX.current = null;
    if (Math.abs(dx) > 40) {
      moved.current = true;
      go(idxRef.current + (dx < 0 ? 1 : -1));
    }
  };

  if (n === 0) return null;

  return (
    <div ref={outerRef} style={{ height: h ? h + n * STEP : undefined }}>
    <div
      ref={stageRef}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          go(idxRef.current + 1);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          go(idxRef.current - 1);
        }
      }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragX.current = null;
      }}
      className="sticky select-none outline-none touch-pan-y"
      style={{ top: pinTop }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 38%, rgba(149,191,71,0.18), transparent 55%)' }}
      />

      {/* Cards: the row fades out at both page edges. */}
      <div
        className="relative mx-auto w-full overflow-hidden"
        style={{
          height: `calc(${CARD_W} / ${RATIO} + 40px)`,
          maskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
        }}
      >
        {slides.map((slide, i) => {
          const offset = loopOffset(i, idx, n);
          return (
            <button
              key={i}
              type="button"
              aria-label={slide.title}
              aria-current={offset === 0}
              tabIndex={offset === 0 ? 0 : -1}
              onClick={() => {
                if (moved.current) {
                  moved.current = false;
                  return;
                }
                if (offset !== 0) go(i);
              }}
              className="absolute left-1/2 top-1/2 overflow-hidden rounded-2xl bg-white p-[3px] text-left outline-none
                shadow-[0_28px_56px_-20px_rgba(0,0,0,0.4)] will-change-transform
                transition-[transform,opacity,filter] duration-[650ms] ease-[cubic-bezier(0.2,0.7,0.2,1)]
                dark:shadow-[0_28px_56px_-20px_rgba(0,0,0,0.75)] focus-visible:ring-2 focus-visible:ring-[#95BF47]"
              style={{ width: CARD_W, ...cardStyle(offset) }}
            >
              <img
                src={slide.image}
                alt={slide.alt}
                width={1280}
                height={582}
                draggable={false}
                decoding="async"
                loading={Math.abs(offset) <= 1 ? 'eager' : 'lazy'}
                className="block w-full rounded-xl object-cover"
                style={{ aspectRatio: String(RATIO) }}
              />
            </button>
          );
        })}
      </div>

      {/* Text of the chosen picture. All texts share one grid cell, so the height is
          that of the longest one and nothing jumps when the picture changes. */}
      <div className="relative mx-auto mt-2 grid max-w-2xl px-6 text-center">
        {slides.map((slide, i) => {
          const on = i === idx;
          return (
            <div
              key={i}
              aria-hidden={!on}
              className="col-start-1 row-start-1 transition-[opacity,transform] duration-500 ease-out"
              style={{
                opacity: on ? 1 : 0,
                transform: on ? 'translate3d(0,0,0)' : 'translate3d(0,10px,0)',
                visibility: on ? 'visible' : 'hidden',
              }}
            >
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-tight text-[#1A1A1A] dark:text-white">
                {slide.title}
              </h2>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#1A1A1A]/65 dark:text-white/70">
                {slide.detail}
              </p>
              {slide.points && slide.points.length > 0 && (
                <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
                  {slide.points.map((p) => (
                    <li key={p} className="flex items-center gap-1.5 text-[13px] sm:text-sm text-[#1A1A1A]/80 dark:text-white/80">
                      <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-[#95BF47]/20 text-[#008060] dark:text-[#95BF47]">
                        <Check size={10} strokeWidth={3} />
                      </span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <div className="relative mt-4 flex items-center justify-center gap-3 pb-6" role="group" aria-label={label}>
        <button
          type="button"
          aria-label="Previous"
          onClick={() => go(idx - 1)}
          className="grid h-8 w-8 place-items-center rounded-full border border-black/15 text-[#1A1A1A] hover:bg-black/5 dark:border-white/25 dark:text-white dark:hover:bg-white/10"
        >
          <ChevronLeft size={16} />
        </button>
        <div className="flex items-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={i}
              type="button"
              aria-label={slide.title}
              aria-current={idx === i}
              onClick={() => go(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === i ? 'w-7 bg-[#95BF47]' : 'w-2 bg-black/20 hover:bg-black/40 dark:bg-white/30 dark:hover:bg-white/60'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          aria-label="Next"
          onClick={() => go(idx + 1)}
          className="grid h-8 w-8 place-items-center rounded-full border border-black/15 text-[#1A1A1A] hover:bg-black/5 dark:border-white/25 dark:text-white dark:hover:bg-white/10"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
    </div>
  );
}
