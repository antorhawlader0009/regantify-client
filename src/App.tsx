import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { NavTrail } from './components/ui/BackLink';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { ProtectedRoute } from './components/ProtectedRoute';
import { VendorPageGate } from './components/staff/VendorPageGate';
import { AuthBootstrap } from './components/AuthBootstrap';
import { VendorLayout } from './components/layout/VendorLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { PlaceholderPage } from './components/PlaceholderPage';
import { vendorNav, adminNav, navLinks } from './lib/navConfig';


import VendorPhoneEntry from './pages/auth/VendorPhoneEntry';
import VendorSignup from './pages/auth/VendorSignup';
import VendorVerifyOtp from './pages/auth/VendorVerifyOtp';
import VendorSetPassword from './pages/auth/VendorSetPassword';
import VendorCompleteProfile from './pages/auth/VendorCompleteProfile';
import VendorCompleteSetup from './pages/auth/VendorCompleteSetup';
import VendorImpersonateEntry from './pages/auth/VendorImpersonateEntry';
import VendorForgotPassword from './pages/auth/VendorForgotPassword';
import VendorForgotPasswordVerify from './pages/auth/VendorForgotPasswordVerify';
import VendorForgotPasswordReset from './pages/auth/VendorForgotPasswordReset';
// Super Admin's sign-in (with the QR code library for 2FA set-up) is opened by few people, so it loads on first open too.
const AdminLogin = lazy(() => import('./pages/auth/AdminLogin'));

import VendorDashboard from './pages/vendor/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import { LmsLayout } from './components/lms/LmsLayout';
import { PosLayout } from './components/pos/PosLayout';
import { POS_HOME } from './lib/posApi';
import { startIdleWatch } from './lib/idlePolling';
import { PageLoading } from './components/PageLoading';

