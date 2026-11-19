import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react';

// ---------------------------------------------------------------------------
// The hero's picture story (the look comes from a "fan of cards, then one card
// opens with its details beside it" reference).
//
//  1. The pictures sit in a loose, tilted fan right under the headline.
//  2. A short scroll straightens the row and opens the first picture, with its
//     text beside it. The scroll is smoothed (the animation chases the scroll
//     position), and it is SHORT, so passing the hero down or back up is quick.
//  3. After that the features are a plain slider: arrows, dots, swipe, the arrow
//     keys, and a slow auto-advance. Nothing more is tied to scrolling.
//
// Cheap on purpose: the animation loop runs only while it is still catching up
// with the scroll, and writes transform + opacity only. Sizes are measured on
// resize, never while painting. Every picture is rendered once, at its biggest
// size, and is only ever scaled DOWN (so it stays sharp when open).
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
/** Extra height (px, at full size) under every picture; none now (no caption). */
const CAP = 0;
/** Gap (px) kept between the headline block and the top of the fan. */
const FAN_GAP = 130;
/** Space kept for the fixed site header when the stage pins. */
const PIN_TOP = 84;
/** How long the slider rests on a feature before moving on by itself. */
const AUTO_MS = 5500;
/** The stage stays pinned this much longer (px) after the last feature, so the
    page does not jump away the instant the slider ends. */
const HOLD_PX = 260;

/** Resting tilt (degrees) and lift (px at a 300px card) of each picture in the fan. */
const FAN_ROT = [-8, 5, -4, 6, -6, 8];
const FAN_Y = [18, -8, 10, -12, 8, -14];

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const ease = (k: number) => k * k * (3 - 2 * k);

const CARD_TRANSITION = 'opacity 0.55s ease, transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1)';

type Layout = {
  vh: number;
  outerH: number;
  stageH: number;
  /** Pulls the stage up under the headline so there is no empty band. */
  pullUp: number;
  /** Where the open stage pins: the middle of the screen, never under the header. */
  pinTop: number;
  narrow: boolean;
  aw: number;
  /** Width of a picture when open (its real, full size). */
  fw: number;
  /** Width of a picture in the fan, and the scale that gets it there. */
  cw: number;
  rs: number;
  sp: number;
  /** Open picture position, and the row's vertical centre, from the area centre. */
  fx: number;
  fy: number;
  rowY: number;
  textLeft: number;
  textRight: number;
  textTop: number | null;
};

