import { Briefcase, Calculator, Eye, Headset, Megaphone, ShieldCheck, SlidersHorizontal, Truck, UserRound, type LucideIcon } from 'lucide-react';
import { isNavGroup, type NavChild, type NavLinkItem, type NavSection } from './navConfig';

/**
 * Staff roles and permissions (rule-plan.md Step 1). A hand-kept copy of
 * server/src/staff/staff-permissions.ts plus what the UI needs (labels,
 * role cards, area groups, which nav page needs what); change both
 * together. The server is what actually enforces these; the client only
 * uses them to hide what someone can't open.
 *
 * The store owner never goes through this: the owner can do everything,
 * including STAFF_OWNER_ONLY, which no role can ever get.
 */

export const STAFF_PERMISSIONS = [
  'dashboard.view',
  'analytics.view',
  'analytics.profit',
  'orders.view',
  'orders.create',
  'orders.edit',
  'orders.cancel_refund',
  'orders.courier',
  'orders.delete',
  'customers.view',
  'customers.edit',
  'customers.contact',
  'customers.export',
  'customers.delete',
  'products.view',
  'products.edit',
  'products.price',
  'products.cost',
  'products.delete',
  'reviews.view',
  'reviews.edit',
  'marketing.view',
  'marketing.edit',
  'marketing.gift_cards',
  'sms.view',
  'sms.manage',
  'ai.use',
  'ai.manage',
  'lms.access',
  'pos.access',
  'store.design',
  'store.content',
  'store.checkout',
  'store.settings',
  'store.code',
  'courier.manage',
  'finance.view',
] as const;
export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];

const PERMISSION_SET: ReadonlySet<string> = new Set(STAFF_PERMISSIONS);

export function isStaffPermission(value: string): value is StaffPermission {
  return PERMISSION_SET.has(value);
}

/** Changing something means seeing it; followed transitively by expandImplied. */
export const PERMISSION_IMPLIES: Partial<Record<StaffPermission, readonly StaffPermission[]>> = {
  'analytics.profit': ['analytics.view'],
  'orders.create': ['orders.view', 'customers.contact'],
  'orders.edit': ['orders.view', 'customers.contact'],
  'orders.cancel_refund': ['orders.edit'],
  'orders.courier': ['orders.view'],
  'orders.delete': ['orders.view'],
  'customers.edit': ['customers.contact'],
  'customers.contact': ['customers.view'],
  'customers.export': ['customers.contact'],
  'customers.delete': ['customers.contact'],
  'products.edit': ['products.view'],
  'products.price': ['products.edit'],
  'products.cost': ['products.view'],
  'products.delete': ['products.view'],
  'reviews.edit': ['reviews.view'],
  'marketing.edit': ['marketing.view'],
  'marketing.gift_cards': ['marketing.view'],
  'sms.manage': ['sms.view'],
  'ai.manage': ['ai.use'],
  'lms.access': ['customers.contact'],
};

/** Drops unknown keys, adds what each one implies, and returns them in catalog order. */
export function expandImplied(permissions: Iterable<string>): StaffPermission[] {
  const out = new Set<StaffPermission>();
  const stack = [...permissions].filter(isStaffPermission);
  while (stack.length) {
    const p = stack.pop()!;
    if (out.has(p)) continue;
    out.add(p);
    stack.push(...(PERMISSION_IMPLIES[p] ?? []));
  }
  return STAFF_PERMISSIONS.filter((p) => out.has(p));
}

/** Short words for one permission, used in the custom role table and the "can't" line. */
export const PERMISSION_LABELS: Record<StaffPermission, string> = {
  'dashboard.view': 'See dashboard numbers',
  'analytics.view': 'See reports',
  'analytics.profit': 'See cost and profit',
  'orders.view': 'See orders',
  'orders.create': 'Add manual orders',
  'orders.edit': 'Change orders',
  'orders.cancel_refund': 'Cancel and refund',
  'orders.courier': 'Book courier',
  'orders.delete': 'Move to trash',
  'customers.view': 'See customers',
  'customers.edit': 'Change customers',
  'customers.contact': 'See full phone and email',
  'customers.export': 'Export customer list',
  'customers.delete': 'Delete customers',
  'products.view': 'See products',
  'products.edit': 'Add and edit products',
  'products.price': 'Change prices',
  'products.cost': 'See cost price',
  'products.delete': 'Delete products',
  'reviews.view': 'See reviews',
  'reviews.edit': 'Manage reviews',
  'marketing.view': 'See marketing',
  'marketing.edit': 'Run coupons, campaigns and sales',
  'marketing.gift_cards': 'Gift cards',
  'sms.view': 'See SMS credits and logs',
  'sms.manage': 'Send SMS to customers',
  'ai.use': 'Use AI tools',
  'ai.manage': 'Set up chatbot and automation',
  'lms.access': 'Open LMS',
  'pos.access': 'Open POS',
  'store.design': 'Change store design',
  'store.content': 'Edit pages and media',
  'store.checkout': 'Change checkout settings',
  'store.settings': 'Change domain, social, SEO and GDPR',
  'store.code': 'Change tracking and custom code',
  'courier.manage': 'Connect couriers',
  'finance.view': 'See wallet and earnings',
};

