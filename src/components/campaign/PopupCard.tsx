import { useState, type CSSProperties } from 'react';
import type { PopupForm } from '../../lib/popupCampaignsApi';

type StorefrontPopupCampaign = PopupForm;

// Marketing > Campaigns > Popup: how one popup looks. Plain inline styles
// on purpose, so the dashboard's live preview can render the very same
// markup without sharing a stylesheet.
//
// KEEP IN LOCKSTEP with storefront/src/themes/storepal/components/PopupCard.tsx (what
// shoppers see). Both files are the same code; only the types'
// import and the font defaults at the top differ.

/** Everything the card needs to draw itself (no targeting, no counters). */
export type PopupLook = Pick<
  StorefrontPopupCampaign,
  | 'format'
  | 'imageUrl'
  | 'imageAlt'
  | 'imageShape'
  | 'imageCrop'
  | 'headline'
  | 'message'
  | 'textPlacement'
  | 'align'
  | 'headlineAlign'
  | 'messageAlign'
  | 'buttonAlign'
  | 'width'
  | 'couponEnabled'
  | 'couponCode'
  | 'buttonEnabled'
  | 'buttonText'
  | 'buttonColor'
  | 'buttonStyle'
  | 'backgroundColor'
  | 'textColor'
  | 'cornerRadius'
>;

export const POPUP_SHAPE_RATIO: Record<StorefrontPopupCampaign['imageShape'], number> = {
  WIDE: 16 / 9,
  BANNER: 2 / 1,
  PHOTO: 3 / 2,
  STANDARD: 4 / 3,
  SQUARE: 1,
  PORTRAIT: 4 / 5,
};

/** Width a corner toast always draws at (the width slider is for the dialog). */
export const TOAST_WIDTH = 340;

const ALIGN: Record<StorefrontPopupCampaign['align'], CSSProperties['textAlign']> = { LEFT: 'left', CENTER: 'center', RIGHT: 'right' };
const JUSTIFY: Record<StorefrontPopupCampaign['align'], CSSProperties['justifyContent']> = {
  LEFT: 'flex-start',
  CENTER: 'center',
  RIGHT: 'flex-end',
};

/** White or near-black, whichever reads on `hex`. */
function readableOn(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.65 ? '#111111' : '#ffffff';
}

/** The picture, cut to the chosen shape. `crop` is 0..1 fractions of the whole picture. */
export function PopupImage({
  url,
  alt,
  shape,
  crop,
}: {
  url: string;
  alt: string | null;
  shape: StorefrontPopupCampaign['imageShape'];
  crop: StorefrontPopupCampaign['imageCrop'];
}) {
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: String(POPUP_SHAPE_RATIO[shape]), overflow: 'hidden', background: '#e7e7e7' }}>
      {crop ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={alt ?? ''}
          draggable={false}
          style={{
            position: 'absolute',
            display: 'block',
            maxWidth: 'none',
            width: `${100 / crop.w}%`,
            left: `${-(crop.x / crop.w) * 100}%`,
            top: `${-(crop.y / crop.h) * 100}%`,
          }}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt ?? ''} draggable={false} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
    </div>
  );
}

