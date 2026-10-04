/**
 * Prints just one element, the way it looks on screen, from a hidden
 * iframe: the element's HTML plus the app's own stylesheets (Tailwind),
 * nothing else from the page.
 *
 * Why not window.print() with "@media print { body * { visibility:
 * hidden } }": content inside a Dialog lives in a fixed, transformed
 * (translate -50%) container, so the "only this" trick prints a blank
 * page. An iframe has none of the app's layout, so what's printed is
 * exactly the element.
 *
 * `title` becomes the document title — Chrome uses it as the suggested
 * file name for "Save as PDF".
 *
 * `page` changes the paper (default A4 with 14 mm margins), e.g. a label
 * roll: { size: '38mm 25mm', padding: '0' }.
 */
export async function printElement(
  element: HTMLElement,
  title: string,
  page: { size?: string; padding?: string } = {},
): Promise<void> {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    window.print();
    return;
  }

  // Every stylesheet the app has loaded: <link> tags in a build, <style>
  // tags in dev (Vite injects them).
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join('\n');
  const escapedTitle = title.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c] ?? c);

  doc.open();
  doc.write(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <base href="${document.baseURI}" />
    <title>${escapedTitle}</title>
    ${styles}
    <style>
      /* No page margin = no browser header/footer (URL, date); the
         padding below gives the page its margins instead, on every page. */
      @page { size: ${page.size ?? 'A4'}; margin: 0; }
      html, body { background: #fff !important; margin: 0; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .print-root { padding: ${page.padding ?? '14mm'}; -webkit-box-decoration-break: clone; box-decoration-break: clone; }
      tr, .avoid-break { break-inside: avoid; }
    </style>
  </head>
  <body><div class="print-root">${element.outerHTML}</div></body>
</html>`);
  doc.close();

  // Wait for the copied stylesheets (and fonts) before printing, or the
  // first print can come out unstyled. Capped so a stuck stylesheet
  // never blocks printing.
  const links = Array.from(doc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
  const loaded = Promise.all(
    links.map(
      (link) =>
        new Promise<void>((resolve) => {
          if (link.sheet) return resolve();
          link.addEventListener('load', () => resolve(), { once: true });
          link.addEventListener('error', () => resolve(), { once: true });
        }),
    ),
  )
    .then(() => doc.fonts?.ready)
    // Images too (a store logo on a receipt), or they can print as empty boxes.
    .then(() =>
      Promise.all(
        Array.from(doc.images).map((img) =>
          img.complete ? undefined : new Promise<void>((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }),
        ),
      ),
    );
  await Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, 3000))]);

  const cleanup = () => setTimeout(() => iframe.remove(), 500);
  win.addEventListener('afterprint', cleanup, { once: true });
  // Fallback for browsers that don't fire afterprint on an iframe.
  setTimeout(() => iframe.isConnected && iframe.remove(), 60_000);

  win.focus();
  win.print();
}
