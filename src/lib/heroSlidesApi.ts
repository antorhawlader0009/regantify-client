import { api } from './api';

/** Store > Hero Section (server hero-slides/). */
export interface HeroSlide {
  id: string;
  imageUrl: string;
  title: string;
  text: string;
  buttonText: string;
  /** "" = not a link; "/p/<slug>" a product; "/?category=<name>" a category; "/..." another store page; else an https:// address. */
  link: string;
}

export type HeroPlanCode = 'FREE' | 'BASIC' | 'STARTER' | 'ADVANCE';

export interface HeroSlidesAnswer {
  items: HeroSlide[];
  /** How many pictures the store's plan allows now. */
  limit: number;
  planCode: HeroPlanCode;
  limits: Record<HeroPlanCode, number>;
}

export const heroSlidesApi = {
  get: () => api.get<HeroSlidesAnswer>('/v1/hero-slides').then((r) => r.data),
  save: (items: HeroSlide[]) => api.put<HeroSlidesAnswer>('/v1/hero-slides', { items }).then((r) => r.data),
};
