import { api } from './api';

// Mirrors server/src/own-app (STORE-APP-plan.md Part B): the owner's API for the store's OWN Android app. Owner only.

export type BuildStatus = 'QUEUED' | 'WAITING_FOR_QUIET' | 'BUILDING' | 'DONE' | 'FAILED' | 'CANCELLED';
export type KeyState = { present: boolean; sha1: string | null; sha256: string | null; checked: boolean };
export type PushMode = 'NONE' | 'SERVICE_ACCOUNT_ROLE' | 'KEY_FILE';

export interface StoreAppInfo {
  name: string;
  shortName: string;
  primaryColor: string;
  logoUrl: string | null;
  packageName: string;
  packageLocked: boolean;
  keySource: 'DEFAULT' | 'OWN';
  keys: { signing: KeyState; upload: KeyState; locked: boolean };
  firebase: { present: boolean; projectId: string | null; pushMode: PushMode; pushTestOk: boolean | null; pushTestedAt: string | null; pushTestDetail: string | null };
  footerSwitch: boolean;
  lastVersionCode: number;
}

export interface StoreAppBuildInfo {
  id: string;
  kind: 'BUILD' | 'KEY_CHECK';
  status: BuildStatus;
  versionCode: number;
  versionName: string;
  targets: string[];
  queuedAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  error: string | null;
  log: string | null;
  apkUrl: string | null;
  hasBundle: boolean;
  hasMapping: boolean;
  apkSize: number | null;
  aabSize: number | null;
  apkSha256: string | null;
  certSha256: string | null;
}

export interface StoreAppView {
  /** False when the plan (or Super Admin) does not give this store its own app. */
  allowed: boolean;
  app: StoreAppInfo | null;
  defaults: { name: string; shortName: string; packageName: string; storeUrl: string };
  builds: StoreAppBuildInfo[];
  buildsPerMonth: number;
  buildsUsed: number;
  buildsLeft: number;
  /** Way A of push: the email to add in the store's Firebase project. Null when push is not set up on the server. */
  platformServiceAccountEmail: string | null;
  builderSeenAt: string | null;
  /** What was changed since the last good build (name, colour, logo...), or empty. */
  changesNotBuilt: string[];
}

export interface KeyMaterialDownload {
  storeFileBase64: string;
  storePassword: string;
  keyAlias: string;
  keyPassword: string;
  sha256: string | null;
}

export interface UpdateStoreApp {
  name?: string;
  shortName?: string;
  packageName?: string;
  primaryColor?: string;
  logoUrl?: string;
  footerSwitch?: boolean;
}

export const storeAppApi = {
  view: () => api.get<StoreAppView>('/v1/store-app').then((r) => r.data),
  update: (body: UpdateStoreApp) => api.patch<StoreAppInfo>('/v1/store-app', body).then((r) => r.data),
  makeDefaultKeys: () => api.post<StoreAppInfo>('/v1/store-app/keys/default').then((r) => r.data),
  uploadKey: (body: { slot: 'signing' | 'upload'; fileBase64: string; storePassword: string; keyAlias: string; keyPassword: string }) =>
    api.post<StoreAppInfo>('/v1/store-app/keys/own', body).then((r) => r.data),
  downloadKeys: (password: string) =>
    api
      .post<{ packageName: string; signing: KeyMaterialDownload | null; upload: KeyMaterialDownload | null }>('/v1/store-app/keys/download', { password })
      .then((r) => r.data),
  saveFirebase: (googleServices: string) => api.put<StoreAppInfo>('/v1/store-app/firebase', { googleServices }).then((r) => r.data),
  removeFirebase: () => api.delete<StoreAppInfo>('/v1/store-app/firebase').then((r) => r.data),
  setPushAccess: (mode: 'SERVICE_ACCOUNT_ROLE' | 'KEY_FILE', keyFile?: string) =>
    api.post<StoreAppInfo>('/v1/store-app/firebase/push-access', { mode, ...(keyFile ? { keyFile } : {}) }).then((r) => r.data),
  testPush: () => api.post<StoreAppInfo>('/v1/store-app/firebase/test').then((r) => r.data),
  build: (targets?: Array<'apk' | 'aab'>) => api.post<StoreAppBuildInfo>('/v1/store-app/builds', targets ? { targets } : {}).then((r) => r.data),
  cancel: (id: string) => api.post<{ cancelled: true }>(`/v1/store-app/builds/${id}/cancel`).then((r) => r.data),
  /** The bundle or symbol file, as a Blob (the file is private: only the signed-in owner can fetch it). */
  /** The Google Play package of a build (bundle, listing pictures and texts, guide) as one ZIP, for the signed-in owner. */
  playZip: (id: string) => api.get<Blob>(`/v1/store-app/builds/${id}/play-zip`, { responseType: 'blob' }).then((r) => r.data),
  file: (id: string, kind: 'aab' | 'mapping') => api.get<Blob>(`/v1/store-app/builds/${id}/files/${kind}`, { responseType: 'blob' }).then((r) => r.data),
};
