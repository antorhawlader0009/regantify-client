import { api } from './api';

// Marketing > Campaigns > Popup. Mirrors server PopupCampaign (see its
// schema comment) and, for the shopper-facing fields, the storefront's
// StorefrontPopupCampaign: update both when a field is added.

export type PopupStatus = 'DRAFT' | 'PUBLISHED';
export type PopupFormat = 'DIALOG' | 'TOAST';
export type PopupShape = 'WIDE' | 'BANNER' | 'PHOTO' | 'STANDARD' | 'SQUARE' | 'PORTRAIT';
export type PopupTextPlacement = 'BELOW_IMAGE' | 'ON_IMAGE';
export type PopupAlign = 'LEFT' | 'CENTER' | 'RIGHT';
export type PopupButtonStyle = 'SOLID' | 'OUTLINE' | 'TEXT';
export type PopupToastCorner = 'BOTTOM_LEFT' | 'BOTTOM_RIGHT';
export type PopupTrigger = 'IMMEDIATE' | 'DELAY' | 'SCROLL' | 'EXIT_INTENT';
export type PopupPageScope = 'ALL' | 'HOME' | 'PRODUCT' | 'CART' | 'SPECIFIC';
export type PopupAudience = 'EVERYONE' | 'NEW' | 'RETURNING';
export type PopupDevices = 'ALL' | 'DESKTOP' | 'MOBILE';
export type PopupFrequency = 'ONCE_EVER' | 'ONCE_PER_SESSION' | 'ONCE_PER_DAY' | 'ONCE_PER_WEEK' | 'EVERY_PAGE';

/** The part of the picture to show, as 0..1 fractions of the whole picture. */
export interface PopupImageCrop {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What the builder edits: every field of a popup except the server's own (id, counters, dates). */
export interface PopupForm {
  name: string;
  status: PopupStatus;
  format: PopupFormat;
  imageUrl: string | null;
  imageAlt: string | null;
  imageShape: PopupShape;
  imageCrop: PopupImageCrop | null;
  headline: string;
  message: string;
  textPlacement: PopupTextPlacement;
  align: PopupAlign;
  headlineAlign: PopupAlign | null;
  messageAlign: PopupAlign | null;
  buttonAlign: PopupAlign | null;
  width: number;
  couponEnabled: boolean;
  couponCode: string | null;
  buttonEnabled: boolean;
  buttonText: string | null;
  buttonLink: string | null;
  buttonColor: string | null;
  buttonStyle: PopupButtonStyle;
  backgroundColor: string | null;
  textColor: string | null;
  cornerRadius: number;
  overlayOpacity: number;
  toastCorner: PopupToastCorner;
  autoCloseSeconds: number | null;
  trigger: PopupTrigger;
  triggerSeconds: number;
  triggerScrollPercent: number;
  pageScope: PopupPageScope;
  pagePaths: string[];
  audience: PopupAudience;
  devices: PopupDevices;
  frequency: PopupFrequency;
  startsAt: string | null;
  endsAt: string | null;
}

export interface PopupCampaign extends PopupForm {
  id: string;
  vendorId: string;
  impressions: number;
  clicks: number;
  createdAt: string;
  updatedAt: string;
}

/** A new popup, with the same defaults the server's schema uses. */
export const NEW_POPUP: PopupForm = {
  name: '',
  status: 'DRAFT',
  format: 'DIALOG',
  imageUrl: null,
  imageAlt: null,
  imageShape: 'PHOTO',
  imageCrop: null,
  headline: '',
  message: '',
  textPlacement: 'BELOW_IMAGE',
  align: 'CENTER',
  headlineAlign: null,
  messageAlign: null,
  buttonAlign: null,
  width: 460,
  couponEnabled: false,
  couponCode: null,
  buttonEnabled: false,
  buttonText: 'Shop now',
  buttonLink: '/',
  buttonColor: null,
  buttonStyle: 'SOLID',
  backgroundColor: null,
  textColor: null,
  cornerRadius: 12,
  overlayOpacity: 50,
  toastCorner: 'BOTTOM_RIGHT',
  autoCloseSeconds: null,
  trigger: 'DELAY',
  triggerSeconds: 5,
  triggerScrollPercent: 50,
  pageScope: 'ALL',
  pagePaths: [],
  audience: 'EVERYONE',
  devices: 'ALL',
  frequency: 'ONCE_EVER',
  startsAt: null,
  endsAt: null,
};

/** Where a popup is in its life, from its own fields (the server keeps no such flag). */
export type PopupPhase = 'draft' | 'scheduled' | 'active' | 'expired';

export function popupPhase(p: Pick<PopupForm, 'status' | 'startsAt' | 'endsAt'>): PopupPhase {
  const now = Date.now();
  if (p.endsAt && new Date(p.endsAt).getTime() <= now) return 'expired';
  if (p.status !== 'PUBLISHED') return 'draft';
  if (p.startsAt && new Date(p.startsAt).getTime() > now) return 'scheduled';
  return 'active';
}

export const popupCampaignsApi = {
  list: () => api.get<PopupCampaign[]>('/v1/popup-campaigns').then((r) => r.data),
  findOne: (id: string) => api.get<PopupCampaign>(`/v1/popup-campaigns/${id}`).then((r) => r.data),
  create: (form: Partial<PopupForm> & { name: string }) => api.post<PopupCampaign>('/v1/popup-campaigns', form).then((r) => r.data),
  update: (id: string, form: Partial<PopupForm>) => api.patch<PopupCampaign>(`/v1/popup-campaigns/${id}`, form).then((r) => r.data),
  remove: (id: string) => api.delete(`/v1/popup-campaigns/${id}`).then((r) => r.data),
};
