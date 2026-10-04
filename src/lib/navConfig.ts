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
  MessageSquare,
  UsersRound,
  PhoneCall,
  ScanBarcode,
  Headphones,
  Settings,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';

export interface NavLinkItem {
  label: string;
  path: string;
  /** Other pages that should keep this link highlighted (e.g. the pages a hub page opens). */
  alsoActive?: string[];
}

/** A collapsible sub-group inside a section (e.g. Store > Design). One level deep only. */
export interface NavGroup {
  label: string;
  children: NavLinkItem[];
  /**
   * Not shown in the sidebar: its pages are reached from a hub page (see Store > Design). They still count for
   * the breadcrumb, the search, the assistant's page list and the section highlight.
   */
  hidden?: boolean;
  /** For a hidden group: the hub page its pages show a "back" link to. */
  hubPath?: string;
}

export type NavChild = NavLinkItem | NavGroup;

export const isNavGroup = (child: NavChild): child is NavGroup => 'children' in child;

/** Every link under a section, with sub-groups flattened out. */
export const navLinks = (children: NavChild[] = []): NavLinkItem[] =>
  children.flatMap((c) => (isNavGroup(c) ? c.children : [c]));

export interface NavSection {
  label: string;
  icon: LucideIcon;
  path?: string; // present when the top-level item itself is a page (e.g. Dashboard, Customers)
  children?: NavChild[];
  /** Sidebar heading; consecutive sections with the same group share one heading. */
  group?: string;
  /** Pinned to the sidebar's bottom bar, which never scrolls. */
  bottom?: boolean;
  /** Its pages (all plain links) also show as a tab bar above each page, so they can be switched without the sidebar. */
  tabs?: boolean;
}

/**
 * Mirrors Section 6 of the project brief exactly. Each child renders as a
 * placeholder page (just a heading) for now — see PlaceholderPage.tsx.
 */
// The pages the Store > Design hub opens (see designPages.ts); kept highlighted under the "Design" link.
const DESIGN_PAGE_PATHS = [
  '/vendor/store/branding',
  '/vendor/store/customize',
  '/vendor/store/navigation',
  '/vendor/store/header-editor',
  '/vendor/store/footer',
  '/vendor/store/layout-settings',
  '/vendor/store/site-banner',
  '/vendor/store/product-display',
  '/vendor/store/product-card',
  '/vendor/store/themes',
];

