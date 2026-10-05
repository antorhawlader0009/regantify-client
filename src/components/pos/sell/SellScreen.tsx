import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, Banknote, CheckCircle2, CloudOff, MonitorSmartphone, RefreshCw, ClipboardList, HandCoins, Lock, MessageSquare, Minus, Pause, Percent, Plus, Printer, ScanBarcode, Search, Trash2, Undo2, User } from 'lucide-react';
import { useReceiptPrinter } from '../receipt/useReceiptPrinter';
import { cartTotals, lineAmounts, round2, toSaleLines, type CartLine } from './cartMath';
import { ReturnsDialog } from './ReturnsDialog';
import { CollectDueDialog } from './DueDialogs';
import { CashDialog } from './CashDialog';
import { CameraScanner } from './CameraScanner';
import { SyncListDialog } from './SyncListDialog';
import { useOfflineSync } from './useOfflineSync';
import { buildOfflineSale, offlineBlocker } from './offlineSale';
import { isNetworkError } from '../../../lib/posOffline';
import { restorePrinter } from '../../../lib/posHardware';
import { openCustomerDisplay, openDisplayChannel, type DisplayMessage } from '../../../lib/posDisplay';
import { approvalCovers, CartDiscountDialog, HeldCartsDialog, HoldDialog, LineEditDialog, ManagerApprovalDialog } from './CounterDialogs';
import {
  posApi,
  TENDER_LABEL,
  type PosCatalogProduct,
  type PosDiscount,
  type PosReceipt,
  type PosSettings,
  type PosTender,
  type PosTenderInput,
  type PosUnlock,
} from '../../../lib/posApi';
import { newClientSaleId } from '../../../lib/posCounter';
import { apiErrorMessage } from '../../../lib/api';
import { toast } from '../../../lib/toast';
import { Field, PosButton, PosDialog, PosInput, taka } from '../ui';
import { useBarcodeScanner } from './useBarcodeScanner';
import { usePosCatalog } from './usePosCatalog';

/*
 * The sell screen (POS-system-plan.md Step 4): find or scan, build the
 * cart, take cash, done. Prices and stock come from the catalog the server
 * worked out (pos-pricing.ts); the server works the sale out again and is
 * what's charged. Keyboard: F2 search, F4 customer, F8 pay, Esc clears.
 */


const optionText = (values: Record<string, string>) => Object.values(values).join(' / ');

