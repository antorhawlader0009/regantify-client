import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { ProtectedRoute } from './components/ProtectedRoute';
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
import GdprPrompt from './pages/vendor/store/GdprPrompt';
import { CustomCss, CustomHeadScripts } from './pages/vendor/store/design/CustomCodePage';
import JavaScriptCode from './pages/vendor/store/design/JavaScriptCode';
import EditJavaScript from './pages/vendor/store/design/EditJavaScript';
import CodGuard from './pages/vendor/store/CodGuard';
import Orders from './pages/vendor/order/Orders';
import IncompleteOrders from './pages/vendor/order/IncompleteOrders';
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
import Coupons from './pages/vendor/marketing/Coupons';
import AddCoupon from './pages/vendor/marketing/AddCoupon';
import Campaigns from './pages/vendor/marketing/Campaigns';
import AddCampaign from './pages/vendor/marketing/AddCampaign';
import Sms from './pages/vendor/sms/Sms';
import AiChatBot from './pages/vendor/ai-automation/AiChatBot';
import Wallet from './pages/vendor/finance/Wallet';
import Transactions from './pages/vendor/finance/Transactions';
import Withdraw from './pages/vendor/finance/Withdraw';
import FeeSummary from './pages/vendor/finance/FeeSummary';
import PaymentCallback from './pages/vendor/finance/PaymentCallback';
import Tracking from './pages/vendor/shipping/Tracking';
import AdminDashboard from './pages/admin/Dashboard';
import AiSettings from './pages/admin/ai/AiSettings';
import AllVendors from './pages/admin/vendors/AllVendors';
import PlanManagement from './pages/admin/plans/PlanManagement';
import PlanRequests from './pages/admin/plans/PlanRequests';
import PaymentGatewayManagement from './pages/admin/payment-gateway/PaymentGatewayManagement';
import Payouts from './pages/admin/finance/Payouts';

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
    r.path !== '/vendor/store/stock-settings' &&
    r.path !== '/vendor/store/gdpr' &&
    r.path !== '/vendor/store/cod-guard' &&
    r.path !== '/vendor/store/custom-css' &&
    r.path !== '/vendor/store/head-scripts' &&
    r.path !== '/vendor/store/javascript' &&
    r.path !== '/vendor/orders' &&
    r.path !== '/vendor/orders/incomplete' &&
    r.path !== '/vendor/customers' &&
    r.path !== '/vendor/reviews' &&
    r.path !== '/vendor/staff' &&
    r.path !== '/vendor/billing' &&
    r.path !== '/vendor/marketing/coupons' &&
    r.path !== '/vendor/marketing/campaigns' &&
    r.path !== '/vendor/sms' &&
    r.path !== '/vendor/ai-automation/ai-chat-bot' &&
    r.path !== '/vendor/finance/wallet' &&
    r.path !== '/vendor/finance/transactions' &&
    r.path !== '/vendor/finance/withdraw' &&
    r.path !== '/vendor/finance/fee-summary' &&
    r.path !== '/vendor/shipping/tracking',
);
const adminPlaceholderRoutes = flattenRoutes(adminNav).filter(
  (r) =>
    r.path !== '/admin/ai-settings' &&
    r.path !== '/admin/vendors/all' &&
    r.path !== '/admin/plans' &&
    r.path !== '/admin/plan-requests' &&
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
                <Route path="/vendor/store/stock-settings" element={<StockSettings />} />
                <Route path="/vendor/store/gdpr" element={<GdprPrompt />} />
                <Route path="/vendor/store/cod-guard" element={<CodGuard />} />
                <Route path="/vendor/store/custom-css" element={<CustomCss />} />
                <Route path="/vendor/store/head-scripts" element={<CustomHeadScripts />} />
                <Route path="/vendor/store/javascript" element={<JavaScriptCode />} />
                <Route path="/vendor/store/javascript/add" element={<EditJavaScript />} />
                <Route path="/vendor/store/javascript/edit/:id" element={<EditJavaScript />} />
                <Route path="/vendor/orders" element={<Orders />} />
                <Route path="/vendor/orders/incomplete" element={<IncompleteOrders />} />
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
                <Route path="/vendor/billing" element={<Billing />} />
                <Route path="/vendor/marketing/coupons" element={<Coupons />} />
                <Route path="/vendor/marketing/coupons/add" element={<AddCoupon />} />
                <Route path="/vendor/marketing/coupons/:id/edit" element={<AddCoupon />} />
                <Route path="/vendor/marketing/campaigns" element={<Campaigns />} />
                <Route path="/vendor/marketing/campaigns/add" element={<AddCampaign />} />
                <Route path="/vendor/marketing/campaigns/:id/edit" element={<AddCampaign />} />
                <Route path="/vendor/sms" element={<Sms />} />
                <Route path="/vendor/ai-automation/ai-chat-bot" element={<AiChatBot />} />
                <Route path="/vendor/finance/wallet" element={<Wallet />} />
                <Route path="/vendor/finance/transactions" element={<Transactions />} />
                <Route path="/vendor/finance/withdraw" element={<Withdraw />} />
                <Route path="/vendor/finance/fee-summary" element={<FeeSummary />} />
                <Route path="/vendor/finance/payment-callback" element={<PaymentCallback />} />
                <Route path="/vendor/shipping/tracking" element={<Tracking />} />
                {vendorPlaceholderRoutes.map((r) => (
                  <Route key={r.path} path={r.path} element={<PlaceholderPage title={r.label} />} />
                ))}
              </Route>

              {/* Landing page builder — deliberately OUTSIDE <VendorLayout>
                  so it renders full-screen with no dashboard sidebar/topbar
                  (landing-plan.md §4.2), while still sitting inside the same
                  VENDOR/STAFF ProtectedRoute as every other vendor route. */}
              <Route path="/vendor/store/landing-pages/:id/builder" element={<LandingPageBuilder />} />
            </Route>

            {/* Super Admin dashboard — protected, SUPER_ADMIN role only */}
            <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/ai-settings" element={<AiSettings />} />
                <Route path="/admin/vendors/all" element={<AllVendors />} />
                <Route path="/admin/plans" element={<PlanManagement />} />
                <Route path="/admin/plan-requests" element={<PlanRequests />} />
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