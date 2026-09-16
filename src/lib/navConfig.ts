import {
  LayoutDashboard,
  PackageSearch,
  ClipboardList,
  Users,
  Truck,
  Wallet,
  Megaphone,
  BarChart3,
  Star,
  Bot,
  Store as StoreIcon,
  Gift,
  MessageSquare,
  UsersRound,
  GraduationCap,
  Headphones,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavChild {
  label: string;
  path: string;
}

export interface NavSection {
  label: string;
  icon: LucideIcon;
  path?: string; // present when the top-level item itself is a page (e.g. Dashboard, Customers)
  children?: NavChild[];
}

/**
 * Mirrors Section 6 of the project brief exactly. Each child renders as a
 * placeholder page (just a heading) for now — see PlaceholderPage.tsx.
 */
export const vendorNav: NavSection[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/vendor/dashboard' },
  {
    label: 'Product',
    icon: PackageSearch,
    children: [
      { label: 'All Products', path: '/vendor/product/all' },
      { label: 'Add Product', path: '/vendor/product/add' },
      { label: 'Categories', path: '/vendor/product/categories' },
      { label: 'Collections', path: '/vendor/product/collections' },
      { label: 'Brands', path: '/vendor/product/brands' },
      { label: 'Low Stock', path: '/vendor/product/low-stock' },
    ],
  },
  {
    label: 'Order',
    icon: ClipboardList,
    children: [
      { label: 'Orders', path: '/vendor/orders' },
      { label: 'Incomplete Orders', path: '/vendor/orders/incomplete' },
    ],
  },
  { label: 'Customers', icon: Users, path: '/vendor/customers' },
  {
    label: 'Courier Integration',
    icon: Truck,
    children: [
      { label: 'Steadfast', path: '/vendor/shipping/shipments' },
      { label: 'Pathao', path: '/vendor/shipping/courier' },
      { label: 'Redex', path: '/vendor/shipping/tracking' },
      { label: 'Tracking', path: '/vendor/shipping/returns' },
    ],
  },
  {
    label: 'Finance',
    icon: Wallet,
    children: [
      { label: 'Wallet', path: '/vendor/finance/wallet' },
      { label: 'Transactions', path: '/vendor/finance/transactions' },
      { label: 'Earnings', path: '/vendor/finance/earnings' },
      { label: 'Withdraw', path: '/vendor/finance/withdraw' },
      { label: 'Fee Summary', path: '/vendor/finance/fee-summary' },
    ],
  },
  {
    label: 'Marketing',
    icon: Megaphone,
    children: [
      { label: 'Coupons', path: '/vendor/marketing/coupons' },
      { label: 'Campaigns', path: '/vendor/marketing/campaigns' },
      { label: 'Discounts', path: '/vendor/marketing/discounts' },
      { label: 'Flash Sale', path: '/vendor/marketing/flash-sale' },
      { label: 'Abandoned Cart', path: '/vendor/marketing/abandoned-cart' },
    ],
  },
  {
    label: 'Analytics',
    icon: BarChart3,
    children: [
      { label: 'Sales', path: '/vendor/analytics/sales' },
      { label: 'Orders', path: '/vendor/analytics/orders' },
      { label: 'Products', path: '/vendor/analytics/products' },
      { label: 'Customers', path: '/vendor/analytics/customers' },
    ],
  },
  { label: 'Reviews', icon: Star, path: '/vendor/reviews' },
  {
    label: 'AI & Automation',
    icon: Bot,
    children: [
      { label: 'AI Tools', path: '/vendor/ai-automation/ai-tools' },
      { label: 'Automation', path: '/vendor/ai-automation/automation' },
      { label: 'n8n', path: '/vendor/ai-automation/n8n' },
    ],
  },
  {
    label: 'Store',
    icon: StoreIcon,
    children: [
      { label: 'Themes', path: '/vendor/store/themes' },
      { label: 'Logo', path: '/vendor/store/logo' },
      { label: 'Customize', path: '/vendor/store/customize' },
      { label: 'Pages', path: '/vendor/store/pages' },
      { label: 'Social', path: '/vendor/store/social' },
      { label: 'Navigation', path: '/vendor/store/navigation' },
      { label: 'Domain', path: '/vendor/store/domain' },
      { label: 'SEO', path: '/vendor/store/seo' },
    ],
  },
  { label: 'Gift Cards', icon: Gift, path: '/vendor/gift-cards' },
  { label: 'SMS', icon: MessageSquare, path: '/vendor/sms' },
  { label: 'Staff', icon: UsersRound, path: '/vendor/staff' },
  { label: 'LMS System', icon: GraduationCap, path: '/vendor/lms' },
  { label: 'Support', icon: Headphones, path: '/vendor/support' },
  { label: 'Settings', icon: Settings, path: '/vendor/settings' },
];

/** Section 7 of the brief — Super Admin's own, simpler nav. */
export const adminNav: NavSection[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  {
    label: 'Vendors',
    icon: Users,
    children: [
      { label: 'All Vendors', path: '/admin/vendors/all' },
      { label: 'Pending Approval', path: '/admin/vendors/pending' },
      { label: 'Suspended Vendors', path: '/admin/vendors/suspended' },
    ],
  },
  { label: 'Orders', icon: ClipboardList, path: '/admin/orders' },
  { label: 'Customers', icon: UsersRound, path: '/admin/customers' },
  {
    label: 'Finance',
    icon: Wallet,
    children: [
      { label: 'Platform Revenue', path: '/admin/finance/revenue' },
      { label: 'Commission Settings', path: '/admin/finance/commission' },
      { label: 'Payouts', path: '/admin/finance/payouts' },
    ],
  },
  { label: 'Marketing', icon: Megaphone, path: '/admin/marketing' },
  { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  { label: 'Reviews', icon: Star, path: '/admin/reviews' },
  { label: 'AI Settings', icon: Bot, path: '/admin/ai-settings' },
  { label: 'Support', icon: Headphones, path: '/admin/support' },
  { label: 'Staff', icon: UsersRound, path: '/admin/staff' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
];
