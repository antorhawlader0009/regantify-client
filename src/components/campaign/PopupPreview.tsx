import { useEffect, useRef, useState } from 'react';
import { Eye, Minus, Monitor, Plus, Smartphone, Tablet } from 'lucide-react';
import type { PopupForm } from '../../lib/popupCampaignsApi';
import { PopupCard, TOAST_WIDTH } from './PopupCard';

type Device = 'desktop' | 'tablet' | 'mobile';

// The screen sizes the popup is drawn at (CSS px), so the preview wraps
// text and shrinks the dialog exactly like a real browser of that size.
const SCREEN: Record<Device, { w: number; h: number; label: string }> = {
  desktop: { w: 1280, h: 720, label: 'Desktop' },
  tablet: { w: 768, h: 900, label: 'Tablet' },
  mobile: { w: 390, h: 780, label: 'Phone' },
};

/** StorePal's own default accent (storefront globals.css), for a store with none set. */
export const STOREPAL_DEFAULT_ACCENT = '#e91e63';

export function fontStacks(headingFont: string | null | undefined, bodyFont: string | null | undefined) {
  const base = "Poppins, 'Noto Sans Bengali', ui-sans-serif, system-ui, sans-serif";
  return {
    headingFamily: `${headingFont ? `"${headingFont}", ` : ''}${base}`,
    bodyFamily: `${bodyFont ? `"${bodyFont}", ` : ''}${base}`,
  };
}

