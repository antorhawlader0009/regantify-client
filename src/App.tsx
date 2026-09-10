import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthBootstrap } from './components/AuthBootstrap';
import { VendorLayout } from './components/layout/VendorLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { PlaceholderPage } from './components/PlaceholderPage';
import { vendorNav, adminNav } from './lib/navConfig';

import Home from './pages/marketing/Home';

import VendorPhoneEntry from './pages/auth/VendorPhoneEntry';
import VendorSignup from './pages/auth/VendorSignup';
import VendorVerifyOtp from './pages/auth/VendorVerifyOtp';
import VendorSetPassword from './pages/auth/VendorSetPassword';
import VendorCompleteProfile from './pages/auth/VendorCompleteProfile';
import VendorCompleteSetup from './pages/auth/VendorCompleteSetup';
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
import Orders from './pages/vendor/order/Orders';
import AddOrder from './pages/vendor/order/AddOrder';
import OrderDetail from './pages/vendor/order/OrderDetail';
import AdminDashboard from './pages/admin/Dashboard';

const queryClient = new QueryClient();

/** Flattens navConfig into { path, label } pairs, skipping Dashboard (has its own real page). */
function flattenRoutes(sections: typeof vendorNav) {
  const routes: { path: string; label: string }[] = [];
  for (const section of sections) {
    if (section.path && section.label !== 'Dashboard') {
      routes.push({ path: section.path, label: section.label });
    }
    if (section.children) {
      for (const child of section.children) {
        routes.push({ path: child.path, label: child.label });
      }
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
    r.path !== '/vendor/orders',
);
const adminPlaceholderRoutes = flattenRoutes(adminNav);

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

            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Vendor setup flow */}
            <Route element={<ProtectedRoute allowedRoles={['VENDOR']} />}>
              <Route path="/vendor/set-password" element={<VendorSetPassword />} />
              <Route path="/vendor/complete-profile" element={<VendorCompleteProfile />} />
            </Route>

            {/* Vendor dashboard — protected, VENDOR role only */}
            <Route element={<ProtectedRoute allowedRoles={['VENDOR']} />}>
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
                <Route path="/vendor/orders" element={<Orders />} />
                <Route path="/vendor/orders/add" element={<AddOrder />} />
                <Route path="/vendor/orders/:id" element={<OrderDetail />} />
                {vendorPlaceholderRoutes.map((r) => (
                  <Route key={r.path} path={r.path} element={<PlaceholderPage title={r.label} />} />
                ))}
              </Route>
            </Route>

            {/* Super Admin dashboard — protected, SUPER_ADMIN role only */}
            <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
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