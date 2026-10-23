import {
  Activity,
  Smartphone,
  ShieldCheck,
  History,
  ReceiptText,
  LayoutDashboard,
  PackageSearch,
  ClipboardList,
  Users,
  Truck,
  Plug,
  Wallet,
  Megaphone,
  BarChart3,
  Star,
  Flag,
  Bot,
  Store as StoreIcon,
  MessageSquare,
  UsersRound,
  PhoneCall,
  ScanBarcode,
  Headphones,
  Puzzle,
  Settings,
  CreditCard,
  Landmark,
  Percent,
  Tags,
  Banknote,
  RefreshCw,
  UserCog,
  BadgeCheck,
  Inbox,
  Sparkles,
  ToggleRight,
  ShoppingBag,
  ShieldAlert,
  Workflow,
  TrendingDown,
  Scale,
  Timer,
  Mail,
  BookOpen,
  Lightbulb,
  Gift,
  Globe,
  type LucideIcon,
} from 'lucide-react';

export interface NavLinkItem {
  label: string;
  path: string;
  /** Other pages that should keep this link highlighted (e.g. the pages a hub page opens). */
  alsoActive?: string[];
  /**
   * A Full mode page (SIMPLE-VIEW-plan.md): left out of the sidebar, tab bars and hubs in Simple mode, unless the person
   * pinned it, it is in use (LMS/POS in the plan) or they are on that very page. Search (Ctrl K), links and routes are
   * unaffected. lib/simpleView.ts reads these marks.
   */
  advanced?: boolean;
  /** A page behind a feature flag (super-admin-new.md Step 1): left out of the sidebar for stores the flag is off for. Guard its route with <FeatureGate> too. */
  flag?: string;
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
  /** A whole sub-group of advanced pages (see NavLinkItem.advanced). */
  advanced?: boolean;
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
  /** A top-level advanced page (see NavLinkItem.advanced). */
  advanced?: boolean;
  /** Its pages (all plain links) also show as a tab bar above each page, so they can be switched without the sidebar. */
  tabs?: boolean;
  /** Plain page links marked `pair` that sit next to each other share one row in the expanded sidebar (LMS | POS). */
  pair?: boolean;
  /** Opening this section in the sidebar also opens its first page (Product -> All Products). */
  openFirst?: boolean;
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
  '/vendor/store/chat-button',
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
  { label: 'LMS', icon: PhoneCall, group: 'Main Menu', path: '/vendor/lms', advanced: true, pair: true },
  // POS: selling over the counter, a dashboard page with its own section tabs (POS-system-plan.md).
  { label: 'POS', icon: ScanBarcode, group: 'Main Menu', path: '/vendor/pos', advanced: true, pair: true },
  // Under LMS | POS, also side by side: the Chrome extension's page (was Store > Connect Extension) and the app page.
  { label: 'Extension', icon: Plug, group: 'Main Menu', path: '/vendor/store/extension', pair: true },
  { label: 'App', icon: Smartphone, group: 'Main Menu', path: '/vendor/app', pair: true },
  {
    label: 'Product',
    icon: PackageSearch,
    group: 'Product',
    openFirst: true,
    children: [
      { label: 'All Products', path: '/vendor/product/all' },
      { label: 'Add Product', path: '/vendor/product/add' },
      { label: 'Categories', path: '/vendor/product/categories' },
      { label: 'Collections', path: '/vendor/product/collections', advanced: true },
      { label: 'Brands', path: '/vendor/product/brands', advanced: true },
      { label: 'Size Guides', path: '/vendor/product/size-guides', advanced: true },
      { label: 'Low Stock', path: '/vendor/product/low-stock' },
      { label: 'Stock Count', path: '/vendor/product/stock-count', advanced: true },
      { label: 'Stock History', path: '/vendor/product/stock-history', advanced: true },
      { label: 'Sell through resellers', path: '/vendor/product/resellers', flag: 'RESALE_SUPPLY' },
      { label: 'Find products to sell', path: '/vendor/product/resell', flag: 'RESALE_SELL' },
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
      { label: 'Campaigns', path: '/vendor/marketing/campaigns', advanced: true },
      { label: 'Discounts', path: '/vendor/marketing/discounts' },
      { label: 'Flash Sale', path: '/vendor/marketing/flash-sale', advanced: true },
      { label: 'Gift Cards', path: '/vendor/marketing/gift-cards', advanced: true },
      { label: 'Reward Points', path: '/vendor/marketing/rewards', advanced: true },
    ],
  },
  { label: 'SMS', icon: MessageSquare, group: 'Sales Marketing', path: '/vendor/sms' },
  {
    label: 'AI & Automation',
    icon: Bot,
    group: 'Sales Marketing',
    tabs: true,
    children: [
      { label: 'AI Chat Bot', path: '/vendor/ai-automation/ai-chat-bot', advanced: true },
      { label: 'n8n', path: '/vendor/ai-automation/n8n', advanced: true },
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
          { label: 'Header Editor', path: '/vendor/store/header-editor' },
          { label: 'Footer', path: '/vendor/store/footer' },
          { label: 'Layout Settings', path: '/vendor/store/layout-settings', advanced: true },
          { label: 'Site Banner', path: '/vendor/store/site-banner' },
          { label: 'Chat Button', path: '/vendor/store/chat-button' },
          { label: 'Product Display', path: '/vendor/store/product-display', advanced: true },
          { label: 'Product Card', path: '/vendor/store/product-card', advanced: true },
          { label: 'Trust Strip', path: '/vendor/store/trust-strip', advanced: true },
          { label: 'Store Reputation', path: '/vendor/store/reputation', advanced: true },
        ],
      },
      {
        label: 'Content',
        children: [
          { label: 'Pages', path: '/vendor/store/pages' },
          { label: 'Magazine', path: '/vendor/store/magazine', advanced: true },
          { label: 'FAQ', path: '/vendor/store/faq', advanced: true },
          { label: 'Social Feed', path: '/vendor/store/social-feed', advanced: true },
          { label: 'Share & QR', path: '/vendor/store/share', advanced: true },
          { label: 'Landing Page', path: '/vendor/store/landing-pages' },
          { label: 'Media', path: '/vendor/store/media' },
        ],
      },
      {
        label: 'Checkout',
        children: [
          { label: 'Payment Gateway', path: '/vendor/store/payment-gateway' },
          { label: 'Delivery Charge', path: '/vendor/store/delivery-charge' },
          { label: 'Stock Settings', path: '/vendor/store/stock-settings', advanced: true },
          { label: 'Invoice', path: '/vendor/store/invoice', advanced: true },
          { label: 'COD Guard', path: '/vendor/store/cod-guard' },
          { label: 'Form Fields', path: '/vendor/store/checkout-form', advanced: true },
          { label: 'Store Away', path: '/vendor/store/store-away', advanced: true },
          { label: 'Backup', path: '/vendor/store/backup', advanced: true },
          { label: 'Order Tracking', path: '/vendor/store/order-tracking' },
        ],
      },
      {
        label: 'SEO & Tracking',
        children: [
          { label: 'SEO', path: '/vendor/store/seo', advanced: true },
          { label: 'Integrations', path: '/vendor/store/integrations' },
        ],
      },
      {
        label: 'Store Settings',
        children: [
          { label: 'Domain', path: '/vendor/store/domain' },
          { label: 'Social', path: '/vendor/store/social' },
          { label: 'GDPR Prompt', path: '/vendor/store/gdpr', advanced: true },
        ],
      },
      {
        label: 'Custom Code',
        advanced: true,
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
      { label: 'CarryBee', path: '/vendor/courier/carrybee' },
      { label: 'Courier Rules', path: '/vendor/courier/rules', advanced: true },
      // The only other real standalone page in this group — see Tracking.tsx.
      { label: 'Tracking', path: '/vendor/shipping/tracking' },
    ],
  },
  // The Chat order saver Chrome extension: linking, AI instructions, privacy, saved chats and checkout links.
  {
    label: 'Finance',
    icon: Wallet,
    group: 'Account',
    children: [
      { label: 'Wallet', path: '/vendor/finance/wallet' },
      { label: 'Reseller earnings', path: '/vendor/finance/reseller-earnings', flag: 'RESALE_SELL' },
      { label: 'Transactions', path: '/vendor/finance/transactions' },
      { label: 'Expenses', path: '/vendor/finance/expenses', advanced: true },
      { label: 'Withdraw', path: '/vendor/finance/withdraw' },
      { label: 'Refer and earn', path: '/vendor/finance/referrals', advanced: true },
      { label: 'Fee Summary', path: '/vendor/finance/fee-summary', advanced: true },
      { label: 'Receipts', path: '/vendor/finance/receipts', advanced: true },
    ],
  },
  { label: 'Billing', icon: CreditCard, group: 'Account', path: '/vendor/billing' },
  { label: 'Staff', icon: UsersRound, group: 'Account', path: '/vendor/staff' },
  { label: 'Activity Log', icon: History, group: 'Account', path: '/vendor/activity', advanced: true },
  { label: 'Add-ons', icon: Puzzle, bottom: true, path: '/vendor/addons', advanced: true },
  { label: 'Support', icon: Headphones, bottom: true, path: '/vendor/support' },
  { label: 'Settings', icon: Settings, bottom: true, path: '/vendor/settings' },
];