/**
 * The dashboard areas, in sidebar order. Each permission sits in exactly
 * one area. `label` is the chip on the "Dashboard access" card; the
 * columns are the custom role table (View / Add & edit / Delete / Export /
 * Extra). Areas that are one switch (Store design, POS, ...) use just one column.
 */
export interface StaffPermissionArea {
  key: string;
  label: string;
  view?: StaffPermission;
  edit?: StaffPermission;
  delete?: StaffPermission;
  export?: StaffPermission;
  extras?: readonly StaffPermission[];
}

export const STAFF_PERMISSION_AREAS: readonly StaffPermissionArea[] = [
  { key: 'dashboard', label: 'Dashboard', view: 'dashboard.view' },
  { key: 'analytics', label: 'Analytics', view: 'analytics.view', extras: ['analytics.profit'] },
  {
    key: 'orders',
    label: 'Orders',
    view: 'orders.view',
    edit: 'orders.edit',
    delete: 'orders.delete',
    extras: ['orders.create', 'orders.cancel_refund', 'orders.courier'],
  },
  {
    key: 'customers',
    label: 'Customers',
    view: 'customers.view',
    edit: 'customers.edit',
    delete: 'customers.delete',
    export: 'customers.export',
    extras: ['customers.contact'],
  },
  { key: 'lms', label: 'LMS', view: 'lms.access' },
  { key: 'pos', label: 'POS', view: 'pos.access' },
  {
    key: 'products',
    label: 'Products',
    view: 'products.view',
    edit: 'products.edit',
    delete: 'products.delete',
    extras: ['products.price', 'products.cost'],
  },
  { key: 'reviews', label: 'Reviews', view: 'reviews.view', edit: 'reviews.edit' },
  { key: 'marketing', label: 'Marketing', view: 'marketing.view', edit: 'marketing.edit', extras: ['marketing.gift_cards'] },
  { key: 'sms', label: 'SMS', view: 'sms.view', edit: 'sms.manage' },
  { key: 'ai', label: 'AI & Automation', extras: ['ai.use', 'ai.manage'] },
  { key: 'design', label: 'Store design', edit: 'store.design' },
  { key: 'content', label: 'Content', edit: 'store.content' },
  { key: 'checkout', label: 'Checkout settings', edit: 'store.checkout' },
  { key: 'settings', label: 'Store settings', edit: 'store.settings' },
  { key: 'code', label: 'Tracking & code', edit: 'store.code' },
  { key: 'couriers', label: 'Couriers', edit: 'courier.manage' },
  { key: 'finance', label: 'Finance', view: 'finance.view' },
];

export function areaPermissions(area: StaffPermissionArea): StaffPermission[] {
  return [area.view, area.edit, area.delete, area.export, ...(area.extras ?? [])].filter((p): p is StaffPermission => Boolean(p));
}

/** The areas someone can open at all: the chips on the "Dashboard access" card. */
export function accessAreas(permissions: readonly StaffPermission[]): StaffPermissionArea[] {
  const has = new Set(permissions);
  return STAFF_PERMISSION_AREAS.filter((area) => areaPermissions(area).some((p) => has.has(p)));
}

/** Same strings as the server's StaffRoleKey, in picker order. */
export const STAFF_ROLE_KEYS = ['ADMIN', 'MANAGER', 'STAFF', 'CS_TEAM', 'DELIVERY', 'MARKETING', 'ACCOUNTS', 'VIEWER', 'CUSTOM'] as const;
export type StaffRoleKey = (typeof STAFF_ROLE_KEYS)[number];
export type PresetRoleKey = Exclude<StaffRoleKey, 'CUSTOM'>;