export default function HeroScrollStory({ slides, label }: Props) {
  const n = slides.length;
  const outerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const layoutRef = useRef<Layout | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const lastInputRef = useRef(0);
  const dragX = useRef<number | null>(null);

  // `target` follows the scroll straight away; `shown` chases it.
  const anim = useRef({ target: 0, shown: -1, frame: 0 });

  const paint = useCallback(() => {
    const L = layoutRef.current;
    if (!L || n === 0) return;
    const p = anim.current.shown;
    const u1 = ease(clamp(p / 0.4));
    const ex = ease(clamp((p - 0.3) / 0.7));
    const settled = ex >= 0.999;
    const sel = idxRef.current;
    const yScale = L.cw / 300;
    const gate = clamp((ex - 0.75) / 0.25);

    for (let i = 0; i < n; i++) {
      const card = cardRefs.current[i];
      const text = textRefs.current[i];
      const offset = i - sel;

      if (card) {
        const rowX = (i - (n - 1) / 2) * L.sp;
        const rowY = L.rowY + (FAN_Y[i % FAN_Y.length] ?? 0) * yScale * (1 - u1);
        const rowR = (FAN_ROT[i % FAN_ROT.length] ?? 0) * (1 - u1);
        let x: number;
        let y: number;
        let r: number;
        let sc: number;
        let opacity: number;
        let z: number;

        if (i === sel && !settled) {
          // The chosen picture travels from the row to the open position.
          x = lerp(rowX, L.fx, ex);
          y = lerp(rowY, L.fy, ex);
          r = lerp(rowR, 0, ex);
          sc = lerp(L.rs, 1, ex);
          opacity = 1;
          z = 30;
        } else if (ex < 0.6) {
          // The others stay in the row, sliding outward and fading as it opens.
          const dir = i < n / 2 ? -1 : 1;
          x = rowX + dir * ex * L.aw * 0.3;
          y = rowY;
          r = rowR;
          sc = L.rs;
          opacity = 1 - clamp(ex * 1.8);
          z = 10 - Math.abs(i - (n - 1) / 2);
        } else {
          // Open: the chosen one is in place, the rest wait just to either side.
          x = L.fx + clamp(offset, -1, 1) * 70;
          y = L.fy;
          r = 0;
          sc = 1;
          opacity = offset === 0 ? 1 : 0;
          z = offset === 0 ? 30 : 20;
        }

        card.style.transition = settled ? CARD_TRANSITION : 'none';
        card.style.opacity = opacity.toFixed(3);
        card.style.visibility = settled && offset !== 0 ? 'visible' : opacity < 0.01 ? 'hidden' : 'visible';
        card.style.pointerEvents = opacity < 0.5 ? 'none' : 'auto';
        card.style.zIndex = String(Math.round(z));
        card.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${r.toFixed(2)}deg) scale(${sc.toFixed(4)})`;
      }

      if (text) {
        const o = gate * (offset === 0 ? 1 : 0);
        text.style.transition = settled ? 'opacity 0.5s ease, transform 0.6s cubic-bezier(0.2, 0.7, 0.2, 1)' : 'none';
        text.style.opacity = o.toFixed(3);
        text.style.visibility = o < 0.01 && !settled ? 'hidden' : 'visible';
        const dx = offset === 0 ? 0 : clamp(offset, -1, 1) * 36;
        text.style.transform = `translate3d(${dx}px, ${((1 - gate) * 20).toFixed(1)}px, 0)`;
      }
    }

    const nextOpen = ex > 0.8;
    if (nextOpen !== openRef.current) {
      openRef.current = nextOpen;
      setOpen(nextOpen);
    }
  }, [n]);

  // Smoothly chase the scroll position.
  const run = useCallback(() => {
    const a = anim.current;
    if (a.frame) return;
    const tick = () => {
      a.frame = 0;
      const d = a.target - a.shown;
      a.shown = Math.abs(d) < 0.0008 ? a.target : a.shown + d * 0.16;
      paint();
      if (a.shown !== a.target) a.frame = requestAnimationFrame(tick);
    };
    a.frame = requestAnimationFrame(tick);
  }, [paint]);

  const readScroll = useCallback(() => {
    const L = layoutRef.current;
    const outer = outerRef.current;
    if (!L || !outer) return 0;
    // The hero is the top of the page, so the opening starts with the very first
    // scroll and is finished exactly when the stage reaches its pinned spot. From
    // then on scrolling changes the feature (see the wheel handler below).
    const docTop = outer.getBoundingClientRect().top + window.scrollY;
    return clamp(window.scrollY / Math.max(120, docTop - L.pinTop));
  }, []);

  // Measure on mount and on resize.
  useLayoutEffect(() => {
    const measure = () => {
      const area = areaRef.current;
      if (!area) return;
      const prev = layoutRef.current;
      let vh = window.innerHeight;
      // Phone address bars change the height a little while scrolling; ignore that.
      if (prev && Math.abs(vh - prev.vh) < 120 && area.clientWidth === prev.aw) vh = prev.vh;

      const aw = area.clientWidth;
      const narrow = aw < 820;
      const cw = narrow ? aw * 0.44 : Math.min(aw * 0.25, 440);
      const sp = Math.min(cw * 0.66, (aw - cw - 16) / Math.max(1, n - 1));
      const tilt = 50 * (cw / 300);

      let fw: number;
      let fx: number;
      let fy: number;
      let rowY: number;
      let stageH: number;
      let textLeft = 0;
      let textRight = 0;
      let textTop: number | null = null;
      const AREA_TOP = 12;
      const AREA_BOTTOM = 56;

      if (narrow) {
        fw = aw - 32;
        const fh = fw / RATIO + CAP;
        stageH = AREA_TOP + fh + 24 + 250 + AREA_BOTTOM;
        const ah = stageH - AREA_TOP - AREA_BOTTOM;
        fx = 0;
        fy = -ah / 2 + fh / 2;
        rowY = fy;
        textLeft = 16;
        textRight = 16;
        textTop = fh + 24;
      } else {
        const padX = Math.max(16, (aw - 1240) / 2);
        fw = Math.min((aw - padX * 2) * 0.56, 740);
        // Never taller than the screen under the header.
        fw = Math.min(fw, (vh - PIN_TOP - AREA_TOP - AREA_BOTTOM - 8 - CAP) * RATIO);
        const fh = fw / RATIO + CAP;
        stageH = AREA_TOP + fh + AREA_BOTTOM;
        fx = -aw / 2 + padX + fw / 2;
        fy = 0;
        rowY = 0;
        textLeft = padX + fw + 48;
        textRight = padX;
      }

      const ah = stageH - AREA_TOP - AREA_BOTTOM;
      const rowH = (cw / fw) * (fw / RATIO + CAP) + tilt;
      // The row sits in the middle of the area; lift the whole stage so the cards
      // start a set distance under the headline instead of leaving an empty band.
      const rowTop = AREA_TOP + ah / 2 + rowY - rowH / 2;
      // (Negative when the gap asked for is bigger than the stage's own: the stage
      // is then pushed down instead.)
      const pullUp = rowTop - FAN_GAP;

      const next: Layout = {
        vh,
        stageH,
        pullUp,
        pinTop: Math.max(PIN_TOP, (vh - stageH) / 2),
        outerH: stageH + HOLD_PX,
        narrow,
        aw,
        fw,
        cw,
        rs: cw / fw,
        sp,
        fx,
        fy,
        rowY,
        textLeft,
        textRight,
        textTop,
      };
      layoutRef.current = next;
      setLayout(next);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [n]);

  // Paint once the layout is known, then follow the scroll.
  useEffect(() => {
    if (!layout) return;
    const a = anim.current;
    a.target = readScroll();
    // First paint (or a resize): jump, do not animate from nothing.
    a.shown = a.target;
    paint();
    const onScroll = () => {
      a.target = readScroll();
      run();

      // Keep the page inside the pinned stretch until the features have been
      // gone through. A quick flick (or the browser's smooth-scroll momentum)
      // can carry the page past it in one go; put it back in the middle of the
      // stretch. Past the last feature going down, or the first going up, the
      // page is free to leave.
      const outer = outerRef.current;
      const L = layoutRef.current;
      if (!outer || !L || n < 2) return;
      const pinStart = outer.getBoundingClientRect().top + window.scrollY - L.pinTop;
      const y = window.scrollY;
      const overshotDown = y > pinStart + HOLD_PX + 2 && y <= pinStart + HOLD_PX + L.vh * 2 && idxRef.current < n - 1;
      const overshotUp = y < pinStart - 2 && y > pinStart - L.vh * 2 && a.target >= 0.97 && idxRef.current > 0;
      if (overshotDown || overshotUp) window.scrollTo(0, pinStart + HOLD_PX / 2);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (a.frame) cancelAnimationFrame(a.frame);
      a.frame = 0;
    };
  }, [layout, paint, readScroll, run]);

  // Slider state.
  const go = useCallback(
    (next: number) => {
      const k = ((next % n) + n) % n;
      idxRef.current = k;
      lastInputRef.current = performance.now();
      setIdx(k);
      paint();
    },
    [n, paint],
  );

  // Scrolling while the open stage is pinned changes the feature instead of
  // moving the page: one step per scroll gesture (wheel / trackpad / touch).
  // On the first feature (going up) or the last one (going down) the page is
  // left alone, so it carries on to the section above / below as usual.
  useEffect(() => {
    if (n < 2) return;
    let lastEvent = 0;
    let lastStep = 0;
    let touchY: number | null = null;
    let touchStepped = false;

    const pinned = () => {
      const stage = stageRef.current;
      const L = layoutRef.current;
      // Pinned and fully scrolled open (by the scroll position, not by the
      // animation, which may still be catching up for a moment).
      if (!stage || !L || anim.current.target < 1) return false;
      return Math.abs(stage.getBoundingClientRect().top - L.pinTop) <= 3;
    };
    const canStep = (dir: number) => {
      const next = idxRef.current + dir;
      return next >= 0 && next < n;
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaY) < 2 || !pinned()) return;
      const dir = e.deltaY > 0 ? 1 : -1;
      if (!canStep(dir)) return;
      e.preventDefault();
      const now = performance.now();
      const gap = now - lastEvent;
      lastEvent = now;
      // A new gesture = a pause in the wheel events (this also ignores trackpad
      // momentum), and never faster than the slide animation. Nothing changes
      // until the first picture has finished opening.
      if (openRef.current && gap > 160 && now - lastStep > 450) {
        lastStep = now;
        go(idxRef.current + dir);
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? null;
      touchStepped = false;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (touchY === null || !pinned()) return;
      const dy = touchY - (e.touches[0]?.clientY ?? touchY);
      const dir = dy > 0 ? 1 : -1;
      if (Math.abs(dy) < 24 || !canStep(dir)) return;
      if (e.cancelable) e.preventDefault();
      if (!touchStepped && openRef.current) {
        touchStepped = true;
        go(idxRef.current + dir);
      }
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [n, go]);

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (openRef.current) dragX.current = e.clientX;
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    if (dragX.current === null) return;
    const dx = e.clientX - dragX.current;
    dragX.current = null;
    if (Math.abs(dx) > 50) go(idxRef.current + (dx < 0 ? 1 : -1));
  };

  if (n === 0) return null;

  return (
    <div
      ref={outerRef}
      style={{
        height: layout?.outerH ?? undefined,
        minHeight: layout ? undefined : 420,
        marginTop: layout ? -layout.pullUp : undefined,
      }}
    >
      <div
        ref={stageRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        onKeyDown={(e) => {
          if (!openRef.current) return;
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
        className="sticky overflow-hidden outline-none touch-pan-y"
        style={{ top: layout?.pinTop ?? PIN_TOP, height: layout?.stageH ?? 420 }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(149,191,71,0.16), transparent 46%)' }}
        />

        <div ref={areaRef} className="absolute inset-x-0" style={{ top: 12, bottom: 56 }}>
          {layout &&
            slides.map((slide, i) => (
              <button
                key={i}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                type="button"
                aria-label={slide.title}
                tabIndex={i === idx ? 0 : -1}
                onClick={() => (openRef.current ? undefined : go(i))}
                className="absolute left-1/2 top-1/2 overflow-hidden rounded-2xl bg-white p-[3px] text-left
                  shadow-[0_24px_48px_-16px_rgba(0,0,0,0.35)] will-change-transform outline-none
                  dark:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.7)]
                  focus-visible:ring-2 focus-visible:ring-[#95BF47]"
                style={{ width: layout.fw, opacity: 0, visibility: 'hidden' }}
              >
                <img
                  src={slide.image}
                  alt={slide.alt}
                  width={1280}
                  height={582}
                  draggable={false}
                  decoding="async"
                  className="block w-full rounded-xl object-cover"
                  style={{ aspectRatio: String(RATIO) }}
                />
              </button>
            ))}

          {layout &&
            slides.map((slide, i) => (
              <div
                key={i}
                aria-hidden={!open || idx !== i}
                className={`absolute ${layout.narrow ? '' : 'top-1/2 -translate-y-1/2'}`}
                style={{
                  left: layout.textLeft,
                  right: layout.textRight,
                  top: layout.narrow ? (layout.textTop ?? 0) : undefined,
                  pointerEvents: 'none',
                }}
              >
                {/* The outer box is only the anchor (centred by CSS); the inner box
                    takes the animated transform so the two never fight. */}
                <div
                  ref={(el) => {
                    textRefs.current[i] = el;
                  }}
                  className="will-change-transform"
                  style={{ opacity: 0, visibility: 'hidden' }}
                >
                  <span className="inline-grid h-8 w-8 place-items-center rounded-full border border-[#95BF47] text-xs font-semibold tabular-nums text-[#008060] dark:text-[#95BF47]">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-[#1A1A1A] dark:text-white">
                    {slide.title}
                  </h2>
                  <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#1A1A1A]/65 dark:text-white/70">
                    {slide.detail}
                  </p>
                  {slide.points && slide.points.length > 0 && (
                    <ul className="mt-4 space-y-2">
                      {slide.points.map((p) => (
                        <li key={p} className="flex items-start gap-2.5 text-sm sm:text-[15px] text-[#1A1A1A]/80 dark:text-white/80">
                          <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#95BF47]/20 text-[#008060] dark:text-[#95BF47]">
                            <Check size={12} strokeWidth={3} />
                          </span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
        </div>

        <div
          className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-3 transition-opacity duration-300"
          style={{ opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
          role="group"
          aria-label={label}
        >
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
