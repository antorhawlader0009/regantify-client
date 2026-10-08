import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';

// ---------------------------------------------------------------------------
// The hero's looping 3D card rail. Ported from ThreeUI's "Character Filmstrip"
// (same perspective maths: a spring-eased phase, cards fan out in depth and
// fade with distance) but restyled for the marketing home: landscape cards, the
// dark / green theme, a caption under every picture.
//
// Built to stay cheap on low-end phones, because this is the first thing every
// visitor loads:
//  - the animation loop runs ONLY while the rail is moving. At rest there is no
//    requestAnimationFrame at all; a slow timer (and any input) wakes it;
//  - per frame it writes just transform + opacity (compositor-only properties).
//    No blur filter, no changing shadow, no pointer-following gradient (those
//    force a repaint of every card, every frame);
//  - cards far from the centre are hidden outright;
//  - sizes are measured once (ResizeObserver), never read inside the loop;
//  - it sleeps while scrolled out of view or while the tab is hidden.
// ---------------------------------------------------------------------------

export type FilmstripSlide = {
  image: string;
  alt: string;
  title: string;
  detail: string;
};

type Props = {
  slides: FilmstripSlide[];
  /** Accessible name of the whole carousel. */
  label: string;
};

/** Each slide appears this many times round the ring, so the rail is deep
    enough to look endless with only a handful of pictures. */
const REPEATS = 2;
/** How long a picture rests before the rail moves on by itself. */
const AUTO_MS = 4200;
/** Cards further than this from the centre are not drawn at all. */
const MAX_VISIBLE_DISTANCE = 3.2;

function wrap(delta: number, count: number) {
  while (delta > count / 2) delta -= count;
  while (delta < -count / 2) delta += count;
  return delta;
}

