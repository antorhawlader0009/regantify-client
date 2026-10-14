import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * A small, safe Markdown renderer for help articles and What's new (super-admin-new.md Step 11). It builds React elements, never HTML, so nothing in the
 * text can run. Supported: # / ## / ### headings, paragraphs, "-" or "*" lists, "1." lists, > quotes, ``` code blocks, **bold**, *italic*, `code` and
 * [text](link), where a link is a page of this site (/vendor/..., /blog/...) or https://. Also used for the platform blog (Step 14).
 */
export function Markdown({ text, className = '' }: { text: string; className?: string }) {
  return <div className={`space-y-3 text-sm leading-relaxed text-regantify-text ${className}`}>{blocks(text)}</div>;
}

function blocks(text: string): ReactNode[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      i++;
      out.push(
        <pre key={out.length} className="overflow-x-auto rounded-lg bg-regantify-search px-3 py-2 text-xs">
          <code>{code.join('\n')}</code>
        </pre>,
      );
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const cls = h[1].length === 1 ? 'text-base font-semibold' : h[1].length === 2 ? 'text-[15px] font-semibold' : 'text-sm font-semibold';
      out.push(
        <p key={out.length} className={`${cls} pt-1`}>
          {inline(h[2])}
        </p>,
      );
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/).test(lines[i])) {
        items.push(lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/, ''));
        i++;
      }
      const Tag = ordered ? 'ol' : 'ul';
      out.push(
        <Tag key={out.length} className={`space-y-1 pl-5 ${ordered ? 'list-decimal' : 'list-disc'}`}>
          {items.map((it, k) => (
            <li key={k}>{inline(it)}</li>
          ))}
        </Tag>,
      );
      continue;
    }
    if (line.startsWith('>')) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) quote.push(lines[i++].replace(/^>\s?/, ''));
      out.push(
        <blockquote key={out.length} className="border-l-2 border-line pl-3 text-regantify-text-muted">
          {inline(quote.join(' '))}
        </blockquote>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|```|>|\s*[-*]\s+|\s*\d+[.)]\s+)/.test(lines[i])) para.push(lines[i++]);
    out.push(<p key={out.length}>{inline(para.join(' '))}</p>);
  }
  return out;
}

const TOKEN = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function inline(text: string): ReactNode {
  const parts = text.split(TOKEN);
  return parts.map((p, k) => {
    if (!p) return null;
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={k}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={k} className="rounded bg-regantify-search px-1 text-[0.85em]">{p.slice(1, -1)}</code>;
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={k}>{p.slice(1, -1)}</em>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(p);
    if (link) return <SafeLink key={k} href={link[2]} label={link[1]} />;
    return <Fragment key={k}>{p}</Fragment>;
  });
}

function SafeLink({ href, label }: { href: string; label: string }) {
  if (href.startsWith('/') && !href.startsWith('//')) {
    return (
      <Link to={href} className="font-medium underline underline-offset-2">
        {label}
      </Link>
    );
  }
  if (/^https:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
        {label}
      </a>
    );
  }
  return <>{label}</>;
}

/** A YouTube link becomes an embedded player (privacy-enhanced domain); any other https video link stays a link. */
export function HelpVideo({ url }: { url: string }) {
  const id = /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(url)?.[1];
  if (id) {
    return (
      <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}`}
          title="Help video"
          className="h-full w-full"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium underline">
      Watch the video
    </a>
  );
}
