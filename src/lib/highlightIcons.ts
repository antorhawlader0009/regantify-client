import {
  BadgeCheck,
  Clock,
  Gift,
  HandCoins,
  Headset,
  Heart,
  Leaf,
  Lock,
  MapPin,
  Package,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { HomeHighlightIcon } from './designSettingsApi';

/**
 * The icons a store highlight can use, in the order the picker shows them. A
 * short plain label each (what the icon is for), since the vendor chooses by
 * meaning. Keys are mirrored by the server's HOME_HIGHLIGHT_ICONS and the
 * storefront's themes/storepal/lib/highlightIcons.ts.
 */
export const HIGHLIGHT_ICONS: { key: HomeHighlightIcon; label: string; Icon: LucideIcon }[] = [
  { key: 'TRUCK', label: 'Delivery', Icon: Truck },
  { key: 'SHIELD_CHECK', label: 'Guarantee', Icon: ShieldCheck },
  { key: 'HAND_COINS', label: 'Payment', Icon: HandCoins },
  { key: 'ROTATE_CCW', label: 'Returns', Icon: RotateCcw },
  { key: 'HEADSET', label: 'Support', Icon: Headset },
  { key: 'BADGE_CHECK', label: 'Quality', Icon: BadgeCheck },
  { key: 'CLOCK', label: 'Time', Icon: Clock },
  { key: 'GIFT', label: 'Gift', Icon: Gift },
  { key: 'LEAF', label: 'Natural', Icon: Leaf },
  { key: 'LOCK', label: 'Secure', Icon: Lock },
  { key: 'STAR', label: 'Rating', Icon: Star },
  { key: 'TAG', label: 'Price', Icon: Tag },
  { key: 'PACKAGE', label: 'Packaging', Icon: Package },
  { key: 'MAP_PIN', label: 'Location', Icon: MapPin },
  { key: 'HEART', label: 'Care', Icon: Heart },
  { key: 'SPARKLES', label: 'Special', Icon: Sparkles },
];

export function highlightIcon(key: HomeHighlightIcon): LucideIcon {
  return HIGHLIGHT_ICONS.find((i) => i.key === key)?.Icon ?? Sparkles;
}
