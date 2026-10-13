import { useCallback, useEffect, useState } from 'react';

/** How tall table rows are in the Super Admin console. A person's own choice, kept in this browser (no account setting). */
export type ConsoleDensity = 'compact' | 'regular' | 'comfortable';
export const DENSITY_LABEL: Record<ConsoleDensity, string> = { compact: 'Compact', regular: 'Regular', comfortable: 'Comfortable' };
const KEY = 'regantify.console.density';

function read(): ConsoleDensity {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'compact' || v === 'comfortable' ? v : 'regular';
  } catch {
    return 'regular';
  }
}

/** Reads the saved density and puts it on <body data-density>, which the table rules in index.css read. */
export function useConsoleDensity(): [ConsoleDensity, (d: ConsoleDensity) => void] {
  const [density, setDensity] = useState<ConsoleDensity>(read);
  useEffect(() => {
    document.body.dataset.density = density;
    return () => {
      delete document.body.dataset.density;
    };
  }, [density]);
  const set = useCallback((d: ConsoleDensity) => {
    setDensity(d);
    try {
      localStorage.setItem(KEY, d);
    } catch {
      // storage blocked: the choice lasts until the page is closed
    }
  }, []);
  return [density, set];
}
