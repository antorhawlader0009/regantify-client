import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Star, X } from 'lucide-react';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';
import { SectionCard, Field, productInputClass } from '../../../components/product/ProductFormPieces';
import { SaveBar, useUnsavedChangesWarning } from '../../../components/product/ProductFormKit';
import { ReviewReplyCard } from './ReviewReplyCard';
import { outlineBtn } from '../../../components/ui/PageKit';
import { reviewsApi } from '../../../lib/reviewsApi';
import { ordersApi, type Order } from '../../../lib/ordersApi';
import { apiErrorMessage } from '../../../lib/api';
import { toLatinDigits } from '../../../lib/bdPhone';
import { toast } from '../../../lib/toast';
import { FormHeader, ProductPicker, toLocalInput, type PickedItem } from '../marketing/MarketingKit';

interface PhotoState {
  previewUrl: string;
  uploadedUrl?: string;
  uploading: boolean;
  error?: string;
}

const MAX_PHOTOS = 6;
const RATING_WORDS = ['', 'Very bad', 'Bad', 'Okay', 'Good', 'Excellent'];

/** Five tappable stars (40px targets), with the word for the rating. */
export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const shown = hover ?? value;
  return (
    <div className="flex items-center gap-2">
      <div role="radiogroup" aria-label="Rating" className="flex" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className="flex h-10 w-9 items-center justify-center"
          >
            <Star size={24} className={n <= shown ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'} aria-hidden />
          </button>
        ))}
      </div>
      <span className="text-sm text-neutral-600">{RATING_WORDS[shown]}</span>
    </div>
  );
}

/**
 * Reviews > "+ Add New" (and Edit, via the :id param). The review itself
 * (title, text, stars, date), photos, what it's about (an order and/or
 * products), and who wrote it. Linking an order fills in the customer's
 * details. See Review model's schema comment for why the customer is
 * free text, not a Customer relation.
 */
