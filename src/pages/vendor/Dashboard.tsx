import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Check, Copy, Eye, EyeOff, Moon, Plus, RefreshCw, Sun, Sunrise, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useCan } from '../../lib/useStaffAccess';
import { dashboardApi } from '../../lib/dashboardApi';
import { getVendorPlanUsage } from '../../lib/plansApi';
import { storefrontStoreUrl } from '../../lib/storefrontUrl';
import { apiErrorMessage } from '../../lib/api';
import { toast } from '../../lib/toast';
import { LockedBadge, upgradeToast } from '../../components/ui/UpgradePrompt';
import { SetupChecklist } from '../../components/dashboard/SetupChecklist';
import { TodayKpis } from '../../components/dashboard/TodayKpis';
import { AttentionList } from '../../components/dashboard/AttentionList';
import { SalesOverview } from '../../components/dashboard/SalesOverview';
import { RecentOrders } from '../../components/dashboard/RecentOrders';
import { DeliveryCard, InStoreCard, MoneyCard, PlanCard, TopProductsCard } from '../../components/dashboard/SideCards';
import { DailyBrief } from '../../components/dashboard/DailyBrief';

// Vendor dashboard home (dashboard-plan.md). Step 2: the page shell —
// greeting, quick actions, loading and error states. The cards come in
// later steps and all read the one ['dashboard'] query below.

const DHAKA = 'Asia/Dhaka';

/** "Good morning" / "Good afternoon" / "Good evening" by the hour in Dhaka, with a matching icon. */
function greeting(now: Date): { text: string; icon: LucideIcon } {
  const hour = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: DHAKA }).format(now));
  if (hour >= 5 && hour < 12) return { text: 'Good morning', icon: Sunrise };
  if (hour >= 12 && hour < 17) return { text: 'Good afternoon', icon: Sun };
  return { text: 'Good evening', icon: Moon };
}

/** "Thursday, 1 October" in Dhaka. */
function todayLabel(now: Date): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: DHAKA }).format(now);
}

// "Hide numbers" is a per-browser convenience; blocked storage just means it starts off.
const HIDE_NUMBERS_KEY = 'regantify.dashboardHideNumbers';

function readHideNumbers() {
  try {
    return localStorage.getItem(HIDE_NUMBERS_KEY) === '1';
  } catch {
    return false;
  }
}

function writeHideNumbers(value: boolean) {
  try {
    localStorage.setItem(HIDE_NUMBERS_KEY, value ? '1' : '0');
  } catch {
    // ignore
  }
}

const outlineBtn =
  'inline-flex h-9 items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm text-regantify-text transition-colors hover:bg-neutral-50';