/** Loads the fonts the store uses so the preview sets text in the same typeface. */
function useStoreFonts(headingFont?: string | null, bodyFont?: string | null) {
  useEffect(() => {
    const families = Array.from(new Set(['Poppins', 'Noto Sans Bengali', headingFont, bodyFont].filter((n): n is string => !!n?.trim())));
    const href = `https://fonts.googleapis.com/css2?${families
      .map((n) => `family=${encodeURIComponent(n.trim()).replace(/%20/g, '+')}:wght@400;500;600;700`)
      .join('&')}&display=swap`;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [headingFont, bodyFont]);
}

/** A faint stand-in for the store behind the popup. */
function FakeStore({ mobile }: { mobile: boolean }) {
  const bar = (w: number | string, h = 8) => <div style={{ width: w, height: h, borderRadius: 4, background: '#d9d9d9' }} />;
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f6f6f6' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56, padding: '0 20px', background: '#fff', borderBottom: '1px solid #e5e5e5' }}>
        <div style={{ width: 90, height: 18, borderRadius: 4, background: '#c9c9c9' }} />
        {!mobile && (
          <div style={{ display: 'flex', gap: 22 }}>
            {bar(46)}
            {bar(54)}
            {bar(40)}
            {bar(58)}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ width: 20, height: 20, borderRadius: 10, background: '#d9d9d9' }} />
          <div style={{ width: 20, height: 20, borderRadius: 10, background: '#d9d9d9' }} />
        </div>
      </div>
      <div style={{ margin: 20, height: mobile ? 160 : 240, borderRadius: 10, background: '#e4e4e4' }} />
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${mobile ? 2 : 4}, 1fr)`, gap: 16, padding: '0 20px' }}>
        {Array.from({ length: mobile ? 4 : 8 }).map((_, i) => (
          <div key={i}>
            <div style={{ aspectRatio: '1', borderRadius: 8, background: '#e9e9e9' }} />
            <div style={{ marginTop: 8 }}>{bar('70%')}</div>
            <div style={{ marginTop: 6 }}>{bar('40%')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The builder's Live preview: the popup drawn over a stand-in store inside
 * a desktop / tablet / phone frame, with zoom. The popup itself is
 * PopupCard, the same markup the storefront renders, laid out here with
 * the same wrapper rules as themes/storepal/components/PopupCampaigns.tsx
 * (16px gutter, the width cap, the dim layer, the toast's corner).
 */
export function PopupPreview({
  popup,
  accent,
  headingFont,
  bodyFont,
}: {
  popup: PopupForm;
  accent: string;
  headingFont?: string | null;
  bodyFont?: string | null;
}) {
  const [device, setDevice] = useState<Device>('desktop');
  const [zoom, setZoom] = useState(100);
  const [boxW, setBoxW] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  useStoreFonts(headingFont, bodyFont);
  const { headingFamily, bodyFamily } = fontStacks(headingFont, bodyFont);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const screen = SCREEN[device];
  const bezel = device === 'desktop' ? 10 : 12;
  const frameW = screen.w + bezel * 2;
  const fit = boxW > 0 ? Math.min(1, (boxW - 24) / frameW) : 1;
  const scale = fit * (zoom / 100);
  const frameH = screen.h + bezel * 2 + (device === 'desktop' ? 14 : 0);

  const toastLeft = popup.toastCorner === 'BOTTOM_LEFT';

  const deviceBtn = (d: Device, Icon: typeof Monitor) => (
    <button
      key={d}
      type="button"
      onClick={() => setDevice(d)}
      aria-label={`${SCREEN[d].label} preview`}
      aria-pressed={device === d}
      title={SCREEN[d].label}
      className={`flex h-8 w-9 items-center justify-center rounded-md transition-colors ${
        device === d ? 'bg-brand text-white' : 'text-neutral-600 hover:bg-neutral-100'
      }`}
    >
      <Icon size={16} />
    </button>
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-regantify-text">
          <Eye size={16} className="text-neutral-500" aria-hidden />
          Live preview
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-line bg-white p-0.5">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoom <= 50}
            onClick={() => setZoom((z) => Math.max(50, z - 10))}
            className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
          >
            <Minus size={14} />
          </button>
          <button type="button" onClick={() => setZoom(100)} title="Reset zoom" className="w-12 text-center text-xs tabular-nums text-neutral-600">
            {zoom}%
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoom >= 150}
            onClick={() => setZoom((z) => Math.min(150, z + 10))}
            className="flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 disabled:opacity-40"
          >
            <Plus size={14} />
          </button>
        </div>
        <div className="flex items-center gap-0.5 rounded-lg border border-line bg-white p-0.5">
          {deviceBtn('desktop', Monitor)}
          {deviceBtn('tablet', Tablet)}
          {deviceBtn('mobile', Smartphone)}
        </div>
      </div>

      <div ref={boxRef} className="overflow-auto rounded-xl border border-line bg-neutral-50 p-3">
        <div style={{ width: frameW * scale, height: frameH * scale, margin: '0 auto' }}>
          <div style={{ width: frameW, height: frameH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            {/* The device: a dark bezel around the screen. */}
            <div
              style={{
                width: frameW,
                height: screen.h + bezel * 2,
                padding: bezel,
                boxSizing: 'border-box',
                background: '#1c1c1e',
                borderRadius: device === 'desktop' ? 18 : device === 'tablet' ? 30 : 42,
              }}
            >
              <div style={{ position: 'relative', width: screen.w, height: screen.h, overflow: 'hidden', borderRadius: device === 'desktop' ? 6 : device === 'tablet' ? 18 : 30 }}>
                <FakeStore mobile={device === 'mobile'} />
                {popup.format === 'DIALOG' ? (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 16,
                      background: `rgba(0,0,0,${popup.overlayOpacity / 100})`,
                    }}
                  >
                    <div style={{ width: '100%', maxWidth: popup.width, maxHeight: screen.h - 32, overflow: 'hidden', borderRadius: popup.cornerRadius }}>
                      <PopupCard popup={popup} accent={accent} headingFamily={headingFamily} bodyFamily={bodyFamily} onClose={() => {}} />
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 16,
                      ...(toastLeft ? { left: 16 } : { right: 16 }),
                      width: `min(${TOAST_WIDTH}px, ${screen.w - 32}px)`,
                    }}
                  >
                    <PopupCard popup={popup} accent={accent} headingFamily={headingFamily} bodyFamily={bodyFamily} onClose={() => {}} />
                  </div>
                )}
              </div>
            </div>
            {device === 'desktop' && (
              <div style={{ width: frameW, height: 14, background: '#c9c9cc', borderRadius: '0 0 16px 16px' }} />
            )}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Drawn with your store’s accent colour and fonts. The real popup also waits for the timing and audience you choose below.
      </p>
    </div>
  );
}