function errorCode(err: unknown): string | undefined {
  return (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
}

export function SellScreen({
  storeName,
  registerId,
  registerName,
  sessionId,
  unlock,
  settings,
  onLock,
  onRegisterClosed,
}: {
  storeName: string;
  registerId: string;
  registerName: string;
  sessionId: string;
  unlock: PosUnlock;
  settings: PosSettings | undefined;
  onLock: () => void;
  onRegisterClosed: () => void;
}) {
  const catalog = usePosCatalog();
  // Step 13: selling on with no internet; offline sales wait here and go in order when it's back.
  const sync = useOfflineSync(unlock.token, () => catalog.refresh());
  const offline = !sync.online;
  const [syncListOpen, setSyncListOpen] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [picking, setPicking] = useState<PosCatalogProduct | null>(null);
  const [paying, setPaying] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [customer, setCustomer] = useState({ name: '', phone: '' });
  const [done, setDone] = useState<PosReceipt | null>(null);
  // One id per sale, kept across retries so a timeout never makes two sales.
  const [clientSaleId, setClientSaleId] = useState(newClientSaleId);
  const searchRef = useRef<HTMLInputElement>(null);

  // Step 7: discounts, coupon, a manager's approval, parked carts.
  const [editing, setEditing] = useState<CartLine | null>(null);
  const [cartDiscount, setCartDiscount] = useState<PosDiscount | undefined>();
  const [discountOpen, setDiscountOpen] = useState(false);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [approvalAsk, setApprovalAsk] = useState<{ discountPercent: number; priceOverride: boolean } | null>(null);
  const [approval, setApproval] = useState<{ id: string; managerName: string; at: number; discountPercent: number; priceOverride: boolean } | null>(null);
  const [holdOpen, setHoldOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  // Step 8: returns, and the store credit an exchange brings to the next sale.
  const [returnsOpen, setReturnsOpen] = useState(false);
  const [exchangeCredit, setExchangeCredit] = useState<{ code: string; amount: number } | null>(null);
  // Step 9: a customer paying back their due.
  const [dueOpen, setDueOpen] = useState(false);
  // Step 10: pay in / pay out / no sale, and the X report.
  const [cashOpen, setCashOpen] = useState(false);
  // Step 12: camera scanning, and what the customer screen shows.
  const [cameraOpen, setCameraOpen] = useState(false);
  const [payQr, setPayQr] = useState(false);
  const display = useRef<ReturnType<typeof openDisplayChannel> | null>(null);
  const displayState = useRef<DisplayMessage>({ type: 'idle', storeName });

  // A printer picked on this counter before reconnects by itself (Serial/USB remember the permission).
  useEffect(() => {
    void restorePrinter();
  }, []);

  // The customer screen: it says "hello" when it opens, and gets what's on screen now.
  useEffect(() => {
    const channel = openDisplayChannel((m) => {
      if (m.type === 'hello') channel.send(displayState.current);
    });
    display.current = channel;
    return () => channel.close();
  }, []);

  const totals = cartTotals(cart, settings, cartDiscount, couponCode ? couponDiscount : 0);
  const isManager = unlock.cashier.role === 'MANAGER';
  const canChangePrice = isManager || unlock.cashier.canOverridePrice;
  const products = useMemo(() => [...catalog.products.values()], [catalog.products]);
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter((c): c is string => !!c))].sort(), [products]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (category && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode === query.trim() ||
        p.variants.some((v) => v.sku.toLowerCase() === q || v.barcode === query.trim())
      );
    });
  }, [products, query, category]);

  const focusSearch = () => searchRef.current?.focus();

  function addLine(product: PosCatalogProduct, variantId: string | null) {
    if (product.variants.length > 0 && !variantId) {
      setPicking(product);
      return;
    }
    const variant = variantId ? product.variants.find((v) => v.id === variantId) : undefined;
    const stock = product.isPreOrder ? null : variant ? variant.stock : product.stock;
    const key = `${product.id}:${variantId ?? ''}`;
    const inCart = cart.find((l) => l.key === key)?.quantity ?? 0;
    if (settings?.blockOutOfStock && stock !== null && inCart + 1 > stock) {
      toast.error(stock <= 0 ? `${product.name} is out of stock.` : `Only ${stock} of ${product.name} in stock.`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + 1 } : l));
      return [
        ...prev,
        {
          key,
          productId: product.id,
          variantId,
          name: product.name,
          options: variant ? optionText(variant.optionValues) : '',
          price: variant ? variant.price : product.price,
          listPrice: variant ? variant.listPrice : product.listPrice,
          quantity: 1,
          stock,
        },
      ];
    });
  }

  /** A scanned or typed code: the catalog first (instant), then the server (a product added a minute ago). */
  async function addByCode(raw: string) {
    const code = raw.trim();
    if (!code) return;
    const lower = code.toLowerCase();
    for (const p of products) {
      if (p.barcode === code) return addLine(p, null);
      const v = p.variants.find((x) => x.barcode === code);
      if (v) return addLine(p, v.id);
    }
    for (const p of products) {
      if (p.sku.toLowerCase() === lower) return addLine(p, null);
      const v = p.variants.find((x) => x.sku.toLowerCase() === lower);
      if (v) return addLine(p, v.id);
    }
    try {
      const found = await posApi.lookup(code);
      catalog.put(found.product);
      addLine(found.product, found.variantId);
    } catch (err) {
      toast.error(apiErrorMessage(err, `Nothing found for "${code}".`));
    }
  }

  function onSearchSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    const exact = products.some((p) => p.barcode === q || p.sku.toLowerCase() === q.toLowerCase() || p.variants.some((v) => v.barcode === q || v.sku.toLowerCase() === q.toLowerCase()));
    if (!exact && visible.length === 1) addLine(visible[0], null);
    else void addByCode(q);
    setQuery('');
  }

  // A coupon's amount comes from the server: asked again whenever the cart or its discount changes.
  const quoteKey = JSON.stringify([toSaleLines(cart), cartDiscount, couponCode, customer.phone.trim()]);
  useEffect(() => {
    if (!couponCode || cart.length === 0) {
      setCouponDiscount(0);
      return;
    }
    const timer = setTimeout(() => {
      posApi
        .quote({ lines: toSaleLines(cart), cartDiscount, couponCode, customer: customer.phone.trim() ? { phone: customer.phone.trim() } : undefined }, unlock.token)
        .then((q) => setCouponDiscount(q.couponDiscount))
        .catch((err: unknown) => {
          toast.error(apiErrorMessage(err, 'That coupon can’t be used on this sale.'));
          setCouponCode(null);
          setCouponDiscount(0);
        });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey]);

  /** What this cart needs a manager for, if anything (the same rule the server checks). */
  const approvalNeed = (): { discountPercent: number; priceOverride: boolean } | null => {
    if (isManager) return null;
    const discount = totals.manualPercent > unlock.cashier.maxDiscountPercent + 0.005;
    const price = totals.priceChanged && !unlock.cashier.canOverridePrice;
    return discount || price ? { discountPercent: discount ? totals.manualPercent : 0, priceOverride: price } : null;
  };

  /** Pay (F8): a manager's PIN first when the cart needs one and there's no fresh approval covering it. */
  function startPay() {
    if (cart.length === 0) return;
    const need = approvalNeed();
    if (need && !approvalCovers(approval, need)) {
      setApprovalAsk(need);
      return;
    }
    setPaying(true);
  }

  const busy = paying || picking !== null || customerOpen || done !== null || editing !== null || discountOpen || approvalAsk !== null || holdOpen || heldOpen || returnsOpen || dueOpen || cashOpen || cameraOpen;

  // Keep the customer screen in step with the cart, the payment and the finished sale.
  const displayKey = JSON.stringify([done?.id, paying, payQr, totals.total, cart.map((l) => [l.key, l.quantity, lineAmounts(l).total])]);
  useEffect(() => {
    const msg: DisplayMessage = done
      ? { type: 'done', storeName, total: done.total, paid: done.payments.reduce((s, p) => s + (p.tendered ?? p.amount), 0), change: done.payments.find((p) => p.method === 'CASH')?.change ?? 0 }
      : paying
        ? { type: 'pay', storeName, total: totals.total, qrImageUrl: payQr ? (printer.profile?.banglaQrImageUrl ?? null) : null }
        : cart.length > 0
          ? {
              type: 'cart',
              storeName,
              lines: cart.map((l) => ({ name: l.name, options: l.options, quantity: l.quantity, total: lineAmounts(l).total })),
              discount: round2(totals.cartOff + totals.coupon),
              vat: totals.vat,
              vatIncluded: totals.vatIncluded,
              total: totals.total,
            }
          : { type: 'idle', storeName };
    displayState.current = msg;
    display.current?.send(msg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayKey]);
  useBarcodeScanner((code) => void addByCode(code), { enabled: !busy });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if (e.key === 'F2') {
        e.preventDefault();
        focusSearch();
      } else if (e.key === 'F4') {
        e.preventDefault();
        setCustomerOpen(true);
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (!busy) startPay();
      } else if (e.key === 'Escape' && !busy) {
        setQuery('');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const printer = useReceiptPrinter();
  const [lastReceipt, setLastReceipt] = useState<PosReceipt | null>(null);
  const [autoPrint, setAutoPrint] = useState(readAutoPrint);

  /** Keep a sale on this device and print its receipt now; it goes to the server when the internet is back (Step 13). */
  async function sellOffline(payments: PosTenderInput[]) {
    const blocked = offlineBlocker(cart, cartDiscount, couponCode, payments);
    if (blocked) throw Object.assign(new Error(blocked), { offlineBlock: true });
    const built = buildOfflineSale({ clientSaleId, sessionId, registerId, registerName, cashier: unlock.cashier, cart, totals, customer, payments });
    await sync.enqueue({ clientSaleId, sale: built.sale, receipt: built.receipt, queuedAt: built.receipt.createdAt });
    catalog.takeStock(cart.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })));
    return built.receipt;
  }

  const sale = useMutation({
    mutationFn: async (payments: PosTenderInput[]) => {
      if (offline) return sellOffline(payments);
      try {
        return await posApi.createSale(
        {
          clientSaleId,
          sessionId,
          lines: toSaleLines(cart),
          customer: customer.name.trim() || customer.phone.trim() ? { name: customer.name.trim() || undefined, phone: customer.phone.trim() || undefined } : undefined,
          cartDiscount,
          couponCode: couponCode ?? undefined,
          approvalId: approval && Date.now() - approval.at < 120_000 ? approval.id : undefined,
          payments,
        },
          unlock.token,
        );
      } catch (err) {
        // No answer at all (the internet dropped): keep it here. The same id makes it once even if it did arrive.
        if (isNetworkError(err)) {
          sync.markOffline();
          return sellOffline(payments);
        }
        throw err;
      }
    },
    onSuccess: (receipt) => {
      setPaying(false);
      setDone(receipt);
      setLastReceipt(receipt);
      catalog.refresh();
      if (autoPrint) printer.print(receipt);
    },
    onError: (err) => {
      if ((err as { offlineBlock?: boolean }).offlineBlock) {
        toast.error((err as Error).message);
        return;
      }
      const code = errorCode(err);
      if (code === 'POS_PIN_REQUIRED') {
        toast.error('Unlock the counter again to finish this sale.');
        onLock();
        return;
      }
      if (code === 'POS_APPROVAL_REQUIRED') {
        // The approval ran out (2 minutes) or the cart changed since: ask the manager again.
        const data = (err as { response?: { data?: { discountPercent?: number; priceOverride?: boolean } } }).response?.data;
        setApproval(null);
        setPaying(false);
        setApprovalAsk({ discountPercent: data?.discountPercent ?? totals.manualPercent, priceOverride: !!data?.priceOverride });
        return;
      }
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        toast.error(apiErrorMessage(err, 'This register is closed.'));
        onRegisterClosed();
        return;
      }
      // Anything else (a network drop too) keeps the cart and the sale id, so "Confirm" again is safe.
      toast.error(apiErrorMessage(err, 'The sale didn’t go through. Check the connection and try again.'));
    },
  });

  function newSale() {
    setDone(null);
    clearCart();
    setClientSaleId(newClientSaleId());
    setTimeout(focusSearch, 0);
  }

  function clearCart() {
    setCart([]);
    setCustomer({ name: '', phone: '' });
    setCartDiscount(undefined);
    setCouponCode(null);
    setCouponInput('');
    setCouponDiscount(0);
    setApproval(null);
    setExchangeCredit(null);
  }

  const hold = useMutation({
    mutationFn: (name: string) =>
      posApi.holdCart({ name, payload: { lines: cart, customer, cartDiscount: cartDiscount ?? null, couponCode }, itemCount: totals.items }, unlock.token),
    onSuccess: (held) => {
      toast.success(`"${held.name}" is on hold`);
      setHoldOpen(false);
      clearCart();
      setTimeout(focusSearch, 0);
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'The cart couldn’t be held. Try again.')),
  });

  /** A held cart back on screen. Prices are worked out again when it's sold. */
  function resumeCart(name: string, payload: Record<string, unknown>) {
    const p = payload as { lines?: CartLine[]; customer?: { name: string; phone: string }; cartDiscount?: PosDiscount | null; couponCode?: string | null };
    setCart(Array.isArray(p.lines) ? p.lines : []);
    setCustomer(p.customer ?? { name: '', phone: '' });
    setCartDiscount(p.cartDiscount ?? undefined);
    setCouponCode(p.couponCode ?? null);
    setCouponInput(p.couponCode ?? '');
    setHeldOpen(false);
    toast.success(`Back on screen: "${name}"`);
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-pos-line bg-pos-surface px-3 sm:px-5">
        <Link to="/vendor/pos/registers" className="rounded-md p-2 text-pos-muted hover:bg-pos-page hover:text-pos-ink" aria-label="Back to the dashboard">
          <ArrowLeft size={18} />
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{storeName}</p>
          <p className="truncate text-xs text-pos-muted">
            {registerName} · {unlock.cashier.displayName}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-1">
          {(offline || sync.waiting.length > 0 || sync.failed.length > 0) && (
            <button
              type="button"
              onClick={() => setSyncListOpen(true)}
              className={`inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium ${sync.failed.length > 0 ? 'bg-red-50 text-pos-alert' : offline ? 'bg-amber-50 text-amber-800' : 'bg-pos-page text-pos-ink'}`}
            >
              {offline ? <CloudOff size={14} aria-hidden /> : <RefreshCw size={14} className={sync.syncing ? 'animate-spin' : ''} aria-hidden />}
              {offline ? 'Offline' : 'Sending'}
              {sync.waiting.length > 0 && ` · ${sync.waiting.length} waiting`}
              {sync.failed.length > 0 && ` · ${sync.failed.length} refused`}
            </button>
          )}
          <PosButton variant="quiet" className="h-9" onClick={() => setReturnsOpen(true)} disabled={offline} title={offline ? 'Needs the internet' : undefined}>
            <Undo2 size={15} aria-hidden />
            <span className="hidden sm:inline">Returns</span>
          </PosButton>
          {printer.profile?.paymentMethods.includes('DUE') && (
            <PosButton variant="quiet" className="h-9" onClick={() => setDueOpen(true)} disabled={offline} title={offline ? 'Needs the internet' : undefined}>
              <HandCoins size={15} aria-hidden />
              <span className="hidden sm:inline">Collect due</span>
            </PosButton>
          )}
          <PosButton variant="quiet" className="h-9" onClick={() => openCustomerDisplay() || toast.error('The browser blocked the new window. Allow pop-ups for this site.')} title="Open the customer screen in a new window (drag it to the second monitor)">
            <MonitorSmartphone size={15} aria-hidden />
            <span className="hidden xl:inline">Customer screen</span>
          </PosButton>
          <PosButton variant="quiet" className="h-9" onClick={() => setCashOpen(true)} disabled={offline} title={offline ? 'Needs the internet' : undefined}>
            <Banknote size={15} aria-hidden />
            <span className="hidden sm:inline">Cash</span>
          </PosButton>
          <PosButton variant="quiet" className="h-9" onClick={() => setHeldOpen(true)} disabled={offline} title={offline ? 'Needs the internet' : undefined}>
            <ClipboardList size={15} aria-hidden />
            <span className="hidden sm:inline">On hold</span>
          </PosButton>
          {lastReceipt && (
            <PosButton variant="quiet" className="h-9" onClick={() => printer.print(lastReceipt)} disabled={printer.printing}>
              <Printer size={15} aria-hidden />
              <span className="hidden sm:inline">Reprint last</span>
            </PosButton>
          )}
        </div>
        <PosButton
          variant="secondary"
          className="h-9"
          onClick={() => {
            // Unlocking checks the PIN on the server, so locking offline would shut the counter until it's back.
            if (offline) toast.error('You’re offline. Unlocking again needs the internet, so the counter stays with you for now.');
            else onLock();
          }}
        >
          <Lock size={15} aria-hidden />
          Lock
        </PosButton>
      </header>

      {/* Two columns from a 10" tablet held upright (768px) up; the cart narrower until a laptop. */}
      <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(0,1fr)_340px] lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* Products */}
        <section className="flex min-h-0 flex-col">
          <form onSubmit={onSearchSubmit} className="shrink-0 border-b border-pos-line bg-pos-surface p-3">
            <label className="relative block">
              <span className="sr-only">Search or scan</span>
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pos-muted" aria-hidden />
              <input
                ref={searchRef}
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Scan a barcode, or search by name or SKU (F2)"
                autoComplete="off"
                spellCheck={false}
                className="h-12 w-full rounded-lg border border-pos-line bg-pos-page pl-10 pr-10 text-base outline-none focus:border-pos-ink"
              />
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-pos-muted hover:bg-pos-surface hover:text-pos-ink"
                aria-label="Scan with the camera"
                title="Scan with the camera"
              >
                <ScanBarcode size={18} aria-hidden />
              </button>
            </label>
            {categories.length > 0 && (
              <div className="mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
                {[null, ...categories].map((c) => (
                  <button
                    key={c ?? 'all'}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`h-8 shrink-0 rounded-full border px-3 text-xs ${category === c ? 'border-pos-ink bg-pos-ink text-white' : 'border-pos-line bg-pos-surface text-pos-ink'}`}
                  >
                    {c ?? 'All'}
                  </button>
                ))}
              </div>
            )}
          </form>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {catalog.status === 'loading' && <p className="text-sm text-pos-muted">Loading products…</p>}
            {catalog.status === 'error' && (
              <p className="text-sm">
                Products couldn't load.{' '}
                <button type="button" className="font-medium underline" onClick={catalog.retry}>
                  Try again
                </button>
              </p>
            )}
            {catalog.status === 'ready' && visible.length === 0 && <p className="text-sm text-pos-muted">No products match.</p>}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {visible.slice(0, 120).map((p) => (
                <ProductTile key={p.id} product={p} onPick={() => addLine(p, null)} />
              ))}
            </div>
            {visible.length > 120 && <p className="mt-3 text-center text-xs text-pos-muted">Showing 120 of {visible.length}. Search to narrow it down.</p>}
          </div>
        </section>

        {/* Cart */}
        <aside className="flex min-h-0 flex-col border-t border-pos-line bg-pos-surface md:border-l md:border-t-0">
          <div className="flex shrink-0 items-center justify-between border-b border-pos-line px-4 py-3">
            <h2 className="text-sm font-semibold">
              Cart {totals.items > 0 && <span className="font-normal text-pos-muted">· {totals.items} item{totals.items === 1 ? '' : 's'}</span>}
            </h2>
            <button type="button" onClick={() => setCustomerOpen(true)} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm hover:bg-pos-page">
              <User size={15} aria-hidden />
              {customer.name.trim() || customer.phone.trim() || 'Walk-in customer'}
            </button>
          </div>

          <ul className="min-h-[8rem] flex-1 divide-y divide-pos-line overflow-y-auto">
            {cart.length === 0 && <li className="px-4 py-8 text-center text-sm text-pos-muted">Scan or tap a product to start a sale.</li>}
            {cart.map((l) => {
              const over = l.stock !== null && l.quantity > l.stock;
              const amounts = lineAmounts(l);
              const changed = amounts.total !== amounts.regularTotal;
              return (
                <li key={l.key} className="px-4 py-3">
                  {/* Tap the line to change its quantity, price or discount. */}
                  <button type="button" onClick={() => setEditing(l)} className="flex w-full items-start justify-between gap-3 text-left">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{l.name}</p>
                      {l.options && <p className="truncate text-xs text-pos-muted">{l.options}</p>}
                      <p className="text-xs text-pos-muted">
                        {taka(amounts.unit)}
                        {(changed || l.listPrice > l.price) && <span className="ml-1 line-through">{taka(changed ? l.price : l.listPrice)}</span>}
                        {l.discount && <span className="ml-1.5 text-pos-go">{l.discount.type === 'PERCENT' ? `${l.discount.value}% off` : `৳${l.discount.value} off`}</span>}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">{taka(amounts.total)}</p>
                  </button>
                  <div className="mt-2 flex items-center gap-2">
                    <QtyButton label="One less" onClick={() => setCart((prev) => prev.flatMap((x) => (x.key !== l.key ? [x] : x.quantity > 1 ? [{ ...x, quantity: x.quantity - 1 }] : [])))}>
                      <Minus size={15} />
                    </QtyButton>
                    <span className="w-8 text-center text-sm tabular-nums">{l.quantity}</span>
                    <QtyButton
                      label="One more"
                      onClick={() => {
                        if (settings?.blockOutOfStock && l.stock !== null && l.quantity + 1 > l.stock) {
                          toast.error(`Only ${l.stock} of ${l.name} in stock.`);
                          return;
                        }
                        setCart((prev) => prev.map((x) => (x.key === l.key ? { ...x, quantity: x.quantity + 1 } : x)));
                      }}
                    >
                      <Plus size={15} />
                    </QtyButton>
                    {over && <span className="text-xs text-amber-700">Only {Math.max(l.stock ?? 0, 0)} in stock</span>}
                    <button type="button" onClick={() => setCart((prev) => prev.filter((x) => x.key !== l.key))} className="ml-auto rounded-md p-1.5 text-pos-muted hover:text-pos-alert" aria-label={`Remove ${l.name}`}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="shrink-0 border-t border-pos-line p-4">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-pos-muted">Subtotal</dt>
                <dd className="tabular-nums">{taka(totals.subtotal)}</dd>
              </div>
              {totals.cartOff > 0 && (
                <div className="flex justify-between text-pos-go">
                  <dt>Discount{cartDiscount?.type === 'PERCENT' ? ` ${cartDiscount.value}%` : ''}</dt>
                  <dd className="tabular-nums">-{taka(totals.cartOff)}</dd>
                </div>
              )}
              {couponCode && (
                <div className="flex justify-between text-pos-go">
                  <dt>
                    Coupon {couponCode}{' '}
                    <button
                      type="button"
                      className="text-xs text-pos-muted underline"
                      onClick={() => {
                        setCouponCode(null);
                        setCouponInput('');
                      }}
                    >
                      remove
                    </button>
                  </dt>
                  <dd className="tabular-nums">-{taka(totals.coupon)}</dd>
                </div>
              )}
              {totals.vat > 0 && (
                <div className="flex justify-between">
                  <dt className="text-pos-muted">{totals.vatIncluded ? 'Includes VAT' : `VAT ${settings?.vatPercent}%`}</dt>
                  <dd className="tabular-nums">{taka(totals.vat)}</dd>
                </div>
              )}
              <div className="flex justify-between pt-1 text-lg font-semibold">
                <dt>Total</dt>
                <dd className="tabular-nums">{taka(totals.total)}</dd>
              </div>
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              <PosButton className="h-9" onClick={() => setDiscountOpen(true)} disabled={cart.length === 0 || offline} title={offline ? 'Needs the internet' : undefined}>
                <Percent size={14} aria-hidden />
                Discount
              </PosButton>
              <PosButton className="h-9" onClick={() => setHoldOpen(true)} disabled={cart.length === 0 || offline} title={offline ? 'Needs the internet' : undefined}>
                <Pause size={14} aria-hidden />
                Hold
              </PosButton>
              {!couponCode && !offline && (
                <form
                  className="flex min-w-[10rem] flex-1 gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (couponInput.trim()) setCouponCode(couponInput.trim().toUpperCase());
                  }}
                >
                  <PosInput value={couponInput} onChange={(e) => setCouponInput(e.target.value)} placeholder="Coupon" aria-label="Coupon code" maxLength={40} className="h-9" disabled={cart.length === 0} />
                  <PosButton type="submit" className="h-9" disabled={!couponInput.trim() || cart.length === 0}>
                    Apply
                  </PosButton>
                </form>
              )}
            </div>
            {exchangeCredit && (
              <p className="mt-2 flex items-center justify-between gap-2 rounded-md bg-pos-page px-3 py-2 text-xs">
                <span>
                  Exchange: store credit {exchangeCredit.code} ({taka(exchangeCredit.amount)}) goes on this sale at Pay.
                </span>
                <button type="button" className="shrink-0 text-pos-muted underline" onClick={() => setExchangeCredit(null)}>
                  remove
                </button>
              </p>
            )}
            {approval && approvalCovers(approval, approvalNeed() ?? { discountPercent: 0, priceOverride: false }) && (
              <p className="mt-2 text-xs text-pos-go">Approved by {approval.managerName}</p>
            )}
            <div className="mt-3 flex gap-2">
              <PosButton className="h-12" onClick={clearCart} disabled={cart.length === 0}>
                Clear
              </PosButton>
              <PosButton variant="primary" className="h-12 flex-1 text-base" onClick={startPay} disabled={cart.length === 0}>
                Pay {cart.length > 0 && taka(totals.total)} <span className="text-xs font-normal opacity-80">(F8)</span>
              </PosButton>
            </div>
          </div>
        </aside>
      </div>

      {picking && (
        <VariantPicker
          product={picking}
          blockOutOfStock={!!settings?.blockOutOfStock}
          onPick={(variantId) => {
            const p = picking;
            setPicking(null);
            addLine(p, variantId);
            setTimeout(focusSearch, 0);
          }}
          onClose={() => {
            setPicking(null);
            setTimeout(focusSearch, 0);
          }}
        />
      )}
      {editing && (
        <LineEditDialog
          line={editing}
          canChangePrice={canChangePrice}
          quantityOnly={offline}
          onSave={(next) => {
            setCart((prev) => prev.map((x) => (x.key === next.key ? next : x)));
            setEditing(null);
          }}
          onRemove={() => {
            setCart((prev) => prev.filter((x) => x.key !== editing.key));
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
      {discountOpen && (
        <CartDiscountDialog
          value={cartDiscount}
          onSave={(d) => {
            setCartDiscount(d);
            setDiscountOpen(false);
          }}
          onClose={() => setDiscountOpen(false)}
        />
      )}
      {approvalAsk && (
        <ManagerApprovalDialog
          ask={approvalAsk}
          token={unlock.token}
          onApproved={(a) => {
            setApproval({ ...a, at: Date.now(), ...approvalAsk });
            setApprovalAsk(null);
            toast.success(`Approved by ${a.managerName}`);
            setPaying(true);
          }}
          onClose={() => setApprovalAsk(null)}
        />
      )}
      {holdOpen && <HoldDialog pending={hold.isPending} onHold={(name) => hold.mutate(name)} onClose={() => setHoldOpen(false)} />}
      {returnsOpen && (
        <ReturnsDialog
          unlock={unlock}
          sessionId={sessionId}
          onClose={() => {
            setReturnsOpen(false);
            catalog.refresh();
            setTimeout(focusSearch, 0);
          }}
          onExchange={(credit) => {
            setExchangeCredit(credit);
            toast.success('Now ring up the new items; the store credit is used at Pay.');
          }}
        />
      )}
      {syncListOpen && (
        <SyncListDialog
          online={sync.online}
          syncing={sync.syncing}
          waiting={sync.waiting}
          failed={sync.failed}
          onSync={() => void sync.sync()}
          onRetry={(id) => void sync.retry(id)}
          onReprint={(r) => printer.print(r)}
          onClose={() => setSyncListOpen(false)}
        />
      )}
      {cameraOpen && (
        <CameraScanner
          onCode={(code) => void addByCode(code)}
          onClose={() => {
            setCameraOpen(false);
            setTimeout(focusSearch, 0);
          }}
        />
      )}
      {cashOpen && (
        <CashDialog
          unlock={unlock}
          sessionId={sessionId}
          profile={printer.profile}
          onClose={() => {
            setCashOpen(false);
            setTimeout(focusSearch, 0);
          }}
        />
      )}
      {dueOpen && (
        <CollectDueDialog
          unlock={unlock}
          sessionId={sessionId}
          methods={printer.profile?.paymentMethods ?? ['CASH']}
          profile={printer.profile}
          onClose={() => {
            setDueOpen(false);
            setTimeout(focusSearch, 0);
          }}
        />
      )}
      {heldOpen && <HeldCartsDialog unlock={unlock} cartEmpty={cart.length === 0} onResume={resumeCart} onClose={() => setHeldOpen(false)} />}
      {paying && (
        <PayDialog
          total={totals.total}
          // Offline (Step 13): gift cards and due need the server.
          methods={(printer.profile?.paymentMethods ?? ['CASH']).filter((m) => !offline || (m !== 'GIFT_CARD' && m !== 'DUE'))}
          qrImageUrl={printer.profile?.banglaQrImageUrl ?? null}
          giftCredit={exchangeCredit}
          customer={customer}
          token={unlock.token}
          onQrShown={setPayQr}
          pending={sale.isPending}
          onConfirm={(payments) => sale.mutate(payments)}
          onClose={() => !sale.isPending && setPaying(false)}
        />
      )}
      {customerOpen && (
        <CustomerDialog
          value={customer}
          onSave={(v) => {
            setCustomer(v);
            setCustomerOpen(false);
            setTimeout(focusSearch, 0);
          }}
          onClose={() => setCustomerOpen(false)}
        />
      )}
      {done && (
        <SaleDone
          receipt={done}
          onNext={newSale}
          onPrint={() => printer.print(done)}
          printing={printer.printing}
          autoPrint={autoPrint}
          onAutoPrint={(on) => {
            setAutoPrint(on);
            writeAutoPrint(on);
          }}
          smsReceipt={!!printer.profile?.smsReceipt}
          token={unlock.token}
        />
      )}
      {printer.element}
    </div>
  );
}

function QtyButton({ children, onClick, label }: { children: React.ReactNode; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex h-8 w-8 items-center justify-center rounded-md border border-pos-line hover:bg-pos-page">
      {children}
    </button>
  );
}

function stockLabel(stock: number | null, isPreOrder: boolean) {
  if (isPreOrder || stock === null) return null;
  if (stock <= 0) return <span className="text-pos-alert">Out of stock</span>;
  return <span>{stock} in stock</span>;
}

function ProductTile({ product, onPick }: { product: PosCatalogProduct; onPick: () => void }) {
  const hasVariants = product.variants.length > 0;
  const prices = hasVariants ? product.variants.map((v) => v.price) : [product.price];
  const min = Math.min(...prices);
  const totalStock = hasVariants ? product.variants.reduce((s, v) => s + Math.max(v.stock, 0), 0) : product.stock;
  return (
    <button type="button" onClick={onPick} className="flex flex-col overflow-hidden rounded-lg border border-pos-line bg-pos-surface text-left hover:border-pos-ink">
      <div className="aspect-square w-full bg-pos-page">
        {product.photo && <img src={product.photo} alt="" loading="lazy" className="h-full w-full object-cover" />}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-2.5">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{product.name}</p>
        <p className="mt-auto text-sm font-semibold tabular-nums">
          {hasVariants && prices.some((p) => p !== min) ? 'from ' : ''}
          {taka(min)}
        </p>
        <p className="text-xs text-pos-muted">{stockLabel(totalStock, product.isPreOrder)}</p>
      </div>
    </button>
  );
}

function VariantPicker({ product, blockOutOfStock, onPick, onClose }: { product: PosCatalogProduct; blockOutOfStock: boolean; onPick: (variantId: string) => void; onClose: () => void }) {
  return (
    <PosDialog open onOpenChange={(o) => !o && onClose()} title={product.name} width="max-w-lg">
      <div className="grid gap-2 sm:grid-cols-2">
        {product.variants.map((v) => {
          const out = !product.isPreOrder && v.stock <= 0;
          return (
            <button
              key={v.id}
              type="button"
              disabled={blockOutOfStock && out}
              onClick={() => onPick(v.id)}
              className="flex min-h-14 flex-col items-start justify-center rounded-lg border border-pos-line px-3 py-2 text-left hover:border-pos-ink disabled:opacity-40"
            >
              <span className="text-sm font-medium">{optionText(v.optionValues)}</span>
              <span className="text-xs text-pos-muted">
                {taka(v.price)} · {product.isPreOrder ? 'Pre-order' : out ? 'Out of stock' : `${v.stock} in stock`}
              </span>
            </button>
          );
        })}
      </div>
    </PosDialog>
  );
}

/** Cash: what the customer hands over, quick notes, and the change. */
/**
 * Taking payment (Step 6): add one line per non-cash tender (it starts at what's still to pay),
 * and cash takes whatever is left, with change. One tender or a split, the same screen.
 */
function PayDialog({
  total,
  methods,
  qrImageUrl,
  giftCredit,
  customer,
  token,
  onQrShown,
  pending,
  onConfirm,
  onClose,
}: {
  total: number;
  methods: PosTender[];
  qrImageUrl: string | null;
  /** An exchange's store credit (Step 8), put in as a gift card line to start with. */
  giftCredit?: { code: string; amount: number } | null;
  /** Due (Step 9) needs the customer's name and phone. */
  customer: { name: string; phone: string };
  token: string;
  /** Step 12: a Bangla QR line is on, so the customer screen shows the shop's QR. */
  onQrShown: (shown: boolean) => void;
  pending: boolean;
  onConfirm: (payments: PosTenderInput[]) => void;
  onClose: () => void;
}) {
  interface Line {
    key: number;
    method: Exclude<PosTender, 'CASH'>;
    amount: string;
    reference: string;
  }
  const [lines, setLines] = useState<Line[]>(() =>
    giftCredit ? [{ key: 0, method: 'GIFT_CARD', amount: String(Math.min(giftCredit.amount, total)), reference: giftCredit.code }] : [],
  );
  const [given, setGiven] = useState('');
  const nextKey = useRef(1);

  const paidOther = round2(lines.reduce((s, l) => s + (Number(l.amount) || 0), 0));
  const cashDue = round2(total - paidOther);
  const tendered = given.trim() === '' ? Math.max(cashDue, 0) : Number(given);
  const cashOk = cashDue <= 0 || (Number.isFinite(tendered) && tendered >= cashDue);
  const change = cashDue > 0 && cashOk ? round2(tendered - cashDue) : 0;
  const lineProblem = lines.find(
    (l) => !(Number(l.amount) > 0) || ((l.method === 'GIFT_CARD' || l.method === 'OTHER') && !l.reference.trim()),
  );
  const valid = cashDue >= 0 && cashOk && !lineProblem;
  const quick = [...new Set([100, 500, 1000].map((step) => Math.ceil(cashDue / step) * step).concat([500, 1000]))]
    .filter((n) => n > cashDue)
    .sort((a, b) => a - b)
    .slice(0, 4);

  const addLine = (method: Exclude<PosTender, 'CASH'>) =>
    setLines((prev) => [...prev, { key: nextKey.current++, method, amount: String(Math.max(cashDue, 0)), reference: '' }]);
  const update = (key: number, patch: Partial<Line>) => setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  function confirm() {
    if (!valid || pending) return;
    const payments: PosTenderInput[] = lines.map((l) => ({
      method: l.method,
      amount: round2(Number(l.amount)),
      ...(l.method === 'GIFT_CARD' ? { giftCardCode: l.reference.trim() } : l.reference.trim() ? { reference: l.reference.trim() } : {}),
    }));
    // Cash takes what's left; a sale fully paid otherwise sends no cash line.
    if (cashDue > 0 || payments.length === 0) payments.unshift({ method: 'CASH', tendered: round2(tendered) });
    onConfirm(payments);
  }

  const placeholder: Record<Exclude<PosTender, 'CASH'>, string> = {
    CARD: 'Last 4 digits (optional)',
    BKASH: 'Transaction ID (optional)',
    NAGAD: 'Transaction ID (optional)',
    BANGLA_QR: 'Transaction ID (optional)',
    BANK: 'Reference (optional)',
    GIFT_CARD: 'Gift card code',
    DUE: 'Note (optional)',
    OTHER: 'Which method? (e.g. Upay)',
  };
  const otherMethods = methods.filter((m): m is Exclude<PosTender, 'CASH'> => m !== 'CASH');

  // Due (Step 9): who owes it, and what they owe already.
  const hasCustomer = !!customer.name.trim() && !!customer.phone.trim();
  const dueLine = lines.find((l) => l.method === 'DUE');
  const owes = useQuery({
    queryKey: ['pos', 'due', customer.phone.trim()],
    queryFn: () => posApi.dueLookup(customer.phone.trim(), token),
    enabled: !!dueLine && hasCustomer,
    retry: false,
  });
  const dueAfter = dueLine && owes.data ? round2(owes.data.balance + (Number(dueLine.amount) || 0)) : null;

  const qrShown = lines.some((l) => l.method === 'BANGLA_QR') && !!qrImageUrl;
  useEffect(() => {
    onQrShown(qrShown);
    return () => onQrShown(false);
  }, [qrShown, onQrShown]);

  return (
    <PosDialog open onOpenChange={(o) => !o && onClose()} title="Payment" width="max-w-lg">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          confirm();
        }}
        className="space-y-4"
      >
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-pos-muted">Total</span>
          <span className="text-2xl font-semibold tabular-nums">{taka(total)}</span>
        </div>

        {otherMethods.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs text-pos-muted">Paid another way? Tap it (tap more than one to split):</p>
            <div className="flex flex-wrap gap-2">
              {otherMethods.map((m) => (
                <PosButton
                  key={m}
                  className="h-9"
                  onClick={() => addLine(m)}
                  disabled={cashDue <= 0 || (m === 'DUE' && (!hasCustomer || !!dueLine))}
                  title={m === 'DUE' && !hasCustomer ? 'Add the customer’s name and phone first (F4)' : undefined}
                >
                  <Plus size={14} aria-hidden />
                  {TENDER_LABEL[m]}
                </PosButton>
              ))}
            </div>
            {otherMethods.includes('DUE') && !hasCustomer && (
              <p className="mt-1.5 text-xs text-pos-muted">To put it on the customer’s due, close this and add their name and phone (F4).</p>
            )}
          </div>
        )}

        {lines.map((l) => (
          <div key={l.key} className="rounded-lg border border-pos-line p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{TENDER_LABEL[l.method]}</span>
              <button type="button" onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))} className="rounded-md p-1 text-pos-muted hover:text-pos-alert" aria-label={`Remove ${TENDER_LABEL[l.method]}`}>
                <Trash2 size={15} />
              </button>
            </div>
            <div className="mt-2 grid grid-cols-[8rem_minmax(0,1fr)] gap-2">
              <PosInput inputMode="decimal" value={l.amount} onChange={(e) => update(l.key, { amount: e.target.value })} aria-label={`${TENDER_LABEL[l.method]} amount`} className="tabular-nums" />
              <PosInput value={l.reference} maxLength={l.method === 'GIFT_CARD' ? 40 : 60} onChange={(e) => update(l.key, { reference: e.target.value })} placeholder={placeholder[l.method]} aria-label={placeholder[l.method]} />
            </div>
            {l.method === 'DUE' && (
              <p className="mt-2 text-xs text-pos-muted">
                {customer.name.trim()} ({customer.phone.trim()})
                {owes.data && (
                  <>
                    {' '}
                    owes {taka(owes.data.balance)} now, <span className="font-medium text-pos-ink">{taka(dueAfter ?? 0)} after this sale</span>
                    {owes.data.limit !== null && <> · limit {taka(owes.data.limit)}</>}
                  </>
                )}
                {owes.data && owes.data.limit !== null && dueAfter !== null && dueAfter > owes.data.limit && (
                  <span className="mt-1 block text-pos-alert">That’s over their limit, so the sale will be refused. Take more now, or a manager can raise the limit on the customer’s page.</span>
                )}
              </p>
            )}
            {l.method === 'BANGLA_QR' && qrImageUrl && (
              <img src={qrImageUrl} alt="Scan to pay with any bank or MFS app" className="mx-auto mt-3 max-h-56 rounded-md border border-pos-line bg-white p-2" />
            )}
          </div>
        ))}

        {cashDue > 0 ? (
          <>
            <Field label={lines.length > 0 ? `Cash for the rest (${taka(cashDue)})` : 'Cash received'} hint="Leave empty if they paid the exact amount.">
              <PosInput autoFocus={lines.length === 0} inputMode="decimal" value={given} onChange={(e) => setGiven(e.target.value)} placeholder={String(cashDue)} className="h-12 text-lg tabular-nums" />
            </Field>
            <div className="flex flex-wrap gap-2">
              <PosButton onClick={() => setGiven('')}>Exact</PosButton>
              {quick.map((n) => (
                <PosButton key={n} onClick={() => setGiven(String(n))}>
                  {taka(n)}
                </PosButton>
              ))}
            </div>
            <div className="flex items-baseline justify-between rounded-lg bg-pos-page px-4 py-3">
              <span className="text-sm">Change to give</span>
              <span className={`text-2xl font-semibold tabular-nums ${cashOk ? '' : 'text-pos-alert'}`}>{cashOk ? taka(change) : 'Not enough'}</span>
            </div>
          </>
        ) : cashDue < 0 ? (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">The payments add up to {taka(paidOther)}, more than the total. Lower one of them.</p>
        ) : (
          <p className="rounded-lg bg-pos-page px-4 py-3 text-sm">Fully paid. No cash needed.</p>
        )}

        {lineProblem && <p className="text-sm text-pos-alert">Fill in each payment: an amount, and the code for a gift card or the name for Other.</p>}
        <PosButton type="submit" variant="primary" className="h-12 w-full text-base" disabled={!valid || pending}>
          {pending ? 'Saving…' : 'Confirm sale'}
        </PosButton>
      </form>
    </PosDialog>
  );
}

