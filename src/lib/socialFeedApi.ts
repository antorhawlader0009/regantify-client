import { api } from './api';

/** Store > Content > Social Feed (SOCIAL-FEED-plan.md). Mirrors the server's SocialFeedService.state answer. */
export interface SocialFeedSettings {
  enabled: boolean;
  title: string;
  columns: 3 | 4 | 6;
  rows: number;
  showHeader: boolean;
}

export interface SocialFeedAccount {
  title: string;
  handle: string | null;
  avatarUrl: string | null;
  profileUrl: string;
  followers: number | null;
  postsCount: number | null;
  status: 'ACTIVE' | 'ERROR';
  lastSyncAt: string | null;
  lastError: string | null;
}

export interface SocialFeedPost {
  id: string;
  platform: 'YOUTUBE';
  externalId: string;
  title: string;
  thumbUrl: string;
  permalink: string;
  postedAt: string;
  hidden: boolean;
  pinOrder: number | null;
}

export interface SocialFeedState {
  youtubeReady: boolean;
  settings: SocialFeedSettings;
  youtube: SocialFeedAccount | null;
  posts: SocialFeedPost[];
}

export const socialFeedApi = {
  state: () => api.get<SocialFeedState>('/v1/social-feed').then((r) => r.data),
  saveSettings: (s: Partial<SocialFeedSettings>) => api.patch<SocialFeedState>('/v1/social-feed/settings', s).then((r) => r.data),
  connectYoutube: (channel: string) => api.post<SocialFeedState>('/v1/social-feed/youtube', { channel }).then((r) => r.data),
  disconnectYoutube: () => api.delete<SocialFeedState>('/v1/social-feed/youtube').then((r) => r.data),
  syncYoutube: () => api.post<SocialFeedState>('/v1/social-feed/youtube/sync').then((r) => r.data),
  updatePost: (id: string, patch: { hidden?: boolean; pinned?: boolean }) => api.patch<SocialFeedState>(`/v1/social-feed/posts/${id}`, patch).then((r) => r.data),
};
