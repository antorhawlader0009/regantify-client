/**
 * Client copy of server/src/blog/blog-html.ts `cleanBlogHtml` (kept in step by hand): removes scripts, styles, frames,
 * forms and embeds, on... attributes and javascript:/vbscript:/data: links. Used wherever the dashboard shows HTML a
 * store saved (the landing-page builder's preview), because that HTML is rendered inside the dashboard, where a script
 * would run with the signed-in owner's session. The server cleans on save too; this also covers pages saved earlier.
 */
export function cleanHtml(input: string | null | undefined): string {
  if (!input) return '';
  let html = String(input).slice(0, 200_000);
  html = html.replace(/<(script|style|iframe|object|embed|form|link|meta|base)\b[\s\S]*?(<\/\1\s*>|$)/gi, '');
  html = html.replace(/<\/?(script|style|iframe|object|embed|form|link|meta|base|input|button|textarea|select)\b[^>]*>/gi, '');
  html = html.replace(/[\s/]+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, ' ');
  html = html.replace(/([\s/])(href|src|xlink:href|formaction|action|poster|background)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, (whole, sep: string, name: string, raw: string) =>
    unsafeUrl(raw.replace(/^["']|["']$/g, '')) ? `${sep}${name}="#"` : whole,
  );
  return html;
}

function unsafeUrl(value: string): boolean {
  const decoded = value
    .replace(/&#x([0-9a-f]+);?/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);?/g, (_, dec: string) => String.fromCharCode(Number(dec)))
    .replace(/&(colon|tab|newline);/gi, (_, n: string) => (n.toLowerCase() === 'colon' ? ':' : ''))
    // eslint-disable-next-line no-control-regex
    .replace(/[\s\u0000-\u001f]+/g, '')
    .toLowerCase();
  return /^(javascript|vbscript|data):/.test(decoded);
}
