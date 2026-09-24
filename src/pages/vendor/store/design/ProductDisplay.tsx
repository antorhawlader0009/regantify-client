import { useEffect, useState, type ReactNode } from 'react';
import type { ProductGalleryStyle, ProductImageShape } from '../../../../lib/designSettingsApi';
import {
  DesignLoading,
  DesignPageHeader,
  DesignSection,
  RadioGroup,
  SaveButton,
  inputClass,
  useDesignSettings,
} from './designShared';

// What StorePal shows when a message is left blank (keep in sync with
// storefront's themes/storepal/lib/designSettings.ts).
const DEFAULT_IN_STOCK = '##stock units in stock';
const DEFAULT_OUT_OF_STOCK = 'Out of stock';
const DEFAULT_PRE_ORDER = 'Available for pre-order';

/** Store > Design > Product Display Options — product photo shape, gallery layout and stock wording. */
export default function ProductDisplay() {
  const { settings, isLoading, save } = useDesignSettings();
  const [shape, setShape] = useState<ProductImageShape>('SQUARE');
  const [gallery, setGallery] = useState<ProductGalleryStyle>('BOTTOM');
  const [messages, setMessages] = useState({ inStockMessage: '', outOfStockMessage: '', preOrderMessage: '' });

  useEffect(() => {
    if (!settings) return;
    setShape(settings.productImageShape);
    setGallery(settings.galleryStyle);
    setMessages({
      inStockMessage: settings.inStockMessage ?? '',
      outOfStockMessage: settings.outOfStockMessage ?? '',
      preOrderMessage: settings.preOrderMessage ?? '',
    });
  }, [settings]);

  return (
    <div className="max-w-3xl">
      <DesignPageHeader
        title="Product Display Options"
        description="How product photos and stock messages look on your StorePal storefront."
      />
      {isLoading || !settings ? (
        <DesignLoading />
      ) : (
        <div className="space-y-8">
          <DesignSection title="Product Display">
            <RadioGroup
              label="Product Image"
              value={shape}
              onChange={setShape}
              options={[
                { value: 'SQUARE', label: 'Square' },
                { value: 'PORTRAIT', label: 'Portrait' },
              ]}
              hint="Portrait images will have more height."
            />
            <RadioGroup
              label="Gallery Style"
              value={gallery}
              onChange={setGallery}
              options={[
                { value: 'LEFT', label: 'Left' },
                { value: 'BOTTOM', label: 'Bottom' },
                { value: 'RIGHT', label: 'Right' },
              ]}
              hint="Where the small photos sit on the product page."
            />
            <SaveButton
              pending={save.isPending}
              onClick={() => save.mutate({ productImageShape: shape, galleryStyle: gallery })}
            />
          </DesignSection>

          <DesignSection title="Stock Message">
            <MessageField
              label="In Stock Message"
              value={messages.inStockMessage}
              placeholder={DEFAULT_IN_STOCK}
              onChange={(v) => setMessages((m) => ({ ...m, inStockMessage: v }))}
              hint={
                <>
                  Use <strong>##stock</strong> to show remaining stock count.
                </>
              }
            />
            <MessageField
              label="Out of Stock Message"
              value={messages.outOfStockMessage}
              placeholder={DEFAULT_OUT_OF_STOCK}
              onChange={(v) => setMessages((m) => ({ ...m, outOfStockMessage: v }))}
            />
            <MessageField
              label="Pre Order Item Message"
              value={messages.preOrderMessage}
              placeholder={DEFAULT_PRE_ORDER}
              onChange={(v) => setMessages((m) => ({ ...m, preOrderMessage: v }))}
            />
            <p className="text-xs text-regantify-text-muted">Leave a message empty to use the default shown in grey.</p>
            <SaveButton pending={save.isPending} onClick={() => save.mutate(messages)} />
          </DesignSection>
        </div>
      )}
    </div>
  );
}

function MessageField({
  label,
  value,
  placeholder,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-regantify-text mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={120}
        className={inputClass}
      />
      {hint && <p className="text-xs text-regantify-text-muted mt-1">{hint}</p>}
    </div>
  );
}