/** The ready-made roles (rule-plan.md 5.4), without implied keys; permissionsFor expands them. */
export const STAFF_ROLE_PRESETS: Record<PresetRoleKey, readonly StaffPermission[]> = {
  ADMIN: STAFF_PERMISSIONS,
  MANAGER: [
    'dashboard.view',
    'analytics.profit',
    'orders.create',
    'orders.cancel_refund',
    'orders.courier',
    'orders.delete',
    'customers.edit',
    'customers.export',
    'products.price',
    'products.cost',
    'reviews.edit',
    'marketing.edit',
    'marketing.gift_cards',
    'sms.manage',
    'ai.use',
    'lms.access',
    'pos.access',
    'store.content',
  ],
  STAFF: ['orders.create', 'orders.edit', 'orders.courier', 'customers.edit', 'customers.contact', 'products.view', 'reviews.edit', 'lms.access', 'pos.access'],
  CS_TEAM: ['orders.create', 'orders.edit', 'customers.edit', 'customers.contact', 'products.view', 'reviews.edit', 'sms.view', 'ai.use', 'lms.access'],
  DELIVERY: ['orders.edit', 'orders.courier', 'customers.contact', 'products.view', 'courier.manage'],
  MARKETING: [
    'dashboard.view',
    'analytics.view',
    'customers.view',
    'products.view',
    'reviews.edit',
    'marketing.edit',
    'marketing.gift_cards',
    'sms.manage',
    'ai.use',
    'store.content',
  ],
  ACCOUNTS: ['dashboard.view', 'analytics.profit', 'orders.view', 'customers.view', 'products.cost', 'marketing.view', 'sms.view', 'finance.view'],
  VIEWER: ['dashboard.view', 'analytics.view', 'orders.view', 'customers.view', 'products.view', 'reviews.view', 'marketing.view'],
};

/** Lowest Plan.staffRoleTier that may assign each role: 0 Free, 1 Basic, 2 Starter, 3 Advance. */
export const STAFF_ROLE_MIN_TIER: Record<StaffRoleKey, number> = {
  ADMIN: 0,
  MANAGER: 1,
  STAFF: 1,
  VIEWER: 1,
  CS_TEAM: 2,
  DELIVERY: 2,
  MARKETING: 2,
  ACCOUNTS: 2,
  CUSTOM: 3,
};

export function roleAllowedOnTier(roleKey: StaffRoleKey, tier: number): boolean {
  return tier >= STAFF_ROLE_MIN_TIER[roleKey];
}

export function permissionsFor(member: { roleKey: StaffRoleKey; customPermissions?: readonly string[] | null }): StaffPermission[] {
  if (member.roleKey === 'CUSTOM') return expandImplied(member.customPermissions ?? []);
  return expandImplied(STAFF_ROLE_PRESETS[member.roleKey]);
}

/** What the role picker shows for each role. */
export const STAFF_ROLES: Record<StaffRoleKey, { name: string; description: string; icon: LucideIcon }> = {
  ADMIN: { name: 'Admin', description: 'Runs the whole store, except staff, billing and withdrawals.', icon: ShieldCheck },
  MANAGER: { name: 'Manager', description: 'Products, orders, customers, marketing and reports. No store settings or money.', icon: Briefcase },
  STAFF: { name: 'Staff', description: 'Day-to-day orders, packing and customer help.', icon: UserRound },
  CS_TEAM: { name: 'CS Team', description: 'Talks to customers: orders, calls, LMS and reviews.', icon: Headset },
  DELIVERY: { name: 'Delivery Team', description: 'Packs orders and books couriers.', icon: Truck },
  MARKETING: { name: 'Marketing', description: 'Coupons, campaigns, SMS, landing pages and popups.', icon: Megaphone },
  ACCOUNTS: { name: 'Accounts', description: 'Sees sales, money and reports. Changes nothing.', icon: Calculator },
  VIEWER: { name: 'Viewer', description: 'Can look at everything they’re given, can’t change anything.', icon: Eye },
  CUSTOM: { name: 'Custom', description: 'You pick exactly what they can do.', icon: SlidersHorizontal },
};

/** No role can ever get these; shown on the Staff pages as "Only you, the owner, can". */
export const STAFF_OWNER_ONLY: readonly string[] = [
  'Add, change or remove staff, and see their passwords',
  'Buy a plan or packages and top up the wallet',
  'Ask for withdrawals',
  'Manage API keys and webhooks',
];