export const vendorNav: NavSection[] = [
  { label: 'Dashboard', icon: LayoutDashboard, group: 'Main Menu', path: '/vendor/dashboard' },
  // One page with its own tabs (Overview/Sales/Orders/...), see AnalyticsPage.tsx.
  { label: 'Analytics', icon: BarChart3, group: 'Main Menu', path: '/vendor/analytics' },
  // Abandoned carts are a tab on the Orders page, not a separate nav entry.
  { label: 'Orders', icon: ClipboardList, group: 'Main Menu', path: '/vendor/orders' },
  { label: 'Customers', icon: Users, group: 'Main Menu', path: '/vendor/customers' },
  // LMS: a dashboard page with its own section tabs (LMS-plan.md Step 4). Its sections
  // (Leads, Call Desk, Tasks, Reports, Settings) are tabs at the top of the page.
  { label: 'LMS', icon: PhoneCall, group: 'Main Menu', path: '/vendor/lms' },
  // POS: selling over the counter, a dashboard page with its own section tabs (POS-system-plan.md).
  { label: 'POS', icon: ScanBarcode, group: 'Main Menu', path: '/vendor/pos' },
  {
    label: 'Product',
    icon: PackageSearch,
    group: 'Product',
    children: [
      { label: 'All Products', path: '/vendor/product/all' },
      { label: 'Add Product', path: '/vendor/product/add' },
      { label: 'Categories', path: '/vendor/product/categories' },
      { label: 'Collections', path: '/vendor/product/collections' },
      { label: 'Brands', path: '/vendor/product/brands' },
      { label: 'Low Stock', path: '/vendor/product/low-stock' },
    ],
  },
  { label: 'Reviews', icon: Star, group: 'Product', path: '/vendor/reviews' },
  {
    label: 'Marketing',
    icon: Megaphone,
    group: 'Sales Marketing',
    tabs: true,
    children: [
      { label: 'Coupons', path: '/vendor/marketing/coupons' },
      { label: 'Campaigns', path: '/vendor/marketing/campaigns' },
      { label: 'Discounts', path: '/vendor/marketing/discounts' },
      { label: 'Flash Sale', path: '/vendor/marketing/flash-sale' },
      { label: 'Gift Cards', path: '/vendor/marketing/gift-cards' },
    ],
  },
  { label: 'SMS', icon: MessageSquare, group: 'Sales Marketing', path: '/vendor/sms' },
  {
    label: 'AI & Automation',
    icon: Bot,
    group: 'Sales Marketing',
    tabs: true,
    children: [
      { label: 'AI Chat Bot', path: '/vendor/ai-automation/ai-chat-bot' },
      { label: 'AI Tools', path: '/vendor/ai-automation/ai-tools' },
      { label: 'Automation', path: '/vendor/ai-automation/automation' },
      { label: 'n8n', path: '/vendor/ai-automation/n8n' },
    ],
  },
  {
    label: 'Store',
    icon: StoreIcon,
    group: 'Store',
    children: [
      { label: 'Templates', path: '/vendor/store/themes' },
      { label: 'Design', path: '/vendor/store/design', alsoActive: DESIGN_PAGE_PATHS },
      {
        label: 'Design',
        hidden: true,
        hubPath: '/vendor/store/design',
        children: [
          { label: 'Branding', path: '/vendor/store/branding' },
          { label: 'Customize', path: '/vendor/store/customize' },
          { label: 'Navigation', path: '/vendor/store/navigation' },
          { label: 'Header Editor', path: '/vendor/store/header-editor' },
          { label: 'Footer', path: '/vendor/store/footer' },
          { label: 'Layout Settings', path: '/vendor/store/layout-settings' },
          { label: 'Site Banner', path: '/vendor/store/site-banner' },
          { label: 'Product Display', path: '/vendor/store/product-display' },
          { label: 'Product Card', path: '/vendor/store/product-card' },
        ],
      },
      {
        label: 'Content',
        children: [
          { label: 'Pages', path: '/vendor/store/pages' },
          { label: 'Landing Page', path: '/vendor/store/landing-pages' },
          { label: 'Media', path: '/vendor/store/media' },
        ],
      },
      {
        label: 'Checkout',
        children: [
          { label: 'Payment Gateway', path: '/vendor/store/payment-gateway' },
          { label: 'Delivery Charge', path: '/vendor/store/delivery-charge' },
          { label: 'Stock Settings', path: '/vendor/store/stock-settings' },
          { label: 'COD Guard', path: '/vendor/store/cod-guard' },
          { label: 'Order Tracking', path: '/vendor/store/order-tracking' },
        ],
      },
      {
        label: 'SEO & Tracking',
        children: [
          { label: 'SEO', path: '/vendor/store/seo' },
          { label: 'Integrations', path: '/vendor/store/integrations' },
        ],
      },
      {
        label: 'Store Settings',
        children: [
          { label: 'Domain', path: '/vendor/store/domain' },
          { label: 'Social', path: '/vendor/store/social' },
          { label: 'GDPR Prompt', path: '/vendor/store/gdpr' },
        ],
      },
      {
        label: 'Custom Code',
        children: [
          { label: 'Custom CSS', path: '/vendor/store/custom-css' },
          { label: 'Custom Head Scripts', path: '/vendor/store/head-scripts' },
          { label: 'JavaScript Code', path: '/vendor/store/javascript' },
        ],
      },
    ],
  },
  {
    label: 'Courier Integration',
    icon: Truck,
    group: 'Store',
    children: [
      // Each courier has its own full page (Dashboard/Parcels/Settings —
      // see pages/vendor/courier/{steadfast,pathao,redx}/); the shared
      // hub (CourierIntegrationPage) lists all three. Real API booking
      // is done from the Orders page's Actions menu.
      { label: 'Steadfast', path: '/vendor/courier/steadfast' },
      { label: 'Pathao', path: '/vendor/courier/pathao' },
      { label: 'RedX', path: '/vendor/courier/redx' },
      // The only other real standalone page in this group — see Tracking.tsx.
      { label: 'Tracking', path: '/vendor/shipping/tracking' },
    ],
  },
  {
    label: 'Finance',
    icon: Wallet,
    group: 'Account',
    children: [
      { label: 'Wallet', path: '/vendor/finance/wallet' },
      { label: 'Transactions', path: '/vendor/finance/transactions' },
      { label: 'Earnings', path: '/vendor/finance/earnings' },
      { label: 'Withdraw', path: '/vendor/finance/withdraw' },
      { label: 'Fee Summary', path: '/vendor/finance/fee-summary' },
    ],
  },
  { label: 'Billing', icon: CreditCard, group: 'Account', path: '/vendor/billing' },
  { label: 'Staff', icon: UsersRound, group: 'Account', path: '/vendor/staff' },
  { label: 'Support', icon: Headphones, bottom: true, path: '/vendor/support' },
  { label: 'Settings', icon: Settings, bottom: true, path: '/vendor/settings' },
];

/** Section 7 of the brief — Super Admin's own, simpler nav. */
export const adminNav: NavSection[] = [
  { label: 'Dashboard', icon: LayoutDashboard, group: 'Main Menu', path: '/admin/dashboard' },
  { label: 'Analytics', icon: BarChart3, group: 'Main Menu', path: '/admin/analytics' },
  { label: 'Orders', icon: ClipboardList, group: 'Main Menu', path: '/admin/orders' },
  { label: 'Customers', icon: UsersRound, group: 'Main Menu', path: '/admin/customers' },
  {
    label: 'Vendors',
    icon: Users,
    group: 'Vendors',
    children: [
      { label: 'All Vendors', path: '/admin/vendors/all' },
      { label: 'Pending Approval', path: '/admin/vendors/pending' },
      { label: 'Suspended Vendors', path: '/admin/vendors/suspended' },
    ],
  },
  {
    label: 'Plans',
    icon: CreditCard,
    group: 'Vendors',
    children: [
      { label: 'Manage Plans', path: '/admin/plans' },
      { label: 'Plan Requests', path: '/admin/plan-requests' },
    ],
  },
  { label: 'Payment Gateway', icon: CreditCard, group: 'Vendors', path: '/admin/payment-gateway' },
  {
    label: 'Finance',
    icon: Wallet,
    group: 'Operations',
    children: [
      { label: 'Platform Revenue', path: '/admin/finance/revenue' },
      { label: 'Commission Settings', path: '/admin/finance/commission' },
      { label: 'Payouts', path: '/admin/finance/payouts' },
    ],
  },
  { label: 'Marketing', icon: Megaphone, group: 'Operations', path: '/admin/marketing' },
  { label: 'Reviews', icon: Star, group: 'Operations', path: '/admin/reviews' },
  { label: 'AI Settings', icon: Bot, group: 'Operations', path: '/admin/ai-settings' },
  { label: 'Staff', icon: UsersRound, group: 'Operations', path: '/admin/staff' },
  { label: 'Support', icon: Headphones, bottom: true, path: '/admin/support' },
  { label: 'Settings', icon: Settings, bottom: true, path: '/admin/settings' },
];
