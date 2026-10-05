import { useEffect, useRef, useState } from 'react';
import { PosButton, PosDialog } from '../ui';

/*
 * Scan with the phone's or tablet's camera (POS-system-plan.md Step 12). Uses the browser's own
 * BarcodeDetector where it has one (Chrome on Android, Mac, ChromeOS); elsewhere the
 * `barcode-detector` ponyfill (ZXing in WebAssembly), loaded only when it's needed. Keeps
 * scanning so a basket goes in one after another; the same code twice in a row needs a short pause.
 */

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'code_93', 'itf', 'codabar', 'qr_code'];

interface Detector {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue: string }>>;
}

async function makeDetector(): Promise<Detector> {
  const native = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
  if (native) return new native({ formats: FORMATS });
  const { BarcodeDetector } = await import('barcode-detector/ponyfill');
  return new BarcodeDetector({ formats: FORMATS as never }) as unknown as Detector;
}

/** A short beep so the cashier hears a scan. */
function beep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    osc.frequency.value = 1500;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
    osc.onended = () => void ctx.close();
  } catch {
    // No sound; the line still goes in.
  }
}

export function CameraScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'error'>('starting');
  const [error, setError] = useState('');
  const [last, setLast] = useState<string | null>(null);
  const handler = useRef(onCode);
  handler.current = onCode;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let stopped = false;
    let timer = 0;
    let lastCode = '';
    let lastAt = 0;

    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('This browser can’t use the camera here. It needs https (or localhost).');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped) return;
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        const detector = await makeDetector();
        setStatus('scanning');
        const tick = async () => {
          if (stopped) return;
          try {
            if (v.readyState >= 2) {
              const [hit] = await detector.detect(v);
              const now = Date.now();
              if (hit?.rawValue && (hit.rawValue !== lastCode || now - lastAt > 1500)) {
                lastCode = hit.rawValue;
                lastAt = now;
                beep();
                setLast(hit.rawValue);
                handler.current(hit.rawValue);
              }
            }
          } catch {
            // One bad frame; try the next.
          }
          timer = window.setTimeout(tick, 150);
        };
        void tick();
      } catch (err) {
        setStatus('error');
        setError(err instanceof DOMException && err.name === 'NotAllowedError' ? 'Camera permission was refused. Allow the camera for this site and try again.' : err instanceof Error ? err.message : 'The camera couldn’t start.');
      }
    })();

    return () => {
      stopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <PosDialog open onOpenChange={(o) => !o && onClose()} title="Scan with the camera">
      <div className="space-y-3">
        <div className="relative overflow-hidden rounded-lg bg-black">
          <video ref={video} muted playsInline className="aspect-[4/3] w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />
        </div>
        {status === 'starting' && <p className="text-sm text-pos-muted">Starting the camera…</p>}
        {status === 'scanning' && <p className="text-sm text-pos-muted">{last ? `Added ${last}. Keep scanning, or close.` : 'Hold the barcode inside the frame, along the red line.'}</p>}
        {status === 'error' && <p className="text-sm text-pos-alert">{error}</p>}
        <div className="flex justify-end">
          <PosButton variant="primary" onClick={onClose}>
            Done
          </PosButton>
        </div>
      </div>
    </PosDialog>
  );
}
