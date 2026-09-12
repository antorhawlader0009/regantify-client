import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Search, X, ImagePlus } from 'lucide-react';
import { RichTextEditor } from '../../../components/editor/RichTextEditor';
import { SectionCard, Field, inputClass } from '../../../components/product/ProductFormPieces';
import { reviewsApi } from '../../../lib/reviewsApi';
import { ordersApi, type Order } from '../../../lib/ordersApi';
import { productsApi, type Product } from '../../../lib/productsApi';
import { toast } from '../../../lib/toast';

interface PhotoState {
  previewUrl: string;
  uploadedUrl?: string;
  uploading: boolean;
  error?: string;
}

/**
 * Reviews > "+ Add New" (and Edit, via the :id param — same page, same
 * shape as AddCollection.tsx) — matches the reference Add Review form
 * field-for-field: Review Content (Title, rich-text Content, Rating,
 * Date), Review Photos, Order & Product Information (search-to-link,
 * same autocomplete pattern as AddCollection's product search), and
 * free-text Customer Information (see Review model's schema comment
 * for why this isn't a Customer relation).
 */
export default function AddReview() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: existing } = useQuery({
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

  const [productQuery, setProductQuery] = useState('');
  const [productFocused, setProductFocused] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  // Fills the form once the existing review arrives — a plain one-time
  // fill, not a controlled sync (same pattern as EditCustomer.tsx).
  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setContent(existing.content ?? '');
    setRating(existing.rating);
    setPhotos(existing.photos.map((url) => ({ previewUrl: url, uploadedUrl: url, uploading: false })));
    setSelectedProducts(
      existing.products.map((p) => ({ id: p.id, name: p.name, photoUrls: p.photoUrls }) as Product),
    );
    setCustomerName(existing.customerName ?? '');
    setCustomerEmail(existing.customerEmail ?? '');
    setCustomerPhone(existing.customerPhone ?? '');
    if (existing.order) {
      setOrderQuery(`ORDER-${existing.order.invoiceNumber}`);
    }
  }, [existing]);

  const { data: orderSearchResults } = useQuery({
    queryKey: ['orders-search', orderQuery],
    queryFn: () => ordersApi.list({ search: orderQuery.trim(), perPage: 8 }),
    enabled: orderQuery.trim().length > 0 && !selectedOrder,
  });
  const orderMatches = orderSearchResults?.orders ?? [];

  const { data: productSearchResults } = useQuery({
    queryKey: ['products-search', productQuery],
    queryFn: () => productsApi.list({ search: productQuery.trim(), perPage: 8 }),
    enabled: productQuery.trim().length > 0,
  });
  const productMatches = useMemo(
    () => (productSearchResults?.products ?? []).filter((p) => !selectedProducts.some((sp) => sp.id === p.id)),
    [productSearchResults, selectedProducts],
  );

  const selectOrder = (order: Order) => {
    setSelectedOrder(order);
    setOrderQuery(`ORDER-${order.invoiceNumber}`);
    setOrderFocused(false);
    // Prefills Customer Information from the order — still fully
    // editable, and only fills in blank fields so it never clobbers
    // something already typed.
    setCustomerName((prev) => prev || order.customerName);
    setCustomerEmail((prev) => prev || order.customerEmail || '');
    setCustomerPhone((prev) => prev || order.customerPhone);
  };

  const clearOrder = () => {
    setSelectedOrder(null);
    setOrderQuery('');
  };

  const addProduct = (product: Product) => {
    setSelectedProducts((prev) => [...prev, product]);
    setProductQuery('');
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((p) => p.id !== productId));
  };

  const handlePhotoSelect = (file: File | undefined) => {
    if (!file) return;
    if (!/^image\/(jpe?g|png|webp|gif)$/.test(file.type)) return;
    if (photos.length >= 6) return;

    const previewUrl = URL.createObjectURL(file);
    const index = photos.length;
    setPhotos((prev) => [...prev, { previewUrl, uploading: true }]);

    reviewsApi
      .uploadPhoto(file)
      .then((res) =>
        setPhotos((prev) => prev.map((p, i) => (i === index ? { previewUrl, uploadedUrl: res.url, uploading: false } : p))),
      )
      .catch(() => setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, uploading: false, error: 'Upload failed' } : p))));
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  function buildPayload() {
    return {
      title: title.trim(),
      content: content || undefined,
      rating,
      date: date ? new Date(date).toISOString() : undefined,
      photoUrls: photos.filter((p) => p.uploadedUrl).map((p) => p.uploadedUrl!),
      orderId: selectedOrder?.id,
      productIds: selectedProducts.map((p) => p.id),
      customerName: customerName.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
    };
  }

  const saveMutation = useMutation({
    mutationFn: () => (isEdit ? reviewsApi.update(id!, buildPayload()) : reviewsApi.create(buildPayload())),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success(isEdit ? 'Review updated.' : 'Review created.');
      navigate('/vendor/reviews');
    },
    onError: (err: any) => {
      setFormError(err?.response?.data?.message ?? 'Could not save this review. Please try again.');
    },
  });

  const handleSubmit = () => {
    setFormError(null);
    if (!title.trim()) {
      setFormError('Review title is required.');
      return;
    }
    if (photos.some((p) => p.uploading)) {
      setFormError('Please wait for all photos to finish uploading.');
      return;
    }
    saveMutation.mutate();
  };

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate('/vendor/reviews')}
        className="flex items-center gap-1 text-sm text-regantify-text-muted hover:text-regantify-text mb-3"
      >
        <ChevronLeft size={16} />
        Reviews
      </button>

      <h1 className="text-2xl font-semibold text-regantify-text mb-6">{isEdit ? 'Edit Review' : 'Add Review'}</h1>

      <div className="space-y-6">
        <SectionCard title="Review Content">
          <div className="space-y-5">
            <Field label="Title" required>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Review Title"
                className={inputClass}
              />
              {formError === 'Review title is required.' && <p className="text-red-500 text-xs mt-1">Review title is required.</p>}
            </Field>

            <Field label="Review Content">
              <RichTextEditor value={content} onChange={setContent} placeholder="Enter text here..." />
            </Field>

            <Field label="Rating" required>
              <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className={inputClass}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Date" hint="Defaults to right now if left blank">
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Review Photos">
          <div className="flex flex-wrap gap-3">
            {photos.map((photo, i) => (
              <div key={i} className="relative w-24 h-24 rounded-xl overflow-hidden border border-black/10 shrink-0">
                <img src={photo.uploadedUrl ?? photo.previewUrl} alt="" className="w-full h-full object-cover" />
                {photo.uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
            {photos.length < 6 && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="w-24 h-24 rounded-xl border-2 border-dashed border-black/15 bg-regantify-content
                  flex items-center justify-center hover:border-black/25 shrink-0"
              >
                <ImagePlus size={20} className="text-regantify-text-muted" />
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
        </SectionCard>

        <SectionCard title="Order & Product Information">
          <div className="space-y-5">
            <Field label="Order">
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
                  placeholder="Search Order"
                  className={inputClass}
                />
                {selectedOrder && (
                  <button
                    type="button"
                    onClick={clearOrder}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-regantify-text-muted hover:text-red-600"
                  >
                    <X size={14} />
                  </button>
                )}
                {orderFocused && !selectedOrder && orderMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 bg-white rounded-xl shadow-lg border border-black/10 max-h-48 overflow-y-auto py-1">
                    {orderMatches.map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        onMouseDown={() => selectOrder(o)}
                        className="w-full text-left px-3.5 py-2 text-sm text-regantify-text hover:bg-regantify-content flex items-center justify-between gap-2"
                      >
                        <span className="font-medium">ORDER-{o.invoiceNumber}</span>
                        <span className="text-xs text-regantify-text-muted truncate">{o.customerName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Field>

            <div>
              <p className="text-sm font-medium text-regantify-text mb-2">Products</p>
              <div className="space-y-2 mb-3">
                {selectedProducts.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 p-2 rounded-xl bg-regantify-content">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={p.photoUrls[0] ?? ''} alt="" className="w-8 h-8 rounded-lg object-cover bg-white shrink-0" />
                      <span className="text-sm text-regantify-text truncate">{p.name}</span>
                    </div>
                    <button type="button" onClick={() => removeProduct(p.id)} className="text-regantify-text-muted hover:text-red-600 shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-regantify-text-muted" size={16} />
                <input
                  type="text"
                  value={productQuery}
                  onChange={(e) => setProductQuery(e.target.value)}
                  onFocus={() => setProductFocused(true)}
                  onBlur={() => setTimeout(() => setProductFocused(false), 150)}
                  placeholder="Search products to add"
                  className={`${inputClass} pl-10`}
                />
                {productFocused && productMatches.length > 0 && (
                  <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-10 bg-white rounded-xl shadow-lg border border-black/10 max-h-56 overflow-y-auto py-1">
                    {productMatches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onMouseDown={() => addProduct(p)}
                        className="w-full text-left px-3.5 py-2 text-sm text-regantify-text hover:bg-regantify-content flex items-center gap-2.5"
                      >
                        <img src={p.photoUrls[0] ?? ''} alt="" className="w-6 h-6 rounded object-cover bg-regantify-content" />
                        <span className="truncate">{p.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Customer Information">
          <div className="space-y-5">
            <Field label="Name">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer Name"
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Customer Email"
                className={inputClass}
              />
            </Field>
            <Field label="Phone">
              <input
                type="text"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Customer Phone"
                className={inputClass}
              />
            </Field>
          </div>
        </SectionCard>

        {formError && formError !== 'Review title is required.' && <p className="text-red-500 text-sm">{formError}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="px-8 py-3 rounded-xl bg-regantify-cta hover:bg-regantify-cta-dark text-white font-medium transition-colors disabled:opacity-60"
        >
          {saveMutation.isPending ? 'Saving…' : isEdit ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );
}