/**
 * Super Admin's nav (design pass 2026-10-13). Flat links grouped by the job they do, not nested menus: the console rail (AdminSidebar) shows each group as a
 * collapsible heading. Paths are unchanged, so permissions (adminPermissions.ts PATH_ACCESS), Ctrl K and the routes in App.tsx keep working. Receipt details
 * lives in Settings > Company (its old page still opens by address).
 */
export const adminNav: NavSection[] = [
  { label: 'Dashboard', icon: LayoutDashboard, group: 'Overview', path: '/admin/dashboard' },
  { label: 'Analytics', icon: BarChart3, group: 'Overview', path: '/admin/analytics' },
  { label: 'Economics', icon: Scale, group: 'Overview', path: '/admin/economics' },
  { label: 'Product insights', icon: PackageSearch, group: 'Overview', path: '/admin/product-insights' },

  { label: 'All stores', icon: StoreIcon, group: 'Stores', path: '/admin/vendors/all' },
  { label: 'Pending approval', icon: BadgeCheck, group: 'Stores', path: '/admin/vendors/pending' },
  { label: 'Suspended', icon: Users, group: 'Stores', path: '/admin/vendors/suspended' },
  { label: 'Verification', icon: ShieldCheck, group: 'Stores', path: '/admin/verification' },
  { label: 'Store reports', icon: Flag, group: 'Stores', path: '/admin/reports' },
  { label: 'Reseller problems', icon: Flag, group: 'Stores', path: '/admin/resale-disputes' },
  { label: 'Trust and safety', icon: ShieldAlert, group: 'Stores', path: '/admin/trust-safety' },
  { label: 'Domains', icon: Globe, group: 'Stores', path: '/admin/domains' },
  { label: 'Delivery times', icon: Timer, group: 'Stores', path: '/admin/delivery-times' },

  { label: 'Orders', icon: ClipboardList, group: 'Commerce', path: '/admin/orders' },
  { label: 'Customers', icon: UsersRound, group: 'Commerce', path: '/admin/customers' },
  { label: 'Reviews', icon: Star, group: 'Commerce', path: '/admin/reviews' },

  { label: 'Platform revenue', icon: Landmark, group: 'Money', path: '/admin/finance/revenue' },
  { label: 'Payouts', icon: Banknote, group: 'Money', path: '/admin/finance/payouts' },
  { label: 'Commission', icon: Percent, group: 'Money', path: '/admin/finance/commission' },
  { label: 'Plans', icon: Wallet, group: 'Money', path: '/admin/plans' },
  { label: 'Plan requests', icon: Inbox, group: 'Money', path: '/admin/plan-requests' },
  { label: 'Renewals', icon: RefreshCw, group: 'Money', path: '/admin/renewals' },
  { label: 'Churn', icon: TrendingDown, group: 'Money', path: '/admin/churn' },
  { label: 'Referrals', icon: Gift, group: 'Money', path: '/admin/referrals' },
  { label: 'Packs and promos', icon: Tags, group: 'Money', path: '/admin/packs' },
  { label: 'Payment gateways', icon: CreditCard, group: 'Money', path: '/admin/payment-gateway' },

  { label: 'Support', icon: Headphones, group: 'Reach', path: '/admin/support' },
  { label: 'Messages', icon: MessageSquare, group: 'Reach', path: '/admin/messages' },
  { label: 'Automations', icon: Workflow, group: 'Reach', path: '/admin/automations' },
  { label: 'Help center', icon: BookOpen, group: 'Reach', path: '/admin/help' },
  { label: "What's new", icon: Sparkles, group: 'Reach', path: '/admin/changelog' },
  { label: 'Feature requests', icon: Lightbulb, group: 'Reach', path: '/admin/feature-requests' },
  { label: 'Announcements', icon: Megaphone, group: 'Reach', path: '/admin/announcements' },
  { label: 'Marketing', icon: Sparkles, group: 'Reach', path: '/admin/marketing' },

  { label: 'AI settings', icon: Bot, group: 'Platform', path: '/admin/ai-settings' },
  { label: 'System status', icon: Activity, group: 'Platform', path: '/admin/system-status' },
  { label: 'Email', icon: Mail, group: 'Platform', path: '/admin/email' },
  { label: 'Shop', icon: ShoppingBag, group: 'Platform', path: '/admin/shop' },
  { label: 'Feature flags', icon: ToggleRight, group: 'Platform', path: '/admin/feature-flags' },
  { label: 'Add-ons', icon: Puzzle, group: 'Platform', path: '/admin/addons' },
  { label: 'Approvals', icon: ShieldCheck, group: 'Platform', path: '/admin/approvals' },
  { label: 'Staff', icon: UserCog, group: 'Platform', path: '/admin/staff' },
  { label: 'Settings', icon: Settings, group: 'Platform', path: '/admin/settings' },
];

