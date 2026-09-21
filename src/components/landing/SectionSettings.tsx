import { RichTextEditor } from '../editor/RichTextEditor';
import { ImageField } from './ImageField';
import { ProductPickerField } from './ProductPickerField';
import { AddRowButton, Field, NumberInput, RepeaterRow, Select, TextArea, TextInput, Toggle } from './fields';
import type {
  BannerVideoProps,
  ButtonProps,
  CarouselProps,
  CheckoutFormProps,
  CountdownTimerProps,
  CustomerReviewsProps,
  FaqProps,
  FeatureGridProps,
  HeadingProps,
  HeroSliderProps,
  ImageProps,
  LeadFormProps,
  PriceOfferProps,
  SelectProductsProps,
  SpacerProps,
  StatsProps,
  StickyOrderBarProps,
  TextProps,
  TrustBadgesProps,
  TwoColumnProps,
  TwoColumnSide,
} from '../../lib/landingSections';

/**
 * Renders the settings form for whichever section is selected in the
 * builder's left rail. One component per section type, dispatched by
 * `type` — the editor half of the shared section registry contract
 * (landing-page-sections.md).
 *
 * Every form is "controlled by props, commits through onChange" — it
 * never holds its own copy of the section state, so the live preview
 * updates as the vendor types.
 */
interface SectionSettingsProps {
  type: string;
  props: Record<string, unknown>;
  onChange: (props: Record<string, unknown>) => void;
}

export function SectionSettings({ type, props, onChange }: SectionSettingsProps) {
  // Each case narrows `props` to its own shape. The cast is safe in
  // practice (the registry's defaults seed the right shape, and forms
  // only ever write their own fields back) but every field read below
  // still falls back to a default, so a section saved by an older build
  // with missing fields renders rather than crashing the builder.
  switch (type) {
    case 'heading':
      return <HeadingForm props={props as unknown as HeadingProps} onChange={onChange} />;
    case 'text':
      return <TextForm props={props as unknown as TextProps} onChange={onChange} />;
    case 'image':
      return <ImageForm props={props as unknown as ImageProps} onChange={onChange} />;
    case 'spacer':
      return <SpacerForm props={props as unknown as SpacerProps} onChange={onChange} />;
    case 'button':
      return <ButtonForm props={props as unknown as ButtonProps} onChange={onChange} />;
    case 'hero-slider':
      return <HeroSliderForm props={props as unknown as HeroSliderProps} onChange={onChange} />;
    case 'banner-video':
      return <BannerVideoForm props={props as unknown as BannerVideoProps} onChange={onChange} />;
    case 'two-column':
      return <TwoColumnForm props={props as unknown as TwoColumnProps} onChange={onChange} />;
    case 'select-products':
      return <SelectProductsForm props={props as unknown as SelectProductsProps} onChange={onChange} />;
    case 'price-offer':
      return <PriceOfferForm props={props as unknown as PriceOfferProps} onChange={onChange} />;
    case 'countdown-timer':
      return <CountdownTimerForm props={props as unknown as CountdownTimerProps} onChange={onChange} />;
    case 'sticky-order-bar':
      return <StickyOrderBarForm props={props as unknown as StickyOrderBarProps} onChange={onChange} />;
    case 'customer-reviews':
      return <CustomerReviewsForm props={props as unknown as CustomerReviewsProps} onChange={onChange} />;
    case 'trust-badges':
      return <TrustBadgesForm props={props as unknown as TrustBadgesProps} onChange={onChange} />;
    case 'stats':
      return <StatsForm props={props as unknown as StatsProps} onChange={onChange} />;
    case 'faq':
      return <FaqForm props={props as unknown as FaqProps} onChange={onChange} />;
    case 'feature-grid':
      return <FeatureGridForm props={props as unknown as FeatureGridProps} onChange={onChange} />;
    case 'carousel':
      return <CarouselForm props={props as unknown as CarouselProps} onChange={onChange} />;
    case 'checkout-form':
      return <CheckoutFormForm props={props as unknown as CheckoutFormProps} onChange={onChange} />;
    case 'lead-form':
      return <LeadFormForm props={props as unknown as LeadFormProps} onChange={onChange} />;
    default:
      return (
        <p className="text-[12px] leading-relaxed text-slate-500">
          This section type ({type}) has no settings form in this version of the builder.
        </p>
      );
  }
}