function CouponBox({ code, color }: { code: string; color: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked: the code is on screen to type.
    }
  };
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        border: `1.5px dashed ${color}`,
        borderRadius: 8,
        padding: '8px 8px 8px 14px',
        margin: '14px 0 0',
      }}
    >
      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 15, fontWeight: 700, letterSpacing: 1, wordBreak: 'break-all' }}>{code}</span>
      <button
        type="button"
        onClick={copy}
        style={{
          flexShrink: 0,
          cursor: 'pointer',
          border: 0,
          borderRadius: 6,
          padding: '6px 12px',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'inherit',
          background: color,
          color: readableOn(color),
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

/**
 * One popup, without the dim layer or its place on the screen (see
 * PopupCampaigns.tsx and the builder's preview for those). `accent` is the
 * store's accent colour, used for a button with no colour of its own.
 */
export function PopupCard({
  popup,
  accent,
  headingFamily = 'var(--font-display), sans-serif',
  bodyFamily = 'var(--font-sans), sans-serif',
  onClose,
  onButton,
}: {
  popup: PopupLook;
  accent: string;
  headingFamily?: string;
  bodyFamily?: string;
  onClose?: () => void;
  onButton?: () => void;
}) {
  const over = popup.textPlacement === 'ON_IMAGE' && !!popup.imageUrl;
  const bg = popup.backgroundColor ?? '#ffffff';
  const ink = over ? '#ffffff' : popup.textColor ?? '#1a1a1a';
  const btnColor = popup.buttonColor ?? accent;
  const hasText = !!(popup.headline.trim() || popup.message.trim() || (popup.couponEnabled && popup.couponCode) || (popup.buttonEnabled && popup.buttonText));

  const buttonStyle: CSSProperties = {
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.2,
    padding: '11px 24px',
    borderRadius: Math.min(popup.cornerRadius, 10),
    border: 0,
    ...(popup.buttonStyle === 'SOLID'
      ? { background: btnColor, color: readableOn(btnColor) }
      : popup.buttonStyle === 'OUTLINE'
        ? { background: 'transparent', color: over ? '#fff' : btnColor, border: `2px solid ${over ? '#fff' : btnColor}` }
        : { background: 'transparent', color: over ? '#fff' : btnColor, textDecoration: 'underline', padding: '11px 6px' }),
  };

  const text = hasText && (
    <div
      style={{
        padding: over ? '36px 22px 20px' : '20px 24px 24px',
        color: ink,
        fontFamily: bodyFamily,
        ...(over
          ? { position: 'absolute', left: 0, right: 0, bottom: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0))' }
          : {}),
      }}
    >
      {popup.headline.trim() && (
        <div
          style={{
            fontFamily: headingFamily,
            fontSize: 20,
            fontWeight: 700,
            lineHeight: 1.25,
            textAlign: ALIGN[popup.headlineAlign ?? popup.align],
            overflowWrap: 'anywhere',
          }}
        >
          {popup.headline}
        </div>
      )}
      {popup.message.trim() && (
        <div
          style={{
            marginTop: popup.headline.trim() ? 8 : 0,
            fontSize: 14,
            lineHeight: 1.55,
            opacity: 0.82,
            textAlign: ALIGN[popup.messageAlign ?? popup.align],
            overflowWrap: 'anywhere',
            whiteSpace: 'pre-line',
          }}
        >
          {popup.message}
        </div>
      )}
      {popup.couponEnabled && popup.couponCode && <CouponBox code={popup.couponCode} color={over ? '#ffffff' : popup.textColor ?? '#1a1a1a'} />}
      {popup.buttonEnabled && popup.buttonText && (
        <div style={{ display: 'flex', justifyContent: JUSTIFY[popup.buttonAlign ?? popup.align], marginTop: 16 }}>
          <button type="button" onClick={onButton} style={buttonStyle}>
            {popup.buttonText}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        background: bg,
        color: popup.textColor ?? '#1a1a1a',
        borderRadius: popup.cornerRadius,
        boxShadow: '0 20px 50px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.12)',
        fontFamily: bodyFamily,
      }}
    >
      {onClose && (
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 2,
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 0,
            borderRadius: 999,
            cursor: 'pointer',
            background: 'rgba(0,0,0,0.55)',
            color: '#fff',
            padding: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
      {popup.imageUrl ? (
        <div style={{ position: 'relative' }}>
          <PopupImage url={popup.imageUrl} alt={popup.imageAlt} shape={popup.imageShape} crop={popup.imageCrop} />
          {over && text}
        </div>
      ) : null}
      {!over && text}
      {/* Nothing to show but the close button would look broken: keep a little body. */}
      {!popup.imageUrl && !hasText && <div style={{ height: 80 }} />}
    </div>
  );
}
