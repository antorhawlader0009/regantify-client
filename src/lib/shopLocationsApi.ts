import { api } from './api';

/** Store > Content > Shop Locations (server shop-locations/). */
export interface ShopLocation {
  id: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  /** The google.com address the pasted link led to ("" = none; the store searches the address instead). */
  mapUrl: string;
  lat: number | null;
  lon: number | null;
}

/** What the page sends: the map link as pasted (a share link is followed by the server). */
export interface ShopLocationInput {
  id?: string;
  name: string;
  address: string;
  phone: string;
  hours: string;
  mapLink: string;
}

export const shopLocationsApi = {
  list: () => api.get<ShopLocation[]>('/v1/shop-locations').then((r) => r.data),
  save: (items: ShopLocationInput[]) => api.put<ShopLocation[]>('/v1/shop-locations', { items }).then((r) => r.data),
};

/** The same "open on Google Maps" link the store shows (server shop-locations.ts openUrlOf). */
export function openUrlOf(loc: { name: string; address: string; mapUrl: string }): string {
  if (loc.mapUrl) return loc.mapUrl;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${loc.name}, ${loc.address}`)}`;
}
