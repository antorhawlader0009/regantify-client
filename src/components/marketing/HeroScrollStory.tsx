import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { useIsPhone } from '../../lib/useIsPhone';

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
  /** Shown above the carousel and pinned with it (the hero headline), so only the pictures change. */
  header?: ReactNode;
  /** On a phone only: a section shown right under the carousel, inside the pinned block (see `inline` below). */
  after?: ReactNode;
};

/** Every picture is landscape (the border-free crops are about 2.2:1). */
const RATIO = 2.2;
/** Scroll distance (px) that brings the next picture. */
const STEP = 240;
/** On a phone: where the top of the picture row rests once pinned, just under the nav bar (px from the screen top). */
const PHONE_PIN_GAP = 70;
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

/** The text only ever travels DOWN: it comes out from behind the picture above it (the
    picture sits on top), settles, and when the next slide takes over it drifts a little
    further down while fading away. Waiting slides sit hidden behind the picture. */
type Phase = 'in' | 'out' | 'wait';
function rise(phase: Phase, delayMs: number) {
  if (phase === 'in') {
    return {
      opacity: 1,
      transform: 'translate3d(0,0,0) scale(1)',
      transformOrigin: 'top left',
      transition: `opacity 0.45s ease ${delayMs + 120}ms, transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) ${delayMs + 120}ms`,
    } as const;
  }
  if (phase === 'out') {
    return {
      opacity: 0,
      transform: 'translate3d(0,34px,0) scale(0.99)',
      transformOrigin: 'top left',
      transition: 'opacity 0.35s ease, transform 0.4s ease-in',
    } as const;
  }
  return {
    opacity: 0,
    transform: 'translate3d(0,-64px,0) scale(0.96)',
    transformOrigin: 'top left',
    transition: 'none',
  } as const;
}

/** Shortest signed distance of slide `i` from `sel` on a loop of `n`. */
function loopOffset(i: number, sel: number, n: number) {
  let d = i - sel;
  if (d > n / 2) d -= n;
  if (d < -n / 2) d += n;
  return d;
}

export default function HeroScrollStory({ slides, label, header, after }: Props) {
  const n = slides.length;
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);
  const [h, setH] = useState(0);
  const [pinTop, setPinTop] = useState(0);
  // On a phone the section that follows (`after`) rides inside the pinned block, right under the carousel. While the
  // pictures change, the screen then shows that section where the scroll runway would otherwise be an empty band.
  const isPhone = useIsPhone();
  const inline = isPhone && !!after;
  // The slide that was showing just before this one: it is the one that fades out.
  const prevIdx = useRef(0);
  const leaving = prevIdx.current !== idx ? prevIdx.current : -1;
  useEffect(() => {
    prevIdx.current = idx;
  }, [idx]);
  const dragX = useRef<number | null>(null);
  const moved = useRef(false);
  const doneRef = useRef(false);
  const outerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);

  // Height of the content (the pinned box is exactly this tall) and where it pins.
  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const ch = el.offsetHeight;
      setH(ch);
      // Pin at the very top; if the content is taller than the screen, show its bottom part
      // (except with `after`, which is meant to run on past the screen: pin its top).
      // On a phone (`inline`) the block pins once the headline has scrolled away: the top of the picture row comes to rest
      // just under the nav bar, so the first stretch of scrolling only lifts the headline off the screen.
      const rowTop = cardsRef.current?.offsetTop ?? 0;
      setPinTop(inline ? Math.min(0, PHONE_PIN_GAP - rowTop) : Math.min(0, window.innerHeight - ch));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [n, inline]);

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
      // Tell the nav once the last picture is reached, so it can float up before the hero scrolls away.
      const done = rel >= (n - 1) * STEP;
      if (done !== doneRef.current) {
        doneRef.current = done;
        window.dispatchEvent(new CustomEvent('hero-story-done', { detail: done }));
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
        style={{ background: 'radial-gradient(ellipse at 50% 38%, rgba(244,162,97,0.07), transparent 55%)' }}
      />

      {header}

      {/* Cards: the row fades out at both page edges. */}
      <div
        ref={cardsRef}
        className="relative z-10 mx-auto w-full overflow-hidden"
        style={{
          // Room above and below the cards, so their shadow is not cut off by the clipping box.
          height: `calc(${CARD_W} / ${RATIO} + 150px)`,
          marginTop: header ? 0 : 0,
          marginBottom: -56,
          maskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)',
        }}
      >
        {/* Soft green light behind the middle picture. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: `calc(${CARD_W} * 1.7)`,
            height: `calc(${CARD_W} / ${RATIO} * 1.9)`,
            background: 'radial-gradient(closest-side, rgba(244,162,97,0.14), rgba(244,162,97,0.05) 55%, transparent)',
            filter: 'blur(24px)',
          }}
        />
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
                shadow-[0_1px_2px_rgba(70,30,15,0.10),0_10px_20px_-6px_rgba(70,30,15,0.20),0_36px_60px_-18px_rgba(70,30,15,0.28)] will-change-transform
                transition-[transform,opacity,filter] duration-[650ms] ease-[cubic-bezier(0.2,0.7,0.2,1)]
                dark:shadow-[0_1px_2px_rgba(0,0,0,0.5),0_12px_24px_-6px_rgba(0,0,0,0.6),0_40px_70px_-18px_rgba(0,0,0,0.8)] focus-visible:ring-2 focus-visible:ring-[#F4A261]"
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

      {/* Under the pictures: only the chosen picture's text, left-aligned and no wider than the middle picture. All texts
          share one grid cell, so the height is that of the longest one. */}
      <div className="relative z-0 mx-auto mt-2 pb-6" style={{ width: CARD_W }}>
        <div className="grid pl-6 text-left" style={{ width: '78%' }}>
          {slides.map((slide, i) => {
            const on = i === idx;
            const phase: Phase = on ? 'in' : i === leaving ? 'out' : 'wait';
            return (
              <div
                key={i}
                aria-hidden={!on}
                className="col-start-1 row-start-1"
                style={{ visibility: on ? 'visible' : 'hidden', transition: `visibility 0s linear ${on ? 0 : 0.45}s` }}
              >
                <h2 style={rise(phase, 0)} className="text-xl font-bold leading-tight text-[#241812] sm:text-2xl lg:text-[1.7rem] dark:text-white">
                  {slide.title}
                </h2>
                <p style={rise(phase, 90)} className="mt-1 text-sm leading-snug text-[#241812]/60 sm:text-[15px] dark:text-white/65">
                  {slide.detail}
                </p>
                {slide.points && slide.points.length > 0 && (
                  <ul style={rise(phase, 180)} className="mt-2 grid grid-cols-1 gap-1 min-[480px]:grid-cols-2">
                    {slide.points.map((p) => (
                      <li
                        key={p}
                        className="flex min-w-0 items-center gap-1.5 rounded-full border border-[#C2531F]/15 bg-white/70 py-[3px] pl-1 pr-2.5 text-[12px] font-medium leading-tight text-[#241812]/85 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/85 dark:shadow-none"
                      >
                        <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-[#C2531F] text-white dark:bg-[#F4A261] dark:text-[#241812]">
                          <Check size={9} strokeWidth={3.5} />
                        </span>
                        <span className="truncate">{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* The section that follows, on a phone: it stays put while the pictures change and scrolls on after. Its own
          swipes, taps and keys must not move the carousel. */}
      {inline && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {after}
        </div>
      )}
    </div>
    </div>
  );
}
