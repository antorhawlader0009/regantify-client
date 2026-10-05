import { Brush, Grid2x2, LayoutTemplate, PanelBottom, PanelTop, Palette, MessageSquareText, ShoppingBag, SlidersHorizontal, type LucideIcon } from 'lucide-react';

/**
 * The cards on Store > Design (the hub page): each one opens one existing design page. The sidebar has
 * a single "Design" link; these pages are reached from here, and each shows a "Design" back link.
 * Adding a design page means adding it here and to the hidden Design group in navConfig.ts (which keeps
 * it in the breadcrumb, the search and the assistant's page list).
 */
export interface DesignCard {
  label: string;
  description: string;
  path: string;
  icon: LucideIcon;
}

export const DESIGN_CARDS: DesignCard[] = [
  { label: 'Templates', description: 'Select your template', path: '/vendor/store/themes', icon: Grid2x2 },
  { label: 'Branding', description: 'Your logo, colors and fonts.', path: '/vendor/store/branding', icon: Palette },
  { label: 'Customize', description: 'Choose and reorder your home page sections, and edit their text.', path: '/vendor/store/customize', icon: Brush },
  { label: 'Layout Settings', description: 'Configure how your store details are laid out.', path: '/vendor/store/layout-settings', icon: LayoutTemplate },
  { label: 'Header', description: 'Configure the header and your menus.', path: '/vendor/store/header-editor', icon: PanelTop },
  { label: 'Footer', description: 'Configure the footer.', path: '/vendor/store/footer', icon: PanelBottom },
  { label: 'Site Banner', description: 'Show a notification banner on your website.', path: '/vendor/store/site-banner', icon: MessageSquareText },
  { label: 'Product Display', description: 'Choose how products are shown on the page.', path: '/vendor/store/product-display', icon: ShoppingBag },
  { label: 'Product Card', description: 'Choose what shows on each product card.', path: '/vendor/store/product-card', icon: SlidersHorizontal },
];