/**
 * What it takes to open each vendor nav page (lib/navConfig.ts vendorNav).
 * 'any' = every signed-in staff member (a page that hides its own parts),
 * 'owner' = the store owner only. A path not listed here is owner-only, so
 * a new page stays hidden from staff until someone decides who may open it.
 */
export type NavAccess = StaffPermission | readonly StaffPermission[] | 'any' | 'owner';

export const NAV_ACCESS: Record<string, NavAccess> = {
  '/vendor/dashboard': 'any',
  '/vendor/analytics': 'analytics.view',
  '/vendor/orders': 'orders.view',
  '/vendor/customers': 'customers.view',
  '/vendor/lms': 'lms.access',
  '/vendor/pos': 'pos.access',
  '/vendor/product/all': 'products.view',
  '/vendor/product/add': 'products.edit',
  '/vendor/product/categories': 'products.view',
  '/vendor/product/collections': 'products.view',
  '/vendor/product/brands': 'products.view',
  '/vendor/product/size-guides': 'products.view',
  '/vendor/product/low-stock': 'products.view',
  '/vendor/reviews': 'reviews.view',
  '/vendor/marketing/coupons': 'marketing.view',
  '/vendor/marketing/campaigns': 'marketing.view',
  '/vendor/marketing/discounts': 'marketing.view',
  '/vendor/marketing/flash-sale': 'marketing.view',
  '/vendor/marketing/gift-cards': 'marketing.view',
  '/vendor/sms': 'sms.view',
  '/vendor/ai-automation/ai-chat-bot': 'ai.manage',
  '/vendor/ai-automation/ai-tools': 'ai.use',
  '/vendor/ai-automation/automation': 'ai.manage',
  '/vendor/ai-automation/n8n': 'ai.manage',
  '/vendor/store/themes': 'store.design',
  '/vendor/store/design': 'store.design',
  '/vendor/store/branding': 'store.design',
  '/vendor/store/customize': 'store.design',
  '/vendor/store/header-editor': 'store.design',
  '/vendor/store/footer': 'store.design',
  '/vendor/store/layout-settings': 'store.design',
  '/vendor/store/site-banner': 'store.design',
  '/vendor/store/chat-button': 'store.design',
  '/vendor/store/product-display': 'store.design',
  '/vendor/store/product-card': 'store.design',
  '/vendor/store/pages': 'store.content',
  '/vendor/store/landing-pages': 'store.content',
  '/vendor/store/media': 'store.content',
  '/vendor/store/payment-gateway': 'store.checkout',
  '/vendor/store/delivery-charge': 'store.checkout',
  '/vendor/store/stock-settings': 'store.checkout',
  '/vendor/store/cod-guard': 'store.checkout',
  '/vendor/store/store-away': 'store.checkout',
  '/vendor/store/order-tracking': 'store.checkout',
  '/vendor/store/seo': 'store.settings',
  '/vendor/store/integrations': 'store.code',
  '/vendor/store/domain': 'store.settings',
  '/vendor/store/social': 'store.settings',
  '/vendor/store/gdpr': 'store.settings',
  '/vendor/store/custom-css': 'store.code',
  '/vendor/store/head-scripts': 'store.code',
  '/vendor/store/javascript': 'store.code',
  '/vendor/courier/steadfast': 'courier.manage',
  '/vendor/courier/pathao': 'courier.manage',
  '/vendor/courier/redx': 'courier.manage',
  '/vendor/shipping/tracking': 'orders.view',
  '/vendor/finance/wallet': 'finance.view',
  '/vendor/finance/transactions': 'finance.view',
  '/vendor/finance/expenses': 'finance.view',
  '/vendor/finance/earnings': 'finance.view',
  '/vendor/finance/withdraw': 'owner',
  '/vendor/finance/fee-summary': 'finance.view',
  '/vendor/billing': 'owner',
  '/vendor/staff': 'owner',
  '/vendor/notifications': 'any',
  '/vendor/support': 'any',
  '/vendor/settings': 'any',
};

/**
 * Who is looking (rule-plan.md Step 7). `permissions: null` means not known
 * (e.g. an offline POS session restored from before roles existed): the page
 * then shows and the server decides, rather than hiding everything.
 */
export interface StaffViewer {
  isOwner: boolean;
  permissions: readonly string[] | null;
}

