import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { ProtectedRoute } from './components/ProtectedRoute';
import { VendorPageGate } from './components/staff/VendorPageGate';
import { AuthBootstrap } from './components/AuthBootstrap';
import { VendorLayout } from './components/layout/VendorLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { PlaceholderPage } from './components/PlaceholderPage';
import { vendorNav, adminNav, navLinks } from './lib/navConfig';

import Home from './pages/marketing/Home';

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
import AdminLogin from './pages/auth/AdminLogin';
import Unauthorized from './pages/Unauthorized';

import VendorDashboard from './pages/vendor/Dashboard';
import VendorSettings from './pages/vendor/Settings';
import VendorProfile from './pages/vendor/Profile';
import AddProduct from './pages/vendor/product/AddProduct';
import EditProduct from './pages/vendor/product/EditProduct';
import AllProducts from './pages/vendor/product/AllProducts';
import LowStock from './pages/vendor/product/LowStock';
import Categories from './pages/vendor/product/Categories';
import Brands from './pages/vendor/product/Brands';
import Collections from './pages/vendor/collection/Collections';
import AddCollection from './pages/vendor/collection/AddCollection';
import Themes from './pages/vendor/store/Themes';
import Pages from './pages/vendor/store/Pages';
import AddPage from './pages/vendor/store/AddPage';
import LandingPages from './pages/vendor/store/landing-pages/LandingPages';
import LandingPageBuilder from './pages/vendor/store/landing-pages/LandingPageBuilder';
import Footer from './pages/vendor/store/footer/Footer';
import Social from './pages/vendor/store/Social';
import Branding from './pages/vendor/store/Branding';
import Media from './pages/vendor/store/Media';
import Domain from './pages/vendor/store/Domain';
import PaymentGateway from './pages/vendor/store/PaymentGateway';
import StockSettings from './pages/vendor/store/StockSettings';
import OrderTracking from './pages/vendor/store/OrderTracking';
import DesignHub from './pages/vendor/store/DesignHub';
import DeliveryCharge from './pages/vendor/store/DeliveryCharge';
import GdprPrompt from './pages/vendor/store/GdprPrompt';
import { CustomCss, CustomHeadScripts } from './pages/vendor/store/design/CustomCodePage';
import JavaScriptCode from './pages/vendor/store/design/JavaScriptCode';
import HeaderEditor from './pages/vendor/store/design/HeaderEditor';
import LayoutSettings from './pages/vendor/store/design/LayoutSettings';
import Customize from './pages/vendor/store/design/Customize';
import SiteBanner from './pages/vendor/store/design/SiteBanner';
import ProductDisplay from './pages/vendor/store/design/ProductDisplay';
import ProductCardDisplay from './pages/vendor/store/design/ProductCardDisplay';
import EditJavaScript from './pages/vendor/store/design/EditJavaScript';
import CodGuard from './pages/vendor/store/CodGuard';
import Integrations from './pages/vendor/store/integrations/Integrations';
import FacebookPixel from './pages/vendor/store/integrations/FacebookPixel';
import MetaConversionsApi from './pages/vendor/store/integrations/MetaConversionsApi';
import GoogleAnalytics from './pages/vendor/store/integrations/GoogleAnalytics';
import AnalyticsPage, { AnalyticsLegacyRedirect } from './pages/vendor/analytics/AnalyticsPage';
import GoogleTagManager from './pages/vendor/store/integrations/GoogleTagManager';
import TiktokPixel from './pages/vendor/store/integrations/TiktokPixel';
import Webhooks from './pages/vendor/store/integrations/Webhooks';
import ExternalApi from './pages/vendor/store/integrations/ExternalApi';
import Orders from './pages/vendor/order/Orders';
import AddOrder from './pages/vendor/order/AddOrder';
import OrderDetail from './pages/vendor/order/OrderDetail';
import Customers from './pages/vendor/customer/Customers';
import CustomerDetails from './pages/vendor/customer/CustomerDetails';
import AddCustomer from './pages/vendor/customer/AddCustomer';
import BulkUploadCustomers from './pages/vendor/customer/BulkUploadCustomers';
import CustomerDetail from './pages/vendor/customer/CustomerDetail';
import EditCustomer from './pages/vendor/customer/EditCustomer';
import Reviews from './pages/vendor/review/Reviews';
import AddReview from './pages/vendor/review/AddReview';
import Staff from './pages/vendor/staff/Staff';
import AddStaffMember from './pages/vendor/staff/AddStaffMember';
import Billing from './pages/vendor/Billing';
import Notifications from './pages/vendor/Notifications';
import Coupons from './pages/vendor/marketing/Coupons';
import AddCoupon from './pages/vendor/marketing/AddCoupon';
import Campaigns from './pages/vendor/marketing/Campaigns';
import AddCampaign from './pages/vendor/marketing/AddCampaign';
import PopupCampaignBuilder from './pages/vendor/marketing/PopupCampaignBuilder';
import Discounts from './pages/vendor/marketing/Discounts';
import AddDiscount from './pages/vendor/marketing/AddDiscount';
import FlashSales from './pages/vendor/marketing/FlashSales';
import AddFlashSale from './pages/vendor/marketing/AddFlashSale';
import GiftCards from './pages/vendor/marketing/GiftCards';
import AddGiftCard from './pages/vendor/marketing/AddGiftCard';
import GiftCardDetail from './pages/vendor/marketing/GiftCardDetail';
import Sms from './pages/vendor/sms/Sms';
import AiChatBot from './pages/vendor/ai-automation/AiChatBot';
import Wallet from './pages/vendor/finance/Wallet';
import Transactions from './pages/vendor/finance/Transactions';
import Withdraw from './pages/vendor/finance/Withdraw';
import FeeSummary from './pages/vendor/finance/FeeSummary';
import PaymentCallback from './pages/vendor/finance/PaymentCallback';
import Tracking from './pages/vendor/shipping/Tracking';
import CourierIntegrationPage from './pages/vendor/courier/CourierIntegrationPage';
import PathaoPage from './pages/vendor/courier/pathao/PathaoPage';
import SteadfastPage from './pages/vendor/courier/steadfast/SteadfastPage';
import RedxPage from './pages/vendor/courier/redx/RedxPage';
import PathaoLabelsPrintPage from './pages/vendor/courier/pathao/PathaoLabelsPrintPage';
import AdminDashboard from './pages/admin/Dashboard';
import AiSettings from './pages/admin/ai/AiSettings';
import AllVendors from './pages/admin/vendors/AllVendors';
import PlanManagement from './pages/admin/plans/PlanManagement';
import PlanRequests from './pages/admin/plans/PlanRequests';
import SupportInbox from './pages/admin/support/SupportInbox';
import Support from './pages/vendor/support/Support';
import SupportTicket from './pages/vendor/support/SupportTicket';
import PaymentGatewayManagement from './pages/admin/payment-gateway/PaymentGatewayManagement';
import Payouts from './pages/admin/finance/Payouts';
import LeadsPage from './pages/vendor/lms/LeadsPage';
import CallDeskPage from './pages/vendor/lms/CallDeskPage';
import TasksPage from './pages/vendor/lms/TasksPage';
import ReportsPage from './pages/vendor/lms/ReportsPage';
import LmsSettingsPage from './pages/vendor/lms/LmsSettingsPage';
import ImportLeadsPage from './pages/vendor/lms/ImportLeadsPage';
import { LmsLayout } from './components/lms/LmsLayout';
import { PosLayout } from './components/pos/PosLayout';
import PosSettingsPage from './pages/vendor/pos/PosSettingsPage';
import PosRegistersPage from './pages/vendor/pos/PosRegistersPage';
import PosStaffPage from './pages/vendor/pos/PosStaffPage';
import PosSessionsPage from './pages/vendor/pos/PosSessionsPage';
import PosSalesPage from './pages/vendor/pos/PosSalesPage';
import PosReportsPage from './pages/vendor/pos/PosReportsPage';
import PosHardwarePage from './pages/vendor/pos/PosHardwarePage';
import PosSellPage from './pages/vendor/pos/PosSellPage';
import PosDisplayPage from './pages/vendor/pos/PosDisplayPage';
import { POS_HOME } from './lib/posApi';