/** Grey placeholder blocks in the shape of the cards still loading. */
function DashboardSkeleton() {
  const block = 'animate-pulse rounded-xl border border-line bg-white';
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${block} h-[108px]`} />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className={`${block} h-72 lg:col-span-2`} />
        <div className={`${block} h-72`} />
      </div>
    </div>
  );
}

export default function VendorDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canSeeOrders = useCan('orders.view');
  const [copied, setCopied] = useState(false);
  const [hideNumbers, setHideNumbers] = useState(readHideNumbers);
  const toggleHideNumbers = () => {
    setHideNumbers((h) => {
      writeHideNumbers(!h);
      return !h;
    });
  };

  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.summary,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });

  // Same plan-limit locks as the Products / Orders pages' Add buttons.
  const { data: planUsage } = useQuery({ queryKey: ['vendor-plan-usage'], queryFn: getVendorPlanUsage });
  const atLimit = (u?: { used: number; limit: number | null }) => u != null && u.limit !== null && u.used >= u.limit;
  const atProductLimit = atLimit(planUsage?.usage.products);
  const atOrderLimit = atLimit(planUsage?.usage.ordersToday);

  const isOwner = user?.role === 'VENDOR';
  // Money is owner only and delivery needs a courier: without either, the to-dos take the full width.
  const hasMoneyColumn = !!dashboard.data && (!!dashboard.data.money || dashboard.data.delivery.courierConnected || !!dashboard.data.pos);

  const now = new Date();
  const greet = greeting(now);
  const GreetingIcon = greet.icon;
  const firstName = user?.fullName?.trim().split(/\s+/)[0];
  const storeName = user?.vendor?.storeName;
  const storeUrl = user?.vendor?.subdomain ? storefrontStoreUrl(user.vendor.subdomain) : null;

  const copyStoreLink = async () => {
    if (!storeUrl) return;
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
      toast.success('Store link copied. Share it on Facebook or WhatsApp.');
    } catch {
      toast.error('Could not copy. Your store link is ' + storeUrl);
    }
  };

  return (
    <div className="space-y-4" data-hide-numbers={hideNumbers || undefined}>
      {/* Header: greeting + quick actions */}
      <section className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white p-4">
        <div className="mr-auto flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-lime text-brand">
            <GreetingIcon size={19} strokeWidth={1.8} aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-regantify-text">
              {greet.text}
              {firstName ? `, ${firstName}` : ''}
            </h1>
            <p className="mt-0.5 text-sm text-neutral-500">
              {todayLabel(now)}
              {storeName && ` · ${storeName}`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={toggleHideNumbers}
          aria-pressed={hideNumbers}
          title={hideNumbers ? 'Show money amounts' : 'Hide money amounts, e.g. when someone can see your screen'}
          className={`${outlineBtn} ${hideNumbers ? 'border-brand-lime bg-brand-lime/40' : ''}`}
        >
          {hideNumbers ? <EyeOff size={15} aria-hidden /> : <Eye size={15} aria-hidden />}
          <span className="hidden sm:inline">{hideNumbers ? 'Show numbers' : 'Hide numbers'}</span>
        </button>
        {storeUrl && (
          <button type="button" onClick={copyStoreLink} className={outlineBtn} title={storeUrl} aria-label="Copy store link">
            {copied ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
            {copied ? 'Copied' : 'Copy store link'}
          </button>
        )}
        <button
          type="button"
          onClick={() => (atOrderLimit ? upgradeToast('add more orders today') : navigate('/vendor/orders/add'))}
          title={atOrderLimit ? 'Upgrade your plan to add more orders today.' : undefined}
          className={`${outlineBtn} ${atOrderLimit ? 'text-regantify-text-muted' : ''}`}
        >
          {atOrderLimit ? <LockedBadge size={14} /> : <Plus size={15} />}
          Add Order
        </button>
        <button
          type="button"
          onClick={() => (atProductLimit ? upgradeToast('add more products') : navigate('/vendor/product/add'))}
          title={atProductLimit ? 'Upgrade your plan to add more products.' : undefined}
          className={`flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors ${
            atProductLimit ? 'bg-neutral-100 text-regantify-text-muted' : 'bg-brand text-white hover:bg-brand-dark'
          }`}
        >
          {atProductLimit ? <LockedBadge size={14} /> : <Plus size={15} />}
          Add Product
        </button>
      </section>

      {dashboard.data && <DailyBrief data={dashboard.data} />}

      {/* New stores: the setup steps, owner only (staff can't change most of these). */}
      {dashboard.data && user?.role === 'VENDOR' && (
        <SetupChecklist
          setup={dashboard.data.setup}
          storeKey={user.vendor?.subdomain ?? user.id}
          storeUrl={storeUrl}
          onShareStore={copyStoreLink}
        />
      )}

      {dashboard.isLoading ? (
        <DashboardSkeleton />
      ) : dashboard.isError ? (
        <section className="flex flex-col items-center rounded-xl border border-line bg-white px-6 py-12 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle size={20} />
          </div>
          <p className="mt-3 text-sm font-medium text-regantify-text">Your dashboard couldn’t load.</p>
          <p className="mt-1 text-xs text-neutral-500">{apiErrorMessage(dashboard.error, 'Please check your connection and try again.')}</p>
          <button
            type="button"
            onClick={() => dashboard.refetch()}
            disabled={dashboard.isFetching}
            className={`${outlineBtn} mt-4 disabled:opacity-60`}
          >
            <RefreshCw size={15} className={dashboard.isFetching ? 'animate-spin' : ''} />
            Try again
          </button>
        </section>
      ) : dashboard.data ? (
        <>
          <TodayKpis
            data={dashboard.data}
            onShareStore={copyStoreLink}
            onRefresh={() => dashboard.refetch()}
            refreshing={dashboard.isFetching}
          />

          {/* To-dos, with money and delivery beside them (one column on phones, in this order) */}
          <div className="grid gap-4 lg:grid-cols-3">
            <div className={hasMoneyColumn ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <AttentionList todo={dashboard.data.todo} isOwner={isOwner} planName={dashboard.data.plan.name} />
            </div>
            {hasMoneyColumn && (
              <div className="space-y-4">
                {dashboard.data.money && <MoneyCard money={dashboard.data.money} />}
                {dashboard.data.pos && <InStoreCard pos={dashboard.data.pos} />}
                {(dashboard.data.money || dashboard.data.delivery.courierConnected) && <DeliveryCard delivery={dashboard.data.delivery} />}
              </div>
            )}
          </div>

          {/* Sales numbers need dashboard.view, the latest orders orders.view (rule-plan.md Step 7). */}
          {dashboard.data.today && <SalesOverview data={dashboard.data} />}

          <div className="grid items-start gap-4 lg:grid-cols-3">
            {canSeeOrders && (
              <div className="lg:col-span-2">
                <RecentOrders orders={dashboard.data.recentOrders} />
              </div>
            )}
            <div className={canSeeOrders ? 'space-y-4' : 'space-y-4 lg:col-span-3'}>
              {dashboard.data.today && <TopProductsCard products={dashboard.data.topProducts} />}
              {planUsage && <PlanCard usage={planUsage} isOwner={isOwner} />}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
