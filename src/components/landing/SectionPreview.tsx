import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Package, Star } from 'lucide-react';
import { productsApi, type Product } from '../../lib/productsApi';
import type { LandingPageSection } from '../../lib/landingPagesApi';
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
import { sectionLabel } from '../../lib/landingSections';

/**
 * Renders one section as it will look on the published page, inside the
 * builder's preview canvas. This is the editor-side half of the shared
 * section contract (landing-page-sections.md); the storefront gets its
 * own renderer against the same contract in Step 8.
 *
 * Every prop read falls back to a sensible default so a half-filled
 * section (the normal state while a vendor is building) previews rather
 * than crashing.
 */
export function SectionPreview({ section, device }: { section: LandingPageSection; device: 'desktop' | 'mobile' }) {
  const p = section.props ?? {};

  switch (section.type) {
    case 'heading':
      return <HeadingPreview props={p as unknown as HeadingProps} />;
    case 'text':
      return <TextPreview props={p as unknown as TextProps} />;
    case 'image':
      return <ImagePreview props={p as unknown as ImageProps} />;
    case 'spacer':
      return <SpacerPreview props={p as unknown as SpacerProps} />;
    case 'button':
      return <ButtonPreview props={p as unknown as ButtonProps} />;
    case 'hero-slider':
      return <HeroSliderPreview props={p as unknown as HeroSliderProps} />;
    case 'banner-video':
      return <BannerVideoPreview props={p as unknown as BannerVideoProps} />;
    case 'two-column':
      return <TwoColumnPreview props={p as unknown as TwoColumnProps} device={device} />;
    case 'select-products':
      return <SelectProductsPreview props={p as unknown as SelectProductsProps} device={device} />;
    case 'price-offer':
      return <PriceOfferPreview props={p as unknown as PriceOfferProps} />;
    case 'countdown-timer':
      return <CountdownTimerPreview props={p as unknown as CountdownTimerProps} />;
    case 'sticky-order-bar':
      return <StickyOrderBarPreview props={p as unknown as StickyOrderBarProps} />;
    case 'customer-reviews':
      return <CustomerReviewsPreview props={p as unknown as CustomerReviewsProps} device={device} />;
    case 'trust-badges':
      return <TrustBadgesPreview props={p as unknown as TrustBadgesProps} />;
    case 'stats':
      return <StatsPreview props={p as unknown as StatsProps} />;
    case 'faq':
      return <FaqPreview props={p as unknown as FaqProps} />;
    case 'feature-grid':
      return <FeatureGridPreview props={p as unknown as FeatureGridProps} device={device} />;
    case 'carousel':
      return <CarouselPreview props={p as unknown as CarouselProps} />;
    case 'checkout-form':
      return <CheckoutFormPreview props={p as unknown as CheckoutFormProps} />;
    case 'lead-form':
      return <LeadFormPreview props={p as unknown as LeadFormProps} />;
    default:
      return (
        <div className="border border-dashed border-black/10 px-4 py-8 text-center text-sm text-regantify-text-muted">
          {sectionLabel(section.type)}
        </div>
      );
  }
}