// PERFORMANCE-PLAN.md Step 7: every page is its own file, downloaded the first time it is opened (the sign-in screens
// and the two dashboard home pages stay in the first file). Each layout shows a small loader in its content area
// while a page arrives, so the sidebar and top bar stay put.
const Home = lazy(() => import('./pages/marketing/Home'));
const Blog = lazy(() => import('./pages/marketing/Blog'));
const BlogPostPage = lazy(() => import('./pages/marketing/Blog').then((m) => ({ default: m.BlogPostPage })));
const Unauthorized = lazy(() => import('./pages/Unauthorized'));
const VendorSettings = lazy(() => import('./pages/vendor/Settings'));
const VendorProfile = lazy(() => import('./pages/vendor/Profile'));
const AddProduct = lazy(() => import('./pages/vendor/product/AddProduct'));
const EditProduct = lazy(() => import('./pages/vendor/product/EditProduct'));
const AllProducts = lazy(() => import('./pages/vendor/product/AllProducts'));
const LowStock = lazy(() => import('./pages/vendor/product/LowStock'));
const Categories = lazy(() => import('./pages/vendor/product/Categories'));
const Brands = lazy(() => import('./pages/vendor/product/Brands'));
const SizeGuides = lazy(() => import('./pages/vendor/product/SizeGuides'));
const Collections = lazy(() => import('./pages/vendor/collection/Collections'));
const AddCollection = lazy(() => import('./pages/vendor/collection/AddCollection'));
const Themes = lazy(() => import('./pages/vendor/store/Themes'));
const Pages = lazy(() => import('./pages/vendor/store/Pages'));
const AddPage = lazy(() => import('./pages/vendor/store/AddPage'));
const Magazine = lazy(() => import('./pages/vendor/store/Magazine'));
const Faq = lazy(() => import('./pages/vendor/store/Faq'));
const SocialFeed = lazy(() => import('./pages/vendor/store/SocialFeed'));
const ShareQr = lazy(() => import('./pages/vendor/store/ShareQr'));
const CheckoutFormFields = lazy(() => import('./pages/vendor/store/design/CheckoutFormFields'));
const AddPost = lazy(() => import('./pages/vendor/store/AddPost'));
const LandingPages = lazy(() => import('./pages/vendor/store/landing-pages/LandingPages'));
const LandingPageBuilder = lazy(() => import('./pages/vendor/store/landing-pages/LandingPageBuilder'));
const Footer = lazy(() => import('./pages/vendor/store/footer/Footer'));
const Social = lazy(() => import('./pages/vendor/store/Social'));
const Branding = lazy(() => import('./pages/vendor/store/Branding'));
const Media = lazy(() => import('./pages/vendor/store/Media'));
const Domain = lazy(() => import('./pages/vendor/store/Domain'));
const PaymentGateway = lazy(() => import('./pages/vendor/store/PaymentGateway'));
const StockSettings = lazy(() => import('./pages/vendor/store/StockSettings'));
const InvoiceSettings = lazy(() => import('./pages/vendor/store/InvoiceSettings'));
const OrderTracking = lazy(() => import('./pages/vendor/store/OrderTracking'));
const DesignHub = lazy(() => import('./pages/vendor/store/DesignHub'));
const DeliveryCharge = lazy(() => import('./pages/vendor/store/DeliveryCharge'));
const GdprPrompt = lazy(() => import('./pages/vendor/store/GdprPrompt'));
const CustomCss = lazy(() => import('./pages/vendor/store/design/CustomCodePage').then((m) => ({ default: m.CustomCss })));
const CustomHeadScripts = lazy(() => import('./pages/vendor/store/design/CustomCodePage').then((m) => ({ default: m.CustomHeadScripts })));
const JavaScriptCode = lazy(() => import('./pages/vendor/store/design/JavaScriptCode'));
const HeaderEditor = lazy(() => import('./pages/vendor/store/design/HeaderEditor'));
const LayoutSettings = lazy(() => import('./pages/vendor/store/design/LayoutSettings'));
const Customize = lazy(() => import('./pages/vendor/store/design/Customize'));
const SiteBanner = lazy(() => import('./pages/vendor/store/design/SiteBanner'));
const ChatButton = lazy(() => import('./pages/vendor/store/design/ChatButton'));
const ProductDisplay = lazy(() => import('./pages/vendor/store/design/ProductDisplay'));
const TrustStripPage = lazy(() => import('./pages/vendor/store/design/TrustStrip'));
const ReputationPage = lazy(() => import('./pages/vendor/store/design/Reputation'));
const ProductCardDisplay = lazy(() => import('./pages/vendor/store/design/ProductCardDisplay'));
const EditJavaScript = lazy(() => import('./pages/vendor/store/design/EditJavaScript'));
const CodGuard = lazy(() => import('./pages/vendor/store/CodGuard'));
const StoreBackup = lazy(() => import('./pages/vendor/store/StoreBackup'));
const StoreAway = lazy(() => import('./pages/vendor/store/StoreAway'));
const Seo = lazy(() => import('./pages/vendor/store/Seo'));
const Integrations = lazy(() => import('./pages/vendor/store/integrations/Integrations'));
const FacebookPixel = lazy(() => import('./pages/vendor/store/integrations/FacebookPixel'));
const MetaConversionsApi = lazy(() => import('./pages/vendor/store/integrations/MetaConversionsApi'));
const GoogleAnalytics = lazy(() => import('./pages/vendor/store/integrations/GoogleAnalytics'));
const AnalyticsPage = lazy(() => import('./pages/vendor/analytics/AnalyticsPage'));
const AnalyticsLegacyRedirect = lazy(() => import('./pages/vendor/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsLegacyRedirect })));
const GoogleTagManager = lazy(() => import('./pages/vendor/store/integrations/GoogleTagManager'));
const TiktokPixel = lazy(() => import('./pages/vendor/store/integrations/TiktokPixel'));
const Webhooks = lazy(() => import('./pages/vendor/store/integrations/Webhooks'));
const ExternalApi = lazy(() => import('./pages/vendor/store/integrations/ExternalApi'));
const Orders = lazy(() => import('./pages/vendor/order/Orders'));
const HandoverSheets = lazy(() => import('./pages/vendor/order/HandoverSheets'));
const ReturnCheckIn = lazy(() => import('./pages/vendor/order/ReturnCheckIn'));
const TrackingBulk = lazy(() => import('./pages/vendor/order/TrackingBulk'));
const RiderCash = lazy(() => import('./pages/vendor/order/RiderCash'));
const Refunds = lazy(() => import('./pages/vendor/order/Refunds'));
const StandingOrders = lazy(() => import('./pages/vendor/order/StandingOrders'));
const ConnectExtension = lazy(() => import('./pages/vendor/store/ConnectExtension'));
const AppsPage = lazy(() => import('./pages/vendor/AppsPage'));
const ChatExtensionPrivacy = lazy(() => import('./pages/marketing/ChatExtensionPrivacy'));
const StockCount = lazy(() => import('./pages/vendor/product/StockCount'));
const Questions = lazy(() => import('./pages/vendor/review/Questions'));
const CourierRules = lazy(() => import('./pages/vendor/courier/CourierRules'));
const StockHistory = lazy(() => import('./pages/vendor/product/StockHistory'));
const ResellerSupply = lazy(() => import('./pages/vendor/product/ResellerSupply'));
const ResellerFind = lazy(() => import('./pages/vendor/product/ResellerFind'));
const ImportOrders = lazy(() => import('./pages/vendor/order/ImportOrders'));
const HandoverSheetPrintPage = lazy(() => import('./pages/vendor/order/HandoverSheetPrintPage'));
const AddOrder = lazy(() => import('./pages/vendor/order/AddOrder'));
const OrderDetail = lazy(() => import('./pages/vendor/order/OrderDetail'));
const Customers = lazy(() => import('./pages/vendor/customer/Customers'));
const CustomerDetails = lazy(() => import('./pages/vendor/customer/CustomerDetails'));
const AddCustomer = lazy(() => import('./pages/vendor/customer/AddCustomer'));
const BulkUploadCustomers = lazy(() => import('./pages/vendor/customer/BulkUploadCustomers'));
const CustomerDetail = lazy(() => import('./pages/vendor/customer/CustomerDetail'));
const CustomerMessages = lazy(() => import('./pages/vendor/customer/Messages'));
const EditCustomer = lazy(() => import('./pages/vendor/customer/EditCustomer'));
const Reviews = lazy(() => import('./pages/vendor/review/Reviews'));
const AddReview = lazy(() => import('./pages/vendor/review/AddReview'));
const Staff = lazy(() => import('./pages/vendor/staff/Staff'));
const ActivityLog = lazy(() => import('./pages/vendor/account/ActivityLog'));
const Verification = lazy(() => import('./pages/vendor/Verification'));
const AdminVerification = lazy(() => import('./pages/admin/Verification'));
const AdminResaleDisputes = lazy(() => import('./pages/admin/ResaleDisputes'));
const AddStaffMember = lazy(() => import('./pages/vendor/staff/AddStaffMember'));
const Billing = lazy(() => import('./pages/vendor/Billing'));
const Notifications = lazy(() => import('./pages/vendor/Notifications'));
const Coupons = lazy(() => import('./pages/vendor/marketing/Coupons'));
const AddCoupon = lazy(() => import('./pages/vendor/marketing/AddCoupon'));
const Campaigns = lazy(() => import('./pages/vendor/marketing/Campaigns'));
const AddCampaign = lazy(() => import('./pages/vendor/marketing/AddCampaign'));
const PopupCampaignBuilder = lazy(() => import('./pages/vendor/marketing/PopupCampaignBuilder'));
const Discounts = lazy(() => import('./pages/vendor/marketing/Discounts'));
const GiftOffers = lazy(() => import('./pages/vendor/marketing/GiftOffers'));
const RewardPoints = lazy(() => import('./pages/vendor/marketing/RewardPoints'));
const AddDiscount = lazy(() => import('./pages/vendor/marketing/AddDiscount'));
const FlashSales = lazy(() => import('./pages/vendor/marketing/FlashSales'));
const AddFlashSale = lazy(() => import('./pages/vendor/marketing/AddFlashSale'));
const GiftCards = lazy(() => import('./pages/vendor/marketing/GiftCards'));
const AddGiftCard = lazy(() => import('./pages/vendor/marketing/AddGiftCard'));
const GiftCardDetail = lazy(() => import('./pages/vendor/marketing/GiftCardDetail'));
const Sms = lazy(() => import('./pages/vendor/sms/Sms'));
const AiChatBot = lazy(() => import('./pages/vendor/ai-automation/AiChatBot'));
const Wallet = lazy(() => import('./pages/vendor/finance/Wallet'));
const ResellerEarnings = lazy(() => import('./pages/vendor/finance/ResellerEarnings'));
const Transactions = lazy(() => import('./pages/vendor/finance/Transactions'));
const Withdraw = lazy(() => import('./pages/vendor/finance/Withdraw'));
const FeeSummary = lazy(() => import('./pages/vendor/finance/FeeSummary'));
const Expenses = lazy(() => import('./pages/vendor/finance/Expenses'));
const PaymentCallback = lazy(() => import('./pages/vendor/finance/PaymentCallback'));
const Tracking = lazy(() => import('./pages/vendor/shipping/Tracking'));
const CourierIntegrationPage = lazy(() => import('./pages/vendor/courier/CourierIntegrationPage'));
const PathaoPage = lazy(() => import('./pages/vendor/courier/pathao/PathaoPage'));
const SteadfastPage = lazy(() => import('./pages/vendor/courier/steadfast/SteadfastPage'));
const RedxPage = lazy(() => import('./pages/vendor/courier/redx/RedxPage'));
const CarrybeePage = lazy(() => import('./pages/vendor/courier/carrybee/CarrybeePage'));
const PathaoLabelsPrintPage = lazy(() => import('./pages/vendor/courier/pathao/PathaoLabelsPrintPage'));
const AiSettings = lazy(() => import('./pages/admin/ai/AiSettings'));
const SystemStatus = lazy(() => import('./pages/admin/SystemStatus'));
const FeatureFlags = lazy(() => import('./pages/admin/FeatureFlags'));
const AdminShop = lazy(() => import('./pages/admin/Shop'));
const TrustSafety = lazy(() => import('./pages/admin/TrustSafety'));
const Automations = lazy(() => import('./pages/admin/Automations'));
const Churn = lazy(() => import('./pages/admin/Churn'));
const Economics = lazy(() => import('./pages/admin/Economics'));
const AdminEmail = lazy(() => import('./pages/admin/Email'));
const ProductInsights = lazy(() => import('./pages/admin/ProductInsights'));
const DeliveryTimes = lazy(() => import('./pages/admin/DeliveryTimes'));
const HelpArticles = lazy(() => import('./pages/admin/HelpArticles'));
const Changelog = lazy(() => import('./pages/admin/Changelog'));
const FeatureRequests = lazy(() => import('./pages/admin/FeatureRequests'));
const AdminReferrals = lazy(() => import('./pages/admin/Referrals'));
const Approvals = lazy(() => import('./pages/admin/Approvals'));
const AdminDomains = lazy(() => import('./pages/admin/Domains'));
const VendorReferrals = lazy(() => import('./pages/vendor/finance/Referrals'));
const ReceiptDetails = lazy(() => import('./pages/admin/ReceiptDetails'));
const VendorTwoStep = lazy(() => import('./pages/auth/VendorTwoStep'));
const GoogleCallback = lazy(() => import('./pages/auth/GoogleCallback'));
const AdminAnalytics = lazy(() => import('./pages/admin/Analytics'));
const AdminReviews = lazy(() => import('./pages/admin/Reviews'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminMarketing = lazy(() => import('./pages/admin/Marketing'));
const AdminSettings = lazy(() => import('./pages/admin/Settings'));
const AdminAddons = lazy(() => import('./pages/admin/Addons'));
const Receipts = lazy(() => import('./pages/vendor/finance/Receipts'));
const AllVendors = lazy(() => import('./pages/admin/vendors/AllVendors'));
const StoreDetailPage = lazy(() => import('./pages/admin/vendors/StoreDetail'));
const PendingApproval = lazy(() => import('./pages/admin/vendors/PendingApproval'));
const SuspendedVendors = lazy(() => import('./pages/admin/vendors/SuspendedVendors'));
const PlatformRevenue = lazy(() => import('./pages/admin/finance/PlatformRevenue'));
const AdminOrders = lazy(() => import('./pages/admin/orders/AdminOrders'));
const AdminOrderDetail = lazy(() => import('./pages/admin/orders/AdminOrderDetail'));
const AdminCustomers = lazy(() => import('./pages/admin/customers/AdminCustomers'));
const AdminShopperDetail = lazy(() => import('./pages/admin/customers/AdminShopperDetail'));
const Renewals = lazy(() => import('./pages/admin/plans/Renewals'));
const PacksAndPromos = lazy(() => import('./pages/admin/plans/PacksAndPromos'));
const Messages = lazy(() => import('./pages/admin/Messages'));
const Team = lazy(() => import('./pages/admin/Team'));
const CommissionSettings = lazy(() => import('./pages/admin/finance/CommissionSettings'));
const PlanManagement = lazy(() => import('./pages/admin/plans/PlanManagement'));
const PlanRequests = lazy(() => import('./pages/admin/plans/PlanRequests'));
const Announcements = lazy(() => import('./pages/admin/Announcements'));
const SupportInbox = lazy(() => import('./pages/admin/support/SupportInbox'));
const Addons = lazy(() => import('./pages/vendor/addons/Addons'));
const Support = lazy(() => import('./pages/vendor/support/Support'));
const SupportTicket = lazy(() => import('./pages/vendor/support/SupportTicket'));
const HelpCenter = lazy(() => import('./pages/vendor/help/HelpCenter'));
const PaymentGatewayManagement = lazy(() => import('./pages/admin/payment-gateway/PaymentGatewayManagement'));
const Payouts = lazy(() => import('./pages/admin/finance/Payouts'));
const LeadsPage = lazy(() => import('./pages/vendor/lms/LeadsPage'));
const CallDeskPage = lazy(() => import('./pages/vendor/lms/CallDeskPage'));
const TasksPage = lazy(() => import('./pages/vendor/lms/TasksPage'));
const ReportsPage = lazy(() => import('./pages/vendor/lms/ReportsPage'));
const LmsSettingsPage = lazy(() => import('./pages/vendor/lms/LmsSettingsPage'));
const ImportLeadsPage = lazy(() => import('./pages/vendor/lms/ImportLeadsPage'));
const PosSettingsPage = lazy(() => import('./pages/vendor/pos/PosSettingsPage'));
const PosRegistersPage = lazy(() => import('./pages/vendor/pos/PosRegistersPage'));
const PosStaffPage = lazy(() => import('./pages/vendor/pos/PosStaffPage'));
const PosSessionsPage = lazy(() => import('./pages/vendor/pos/PosSessionsPage'));
const PosSalesPage = lazy(() => import('./pages/vendor/pos/PosSalesPage'));
const PosReportsPage = lazy(() => import('./pages/vendor/pos/PosReportsPage'));
const PosHardwarePage = lazy(() => import('./pages/vendor/pos/PosHardwarePage'));
const PosSellPage = lazy(() => import('./pages/vendor/pos/PosSellPage'));
const PosDisplayPage = lazy(() => import('./pages/vendor/pos/PosDisplayPage'));

// PERFORMANCE-PLAN.md Step 6: an answer counts as fresh for 30 s (opening a page again within that time uses it), coming
// back to the tab refetches only the queries that ask for it (the bell, the orders pulse, the dashboard), and a failed
// request is retried once. Mutations still invalidate what they change, so an edit shows at once.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});
startIdleWatch(queryClient);

// Step 7: pages are separate files named by their content, so after a new deploy a tab opened before it may ask for a
// file that no longer exists. Vite reports that here; the page reloads once to pick up the new build (once per 30 s, so a
// real outage can't loop)..
if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    let last = 0;
    try {
      last = Number(sessionStorage.getItem('regantify-chunk-reload') ?? 0);
    } catch {
      // storage blocked: reload anyway
    }
    if (Date.now() - last < 30_000) return;
    try {
      sessionStorage.setItem('regantify-chunk-reload', String(Date.now()));
    } catch {
      // storage blocked
    }
    event.preventDefault();
    window.location.reload();
  });
}

// Step 7: the two pages a seller opens most are fetched quietly a few seconds after the dashboard has loaded, so the
// first click on them doesn't wait for their file. A failed prefetch is harmless (the page loads when opened).
if (typeof window !== 'undefined' && window.location.pathname.startsWith('/vendor') && !window.location.pathname.startsWith('/vendor/pos/')) {
  window.addEventListener('load', () => {
    window.setTimeout(() => {
      void import('./pages/vendor/order/Orders').catch(() => undefined);
      void import('./pages/vendor/product/AllProducts').catch(() => undefined);
    }, 3_000);
  });
}

/** Flattens navConfig into { path, label } pairs, skipping Dashboard (has its own real page). */
function flattenRoutes(sections: typeof vendorNav) {
  const routes: { path: string; label: string }[] = [];
  for (const section of sections) {
    if (section.path && section.label !== 'Dashboard') {
      routes.push({ path: section.path, label: section.label });
    }
    for (const child of navLinks(section.children)) {
      routes.push({ path: child.path, label: child.label });
    }
  }
  return routes;
}

const vendorPlaceholderRoutes = flattenRoutes(vendorNav).filter(
  (r) =>
    r.path !== '/vendor/settings' &&
    r.path !== '/vendor/support' &&
    r.path !== '/vendor/notifications' &&
    r.path !== '/vendor/addons' &&
    r.path !== '/vendor/product/all' &&
    r.path !== '/vendor/product/add' &&
    r.path !== '/vendor/product/categories' &&
    r.path !== '/vendor/product/brands' &&
    r.path !== '/vendor/product/size-guides' &&
    r.path !== '/vendor/product/collections' &&
    r.path !== '/vendor/product/low-stock' &&
    r.path !== '/vendor/product/stock-count' &&
    r.path !== '/vendor/product/stock-history' &&
    r.path !== '/vendor/product/resellers' &&
    r.path !== '/vendor/product/resell' &&
    r.path !== '/vendor/store/themes' &&
    r.path !== '/vendor/store/pages' &&
    r.path !== '/vendor/store/magazine' &&
    r.path !== '/vendor/store/faq' &&
    r.path !== '/vendor/store/social-feed' &&
    r.path !== '/vendor/store/share' &&
    r.path !== '/vendor/store/checkout-form' &&
    r.path !== '/vendor/store/landing-pages' &&
    r.path !== '/vendor/store/footer' &&
    r.path !== '/vendor/store/social' &&
    r.path !== '/vendor/store/branding' &&
    r.path !== '/vendor/store/media' &&
    r.path !== '/vendor/store/domain' &&
    r.path !== '/vendor/store/payment-gateway' &&
    r.path !== '/vendor/store/delivery-charge' &&
    r.path !== '/vendor/store/stock-settings' &&
    r.path !== '/vendor/store/invoice' &&
    r.path !== '/vendor/store/order-tracking' &&
    r.path !== '/vendor/store/design' &&
    r.path !== '/vendor/store/gdpr' &&
    r.path !== '/vendor/store/cod-guard' &&
    r.path !== '/vendor/store/store-away' &&
    r.path !== '/vendor/store/seo' &&
    r.path !== '/vendor/store/integrations' &&
    r.path !== '/vendor/store/header-editor' &&
    r.path !== '/vendor/store/layout-settings' &&
    r.path !== '/vendor/store/customize' &&
    r.path !== '/vendor/store/site-banner' &&
    r.path !== '/vendor/store/chat-button' &&
    r.path !== '/vendor/store/product-display' &&
    r.path !== '/vendor/store/trust-strip' &&
    r.path !== '/vendor/store/product-card' &&
    r.path !== '/vendor/store/custom-css' &&
    r.path !== '/vendor/store/head-scripts' &&
    r.path !== '/vendor/store/javascript' &&
    r.path !== '/vendor/orders' &&
    r.path !== '/vendor/customers' &&
    r.path !== '/vendor/reviews' &&
    r.path !== '/vendor/staff' &&
    r.path !== '/vendor/activity' &&
    r.path !== '/vendor/billing' &&
    r.path !== '/vendor/marketing/coupons' &&
    r.path !== '/vendor/marketing/campaigns' &&
    r.path !== '/vendor/marketing/discounts' &&
    r.path !== '/vendor/marketing/flash-sale' &&
    r.path !== '/vendor/marketing/gift-cards' &&
    r.path !== '/vendor/marketing/rewards' &&
    r.path !== '/vendor/sms' &&
    r.path !== '/vendor/ai-automation/ai-chat-bot' &&
    r.path !== '/vendor/finance/wallet' &&
    r.path !== '/vendor/finance/reseller-earnings' &&
    r.path !== '/vendor/finance/transactions' &&
    r.path !== '/vendor/finance/referrals' &&
    r.path !== '/vendor/finance/withdraw' &&
    r.path !== '/vendor/finance/fee-summary' &&
    r.path !== '/vendor/finance/receipts' &&
    r.path !== '/vendor/finance/expenses' &&
    r.path !== '/vendor/shipping/tracking' &&
    r.path !== '/vendor/courier' &&
    r.path !== '/vendor/courier/pathao' &&
    r.path !== '/vendor/courier/steadfast' &&
    r.path !== '/vendor/courier/redx' &&
    r.path !== '/vendor/courier/carrybee' &&
    r.path !== '/vendor/courier/rules' &&
    r.path !== '/vendor/store/extension' &&
    r.path !== '/vendor/app' &&
    r.path !== '/vendor/analytics' &&
    !r.path.startsWith('/vendor/lms') &&
    !r.path.startsWith('/vendor/pos'),
);
const adminPlaceholderRoutes = flattenRoutes(adminNav).filter(
  (r) =>
    r.path !== '/admin/ai-settings' &&
    r.path !== '/admin/system-status' &&
    r.path !== '/admin/feature-flags' &&
    r.path !== '/admin/shop' &&
    r.path !== '/admin/trust-safety' &&
    r.path !== '/admin/verification' &&
    r.path !== '/admin/resale-disputes' &&
    r.path !== '/admin/receipt-details' &&
    r.path !== '/admin/dashboard' &&
    r.path !== '/admin/renewals' &&
    r.path !== '/admin/analytics' &&
    r.path !== '/admin/reviews' &&
    r.path !== '/admin/reports' &&
    r.path !== '/admin/marketing' &&
    r.path !== '/admin/settings' &&
    r.path !== '/admin/addons' &&
    r.path !== '/admin/vendors/all' &&
    r.path !== '/admin/customers' &&
    r.path !== '/admin/packs' &&
    r.path !== '/admin/messages' &&
    r.path !== '/admin/automations' &&
    r.path !== '/admin/churn' &&
    r.path !== '/admin/economics' &&
    r.path !== '/admin/email' &&
    r.path !== '/admin/product-insights' &&
    r.path !== '/admin/delivery-times' &&
    r.path !== '/admin/help' &&
    r.path !== '/admin/changelog' &&
    r.path !== '/admin/feature-requests' &&
    r.path !== '/admin/referrals' &&
    r.path !== '/admin/approvals' &&
    r.path !== '/admin/domains' &&
    r.path !== '/admin/staff' &&
    r.path !== '/admin/finance/commission' &&
    r.path !== '/admin/orders' &&
    r.path !== '/admin/finance/revenue' &&
    r.path !== '/admin/vendors/pending' &&
    r.path !== '/admin/vendors/suspended' &&
    r.path !== '/admin/plans' &&
    r.path !== '/admin/plan-requests' &&
    r.path !== '/admin/announcements' &&
    r.path !== '/admin/support' &&
    r.path !== '/admin/payment-gateway' &&
    r.path !== '/admin/finance/payouts',
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* One toaster for the whole app */}
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: '#0E0D0D',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />
      {/* Auth restoration bootstrap */}
      <AuthBootstrap>
        <BrowserRouter>
          {/* The in-tab history the "‹ Back" links read (components/ui/BackLink.tsx). */}
          <NavTrail />
          <Suspense fallback={<PageLoading />}>
          <Routes>
            {/* Root → marketing landing page */}
            <Route path="/" element={<Home />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/legal/chat-extension-privacy" element={<ChatExtensionPrivacy />} />
            <Route path="/blog/:slug" element={<BlogPostPage />} />

            {/* Public storefront now lives in its own app — see storefront/
                (Next.js, server-rendered for SEO/speed). "Visit site" and
                Store > Themes link out to it directly (storefrontUrl.ts)
                instead of routing through this dashboard. */}

            {/* Vendor auth flow */}
            <Route path="/vendor/login" element={<VendorPhoneEntry />} />
            <Route path="/vendor/signup" element={<VendorSignup />} />
            <Route path="/vendor/verify-otp" element={<VendorVerifyOtp />} />
            <Route path="/vendor/complete-setup" element={<VendorCompleteSetup />} />
            <Route path="/vendor/forgot-password" element={<VendorForgotPassword />} />
            <Route path="/vendor/forgot-password/verify" element={<VendorForgotPasswordVerify />} />
            <Route path="/vendor/forgot-password/reset" element={<VendorForgotPasswordReset />} />
            {/* The authenticator code after the first sign-in step (two-step sign-in, Settings > Security). */}
            <Route path="/vendor/two-step" element={<VendorTwoStep />} />
            {/* GOOGLE_CALLBACK_URL: Google sends the browser back here ("Continue with Google", Settings > Connect Google). */}
            <Route path="/auth/google/callback" element={<GoogleCallback />} />

            {/* Super Admin auth flow */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Super Admin > All Vendors > "Login as Vendor" landing tab — see VendorImpersonateEntry.tsx */}
            <Route path="/vendor-impersonate" element={<VendorImpersonateEntry />} />

            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Vendor setup flow */}
            <Route element={<ProtectedRoute allowedRoles={['VENDOR']} />}>
              <Route path="/vendor/set-password" element={<VendorSetPassword />} />
              <Route path="/vendor/complete-profile" element={<VendorCompleteProfile />} />
            </Route>

            {/* Vendor dashboard — protected, VENDOR or STAFF (a team
                member under a vendor's store — see StaffMember model;
                every route here is scoped identically either way via
                VendorService.findVendorIdByUserId) */}
            <Route element={<ProtectedRoute allowedRoles={['VENDOR', 'STAFF']} />}>
              <Route element={<VendorLayout />}>
                <Route path="/vendor/dashboard" element={<VendorDashboard />} />
                <Route path="/vendor/settings" element={<VendorSettings />} />
                <Route path="/vendor/profile" element={<VendorProfile />} />
                <Route path="/vendor/notifications" element={<Notifications />} />
                <Route path="/vendor/addons" element={<Addons />} />
                <Route path="/vendor/support" element={<Support />} />
                <Route path="/vendor/support/:id" element={<SupportTicket />} />
                <Route path="/vendor/help" element={<HelpCenter />} />
                <Route path="/vendor/help/:slug" element={<HelpCenter />} />
                <Route path="/vendor/product/add" element={<AddProduct />} />
                <Route path="/vendor/product/edit/:id" element={<EditProduct />} />
                <Route path="/vendor/product/all" element={<AllProducts />} />
                <Route path="/vendor/product/low-stock" element={<LowStock />} />
                <Route path="/vendor/product/stock-count" element={<StockCount />} />
                <Route path="/vendor/product/stock-history" element={<StockHistory />} />
                <Route path="/vendor/product/resellers" element={<ResellerSupply />} />
                <Route path="/vendor/product/resell" element={<ResellerFind />} />
                <Route path="/vendor/product/categories" element={<Categories />} />
                <Route path="/vendor/product/brands" element={<Brands />} />
                <Route path="/vendor/product/size-guides" element={<SizeGuides />} />
                <Route path="/vendor/product/collections" element={<Collections />} />
                <Route path="/vendor/product/collections/add" element={<AddCollection />} />
                <Route path="/vendor/product/collections/edit/:id" element={<AddCollection />} />
                <Route path="/vendor/store/themes" element={<Themes />} />
                <Route path="/vendor/store/pages" element={<Pages />} />
                <Route path="/vendor/store/pages/add" element={<AddPage />} />
                <Route path="/vendor/store/pages/edit/:id" element={<AddPage />} />
                <Route path="/vendor/store/faq" element={<Faq />} />
                <Route path="/vendor/store/social-feed" element={<SocialFeed />} />
                <Route path="/vendor/store/share" element={<ShareQr />} />
                <Route path="/vendor/store/checkout-form" element={<CheckoutFormFields />} />
                <Route path="/vendor/store/magazine" element={<Magazine />} />
                <Route path="/vendor/store/magazine/add" element={<AddPost />} />
                <Route path="/vendor/store/magazine/edit/:id" element={<AddPost />} />
                <Route path="/vendor/store/landing-pages" element={<LandingPages />} />
                <Route path="/vendor/store/footer" element={<Footer />} />
                <Route path="/vendor/store/social" element={<Social />} />
                <Route path="/vendor/store/branding" element={<Branding />} />
                <Route path="/vendor/store/media" element={<Media />} />
                <Route path="/vendor/store/domain" element={<Domain />} />
                <Route path="/vendor/store/payment-gateway" element={<PaymentGateway />} />
                <Route path="/vendor/store/delivery-charge" element={<DeliveryCharge />} />
                <Route path="/vendor/store/stock-settings" element={<StockSettings />} />
                <Route path="/vendor/store/invoice" element={<InvoiceSettings />} />
                <Route path="/vendor/store/order-tracking" element={<OrderTracking />} />
                <Route path="/vendor/store/design" element={<DesignHub />} />
                <Route path="/vendor/store/gdpr" element={<GdprPrompt />} />
                <Route path="/vendor/store/cod-guard" element={<CodGuard />} />
                <Route path="/vendor/store/backup" element={<StoreBackup />} />
                <Route path="/vendor/store/store-away" element={<StoreAway />} />
                <Route path="/vendor/store/seo" element={<Seo />} />
                <Route path="/vendor/store/integrations" element={<Integrations />} />
                <Route path="/vendor/store/integrations/facebook-pixel" element={<FacebookPixel />} />
                <Route path="/vendor/store/integrations/meta-conversions-api" element={<MetaConversionsApi />} />
                <Route path="/vendor/store/integrations/google-analytics" element={<GoogleAnalytics />} />
                <Route path="/vendor/store/integrations/google-tag-manager" element={<GoogleTagManager />} />
                <Route path="/vendor/store/integrations/tiktok-pixel" element={<TiktokPixel />} />
                <Route path="/vendor/store/integrations/webhooks" element={<Webhooks />} />
                <Route path="/vendor/store/integrations/external-api" element={<ExternalApi />} />
                <Route path="/vendor/store/header-editor" element={<HeaderEditor />} />
                <Route path="/vendor/store/layout-settings" element={<LayoutSettings />} />
                <Route path="/vendor/store/customize" element={<Customize />} />
                {/* Menus are edited in the Header Editor (and Layout Settings, Footer); there is no separate Navigation page. */}
                <Route path="/vendor/store/navigation" element={<Navigate to="/vendor/store/header-editor" replace />} />
                <Route path="/vendor/store/site-banner" element={<SiteBanner />} />
                <Route path="/vendor/store/chat-button" element={<ChatButton />} />
                <Route path="/vendor/store/product-display" element={<ProductDisplay />} />
                <Route path="/vendor/store/trust-strip" element={<TrustStripPage />} />
                <Route path="/vendor/store/reputation" element={<ReputationPage />} />
                <Route path="/vendor/store/product-card" element={<ProductCardDisplay />} />
                <Route path="/vendor/store/custom-css" element={<CustomCss />} />
                <Route path="/vendor/store/head-scripts" element={<CustomHeadScripts />} />
                <Route path="/vendor/store/javascript" element={<JavaScriptCode />} />
                <Route path="/vendor/store/javascript/add" element={<EditJavaScript />} />
                <Route path="/vendor/store/javascript/edit/:id" element={<EditJavaScript />} />
                <Route path="/vendor/orders" element={<Orders />} />
                {/* Old sidebar link; Abandoned Cart is now a tab on the Orders page. */}
                <Route path="/vendor/orders/incomplete" element={<Navigate to="/vendor/orders?tab=abandoned-cart" replace />} />
                <Route path="/vendor/orders/add" element={<AddOrder />} />
                <Route path="/vendor/orders/handover" element={<HandoverSheets />} />
                <Route path="/vendor/orders/import" element={<ImportOrders />} />
                <Route path="/vendor/orders/return-check-in" element={<ReturnCheckIn />} />
                <Route path="/vendor/orders/tracking-bulk" element={<TrackingBulk />} />
                <Route path="/vendor/orders/rider-cash" element={<RiderCash />} />
                <Route path="/vendor/orders/refunds" element={<Refunds />} />
                <Route path="/vendor/orders/standing" element={<StandingOrders />} />
                <Route path="/vendor/orders/chats" element={<Navigate to="/vendor/store/extension?tab=chats" replace />} />
                <Route path="/vendor/store/extension" element={<ConnectExtension />} />
                <Route path="/vendor/app" element={<AppsPage />} />
                <Route path="/vendor/orders/:id" element={<OrderDetail />} />
                <Route path="/vendor/customers" element={<Customers />} />
                <Route path="/vendor/customers/details" element={<CustomerDetails />} />
                <Route path="/vendor/customers/messages" element={<CustomerMessages />} />
                <Route path="/vendor/customers/add" element={<AddCustomer />} />
                <Route path="/vendor/customers/bulk-upload" element={<BulkUploadCustomers />} />
                <Route path="/vendor/customers/:phone/edit" element={<EditCustomer />} />
                <Route path="/vendor/customers/:phone" element={<CustomerDetail />} />
                <Route path="/vendor/reviews" element={<Reviews />} />
                <Route path="/vendor/reviews/add" element={<AddReview />} />
                <Route path="/vendor/reviews/questions" element={<Questions />} />
                <Route path="/vendor/reviews/:id/edit" element={<AddReview />} />
                <Route path="/vendor/staff" element={<Staff />} />
                <Route path="/vendor/activity" element={<ActivityLog />} />
                <Route path="/vendor/verification" element={<Verification />} />
                <Route path="/vendor/staff/add" element={<AddStaffMember />} />
                <Route path="/vendor/staff/:id/edit" element={<AddStaffMember />} />
                <Route path="/vendor/billing" element={<Billing />} />
                <Route path="/vendor/marketing/coupons" element={<Coupons />} />
                <Route path="/vendor/marketing/coupons/add" element={<AddCoupon />} />
                <Route path="/vendor/marketing/coupons/:id/edit" element={<AddCoupon />} />
                <Route path="/vendor/marketing/campaigns" element={<Campaigns />} />
                <Route path="/vendor/marketing/campaigns/add" element={<AddCampaign />} />
                <Route path="/vendor/marketing/campaigns/:id/edit" element={<AddCampaign />} />
                <Route path="/vendor/marketing/discounts" element={<Discounts />} />
                <Route path="/vendor/marketing/discounts/gifts" element={<GiftOffers />} />
                <Route path="/vendor/marketing/rewards" element={<RewardPoints />} />
                <Route path="/vendor/marketing/discounts/add" element={<AddDiscount />} />
                <Route path="/vendor/marketing/discounts/:id/edit" element={<AddDiscount />} />
                <Route path="/vendor/marketing/flash-sale" element={<FlashSales />} />
                <Route path="/vendor/marketing/flash-sale/add" element={<AddFlashSale />} />
                <Route path="/vendor/marketing/flash-sale/:id/edit" element={<AddFlashSale />} />
                <Route path="/vendor/marketing/gift-cards" element={<GiftCards />} />
                <Route path="/vendor/marketing/gift-cards/add" element={<AddGiftCard />} />
                <Route path="/vendor/marketing/gift-cards/:id" element={<GiftCardDetail />} />
                <Route path="/vendor/sms" element={<Sms />} />
                <Route path="/vendor/ai-automation/ai-chat-bot" element={<AiChatBot />} />
                <Route path="/vendor/finance/wallet" element={<Wallet />} />
                <Route path="/vendor/finance/reseller-earnings" element={<ResellerEarnings />} />
                <Route path="/vendor/finance/transactions" element={<Transactions />} />
                <Route path="/vendor/finance/referrals" element={<VendorReferrals />} />
                <Route path="/vendor/finance/receipts" element={<Receipts />} />
                <Route path="/vendor/finance/withdraw" element={<Withdraw />} />
                <Route path="/vendor/finance/fee-summary" element={<FeeSummary />} />
                <Route path="/vendor/finance/expenses" element={<Expenses />} />
                <Route path="/vendor/finance/payment-callback" element={<PaymentCallback />} />
                <Route path="/vendor/shipping/tracking" element={<Tracking />} />
                <Route path="/vendor/courier" element={<CourierIntegrationPage />} />
                <Route path="/vendor/courier/pathao" element={<PathaoPage />} />
                <Route path="/vendor/courier/steadfast" element={<SteadfastPage />} />
                <Route path="/vendor/courier/redx" element={<RedxPage />} />
                <Route path="/vendor/courier/carrybee" element={<CarrybeePage />} />
                <Route path="/vendor/courier/rules" element={<CourierRules />} />
                <Route path="/vendor/analytics" element={<AnalyticsPage />} />
                <Route path="/vendor/analytics/:tab" element={<AnalyticsLegacyRedirect />} />
                {/* LMS: a dashboard page with its own shell (LmsLayout: section tabs, lead
                    search, bell), so it renders inside VendorLayout like every other
                    vendor page (LMS-plan.md Step 4). */}
                <Route element={<LmsLayout />}>
                  <Route path="/vendor/lms" element={<Navigate to="/vendor/lms/leads" replace />} />
                  <Route path="/vendor/lms/leads" element={<LeadsPage />} />
                  <Route path="/vendor/lms/leads/import" element={<ImportLeadsPage />} />
                  <Route path="/vendor/lms/desk" element={<CallDeskPage />} />
                  <Route path="/vendor/lms/tasks" element={<TasksPage />} />
                  <Route path="/vendor/lms/reports" element={<ReportsPage />} />
                  <Route path="/vendor/lms/settings" element={<LmsSettingsPage />} />
                  <Route path="/vendor/lms/*" element={<Navigate to="/vendor/lms/leads" replace />} />
                </Route>
                {/* POS: same idea as the LMS, a dashboard page with its own section tabs
                    (POS-system-plan.md). The full-screen sell screen (Step 4) mounts outside VendorLayout. */}
                <Route element={<PosLayout />}>
                  <Route path="/vendor/pos" element={<Navigate to={POS_HOME} replace />} />
                  <Route path="/vendor/pos/registers" element={<PosRegistersPage />} />
                  <Route path="/vendor/pos/sessions" element={<PosSessionsPage />} />
                  <Route path="/vendor/pos/sales" element={<PosSalesPage />} />
                  <Route path="/vendor/pos/reports" element={<PosReportsPage />} />
                  <Route path="/vendor/pos/hardware" element={<PosHardwarePage />} />
                  <Route path="/vendor/pos/staff" element={<PosStaffPage />} />
                  <Route path="/vendor/pos/settings" element={<PosSettingsPage />} />
                  <Route path="/vendor/pos/*" element={<Navigate to={POS_HOME} replace />} />
                </Route>
                {vendorPlaceholderRoutes.map((r) => (
                  <Route key={r.path} path={r.path} element={<PlaceholderPage title={r.label} />} />
                ))}
              </Route>

              {/* The full-screen vendor pages below sit outside <VendorLayout>, so they get the
                  role check (rule-plan.md Step 7) from this gate instead of the layout's. */}
              <Route element={<VendorPageGate />}>
              {/* Landing page builder — deliberately OUTSIDE <VendorLayout>
                  so it renders full-screen with no dashboard sidebar/topbar
                  (landing-plan.md §4.2), while still sitting inside the same
                  VENDOR/STAFF ProtectedRoute as every other vendor route. */}
              <Route path="/vendor/store/landing-pages/:id/builder" element={<LandingPageBuilder />} />
              {/* Marketing > Campaigns > Popup builder: full screen like the landing page builder. */}
              <Route path="/vendor/marketing/campaigns/popup/new" element={<PopupCampaignBuilder />} />
              <Route path="/vendor/marketing/campaigns/popup/:id/edit" element={<PopupCampaignBuilder />} />
              {/* Pathao shipping labels (pathao-plan.md Step 12) — also
                  outside <VendorLayout>, so only the labels print. */}
              <Route path="/vendor/courier/pathao/labels" element={<PathaoLabelsPrintPage />} />
              {/* Courier handover sheet (TellMe idea 18): also outside <VendorLayout>, so only the sheet prints. */}
              <Route path="/vendor/orders/handover/:id/print" element={<HandoverSheetPrintPage />} />
              {/* POS counter (POS-system-plan.md Step 4): full screen, outside <VendorLayout>. */}
              <Route path="/vendor/pos/sell" element={<PosSellPage />} />
              {/* The customer-facing screen (Step 12): a second window fed by the counter tab. */}
              <Route path="/vendor/pos/display" element={<PosDisplayPage />} />
              </Route>
            </Route>

            {/* Super Admin dashboard — protected, SUPER_ADMIN role only */}
            <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/ai-settings" element={<AiSettings />} />
                <Route path="/admin/system-status" element={<SystemStatus />} />
                <Route path="/admin/feature-flags" element={<FeatureFlags />} />
                <Route path="/admin/shop" element={<AdminShop />} />
                <Route path="/admin/trust-safety" element={<TrustSafety />} />
                <Route path="/admin/verification" element={<AdminVerification />} />
                <Route path="/admin/resale-disputes" element={<AdminResaleDisputes />} />
                <Route path="/admin/receipt-details" element={<ReceiptDetails />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/admin/reviews" element={<AdminReviews />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/marketing" element={<AdminMarketing />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/addons" element={<AdminAddons />} />
                <Route path="/admin/vendors/all" element={<AllVendors />} />
                <Route path="/admin/renewals" element={<Renewals />} />
                <Route path="/admin/packs" element={<PacksAndPromos />} />
                <Route path="/admin/messages" element={<Messages />} />
                <Route path="/admin/automations" element={<Automations />} />
                <Route path="/admin/churn" element={<Churn />} />
                <Route path="/admin/economics" element={<Economics />} />
                <Route path="/admin/email" element={<AdminEmail />} />
                <Route path="/admin/product-insights" element={<ProductInsights />} />
                <Route path="/admin/delivery-times" element={<DeliveryTimes />} />
                <Route path="/admin/help" element={<HelpArticles />} />
                <Route path="/admin/changelog" element={<Changelog />} />
                <Route path="/admin/feature-requests" element={<FeatureRequests />} />
                <Route path="/admin/referrals" element={<AdminReferrals />} />
                <Route path="/admin/approvals" element={<Approvals />} />
                <Route path="/admin/domains" element={<AdminDomains />} />
                <Route path="/admin/staff" element={<Team />} />
                <Route path="/admin/finance/commission" element={<CommissionSettings />} />
                <Route path="/admin/customers" element={<AdminCustomers />} />
                <Route path="/admin/customers/:phone" element={<AdminShopperDetail />} />
                <Route path="/admin/orders" element={<AdminOrders />} />
                <Route path="/admin/orders/:orderId" element={<AdminOrderDetail />} />
                <Route path="/admin/finance/revenue" element={<PlatformRevenue />} />
                <Route path="/admin/vendors/pending" element={<PendingApproval />} />
                <Route path="/admin/vendors/suspended" element={<SuspendedVendors />} />
                <Route path="/admin/vendors/:vendorId" element={<StoreDetailPage />} />
                <Route path="/admin/plans" element={<PlanManagement />} />
                <Route path="/admin/plan-requests" element={<PlanRequests />} />
                <Route path="/admin/announcements" element={<Announcements />} />
                <Route path="/admin/support" element={<SupportInbox />} />
                <Route path="/admin/support/:id" element={<SupportInbox />} />
                <Route path="/admin/payment-gateway" element={<PaymentGatewayManagement />} />
                <Route path="/admin/finance/payouts" element={<Payouts />} />
                {adminPlaceholderRoutes.map((r) => (
                  <Route key={r.path} path={r.path} element={<PlaceholderPage title={r.label} />} />
                ))}
              </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/vendor/login" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthBootstrap>
    </QueryClientProvider>
  );
}