export default function HeroFilmstrip({ slides, label }: Props) {
  const n = slides.length;
  const count = n * REPEATS;
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [active, setActive] = useState(0);

  // Everything the animation loop reads lives in one ref, so a pointer event
  // never re-renders the page.
  const s = useRef({
    phase: 0,
    target: 0,
    base: 0,
    pointerX: 0,
    hovering: false,
    lastInput: 0,
    dragStartX: null as number | null,
    /** Set by the effect: start the loop if it is asleep. */
    wake: () => {},
  });

  const nearest = () => ((Math.round(s.current.phase) % count) + count) % count;

  const goToSlide = (slide: number) => {
    const st = s.current;
    const here = nearest();
    let best = 0;
    for (let k = 0; k < REPEATS; k++) {
      const d = wrap(slide + k * n - here, count);
      if (k === 0 || Math.abs(d) < Math.abs(best)) best = d;
    }
    st.base = Math.round(st.phase) + best;
    st.target = st.base;
    st.hovering = false;
    st.lastInput = performance.now();
    st.wake();
  };

  const step = (d: number) => {
    const st = s.current;
    st.base += d;
    st.target = st.base;
    st.lastInput = performance.now();
    st.wake();
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const st = s.current;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    st.lastInput = performance.now();

    let frame = 0;
    let prev = 0;
    let visible = true;
    let lastActive = -1;
    let spacing = 400;

    const measure = () => {
      const w = cardRefs.current[0]?.offsetWidth ?? 420;
      spacing = w * 0.88;
    };
    measure();

    const paint = () => {
      for (let i = 0; i < count; i++) {
        const card = cardRefs.current[i];
        if (!card) continue;
        const delta = wrap(i - st.phase, count);
        const distance = Math.abs(delta);

        if (distance > MAX_VISIBLE_DISTANCE) {
          card.style.visibility = 'hidden';
          continue;
        }
        card.style.visibility = 'visible';

        const focus = Math.exp(-distance * distance * 1.28);
        const side = Math.max(0, 1 - distance / 5);
        const x = delta * spacing;
        const y = distance * 10;
        const z = focus * 150 - distance * 150;
        const scale = 0.62 + side * 0.1 + focus * 0.28;
        const rotateY = -Math.max(-2.5, Math.min(2.5, delta)) * 14 + st.pointerX * focus * 3;

        card.style.zIndex = String(Math.round(1000 - distance * 100));
        card.style.opacity = Math.max(0.14, side * 0.8 + focus * 0.2).toFixed(2);
        card.style.transform =
          `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) ` +
          `rotateY(${rotateY.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
      }

      const slide = nearest() % n;
      if (slide !== lastActive) {
        lastActive = slide;
        setActive(slide);
      }
    };

    const tick = (time: number) => {
      frame = 0;
      const dt = Math.min(32, time - prev);
      prev = time;
      const ease = reduced ? 1 : 1 - Math.pow(0.001, dt / 1000);

      st.phase += (st.target - st.phase) * ease;
      const settled = Math.abs(st.target - st.phase) < 0.001;
      if (settled) st.phase = st.target;
      paint();

      // At rest the loop ends here; nothing runs until an input or the timer wakes it.
      if (!settled && visible && !document.hidden) frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (frame || !visible || document.hidden) return;
      prev = performance.now();
      frame = requestAnimationFrame(tick);
    };
    st.wake = wake;

    const resizeObserver = new ResizeObserver(() => {
      measure();
      paint();
    });
    resizeObserver.observe(stage);

    // Auto-advance: a plain timer, not a per-frame check.
    const timer = reduced
      ? 0
      : window.setInterval(() => {
          if (st.hovering || !visible || document.hidden) return;
          if (performance.now() - st.lastInput < AUTO_MS) return;
          st.base += 1;
          st.target = st.base;
          wake();
        }, AUTO_MS);

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible) wake();
    });
    observer.observe(stage);
    const onVisibility = () => wake();
    document.addEventListener('visibilitychange', onVisibility);

    paint();

    return () => {
      st.wake = () => {};
      if (frame) cancelAnimationFrame(frame);
      if (timer) window.clearInterval(timer);
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [count, n]);

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;
    const st = s.current;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width - 0.5) * 2));
    st.pointerX = nx;
    st.hovering = true;
    st.target = st.base + nx * 1.6;
    st.lastInput = performance.now();
    st.wake();
  };

  const onPointerLeave = () => {
    const st = s.current;
    st.hovering = false;
    st.pointerX = 0;
    st.target = st.base;
    st.lastInput = performance.now();
    st.wake();
  };

  // Touch / pen: swipe sideways to move one picture. (Vertical drags stay the
  // page's own scroll, see touch-pan-y on the stage.)
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') s.current.dragStartX = e.clientX;
  };
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const st = s.current;
    if (st.dragStartX === null) return;
    const dx = e.clientX - st.dragStartX;
    st.dragStartX = null;
    if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    }
  };

  // Static: a gradient that never changes is painted once, not every frame.
  const stageStyle: CSSProperties = {
    background: 'radial-gradient(ellipse at 50% 52%, rgba(149,191,71,0.16), transparent 42%)',
  };
  // The rail lines use currentColor so day (dark lines) and night (white lines) share one rule.
  const railLines: CSSProperties = {
    background:
      'linear-gradient(90deg, currentColor 1px, transparent 1px) 50% 0 / 25% 100%,' +
      'repeating-linear-gradient(0deg, transparent 0, transparent 109px, currentColor 110px, transparent 111px)',
  };

  return (
    <div>
      <div
        ref={stageRef}
        role="region"
        aria-roledescription="carousel"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        style={stageStyle}
        className="relative h-[400px] sm:h-[460px] overflow-hidden select-none touch-pan-y cursor-ew-resize
          [perspective:1450px] [contain:layout_paint] outline-none focus-visible:ring-2 focus-visible:ring-[#95BF47]/60"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 text-black/[0.06] dark:text-white/[0.05]"
          style={railLines}
        />
        <div className="absolute inset-0 z-[2] [transform-style:preserve-3d]">
          {Array.from({ length: count }, (_, i) => {
            const slide = slides[i % n];
            const original = i < n;
            return (
              <button
                key={i}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                type="button"
                tabIndex={original ? 0 : -1}
                aria-hidden={original ? undefined : true}
                aria-label={slide.title}
                onClick={() => goToSlide(i % n)}
                className="absolute top-1/2 left-1/2 w-[clamp(270px,40vw,500px)] overflow-hidden rounded-2xl
                  border border-black/10 bg-white dark:border-white/10 dark:bg-[#232323] p-2 text-left outline-none
                  will-change-transform shadow-[0_24px_48px_-16px_rgba(0,0,0,0.35)]
                  dark:shadow-[0_24px_48px_-16px_rgba(0,0,0,0.7)]
                  [transform-style:preserve-3d] focus-visible:ring-2 focus-visible:ring-[#95BF47]"
              >
                <img
                  src={slide.image}
                  alt={original ? slide.alt : ''}
                  width={960}
                  height={540}
                  draggable={false}
                  decoding="async"
                  className="block w-full aspect-video rounded-xl object-cover"
                />
                <span className="flex items-start gap-3 px-2 pt-3 pb-2 min-h-[104px] sm:min-h-[112px]">
                  <span
                    className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-[#95BF47]
                      text-[11px] font-semibold leading-none text-[#95BF47] tabular-nums"
                  >
                    {String((i % n) + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base sm:text-lg font-semibold leading-tight text-[#1A1A1A] dark:text-white">
                      {slide.title}
                    </span>
                    <span className="mt-1 block text-[13px] sm:text-sm leading-snug text-[#1A1A1A]/60 dark:text-white/65">
                      {slide.detail}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        {/* Soft fade into the page on both sides (matches the hero background). */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-[5] w-[12%] bg-gradient-to-r from-[#F3F7EC] to-transparent dark:from-[#1A1A1A]" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-[5] w-[12%] bg-gradient-to-l from-[#F3F7EC] to-transparent dark:from-[#1A1A1A]" />
      </div>

      <div className="mt-2 flex items-center justify-center gap-2" role="group" aria-label={label}>
        {slides.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            aria-label={slide.title}
            aria-current={active === i}
            onClick={() => goToSlide(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              active === i ? 'w-7 bg-[#95BF47]' : 'w-2 bg-black/20 hover:bg-black/40 dark:bg-white/30 dark:hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
