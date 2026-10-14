import { useEffect } from 'react';

function setMeta(attr: 'name' | 'property', key: string, content: string | undefined) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!content) {
    el?.remove();
    return;
  }
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.content = content;
}

/**
 * The browser-tab title and the description / share tags of a public page (super-admin-new.md Step 14). The dashboard is a single-page app, so these are
 * set after the page loads: Google reads them (it runs the page's script), but link previews in Facebook and WhatsApp, which do not, still show the
 * site's default title from index.html. The title goes back to "Regantify" when the page closes.
 */
export function usePageMeta(title: string | undefined, description?: string, imageUrl?: string) {
  useEffect(() => {
    if (title) document.title = title;
    setMeta('name', 'description', description);
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', imageUrl);
    return () => {
      document.title = 'Regantify';
      setMeta('name', 'description', undefined);
      setMeta('property', 'og:title', undefined);
      setMeta('property', 'og:description', undefined);
      setMeta('property', 'og:image', undefined);
    };
  }, [title, description, imageUrl]);
}