/** Shared empty-slot placeholder for an image the vendor hasn't picked yet. */
function EmptyImage({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center bg-black/5 text-black/20 ${className}`}>
      <Package size={22} strokeWidth={1.5} />
    </div>
  );
}

const alignClass = (a?: string) =>
  a === 'left' ? 'text-left' : a === 'right' ? 'text-right' : 'text-center';

// -- Basic --------------------------------------------------------------

function HeadingPreview({ props }: { props: HeadingProps }) {
  const size =
    props.level === 'h1' ? 'text-3xl' : props.level === 'h3' ? 'text-lg' : 'text-2xl';
  return (
    <div className={`px-6 py-5 ${alignClass(props.align)}`}>
      <span className={`font-bold text-regantify-text ${size}`}>{props.text || 'Your Heading Here'}</span>
    </div>
  );
}

function TextPreview({ props }: { props: TextProps }) {
  return (
    <div
      className={`prose prose-sm max-w-none px-6 py-4 text-regantify-text ${alignClass(props.align)}`}
      dangerouslySetInnerHTML={{ __html: props.html || '<p class="opacity-40">Write something...</p>' }}
    />
  );
}

function ImagePreview({ props }: { props: ImageProps }) {
  if (!props.imageUrl) return <EmptyImage className="mx-6 my-4 h-44 rounded-lg" />;
  return (
    <img
      src={props.imageUrl}
      alt={props.alt ?? ''}
      className={`w-full ${props.fit === 'contain' ? 'object-contain' : 'object-cover'} max-h-96`}
    />
  );
}

function SpacerPreview({ props }: { props: SpacerProps }) {
  return (
    <div className="flex items-center px-6" style={{ height: props.heightPx ?? 40 }}>
      {props.showLine && (
        <div
          className="w-full border-t border-black/10"
          style={{ borderStyle: props.lineStyle ?? 'solid' }}
        />
      )}
    </div>
  );
}

function ButtonPreview({ props }: { props: ButtonProps }) {
  const variant =
    props.variant === 'outline'
      ? 'border-2 border-regantify-cta text-regantify-cta'
      : props.variant === 'secondary'
        ? 'bg-regantify-black text-white'
        : 'bg-regantify-cta text-white';
  return (
    <div className={`px-6 py-4 ${alignClass(props.align)}`}>
      <span className={`inline-block rounded-lg px-6 py-2.5 text-sm font-semibold ${variant}`}>
        {props.label || 'Click Here'}
      </span>
    </div>
  );
}

// -- Hero ---------------------------------------------------------------

function HeroSliderPreview({ props }: { props: HeroSliderProps }) {
  // Preview always shows the first slide — the builder canvas is about
  // layout/content review, not exercising autoplay timing.
  const slide = props.slides?.[0];
  if (!slide) return <EmptyImage className="h-56" />;

  return (
    <div className="relative">
      {slide.imageUrl ? (
        <img src={slide.imageUrl} alt="" className="h-56 w-full object-cover" />
      ) : (
        <EmptyImage className="h-56" />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 px-6 text-center">
        {slide.headline && <span className="text-2xl font-bold text-white">{slide.headline}</span>}
        {slide.subheadline && <span className="text-sm text-white/90">{slide.subheadline}</span>}
        {slide.ctaLabel && (
          <span className="mt-1 rounded-lg bg-regantify-cta px-5 py-2 text-sm font-semibold text-white">
            {slide.ctaLabel}
          </span>
        )}
      </div>
      {(props.slides?.length ?? 0) > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {props.slides.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/50'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BannerVideoPreview({ props }: { props: BannerVideoProps }) {
  return (
    <div className="relative">
      {props.posterImageUrl ? (
        <img src={props.posterImageUrl} alt="" className="h-52 w-full object-cover" />
      ) : (
        <div className="flex h-52 w-full items-center justify-center bg-black/80">
          <span className="ml-1 h-0 w-0 border-y-[14px] border-l-[22px] border-y-transparent border-l-white/80" />
        </div>
      )}
      {props.overlayText && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 px-6 text-center">
          <span className="text-xl font-bold text-white">{props.overlayText}</span>
        </div>
      )}
    </div>
  );
}

function SidePreview({ side }: { side: TwoColumnSide }) {
  if (!side) return <EmptyImage className="h-36 rounded-lg" />;
  if (side.kind === 'image') {
    return side.imageUrl ? (
      <img src={side.imageUrl} alt={side.alt ?? ''} className="h-36 w-full rounded-lg object-cover" />
    ) : (
      <EmptyImage className="h-36 rounded-lg" />
    );
  }
  return (
    <div
      className="prose prose-sm max-w-none text-regantify-text"
      dangerouslySetInnerHTML={{ __html: side.html || '<p class="opacity-40">Text here</p>' }}
    />
  );
}

function TwoColumnPreview({ props, device }: { props: TwoColumnProps; device: 'desktop' | 'mobile' }) {
  const stacked = device === 'mobile' && (props.stackOnMobile ?? true);
  return (
    <div className={`grid gap-4 px-6 py-5 ${stacked ? 'grid-cols-1' : 'grid-cols-2'}`}>
      <SidePreview side={props.left} />
      <SidePreview side={props.right} />
    </div>
  );
}

// -- Products -----------------------------------------------------------

/** Resolves the section's productIds to real rows so previews show actual names/prices. */
function useResolvedProducts(productIds: string[] | undefined): Product[] {
  const { data } = useQuery({
    queryKey: ['products', 'landing-picker'],
    queryFn: () => productsApi.list({ perPage: 200 }),
  });
  const byId = new Map((data?.products ?? []).map((p) => [p.id, p]));
  return (productIds ?? []).map((id) => byId.get(id)).filter((p): p is Product => !!p);
}

function ProductCard({ product, showPrice, showStock }: { product: Product; showPrice?: boolean; showStock?: boolean }) {
  const price = Number(product.discountPrice ?? product.price);
  const was = product.discountPrice ? Number(product.price) : null;

  return (
    <div className="overflow-hidden rounded-lg border border-black/5">
      {product.photoUrls?.[0] ? (
        <img src={product.photoUrls[0]} alt="" className="aspect-square w-full object-cover" />
      ) : (
        <EmptyImage className="aspect-square w-full" />
      )}
      <div className="p-2.5">
        <span className="block truncate text-[13px] font-medium text-regantify-text">{product.name}</span>
        {showPrice !== false && (
          <span className="mt-0.5 flex items-baseline gap-1.5">
            <span className="text-sm font-semibold text-regantify-text">৳ {price.toLocaleString()}</span>
            {was && <span className="text-[11px] text-regantify-text-muted line-through">৳ {was.toLocaleString()}</span>}
          </span>
        )}
        {showStock && (
          <span className="mt-0.5 block text-[11px] text-regantify-text-muted">
            {product.stockQuantity == null ? 'In stock' : `${product.stockQuantity} in stock`}
          </span>
        )}
      </div>
    </div>
  );
}

function SelectProductsPreview({ props, device }: { props: SelectProductsProps; device: 'desktop' | 'mobile' }) {
  const products = useResolvedProducts(props.productIds);

  if (products.length === 0) {
    return (
      <div className="mx-6 my-4 rounded-lg border border-dashed border-black/10 px-4 py-8 text-center text-sm text-regantify-text-muted">
        Pick a product to show here.
      </div>
    );
  }

  const cols =
    device === 'mobile' ? 1 : props.layout === 'single' ? 1 : (props.columns ?? 3);

  return (
    <div
      className="grid gap-3 px-6 py-5"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} showPrice={props.showPrice} showStock={props.showStock} />
      ))}
    </div>
  );
}

function PriceOfferPreview({ props }: { props: PriceOfferProps }) {
  return (
    <div
      className="flex flex-col items-center gap-1 bg-cover bg-center px-6 py-6 text-center"
      style={props.backgroundImageUrl ? { backgroundImage: `url(${props.backgroundImageUrl})` } : undefined}
    >
      {props.wasPrice > 0 && (
        <span className="text-sm text-regantify-text-muted line-through">
          ৳ {Number(props.wasPrice).toLocaleString()}
        </span>
      )}
      <span className="text-3xl font-bold text-regantify-cta">
        ৳ {Number(props.nowPrice ?? 0).toLocaleString()}
      </span>
      <span className="mt-2 rounded-lg bg-regantify-cta px-6 py-2.5 text-sm font-semibold text-white">
        {props.ctaLabel || 'অর্ডার করুন'}
      </span>
    </div>
  );
}

function CountdownTimerPreview({ props }: { props: CountdownTimerProps }) {
  const end = new Date(props.endsAt ?? '').getTime();
  const remaining = Math.max(0, end - Date.now());
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const mins = Math.floor((remaining % 3_600_000) / 60_000);
  const secs = Math.floor((remaining % 60_000) / 1000);
  const parts = [
    { v: days, l: 'Days' },
    { v: hours, l: 'Hrs' },
    { v: mins, l: 'Min' },
    { v: secs, l: 'Sec' },
  ];

  if (remaining === 0 && (props.expiredBehavior ?? 'hide') === 'hide') {
    return (
      <div className="px-6 py-4 text-center text-xs text-regantify-text-muted">
        Timer has expired — hidden on the live page.
      </div>
    );
  }
  if (remaining === 0) {
    return (
      <div className="px-6 py-5 text-center text-sm font-medium text-regantify-text">
        {props.expiredMessage || 'This offer has ended.'}
      </div>
    );
  }

  if ((props.style_ ?? 'boxes') === 'inline') {
    return (
      <div className="px-6 py-4 text-center text-sm font-semibold text-regantify-text">
        {days}d : {hours}h : {mins}m : {secs}s
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-2 px-6 py-5">
      {parts.map((p) => (
        <div key={p.l} className="w-14 rounded-lg bg-regantify-cta py-2 text-center text-white">
          <span className="block text-lg font-bold">{String(p.v).padStart(2, '0')}</span>
          <span className="block text-[10px] opacity-80">{p.l}</span>
        </div>
      ))}
    </div>
  );
}

function StickyOrderBarPreview({ props }: { props: StickyOrderBarProps }) {
  const products = useResolvedProducts(props.productId ? [props.productId] : []);
  const product = products[0];

  return (
    <div className="px-6 py-3">
      <div className="flex items-center gap-2.5 rounded-lg border border-black/10 bg-white p-2 shadow-lg">
        {product?.photoUrls?.[0] && (
          <img src={product.photoUrls[0]} alt="" className="h-9 w-9 rounded object-cover" />
        )}
        {product && (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[12px] font-medium text-regantify-text">{product.name}</span>
            <span className="block text-[11px] text-regantify-cta">
              ৳ {Number(product.discountPrice ?? product.price).toLocaleString()}
            </span>
          </span>
        )}
        <span className="ml-auto shrink-0 rounded-lg bg-regantify-cta px-4 py-2 text-[12px] font-semibold text-white">
          {props.ctaLabel || 'অর্ডার করুন'}
        </span>
      </div>
      <span className="mt-1 block text-center text-[10px] text-regantify-text-muted">
        Sticks to the bottom of the screen on the live page.
      </span>
    </div>
  );
}

// -- Social proof -------------------------------------------------------

function CustomerReviewsPreview({
  props,
  device,
}: {
  props: CustomerReviewsProps;
  device: 'desktop' | 'mobile';
}) {
  const reviews = props.reviews ?? [];
  return (
    <div className="px-6 py-5">
      {props.title && (
        <h3 className="mb-3 text-center text-lg font-bold text-regantify-text">{props.title}</h3>
      )}
      <div
        className="grid gap-2.5"
        style={{ gridTemplateColumns: `repeat(${device === 'mobile' ? 1 : 3}, minmax(0, 1fr))` }}
      >
        {reviews.map((r, i) => (
          <div key={i} className="rounded-lg border border-black/10 p-2.5">
            <div className="mb-1.5 flex items-center gap-2">
              {r.avatarUrl ? (
                <img src={r.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <span className="h-7 w-7 rounded-full bg-black/10" />
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-semibold text-regantify-text">
                  {r.name || 'Customer name'}
                </span>
                {r.rating && (
                  <span className="flex gap-0.5">
                    {Array.from({ length: r.rating }).map((_, s) => (
                      <Star key={s} size={9} className="fill-amber-400 text-amber-400" />
                    ))}
                  </span>
                )}
              </span>
              {r.timeAgo && <span className="shrink-0 text-[10px] text-regantify-text-muted">{r.timeAgo}</span>}
            </div>
            <p className="text-[11.5px] leading-relaxed text-regantify-text-muted">
              {r.text || 'Their review will show here.'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrustBadgesPreview({ props }: { props: TrustBadgesProps }) {
  const badges = props.badges ?? [];
  return (
    <div className="px-6 py-5 text-center">
      {props.title && <h3 className="mb-3 text-sm font-semibold text-regantify-text">{props.title}</h3>}
      {badges.length === 0 ? (
        <p className="text-xs text-regantify-text-muted">Add payment or delivery partner logos.</p>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-4">
          {badges.map((b, i) => (
            <span key={i} className="flex flex-col items-center gap-1">
              {b.imageUrl ? (
                <img src={b.imageUrl} alt={b.label ?? ''} className="h-9 object-contain" />
              ) : (
                <EmptyImage className="h-9 w-9 rounded" />
              )}
              {b.label && <span className="text-[10px] text-regantify-text-muted">{b.label}</span>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function StatsPreview({ props }: { props: StatsProps }) {
  const stats = props.stats ?? [];
  return (
    <div className="flex justify-around px-6 py-5">
      {stats.map((s, i) => (
        <div key={i} className="text-center">
          <span className="block text-xl font-bold text-regantify-cta">{s.value || '0'}</span>
          <span className="block text-[11px] text-regantify-text-muted">{s.label || 'Label'}</span>
        </div>
      ))}
    </div>
  );
}

// -- Content ------------------------------------------------------------

function FaqPreview({ props }: { props: FaqProps }) {
  const items = props.items ?? [];
  return (
    <div className="px-6 py-5">
      {props.title && <h3 className="mb-3 text-center text-lg font-bold text-regantify-text">{props.title}</h3>}
      <div className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <div key={i} className="rounded-lg border border-black/10">
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-[13px] font-medium text-regantify-text">
                {item.question || 'Question?'}
              </span>
              <ChevronDown size={15} className="shrink-0 text-regantify-text-muted" />
            </div>
            {i === 0 && item.answer && (
              <p className="border-t border-black/5 px-3 py-2.5 text-[12px] leading-relaxed text-regantify-text-muted">
                {item.answer}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureGridPreview({ props, device }: { props: FeatureGridProps; device: 'desktop' | 'mobile' }) {
  const items = props.items ?? [];
  const cols = device === 'mobile' ? 1 : (props.columns ?? 3);
  return (
    <div className="px-6 py-5">
      {props.title && <h3 className="mb-3 text-center text-lg font-bold text-regantify-text">{props.title}</h3>}
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {items.map((item, i) => (
          <div key={i} className="overflow-hidden rounded-lg border border-black/5 text-center">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="aspect-video w-full object-cover" />
            ) : (
              <EmptyImage className="aspect-video w-full" />
            )}
            <div className="p-2.5">
              <span className="block text-[12.5px] font-semibold text-regantify-text">
                {item.title || 'Feature'}
              </span>
              {item.description && (
                <span className="mt-0.5 block text-[11px] text-regantify-text-muted">{item.description}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CarouselPreview({ props }: { props: CarouselProps }) {
  const items = props.items ?? [];
  if (items.length === 0) {
    return (
      <div className="mx-6 my-4 rounded-lg border border-dashed border-black/10 px-4 py-8 text-center text-sm text-regantify-text-muted">
        Add images to the carousel.
      </div>
    );
  }
  return (
    <div className="flex gap-2.5 overflow-hidden px-6 py-5">
      {items.slice(0, 3).map((item, i) => (
        <div key={i} className="min-w-0 flex-1">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="aspect-[4/3] w-full rounded-lg object-cover" />
          ) : (
            <EmptyImage className="aspect-[4/3] w-full rounded-lg" />
          )}
          {item.caption && (
            <span className="mt-1 block truncate text-center text-[11px] text-regantify-text-muted">
              {item.caption}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// -- Conversion ---------------------------------------------------------

function FakeInput({ label, required }: { label: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] text-regantify-text">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      <span className="block h-8 w-full rounded-md border border-black/15 bg-white" />
    </label>
  );
}

function CheckoutFormPreview({ props }: { props: CheckoutFormProps }) {
  const products = useResolvedProducts(props.productIds);
  const collect = props.collectFields ?? {
    name: true,
    phone: true,
    address: true,
    district: true,
    shippingOption: true,
  };
  const total = products.reduce((sum, p) => sum + Number(p.discountPrice ?? p.price), 0);

  return (
    <div className="px-6 py-5">
      <h3 className="mb-3 text-base font-bold text-regantify-text">Submit Your Order Information</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2.5">
          <FakeInput label="নাম" required />
          <FakeInput label="মোবাইল" required />
          <FakeInput label="ঠিকানা" required />
          {collect.district && <FakeInput label="জেলা" />}
          {collect.shippingOption && <FakeInput label="Shipping Option" />}
        </div>

        <div className="rounded-lg border border-black/10 p-3">
          <span className="mb-2 block text-[13px] font-semibold text-regantify-text">Your order</span>
          {products.length === 0 ? (
            <p className="text-[11.5px] text-regantify-text-muted">No product selected yet.</p>
          ) : (
            products.map((p) => (
              <div key={p.id} className="mb-1.5 flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[11.5px] text-regantify-text">{p.name}</span>
                <span className="shrink-0 text-[11.5px] text-regantify-text">
                  ৳ {Number(p.discountPrice ?? p.price).toLocaleString()}
                </span>
              </div>
            ))
          )}
          <div className="mt-2 flex items-center justify-between border-t border-black/10 pt-2">
            <span className="text-[12px] font-semibold text-regantify-text">Total</span>
            <span className="text-[12px] font-semibold text-regantify-text">৳ {total.toLocaleString()}</span>
          </div>
          <span className="mt-2 block text-[11px] text-regantify-text-muted">
            {props.codOnly === false ? 'Cash on Delivery / Online Payment' : 'Cash on Delivery'}
          </span>
          <span className="mt-2 block rounded-md bg-regantify-black py-2 text-center text-[12px] font-semibold text-white">
            Place Order
          </span>
        </div>
      </div>
    </div>
  );
}

function LeadFormPreview({ props }: { props: LeadFormProps }) {
  const collect = props.collectFields ?? { name: true, phone: true, email: false };
  return (
    <div className="px-6 py-5">
      <div className="mx-auto flex max-w-sm flex-col gap-2.5">
        <FakeInput label="নাম" required />
        <FakeInput label="মোবাইল" required />
        {collect.email && <FakeInput label="Email" />}
        <span className="mt-1 block rounded-md bg-regantify-cta py-2 text-center text-[12px] font-semibold text-white">
          Submit
        </span>
      </div>
    </div>
  );
}