export default function AddReview() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing, isLoading } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => reviewsApi.findOne(id!),
    enabled: isEdit,
  });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [rating, setRating] = useState(5);
  const [date, setDate] = useState(''); // datetime-local string; blank = now, on create
  const [photos, setPhotos] = useState<PhotoState[]>([]);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [orderQuery, setOrderQuery] = useState('');
  const [orderFocused, setOrderFocused] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [products, setProducts] = useState<PickedItem[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // One-time fill once the existing review arrives.
  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setContent(existing.content ?? '');
    setRating(existing.rating);
    setDate(toLocalInput(existing.createdAt));
    setPhotos(existing.photos.map((url) => ({ previewUrl: url, uploadedUrl: url, uploading: false })));
    setProducts(existing.products.map((p) => ({ id: p.id, label: p.name, photoUrl: p.photoUrls[0] ?? null })));
    setCustomerName(existing.customerName ?? '');
    setCustomerEmail(existing.customerEmail ?? '');
    setCustomerPhone(existing.customerPhone ?? '');
    if (existing.order) setOrderQuery(`ORDER-${existing.order.invoiceNumber}`);
  }, [existing]);

  const dirty = !saved && Boolean(isEdit ? existing && (title !== existing.title || content !== (existing.content ?? '') || rating !== existing.rating) : title || content);
  useUnsavedChangesWarning(Boolean(dirty));

  const { data: orderSearchResults } = useQuery({
    queryKey: ['orders-search', orderQuery],
    queryFn: () => ordersApi.list({ search: orderQuery.trim().replace(/^order-/i, ''), perPage: 8 }),
    enabled: orderQuery.trim().length > 0 && !selectedOrder,
  });
  const orderMatches = orderSearchResults?.orders ?? [];

  const selectOrder = (order: Order) => {
    setSelectedOrder(order);
    setOrderQuery(`ORDER-${order.invoiceNumber}`);
    setOrderFocused(false);
    // Fills only empty customer fields, so nothing typed is overwritten.
    setCustomerName((prev) => prev || order.customerName);
    setCustomerEmail((prev) => prev || order.customerEmail || '');
    setCustomerPhone((prev) => prev || order.customerPhone);
  };

  const handlePhotoSelect = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp|gif)$/.test(file.type)) {
      toast.error('Choose a JPG, PNG, WebP or GIF photo.');
      return;
    }
    if (photos.length >= MAX_PHOTOS) return;
    const previewUrl = URL.createObjectURL(file);
    const index = photos.length;
    setPhotos((prev) => [...prev, { previewUrl, uploading: true }]);
    reviewsApi
      .uploadPhoto(file)
      .then((res) => setPhotos((prev) => prev.map((p, i) => (i === index ? { previewUrl, uploadedUrl: res.url, uploading: false } : p))))
      .catch((err) =>
        setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, uploading: false, error: apiErrorMessage(err, 'Didn’t upload') } : p))),
      );
  };

  const errors = {
    title: !title.trim() ? 'Give the review a short title, e.g. “Great quality”.' : null,
    photos: photos.some((p) => p.uploading) ? 'Wait for the photos to finish uploading.' : null,
  };
  const valid = !errors.title && !errors.photos;

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: title.trim(),
        content: content || undefined,
        rating,
        date: date ? new Date(date).toISOString() : undefined,
        photoUrls: photos.filter((p) => p.uploadedUrl).map((p) => p.uploadedUrl!),
        orderId: selectedOrder?.id,
        productIds: products.map((p) => p.id),
        customerName: customerName.trim() || undefined,
        customerEmail: customerEmail.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
      };
      return isEdit ? reviewsApi.update(id!, payload) : reviewsApi.create(payload);
    },
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success(isEdit ? 'Review saved' : 'Review added');
      navigate('/vendor/reviews');
    },
    onError: (err: any) => {
      const message = err?.response?.data?.message;
      setFormError((Array.isArray(message) ? message[0] : message) ?? 'Couldn’t save this review. Check your connection and try again.');
    },
  });

  if (isEdit && isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4" aria-busy>
        <div className="h-12 w-48 animate-pulse rounded-lg bg-neutral-100" />
        <div className="h-64 animate-pulse rounded-xl bg-neutral-100" />
      </div>
    );
  }

  return (
    <form
      className="mx-auto max-w-3xl"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        setFormError(null);
        setSubmitted(true);
        if (valid) saveMutation.mutate();
      }}
    >
      <FormHeader
        backTo="/vendor/reviews"
        backLabel="Reviews"
        title={isEdit ? 'Edit review' : 'Add review'}
        description={isEdit ? 'Changes show on your store right away if the review is shown.' : 'A review you add is shown on your store straight away.'}
      />

      <div className="space-y-4">
        {isEdit && existing && <ReviewReplyCard review={existing} />}

        <SectionCard title="Review">
          <div className="space-y-4">
            <Field label="Stars" required>
              <StarPicker value={rating} onChange={setRating} />
            </Field>
            <Field label="Title" required error={submitted ? errors.title : null}>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Great quality, fast delivery" className={productInputClass} />
            </Field>
            <Field label="What they said">
              <RichTextEditor value={content} onChange={setContent} placeholder="The customer’s words" />
            </Field>
            <div className="sm:w-1/2 sm:pr-2">
              <Field label="Date" hint={isEdit ? undefined : 'Leave empty for right now.'}>
                <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className={productInputClass} />
              </Field>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Photos" description={`Up to ${MAX_PHOTOS}. Shown with the review.`}>
          <div className="flex flex-wrap gap-3">
            {photos.map((photo, i) => (
              <div key={i} className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border ${photo.error ? 'border-red-300' : 'border-line'}`}>
                <img src={photo.uploadedUrl ?? photo.previewUrl} alt="" className="h-full w-full object-cover" />
                {photo.uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  </div>
                )}
                {photo.error && <p className="absolute inset-x-0 bottom-0 bg-red-600/90 px-1 py-0.5 text-center text-[10px] text-white">{photo.error}</p>}
                <button
                  type="button"
                  onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                  aria-label="Remove photo"
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                >
                  <X size={13} />
                </button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="flex h-24 w-24 shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-xs text-neutral-500 hover:border-brand"
              >
                <ImagePlus size={20} aria-hidden />
                Add photo
              </button>
            )}
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={(e) => {
              handlePhotoSelect(e.target.files?.[0]);
              e.target.value = '';
            }}
            className="hidden"
          />
          {submitted && errors.photos && <p className="mt-2 text-xs text-red-600">{errors.photos}</p>}
        </SectionCard>

        <SectionCard title="What it’s about" description="Link the order and products so the review shows on those product pages.">
          <div className="space-y-4">
            <Field label="Order" hint="Optional. Fills in the customer below.">
              <div className="relative">
                <input
                  type="text"
                  value={orderQuery}
                  onChange={(e) => {
                    setOrderQuery(e.target.value);
                    if (selectedOrder) setSelectedOrder(null);
                  }}
                  onFocus={() => setOrderFocused(true)}
                  onBlur={() => setTimeout(() => setOrderFocused(false), 150)}
                  placeholder="Search invoice, name or phone"
                  className={productInputClass}
                />
                {selectedOrder && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOrder(null);
                      setOrderQuery('');
                    }}
                    aria-label="Unlink order"
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-neutral-500 hover:text-red-600"
                  >
                    <X size={15} />
                  </button>
                )}
                {orderFocused && !selectedOrder && orderMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-56 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-lg">
                    {orderMatches.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onMouseDown={() => selectOrder(o)}
                        className="flex min-h-10 w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-sm text-regantify-text hover:bg-neutral-50"
                      >
                        <span className="font-medium">ORDER-{o.invoiceNumber}</span>
                        <span className="truncate text-xs text-neutral-500">
                          {o.customerName} · {o.customerPhone}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            <ProductPicker selected={products} onChange={setProducts} />
          </div>
        </SectionCard>

        <SectionCard title="Who wrote it">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" hint="Shown on the review.">
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Nusrat J." className={productInputClass} />
            </Field>
            <Field label="Phone" hint="Only you see this.">
              <input type="text" inputMode="tel" value={customerPhone} onChange={(e) => setCustomerPhone(toLatinDigits(e.target.value))} placeholder="Optional" className={productInputClass} />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Email" hint="Only you see this.">
                <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Optional" className={productInputClass} />
              </Field>
            </div>
          </div>
        </SectionCard>
      </div>

      <SaveBar
        message={formError ? <span className="text-red-600">{formError}</span> : submitted && !valid ? <span className="text-red-600">Fix the fields marked in red.</span> : undefined}
      >
        <Link to="/vendor/reviews" className={`${outlineBtn} h-10`}>
          Cancel
        </Link>
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="inline-flex h-10 items-center rounded-lg bg-brand px-4 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving…' : isEdit ? 'Save review' : 'Add review'}
        </button>
      </SaveBar>
    </form>
  );
}