const queryClient = new QueryClient();

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
    r.path !== '/vendor/product/all' &&
    r.path !== '/vendor/product/add' &&
    r.path !== '/vendor/product/categories' &&
    r.path !== '/vendor/product/brands' &&
    r.path !== '/vendor/product/collections' &&
    r.path !== '/vendor/product/low-stock' &&
    r.path !== '/vendor/store/themes' &&
    r.path !== '/vendor/store/pages' &&
    r.path !== '/vendor/store/landing-pages' &&
    r.path !== '/vendor/store/footer' &&
    r.path !== '/vendor/store/social' &&
    r.path !== '/vendor/store/branding' &&
    r.path !== '/vendor/store/media' &&
    r.path !== '/vendor/store/domain' &&
    r.path !== '/vendor/store/payment-gateway' &&
    r.path !== '/vendor/store/delivery-charge' &&
    r.path !== '/vendor/store/stock-settings' &&
    r.path !== '/vendor/store/order-tracking' &&
    r.path !== '/vendor/store/design' &&
    r.path !== '/vendor/store/gdpr' &&
    r.path !== '/vendor/store/cod-guard' &&
    r.path !== '/vendor/store/integrations' &&
    r.path !== '/vendor/store/header-editor' &&
    r.path !== '/vendor/store/layout-settings' &&
    r.path !== '/vendor/store/customize' &&
    r.path !== '/vendor/store/site-banner' &&
    r.path !== '/vendor/store/product-display' &&
    r.path !== '/vendor/store/product-card' &&
    r.path !== '/vendor/store/custom-css' &&
    r.path !== '/vendor/store/head-scripts' &&
    r.path !== '/vendor/store/javascript' &&
    r.path !== '/vendor/orders' &&
    r.path !== '/vendor/customers' &&
    r.path !== '/vendor/reviews' &&
    r.path !== '/vendor/staff' &&
    r.path !== '/vendor/billing' &&
    r.path !== '/vendor/marketing/coupons' &&
    r.path !== '/vendor/marketing/campaigns' &&
    r.path !== '/vendor/marketing/discounts' &&
    r.path !== '/vendor/marketing/flash-sale' &&
    r.path !== '/vendor/marketing/gift-cards' &&
    r.path !== '/vendor/sms' &&
    r.path !== '/vendor/ai-automation/ai-chat-bot' &&
    r.path !== '/vendor/finance/wallet' &&
    r.path !== '/vendor/finance/transactions' &&
    r.path !== '/vendor/finance/withdraw' &&
    r.path !== '/vendor/finance/fee-summary' &&
    r.path !== '/vendor/shipping/tracking' &&
    r.path !== '/vendor/courier' &&
    r.path !== '/vendor/courier/pathao' &&
    r.path !== '/vendor/courier/steadfast' &&
    r.path !== '/vendor/courier/redx' &&
    r.path !== '/vendor/analytics' &&
    !r.path.startsWith('/vendor/lms') &&
    !r.path.startsWith('/vendor/pos'),
);
const adminPlaceholderRoutes = flattenRoutes(adminNav).filter(
  (r) =>
    r.path !== '/admin/ai-settings' &&
    r.path !== '/admin/vendors/all' &&
    r.path !== '/admin/plans' &&
    r.path !== '/admin/plan-requests' &&
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
          <Routes>
            {/* Root → marketing landing page */}
            <Route path="/" element={<Home />} />

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
                <Route path="/vendor/support" element={<Support />} />
                <Route path="/vendor/support/:id" element={<SupportTicket />} />
                <Route path="/vendor/product/add" element={<AddProduct />} />
                <Route path="/vendor/product/edit/:id" element={<EditProduct />} />
                <Route path="/vendor/product/all" element={<AllProducts />} />
                <Route path="/vendor/product/low-stock" element={<LowStock />} />
                <Route path="/vendor/product/categories" element={<Categories />} />
                <Route path="/vendor/product/brands" element={<Brands />} />
                <Route path="/vendor/product/collections" element={<Collections />} />
                <Route path="/vendor/product/collections/add" element={<AddCollection />} />
                <Route path="/vendor/product/collections/edit/:id" element={<AddCollection />} />
                <Route path="/vendor/store/themes" element={<Themes />} />
                <Route path="/vendor/store/pages" element={<Pages />} />
                <Route path="/vendor/store/pages/add" element={<AddPage />} />
                <Route path="/vendor/store/pages/edit/:id" element={<AddPage />} />
                <Route path="/vendor/store/landing-pages" element={<LandingPages />} />
                <Route path="/vendor/store/footer" element={<Footer />} />
                <Route path="/vendor/store/social" element={<Social />} />
                <Route path="/vendor/store/branding" element={<Branding />} />
                <Route path="/vendor/store/media" element={<Media />} />
                <Route path="/vendor/store/domain" element={<Domain />} />
                <Route path="/vendor/store/payment-gateway" element={<PaymentGateway />} />
                <Route path="/vendor/store/delivery-charge" element={<DeliveryCharge />} />
                <Route path="/vendor/store/stock-settings" element={<StockSettings />} />
                <Route path="/vendor/store/order-tracking" element={<OrderTracking />} />
                <Route path="/vendor/store/design" element={<DesignHub />} />
                <Route path="/vendor/store/gdpr" element={<GdprPrompt />} />
                <Route path="/vendor/store/cod-guard" element={<CodGuard />} />
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
                <Route path="/vendor/store/product-display" element={<ProductDisplay />} />
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
                <Route path="/vendor/orders/:id" element={<OrderDetail />} />
                <Route path="/vendor/customers" element={<Customers />} />
                <Route path="/vendor/customers/details" element={<CustomerDetails />} />
                <Route path="/vendor/customers/add" element={<AddCustomer />} />
                <Route path="/vendor/customers/bulk-upload" element={<BulkUploadCustomers />} />
                <Route path="/vendor/customers/:phone/edit" element={<EditCustomer />} />
                <Route path="/vendor/customers/:phone" element={<CustomerDetail />} />
                <Route path="/vendor/reviews" element={<Reviews />} />
                <Route path="/vendor/reviews/add" element={<AddReview />} />
                <Route path="/vendor/reviews/:id/edit" element={<AddReview />} />
                <Route path="/vendor/staff" element={<Staff />} />
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
                <Route path="/vendor/finance/transactions" element={<Transactions />} />
                <Route path="/vendor/finance/withdraw" element={<Withdraw />} />
                <Route path="/vendor/finance/fee-summary" element={<FeeSummary />} />
                <Route path="/vendor/finance/payment-callback" element={<PaymentCallback />} />
                <Route path="/vendor/shipping/tracking" element={<Tracking />} />
                <Route path="/vendor/courier" element={<CourierIntegrationPage />} />
                <Route path="/vendor/courier/pathao" element={<PathaoPage />} />
                <Route path="/vendor/courier/steadfast" element={<SteadfastPage />} />
                <Route path="/vendor/courier/redx" element={<RedxPage />} />
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
                <Route path="/admin/vendors/all" element={<AllVendors />} />
                <Route path="/admin/plans" element={<PlanManagement />} />
                <Route path="/admin/plan-requests" element={<PlanRequests />} />
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
        </BrowserRouter>
      </AuthBootstrap>
    </QueryClientProvider>
  );
}