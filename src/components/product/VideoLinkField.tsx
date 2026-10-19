import { CheckCircle2, Facebook, Instagram, Music2, TriangleAlert, Video, Youtube } from 'lucide-react';
import { Field, productInputClass } from './ProductFormPieces';

/**
 * Add/Edit Product's "Video link": YouTube, Facebook, Instagram, TikTok or a direct .mp4. The store plays it inside
 * the product page with its picture (server products/product-video.ts decides how; this only says which platform the
 * link looks like, so the seller sees at once that a link is understood). The server refuses a link it can't play.
 */

type Kind = { name: string; icon: typeof Video } | null;

function hostIs(host: string, base: string) {
  return host === base || host.endsWith(`.${base}`);
}

function detect(raw: string): Kind | 'BAD' {
  const s = raw.trim();
  if (!s) return null;
  let u: URL;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
  } catch {
    return 'BAD';
  }
  const h = u.hostname.toLowerCase();
  if (hostIs(h, 'youtube.com') || hostIs(h, 'youtu.be')) return { name: 'YouTube', icon: Youtube };
  if (hostIs(h, 'tiktok.com')) return { name: 'TikTok', icon: Music2 };
  if (hostIs(h, 'instagram.com')) return { name: 'Instagram', icon: Instagram };
  if (hostIs(h, 'facebook.com') || hostIs(h, 'fb.watch') || hostIs(h, 'fb.com')) return { name: 'Facebook', icon: Facebook };
  if (/\.(mp4|webm|mov|m4v)$/i.test(u.pathname)) return { name: 'Video file', icon: Video };
  return 'BAD';
}

export function VideoLinkField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const kind = detect(value);
  return (
    <Field label="Video link" hint="A YouTube, Facebook, Instagram or TikTok video link. It plays on the product page with its picture.">
      <input
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, 500))}
        placeholder="https://www.tiktok.com/@yourshop/video/…"
        maxLength={500}
        className={productInputClass}
      />
      {kind === 'BAD' ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
          <TriangleAlert size={13} /> This link can't be played. Use a YouTube, Facebook, Instagram or TikTok video link.
        </p>
      ) : kind ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs text-regantify-text-muted">
          <CheckCircle2 size={13} className="text-green-600" />
          <kind.icon size={13} /> {kind.name} video. The picture shows on your store within a minute of saving.
        </p>
      ) : null}
    </Field>
  );
}
