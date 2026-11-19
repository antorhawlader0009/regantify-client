import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// ---------------------------------------------------------------------------
// Pins a block while the page scrolls through a stretch of extra height, and reports which step that scroll is at
// (the same idea as the hero's scroll story). The block holds still, the caller moves something inside it per step, and
// after the last step the page carries on. When `enabled` is false the children are rendered as they are.
// ---------------------------------------------------------------------------

type Props = {
  enabled: boolean;
  /** How many positions there are (e.g. plan cards). */
  steps: number;
  /** Called with the current position (0..steps-1) whenever scrolling moves it to another one. */
  onStep: (step: number) => void;
  /** Scroll distance (px) per position. */
  stepPx?: number;
  children: ReactNode;
};

export default function ScrollPinned({ enabled, steps, onStep, stepPx = 220, children }: Props) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);
  const [pinTop, setPinTop] = useState(0);
  const last = useRef(-1);
  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;

  // Height of the block, and where it pins: at the top, or with its bottom on the screen's bottom if it is taller.
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!enabled || !el) return;
    const measure = () => {
      setH(el.offsetHeight);
      setPinTop(Math.min(0, window.innerHeight - el.offsetHeight));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || steps < 2) return;
    last.current = -1;
    let frame = 0;
    const read = () => {
      frame = 0;
      const outer = outerRef.current;
      if (!outer) return;
      const rel = pinTop - outer.getBoundingClientRect().top;
      const k = Math.min(steps - 1, Math.max(0, Math.floor(rel / stepPx)));
      if (k !== last.current) {
        last.current = k;
        onStepRef.current(k);
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
  }, [enabled, steps, stepPx, pinTop, h]);

  if (!enabled) return <>{children}</>;

  return (
    <div ref={outerRef} style={{ height: h ? h + steps * stepPx : undefined }}>
      <div ref={innerRef} className="sticky" style={{ top: pinTop }}>
        {children}
      </div>
    </div>
  );
}