const isHere = (pathname: string, path: string) => pathname === path || pathname.startsWith(`${path}/`);

/** How many sidebar pages are marked advanced (0 = no "Advanced menu" button is needed for this person). */
/**
 * The nav without its advanced pages, unless `show` is on. A page you are standing on always stays, so the
 * sidebar and tab bar never lose the page you opened from search, a link or a bookmark. A section left with no
 * pages disappears. Only the sidebar and tab bar use this; search, breadcrumbs and routes use the full list.
 */
export function withoutAdvanced(sections: NavSection[], show: boolean, pathname: string, keep: string[] = []): NavSection[] {
  if (show) return sections;
  // A page stays when you are on it, or when it is in `keep` (pinned to the menu, or in use like LMS/POS in the plan).
  const stays = (path: string) => isHere(pathname, path) || keep.includes(path);
  const out: NavSection[] = [];
  for (const section of sections) {
    if (section.advanced && !(section.path && stays(section.path))) continue;
    if (!section.children) {
      out.push(section);
      continue;
    }
    const children = section.children
      .map((c): NavChild | null => {
        if (!isNavGroup(c)) return !c.advanced || stays(c.path) ? c : null;
        if (c.hidden) return c;
        const kept = c.children.filter((l) => !(c.advanced || l.advanced) || stays(l.path));
        return kept.length ? { ...c, children: kept } : null;
      })
      .filter((c): c is NavChild => c !== null);
    if (children.length > 0) out.push({ ...section, children });
  }
  return out;
}

/** The nav without links whose feature flag is off for this store (`on` = the store's on-flags). A section or group left empty disappears. */
export function withoutFlagged(sections: NavSection[], on: string[]): NavSection[] {
  const keep = (l: NavLinkItem) => !l.flag || on.includes(l.flag);
  return sections
    .map((section): NavSection | null => {
      if (!section.children) return section;
      const children = section.children
        .map((c): NavChild | null => {
          if (!isNavGroup(c)) return keep(c) ? c : null;
          const kept = c.children.filter(keep);
          return kept.length ? { ...c, children: kept } : null;
        })
        .filter((c): c is NavChild => c !== null);
      return children.length || section.path ? { ...section, children } : null;
    })
    .filter((s): s is NavSection => s !== null);
}

/** Every advanced page, grouped by its section, for the sidebar's "Advanced" list under the normal menu. */
