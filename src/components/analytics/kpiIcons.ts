import { BarChart3, Banknote, Clock, Eye, Percent, Phone, Receipt, ShoppingBag, Target, TrendingUp, Truck, Undo2, Users, type LucideIcon } from 'lucide-react';

/** The icon on a headline number's chip, picked from its label (first match wins), so each tab needs no extra wiring. */
const RULES: Array<[RegExp, LucideIcon]> = [
  [/profit|margin/i, TrendingUp],
  [/sales|revenue|money|income|value of/i, Banknote],
  [/average|avg/i, ShoppingBag],
  [/deliver|parcel|courier|shipping/i, Truck],
  [/return|refund|cancel/i, Undo2],
  [/rate|conversion|share|%/i, Percent],
  [/customer|buyer|people|visitor|contact|lead/i, Users],
  [/visit|view|traffic/i, Eye],
  [/call|reach/i, Phone],
  [/time|minute|wait|first/i, Clock],
  [/win|won|goal|target/i, Target],
  [/order|invoice|unit|product|item/i, Receipt],
];

export function kpiIconFor(label: string): LucideIcon {
  return RULES.find(([re]) => re.test(label))?.[1] ?? BarChart3;
}