// Shared helper: merge a partial patch into the section's props.
type Patch<T> = (patch: Partial<T>) => void;
function patcher<T extends object>(
  props: T,
  onChange: (p: Record<string, unknown>) => void,
): Patch<T> {
  return (patch) => onChange({ ...props, ...patch } as unknown as Record<string, unknown>);
}

const ALIGN_OPTIONS = [
  { value: 'left' as const, label: 'Left' },
  { value: 'center' as const, label: 'Center' },
  { value: 'right' as const, label: 'Right' },
];

// -- Basic --------------------------------------------------------------

function HeadingForm({ props, onChange }: { props: HeadingProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  return (
    <div className="flex flex-col gap-3">
      <Field label="Text">
        <TextInput value={props.text ?? ''} onChange={(text) => set({ text })} />
      </Field>
      <Field label="Size" hint="H1 is the biggest. Use it only once per page for the main headline.">
        <Select
          value={props.level ?? 'h2'}
          onChange={(level) => set({ level })}
          options={[
            { value: 'h1', label: 'H1 — Main headline' },
            { value: 'h2', label: 'H2 — Section title' },
            { value: 'h3', label: 'H3 — Sub-heading' },
          ]}
        />
      </Field>
      <Field label="Alignment">
        <Select value={props.align ?? 'center'} onChange={(align) => set({ align })} options={ALIGN_OPTIONS} />
      </Field>
    </div>
  );
}

function TextForm({ props, onChange }: { props: TextProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  return (
    <div className="flex flex-col gap-3">
      <Field label="Content">
        {/* Reuses the dashboard's existing TipTap editor (same one behind
            Store > Pages' content) rather than a second rich-text stack. */}
        <div className="rounded-lg bg-white p-1 text-regantify-text">
          <RichTextEditor value={props.html ?? ''} onChange={(html) => set({ html })} />
        </div>
      </Field>
      <Field label="Alignment">
        <Select value={props.align ?? 'left'} onChange={(align) => set({ align })} options={ALIGN_OPTIONS} />
      </Field>
    </div>
  );
}

function ImageForm({ props, onChange }: { props: ImageProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  return (
    <div className="flex flex-col gap-3">
      <ImageField label="Image" value={props.imageUrl ?? ''} onChange={(imageUrl) => set({ imageUrl })} />
      <Field label="Alt text" hint="Describes the image for screen readers and search engines.">
        <TextInput value={props.alt ?? ''} onChange={(alt) => set({ alt })} />
      </Field>
      <Field label="Link (optional)">
        <TextInput value={props.link ?? ''} onChange={(link) => set({ link })} placeholder="https://" />
      </Field>
      <Field label="Fit">
        <Select
          value={props.fit ?? 'cover'}
          onChange={(fit) => set({ fit })}
          options={[
            { value: 'cover', label: 'Cover — fill the space, may crop' },
            { value: 'contain', label: 'Contain — show the whole image' },
          ]}
        />
      </Field>
    </div>
  );
}

function SpacerForm({ props, onChange }: { props: SpacerProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  return (
    <div className="flex flex-col gap-3">
      <Field label="Height (px)">
        <NumberInput value={props.heightPx ?? 40} min={0} max={400} onChange={(heightPx) => set({ heightPx })} />
      </Field>
      <Toggle
        label="Show a divider line"
        checked={props.showLine ?? false}
        onChange={(showLine) => set({ showLine })}
      />
      {props.showLine && (
        <Field label="Line style">
          <Select
            value={props.lineStyle ?? 'solid'}
            onChange={(lineStyle) => set({ lineStyle })}
            options={[
              { value: 'solid', label: 'Solid' },
              { value: 'dashed', label: 'Dashed' },
            ]}
          />
        </Field>
      )}
    </div>
  );
}

function ButtonForm({ props, onChange }: { props: ButtonProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  return (
    <div className="flex flex-col gap-3">
      <Field label="Label">
        <TextInput value={props.label ?? ''} onChange={(label) => set({ label })} />
      </Field>
      <Field label="Link" hint="Use #checkout to scroll down to the order form on this page.">
        <TextInput value={props.link ?? ''} onChange={(link) => set({ link })} placeholder="#checkout" />
      </Field>
      <Field label="Style">
        <Select
          value={props.variant ?? 'primary'}
          onChange={(variant) => set({ variant })}
          options={[
            { value: 'primary', label: 'Primary' },
            { value: 'secondary', label: 'Secondary' },
            { value: 'outline', label: 'Outline' },
          ]}
        />
      </Field>
      <Field label="Alignment">
        <Select value={props.align ?? 'center'} onChange={(align) => set({ align })} options={ALIGN_OPTIONS} />
      </Field>
      <Toggle
        label="Open in a new tab"
        checked={props.openInNewTab ?? false}
        onChange={(openInNewTab) => set({ openInNewTab })}
      />
    </div>
  );
}

// -- Hero ---------------------------------------------------------------

function HeroSliderForm({ props, onChange }: { props: HeroSliderProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  const slides = props.slides ?? [];

  const updateSlide = (i: number, patch: Partial<HeroSliderProps['slides'][number]>) =>
    set({ slides: slides.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {slides.map((slide, i) => (
          <RepeaterRow
            key={i}
            index={i}
            onRemove={slides.length > 1 ? () => set({ slides: slides.filter((_, idx) => idx !== i) }) : undefined}
          >
            <ImageField value={slide.imageUrl ?? ''} onChange={(imageUrl) => updateSlide(i, { imageUrl })} />
            <TextInput
              value={slide.headline ?? ''}
              onChange={(headline) => updateSlide(i, { headline })}
              placeholder="Headline"
            />
            <TextInput
              value={slide.subheadline ?? ''}
              onChange={(subheadline) => updateSlide(i, { subheadline })}
              placeholder="Subheadline"
            />
            <div className="grid grid-cols-2 gap-2">
              <TextInput
                value={slide.ctaLabel ?? ''}
                onChange={(ctaLabel) => updateSlide(i, { ctaLabel })}
                placeholder="Button text"
              />
              <TextInput
                value={slide.ctaLink ?? ''}
                onChange={(ctaLink) => updateSlide(i, { ctaLink })}
                placeholder="#checkout"
              />
            </div>
          </RepeaterRow>
        ))}
      </div>

      <AddRowButton
        label="+ Add slide"
        onClick={() =>
          set({
            slides: [...slides, { imageUrl: '', headline: '', subheadline: '', ctaLabel: '', ctaLink: '#checkout' }],
          })
        }
      />

      <Field label="Autoplay speed (ms)" hint="0 turns autoplay off.">
        <NumberInput value={props.autoplayMs ?? 4000} min={0} onChange={(autoplayMs) => set({ autoplayMs })} />
      </Field>
    </div>
  );
}

function BannerVideoForm({ props, onChange }: { props: BannerVideoProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  const muted = props.muted ?? true;

  return (
    <div className="flex flex-col gap-3">
      <Field label="Video URL" hint="A direct video file (.mp4) or a YouTube link.">
        <TextInput value={props.videoUrl ?? ''} onChange={(videoUrl) => set({ videoUrl })} placeholder="https://" />
      </Field>
      <ImageField
        label="Poster image (optional)"
        value={props.posterImageUrl ?? ''}
        onChange={(posterImageUrl) => set({ posterImageUrl })}
      />
      <Field label="Overlay text (optional)">
        <TextInput value={props.overlayText ?? ''} onChange={(overlayText) => set({ overlayText })} />
      </Field>
      <Toggle label="Muted" checked={muted} onChange={(m) => set({ muted: m })} />
      {/* Browsers only permit autoplay on muted video, so this is disabled
          rather than silently failing at runtime (landing-page-sections.md §2.2). */}
      <div className={muted ? '' : 'opacity-40'}>
        <Toggle
          label="Autoplay"
          hint={muted ? undefined : 'Autoplay only works when the video is muted.'}
          checked={muted ? (props.autoplay ?? true) : false}
          onChange={(autoplay) => muted && set({ autoplay })}
        />
      </div>
      <Toggle label="Loop" checked={props.loop ?? true} onChange={(loop) => set({ loop })} />
    </div>
  );
}

function TwoColumnSideEditor({
  side,
  onChange,
}: {
  side: TwoColumnSide;
  onChange: (side: TwoColumnSide) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Select
        value={side.kind}
        onChange={(kind) =>
          onChange(kind === 'image' ? { kind: 'image', imageUrl: '', alt: '' } : { kind: 'html', html: '' })
        }
        options={[
          { value: 'image', label: 'Image' },
          { value: 'html', label: 'Text' },
        ]}
      />
      {side.kind === 'image' ? (
        <ImageField value={side.imageUrl ?? ''} onChange={(imageUrl) => onChange({ ...side, imageUrl })} />
      ) : (
        <TextArea value={side.html ?? ''} onChange={(html) => onChange({ ...side, html })} rows={4} />
      )}
    </div>
  );
}

function TwoColumnForm({ props, onChange }: { props: TwoColumnProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  return (
    <div className="flex flex-col gap-3">
      <Field label="Left column">
        <TwoColumnSideEditor
          side={props.left ?? { kind: 'image', imageUrl: '', alt: '' }}
          onChange={(left) => set({ left })}
        />
      </Field>
      <Field label="Right column">
        <TwoColumnSideEditor
          side={props.right ?? { kind: 'html', html: '' }}
          onChange={(right) => set({ right })}
        />
      </Field>
      <Toggle
        label="Stack on mobile"
        hint="Show the columns one above the other on small screens."
        checked={props.stackOnMobile ?? true}
        onChange={(stackOnMobile) => set({ stackOnMobile })}
      />
    </div>
  );
}

// -- Products / Offer ---------------------------------------------------

function SelectProductsForm({
  props,
  onChange,
}: {
  props: SelectProductsProps;
  onChange: (p: Record<string, unknown>) => void;
}) {
  const set = patcher(props, onChange);
  const layout = props.layout ?? 'single';

  return (
    <div className="flex flex-col gap-3">
      <ProductPickerField
        label="Products"
        value={props.productIds ?? []}
        onChange={(productIds) => set({ productIds })}
      />
      <Field label="Layout">
        <Select
          value={layout}
          onChange={(l) => set({ layout: l })}
          options={[
            { value: 'single', label: 'Single — one large card' },
            { value: 'grid', label: 'Grid' },
            { value: 'carousel', label: 'Carousel' },
          ]}
        />
      </Field>
      {layout === 'grid' && (
        <Field label="Columns">
          <Select
            value={String(props.columns ?? 3) as '2' | '3' | '4'}
            onChange={(c) => set({ columns: Number(c) as 2 | 3 | 4 })}
            options={[
              { value: '2', label: '2' },
              { value: '3', label: '3' },
              { value: '4', label: '4' },
            ]}
          />
        </Field>
      )}
      <Toggle label="Show price" checked={props.showPrice ?? true} onChange={(showPrice) => set({ showPrice })} />
      <Toggle label="Show stock" checked={props.showStock ?? false} onChange={(showStock) => set({ showStock })} />
    </div>
  );
}

function PriceOfferForm({ props, onChange }: { props: PriceOfferProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  return (
    <div className="flex flex-col gap-3">
      <ProductPickerField
        label="Linked product (optional)"
        multiple={false}
        value={props.productId ? [props.productId] : []}
        onChange={(ids) => set({ productId: ids[0] })}
      />
      <div className="grid grid-cols-2 gap-2">
        <Field label="Was (৳)">
          <NumberInput value={props.wasPrice ?? 0} min={0} onChange={(wasPrice) => set({ wasPrice })} />
        </Field>
        <Field label="Now (৳)">
          <NumberInput value={props.nowPrice ?? 0} min={0} onChange={(nowPrice) => set({ nowPrice })} />
        </Field>
      </div>
      <Field label="Button text">
        <TextInput value={props.ctaLabel ?? ''} onChange={(ctaLabel) => set({ ctaLabel })} />
      </Field>
      <Field label="Button link">
        <TextInput value={props.ctaLink ?? ''} onChange={(ctaLink) => set({ ctaLink })} placeholder="#checkout" />
      </Field>
      <ImageField
        label="Background image (optional)"
        value={props.backgroundImageUrl ?? ''}
        onChange={(backgroundImageUrl) => set({ backgroundImageUrl })}
      />
    </div>
  );
}

/** Converts an ISO string to the `datetime-local` input's expected format, in local time. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function CountdownTimerForm({
  props,
  onChange,
}: {
  props: CountdownTimerProps;
  onChange: (p: Record<string, unknown>) => void;
}) {
  const set = patcher(props, onChange);
  const expiredBehavior = props.expiredBehavior ?? 'hide';

  return (
    <div className="flex flex-col gap-3">
      <Field label="Counts down to">
        <input
          type="datetime-local"
          value={toLocalInput(props.endsAt ?? '')}
          onChange={(e) => {
            const d = new Date(e.target.value);
            if (!Number.isNaN(d.getTime())) set({ endsAt: d.toISOString() });
          }}
          className="w-full rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[12.5px]
            text-slate-100 focus:border-white/20 focus:outline-none [color-scheme:dark]"
        />
      </Field>
      <Field label="Style">
        <Select
          value={props.style_ ?? 'boxes'}
          onChange={(style_) => set({ style_ })}
          options={[
            { value: 'boxes', label: 'Boxes' },
            { value: 'inline', label: 'Inline text' },
          ]}
        />
      </Field>
      <Field label="When it runs out">
        <Select
          value={expiredBehavior}
          onChange={(v) => set({ expiredBehavior: v })}
          options={[
            { value: 'hide', label: 'Hide the timer' },
            { value: 'showMessage', label: 'Show a message' },
          ]}
        />
      </Field>
      {expiredBehavior === 'showMessage' && (
        <Field label="Message">
          <TextInput
            value={props.expiredMessage ?? ''}
            onChange={(expiredMessage) => set({ expiredMessage })}
            placeholder="This offer has ended."
          />
        </Field>
      )}
    </div>
  );
}

function StickyOrderBarForm({
  props,
  onChange,
}: {
  props: StickyOrderBarProps;
  onChange: (p: Record<string, unknown>) => void;
}) {
  const set = patcher(props, onChange);
  return (
    <div className="flex flex-col gap-3">
      <ProductPickerField
        label="Show product (optional)"
        multiple={false}
        value={props.productId ? [props.productId] : []}
        onChange={(ids) => set({ productId: ids[0] })}
      />
      <Field label="Button text">
        <TextInput value={props.ctaLabel ?? ''} onChange={(ctaLabel) => set({ ctaLabel })} />
      </Field>
      <Field label="Button link">
        <TextInput value={props.ctaLink ?? ''} onChange={(ctaLink) => set({ ctaLink })} placeholder="#checkout" />
      </Field>
      <Field label="Appear after scrolling (px)" hint="0 keeps it visible from the top.">
        <NumberInput
          value={props.showAfterScrollPx ?? 300}
          min={0}
          onChange={(showAfterScrollPx) => set({ showAfterScrollPx })}
        />
      </Field>
    </div>
  );
}

// -- Social proof -------------------------------------------------------

function CustomerReviewsForm({
  props,
  onChange,
}: {
  props: CustomerReviewsProps;
  onChange: (p: Record<string, unknown>) => void;
}) {
  const set = patcher(props, onChange);
  const reviews = props.reviews ?? [];
  const update = (i: number, patch: Partial<CustomerReviewsProps['reviews'][number]>) =>
    set({ reviews: reviews.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });

  return (
    <div className="flex flex-col gap-3">
      <Field label="Section title">
        <TextInput value={props.title ?? ''} onChange={(title) => set({ title })} />
      </Field>

      <div className="flex flex-col gap-2">
        {reviews.map((review, i) => (
          <RepeaterRow key={i} index={i} onRemove={() => set({ reviews: reviews.filter((_, idx) => idx !== i) })}>
            <ImageField value={review.avatarUrl ?? ''} onChange={(avatarUrl) => update(i, { avatarUrl })} />
            <TextInput value={review.name ?? ''} onChange={(name) => update(i, { name })} placeholder="Name" />
            <TextArea
              value={review.text ?? ''}
              onChange={(text) => update(i, { text })}
              rows={3}
              placeholder="What they said"
            />
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={String(review.rating ?? 5) as '1' | '2' | '3' | '4' | '5'}
                onChange={(r) => update(i, { rating: Number(r) as 1 | 2 | 3 | 4 | 5 })}
                options={[5, 4, 3, 2, 1].map((n) => ({ value: String(n) as '1', label: `${n} ★` }))}
              />
              <TextInput
                value={review.timeAgo ?? ''}
                onChange={(timeAgo) => update(i, { timeAgo })}
                placeholder="10 h"
              />
            </div>
          </RepeaterRow>
        ))}
      </div>

      <AddRowButton label="+ Add review" onClick={() => set({ reviews: [...reviews, { name: '', text: '' }] })} />

      <p className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-2.5 py-2 text-[10.5px] leading-relaxed text-amber-200/70">
        These are testimonials you write yourself — they are not your store's verified customer reviews.
        Only publish what real customers actually said.
      </p>
    </div>
  );
}

function TrustBadgesForm({ props, onChange }: { props: TrustBadgesProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  const badges = props.badges ?? [];
  const update = (i: number, patch: Partial<TrustBadgesProps['badges'][number]>) =>
    set({ badges: badges.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) });

  return (
    <div className="flex flex-col gap-3">
      <Field label="Section title">
        <TextInput value={props.title ?? ''} onChange={(title) => set({ title })} />
      </Field>
      <div className="flex flex-col gap-2">
        {badges.map((badge, i) => (
          <RepeaterRow key={i} index={i} onRemove={() => set({ badges: badges.filter((_, idx) => idx !== i) })}>
            <ImageField value={badge.imageUrl ?? ''} onChange={(imageUrl) => update(i, { imageUrl })} />
            <TextInput
              value={badge.label ?? ''}
              onChange={(label) => update(i, { label })}
              placeholder="Label (optional)"
            />
          </RepeaterRow>
        ))}
      </div>
      <AddRowButton label="+ Add badge" onClick={() => set({ badges: [...badges, { imageUrl: '', label: '' }] })} />
    </div>
  );
}

function StatsForm({ props, onChange }: { props: StatsProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  const stats = props.stats ?? [];
  const update = (i: number, patch: Partial<StatsProps['stats'][number]>) =>
    set({ stats: stats.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {stats.map((stat, i) => (
          <RepeaterRow key={i} index={i} onRemove={() => set({ stats: stats.filter((_, idx) => idx !== i) })}>
            <TextInput
              value={stat.value ?? ''}
              onChange={(value) => update(i, { value })}
              placeholder="10,000+"
            />
            <TextInput
              value={stat.label ?? ''}
              onChange={(label) => update(i, { label })}
              placeholder="Happy customers"
            />
          </RepeaterRow>
        ))}
      </div>
      <AddRowButton label="+ Add stat" onClick={() => set({ stats: [...stats, { value: '', label: '' }] })} />
    </div>
  );
}

// -- Content ------------------------------------------------------------

function FaqForm({ props, onChange }: { props: FaqProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  const items = props.items ?? [];
  const update = (i: number, patch: Partial<FaqProps['items'][number]>) =>
    set({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });

  return (
    <div className="flex flex-col gap-3">
      <Field label="Section title (optional)">
        <TextInput value={props.title ?? ''} onChange={(title) => set({ title })} />
      </Field>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <RepeaterRow key={i} index={i} onRemove={() => set({ items: items.filter((_, idx) => idx !== i) })}>
            <TextInput
              value={item.question ?? ''}
              onChange={(question) => update(i, { question })}
              placeholder="Question"
            />
            <TextArea
              value={item.answer ?? ''}
              onChange={(answer) => update(i, { answer })}
              rows={3}
              placeholder="Answer"
            />
          </RepeaterRow>
        ))}
      </div>
      <AddRowButton
        label="+ Add question"
        onClick={() => set({ items: [...items, { question: '', answer: '' }] })}
      />
    </div>
  );
}

function FeatureGridForm({ props, onChange }: { props: FeatureGridProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  const items = props.items ?? [];
  const update = (i: number, patch: Partial<FeatureGridProps['items'][number]>) =>
    set({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });

  return (
    <div className="flex flex-col gap-3">
      <Field label="Section title">
        <TextInput value={props.title ?? ''} onChange={(title) => set({ title })} />
      </Field>
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <RepeaterRow key={i} index={i} onRemove={() => set({ items: items.filter((_, idx) => idx !== i) })}>
            <ImageField value={item.imageUrl ?? ''} onChange={(imageUrl) => update(i, { imageUrl })} />
            <TextInput value={item.title ?? ''} onChange={(title) => update(i, { title })} placeholder="Title" />
            <TextArea
              value={item.description ?? ''}
              onChange={(description) => update(i, { description })}
              rows={2}
              placeholder="Short description"
            />
          </RepeaterRow>
        ))}
      </div>
      <AddRowButton
        label="+ Add feature"
        onClick={() => set({ items: [...items, { imageUrl: '', title: '', description: '' }] })}
      />
      <Field label="Columns">
        <Select
          value={String(props.columns ?? 3) as '2' | '3' | '4'}
          onChange={(c) => set({ columns: Number(c) as 2 | 3 | 4 })}
          options={[
            { value: '2', label: '2' },
            { value: '3', label: '3' },
            { value: '4', label: '4' },
          ]}
        />
      </Field>
      <Toggle
        label="Reveal caption on hover"
        checked={props.hoverReveal ?? true}
        onChange={(hoverReveal) => set({ hoverReveal })}
      />
    </div>
  );
}

function CarouselForm({ props, onChange }: { props: CarouselProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  const items = props.items ?? [];
  const update = (i: number, patch: Partial<CarouselProps['items'][number]>) =>
    set({ items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)) });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {items.map((item, i) => (
          <RepeaterRow key={i} index={i} onRemove={() => set({ items: items.filter((_, idx) => idx !== i) })}>
            <ImageField value={item.imageUrl ?? ''} onChange={(imageUrl) => update(i, { imageUrl })} />
            <TextInput
              value={item.caption ?? ''}
              onChange={(caption) => update(i, { caption })}
              placeholder="Caption (optional)"
            />
            <TextInput
              value={item.link ?? ''}
              onChange={(link) => update(i, { link })}
              placeholder="Link (optional)"
            />
          </RepeaterRow>
        ))}
      </div>
      <AddRowButton label="+ Add image" onClick={() => set({ items: [...items, { imageUrl: '' }] })} />
      <Field label="Autoplay speed (ms)" hint="0 turns autoplay off.">
        <NumberInput value={props.autoplayMs ?? 0} min={0} onChange={(autoplayMs) => set({ autoplayMs })} />
      </Field>
    </div>
  );
}

// -- Conversion ---------------------------------------------------------

function CheckoutFormForm({ props, onChange }: { props: CheckoutFormProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  const collect = props.collectFields ?? {
    name: true,
    phone: true,
    address: true,
    district: true,
    shippingOption: true,
  };

  return (
    <div className="flex flex-col gap-3">
      <ProductPickerField
        label="Products in this order"
        value={props.productIds ?? []}
        onChange={(productIds) => set({ productIds })}
      />

      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
        <span className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wide text-slate-500">
          Fields
        </span>
        <p className="mb-2 text-[10.5px] leading-relaxed text-slate-600">
          Name, phone and address are always collected.
        </p>
        <Toggle
          label="District quick-select"
          checked={collect.district ?? true}
          onChange={(district) => set({ collectFields: { ...collect, district } })}
        />
        <Toggle
          label="Shipping option"
          hint="Inside / outside Dhaka delivery charge."
          checked={collect.shippingOption ?? true}
          onChange={(shippingOption) => set({ collectFields: { ...collect, shippingOption } })}
        />
      </div>

      <Toggle
        label="Cash on delivery only"
        hint="Hides online payment on this page."
        checked={props.codOnly ?? true}
        onChange={(codOnly) => set({ codOnly })}
      />

      <div className="opacity-50">
        <Toggle
          label="Fraud check"
          hint="Flags risky phone numbers. Available in a later update."
          checked={false}
          onChange={() => {}}
        />
      </div>
    </div>
  );
}

function LeadFormForm({ props, onChange }: { props: LeadFormProps; onChange: (p: Record<string, unknown>) => void }) {
  const set = patcher(props, onChange);
  const collect = props.collectFields ?? { name: true, phone: true, email: false };
  const destination = props.destination ?? 'vendor-dashboard';

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5">
        <span className="mb-1.5 block text-[10.5px] font-medium uppercase tracking-wide text-slate-500">
          Fields
        </span>
        <p className="mb-2 text-[10.5px] leading-relaxed text-slate-600">
          Name and phone are always collected.
        </p>
        <Toggle
          label="Also ask for email"
          checked={collect.email ?? false}
          onChange={(email) => set({ collectFields: { ...collect, email } })}
        />
      </div>

      <Field label="Send leads to">
        <Select
          value={destination}
          onChange={(d) => set({ destination: d })}
          options={[
            { value: 'vendor-dashboard', label: 'My dashboard' },
            { value: 'whatsapp', label: 'WhatsApp' },
          ]}
        />
      </Field>

      {destination === 'whatsapp' && (
        <Field label="WhatsApp number">
          <TextInput
            value={props.whatsappNumber ?? ''}
            onChange={(whatsappNumber) => set({ whatsappNumber })}
            placeholder="8801XXXXXXXXX"
          />
        </Field>
      )}

      <Field label="Thank-you message">
        <TextArea
          value={props.successMessage ?? ''}
          onChange={(successMessage) => set({ successMessage })}
          rows={2}
        />
      </Field>
    </div>
  );
}
