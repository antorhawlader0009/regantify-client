import { useEffect, useRef } from 'react';

/**
 * USB / Bluetooth barcode scanners act as a keyboard: they "type" the code
 * very fast and press Enter. This catches a scan wherever focus is (a
 * button, the page), telling it apart from a person typing by speed: every
 * key within `maxGapMs` of the last, at least `minLength` characters, then
 * Enter. Inputs handle their own Enter (the search box does), so keys typed
 * into an input are left alone.
 */
export function useBarcodeScanner(onScan: (code: string) => void, { enabled = true, minLength = 4, maxGapMs = 50 } = {}) {
  const buffer = useRef('');
  const last = useRef(0);
  const handler = useRef(onScan);
  handler.current = onScan;

  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))) return;
      const now = performance.now();
      if (now - last.current > maxGapMs) buffer.current = '';
      last.current = now;

      if (e.key === 'Enter') {
        if (buffer.current.length >= minLength) {
          e.preventDefault();
          handler.current(buffer.current);
        }
        buffer.current = '';
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) buffer.current += e.key;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, minLength, maxGapMs]);
}