function CustomerDialog({ value, onSave, onClose }: { value: { name: string; phone: string }; onSave: (v: { name: string; phone: string }) => void; onClose: () => void }) {
  const [name, setName] = useState(value.name);
  const [phone, setPhone] = useState(value.phone);
  return (
    <PosDialog open onOpenChange={(o) => !o && onClose()} title="Customer (optional)">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ name, phone });
        }}
        className="space-y-4"
      >
        <p className="text-sm text-pos-muted">Add a phone number to see this sale on the customer's record. Name and phone are both needed to put a sale on their due.</p>
        <Field label="Name">
          <PosInput autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Phone">
          <PosInput inputMode="tel" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" />
        </Field>
        <div className="flex justify-between gap-2">
          <PosButton onClick={() => onSave({ name: '', phone: '' })}>Walk-in</PosButton>
          <PosButton type="submit" variant="primary">
            Save
          </PosButton>
        </div>
      </form>
    </PosDialog>
  );
}

/** After the sale: the change to give, big, and Enter starts the next one. */
function SaleDone({
  receipt,
  onNext,
  onPrint,
  printing,
  autoPrint,
  onAutoPrint,
  smsReceipt,
  token,
}: {
  receipt: PosReceipt;
  onNext: () => void;
  onPrint: () => void;
  printing: boolean;
  autoPrint: boolean;
  onAutoPrint: (on: boolean) => void;
  smsReceipt: boolean;
  token: string;
}) {
  const cash = receipt.payments.find((p) => p.method === 'CASH');
  const nextRef = useRef<HTMLButtonElement>(null);
  const [phone, setPhone] = useState(receipt.customerPhone ?? '');
  const texted = useMutation({
    mutationFn: () => posApi.smsReceipt(receipt.id, phone.trim() || undefined, token),
    onSuccess: (r) => toast.success(`Receipt texted to ${r.phone}`),
    onError: (err) => toast.error(apiErrorMessage(err, 'The receipt couldn’t be texted.')),
  });
  useEffect(() => nextRef.current?.focus(), []);
  return (
    <div className="pos-root pos-overlay fixed inset-0 z-40 flex items-center justify-center p-4">
      <div role="dialog" aria-modal="true" aria-label="Sale complete" className="max-h-full w-full max-w-sm overflow-y-auto rounded-[14px] bg-pos-surface p-6 text-center shadow-xl">
        <CheckCircle2 size={40} className="mx-auto text-pos-go" aria-hidden />
        <h2 className="mt-2 text-lg font-semibold">Sale complete</h2>
        <p className="text-sm text-pos-muted">{receipt.publicCode ?? `#${receipt.invoiceNumber}`}</p>
        <dl className="mt-5 space-y-1.5 text-left text-sm">
          <div className="flex justify-between">
            <dt className="text-pos-muted">Total</dt>
            <dd className="tabular-nums">{taka(receipt.total)}</dd>
          </div>
          {receipt.payments
            .filter((p) => p.method !== 'CASH')
            .map((p, i) => (
              <div key={i} className="flex justify-between">
                <dt className="text-pos-muted">{TENDER_LABEL[p.method as PosTender] ?? p.method}</dt>
                <dd className="tabular-nums">{taka(p.amount)}</dd>
              </div>
            ))}
          {cash?.tendered != null && (
            <div className="flex justify-between">
              <dt className="text-pos-muted">Cash received</dt>
              <dd className="tabular-nums">{taka(cash.tendered)}</dd>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-1">
            <dt className="font-medium">Change</dt>
            <dd className="text-3xl font-semibold tabular-nums">{taka(cash?.change ?? 0)}</dd>
          </div>
          {receipt.dueBalanceAfter != null && (
            <div className="flex justify-between rounded-md bg-pos-page px-2 py-1.5">
              <dt>{receipt.customerName} now owes in all</dt>
              <dd className="font-semibold tabular-nums">{taka(receipt.dueBalanceAfter)}</dd>
            </div>
          )}
        </dl>
        {receipt.stockWarnings.length > 0 && (
          <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-left text-xs text-amber-800">
            Sold more than the stock count for {receipt.stockWarnings.map((w) => w.productName).join(', ')}. The count is now 0; check the shelf and fix it in Products.
          </p>
        )}

        <div className="mt-5 flex items-center gap-2">
          <PosButton className="h-11 flex-1" onClick={onPrint} disabled={printing}>
            <Printer size={16} aria-hidden />
            {printing ? 'Opening…' : 'Print receipt'}
          </PosButton>
        </div>
        <label className="mt-2 flex items-center justify-center gap-2 text-xs text-pos-muted">
          <input type="checkbox" checked={autoPrint} onChange={(e) => onAutoPrint(e.target.checked)} />
          Print after every sale on this counter
        </label>

        {smsReceipt && (
          <form
            className="mt-4 flex gap-2 border-t border-pos-line pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              texted.mutate();
            }}
          >
            <PosInput
              inputMode="tel"
              value={phone}
              maxLength={20}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
              aria-label="Customer phone for the SMS receipt"
              disabled={texted.isSuccess}
            />
            <PosButton type="submit" className="shrink-0" disabled={!phone.trim() || texted.isPending || texted.isSuccess}>
              <MessageSquare size={15} aria-hidden />
              {texted.isSuccess ? 'Sent' : 'Text it'}
            </PosButton>
          </form>
        )}

        <PosButton ref={nextRef} variant="primary" className="mt-5 h-12 w-full text-base" onClick={onNext}>
          New sale
        </PosButton>
      </div>
    </div>
  );
}

const AUTO_PRINT_KEY = 'pos.autoPrint';

/** "Print after every sale" is per counter (one has a printer, another may not); on unless switched off. */
function readAutoPrint(): boolean {
  try {
    return localStorage.getItem(AUTO_PRINT_KEY) !== 'off';
  } catch {
    return true;
  }
}

function writeAutoPrint(on: boolean) {
  try {
    localStorage.setItem(AUTO_PRINT_KEY, on ? 'on' : 'off');
  } catch {
    // Not remembered in a private window; it still applies until the page is reloaded.
  }
}