/** An array means any one of them is enough (same as the server's @Permission). */
export function canAccess(viewer: StaffViewer, need: NavAccess): boolean {
  if (viewer.isOwner || need === 'any') return true;
  if (need === 'owner') return false;
  if (viewer.permissions === null) return true;
  const perms = viewer.permissions;
  return typeof need === 'string' ? perms.includes(need) : need.some((p) => perms.includes(p));
}

/** Whether someone may open a nav page; an unlisted path counts as owner-only. */
export function canOpenPath(viewer: StaffViewer, path: string): boolean {
  return canAccess(viewer, accessForPath(path));
}

/**
 * Pages that aren't in the sidebar (add/edit/detail pages, builders, hubs),
 * first match wins. Each needs what its page needs to work; a save button the
 * person can't use is handled on the page itself.
 */
const ROUTE_RULES: ReadonlyArray<readonly [RegExp, NavAccess]> = [
  [/^\/vendor\/(dashboard|notifications|support|settings|profile|complete-profile|complete-setup)(\/|$)/, 'any'],
  [/^\/vendor\/(staff|billing)(\/|$)/, 'owner'],
  [/^\/vendor\/finance\/(withdraw|payment-callback)(\/|$)/, 'owner'],
  [/^\/vendor\/finance\//, 'finance.view'],
  [/^\/vendor\/analytics(\/|$)/, 'analytics.view'],
  [/^\/vendor\/orders\/add$/, 'orders.create'],
  [/^\/vendor\/orders\/handover(\/|$)/, 'orders.courier'], // courier handover sheets
  [/^\/vendor\/orders(\/|$)/, 'orders.view'],
  [/^\/vendor\/customers\/(add|bulk-upload)$/, 'customers.edit'],
  [/^\/vendor\/customers\/[^/]+\/edit$/, 'customers.edit'],
  [/^\/vendor\/customers\/.+/, 'customers.contact'], // opened by phone number
  [/^\/vendor\/product\/(add|collections\/add)$/, 'products.edit'],
  [/^\/vendor\/product\//, 'products.view'],
  [/^\/vendor\/reviews\/(add|[^/]+\/edit)$/, 'reviews.edit'],
  [/^\/vendor\/marketing\/gift-cards\/add$/, 'marketing.gift_cards'],
  [/^\/vendor\/marketing\/[^/]+\/(add|[^/]+\/edit|popup\/new|popup\/[^/]+\/edit)$/, 'marketing.edit'],
  [/^\/vendor\/marketing\//, 'marketing.view'],
  [/^\/vendor\/store\/integrations\/(external-api|webhooks)$/, 'owner'], // API keys and webhooks
  [/^\/vendor\/store\/(integrations|javascript)(\/|$)/, 'store.code'],
  [/^\/vendor\/store\/(pages|landing-pages|media)(\/|$)/, 'store.content'],
  [/^\/vendor\/store\/navigation$/, 'store.design'],
  [/^\/vendor\/courier\/pathao\/labels$/, ['orders.courier', 'courier.manage']],
  [/^\/vendor\/courier(\/|$)/, 'courier.manage'],
  [/^\/vendor\/lms(\/|$)/, 'lms.access'],
  [/^\/vendor\/pos(\/|$)/, 'pos.access'],
];

/** What it takes to open any vendor page: its nav entry, else the first matching rule, else owner-only. */
export function accessForPath(path: string): NavAccess {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const exact = NAV_ACCESS[clean];
  if (exact) return exact;
  return ROUTE_RULES.find(([re]) => re.test(clean))?.[1] ?? 'owner';
}

/**
 * The vendor nav as this viewer may use it: pages they can't open are left
 * out, then empty groups and empty sections. Used by the sidebar, top bar,
 * section tabs, page search and the Ask-AI page list.
 */
export function navForViewer(sections: NavSection[], viewer: StaffViewer): NavSection[] {
  if (viewer.isOwner) return sections;
  const linkOk = (l: NavLinkItem) => canOpenPath(viewer, l.path);
  const out: NavSection[] = [];
  for (const section of sections) {
    const children = section.children
      ?.map((c): NavChild | null => {
        if (!isNavGroup(c)) return linkOk(c) ? c : null;
        const kept = c.children.filter(linkOk);
        return kept.length ? { ...c, children: kept } : null;
      })
      .filter((c): c is NavChild => c !== null);
    const pathOk = section.path ? canOpenPath(viewer, section.path) : false;
    if (section.children ? children!.length > 0 : pathOk) out.push({ ...section, children });
  }
  return out;
}
