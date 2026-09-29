import { api } from './api';

// Vendor dashboard > LMS — mirrors server/src/lms/.

export type LmsStage = 'NEW' | 'TRYING' | 'IN_TALKS' | 'WON' | 'LOST';

/** Fixed order of the five stages every vendor gets. */
export const LMS_STAGES: LmsStage[] = ['NEW', 'TRYING', 'IN_TALKS', 'WON', 'LOST'];

export type LmsSourceKey = 'ORDER' | 'ABANDONED_CHECKOUT' | 'LANDING_FORM' | 'STORE_FORM' | 'API';
export type LmsStaleStage = 'NEW' | 'TRYING' | 'IN_TALKS';
export type LmsLeadKind = 'ORDER' | 'RECOVERY' | 'ENQUIRY';
export type LmsLeadSource = 'ORDER' | 'ABANDONED_CHECKOUT' | 'LANDING_FORM' | 'STORE_FORM' | 'MANUAL' | 'CHAT_PASTE' | 'IMPORT' | 'API';
export type LmsActivityType = 'CALL' | 'MESSAGE' | 'NOTE' | 'STAGE' | 'ASSIGN' | 'TASK' | 'SYSTEM';

export const LMS_SOURCE_LABELS: Record<LmsLeadSource, string> = {
  ORDER: 'Store order',
  ABANDONED_CHECKOUT: 'Abandoned checkout',
  LANDING_FORM: 'Landing page form',
  STORE_FORM: 'Store form',
  MANUAL: 'Added by hand',
  CHAT_PASTE: 'Pasted chat',
  IMPORT: 'Import',
  API: 'API',
};

export const LMS_KIND_LABELS: Record<LmsLeadKind, string> = {
  ORDER: 'Order',
  RECOVERY: 'Recovery',
  ENQUIRY: 'Enquiry',
};

export interface LmsMe {
  enabled: boolean;
  userId: string;
  isOwner: boolean;
  isManager: boolean;
  stageLabels: Record<LmsStage, string>;
  lostReasons: string[];
}

export interface LmsSettings {
  enabled: boolean;
  sources: Record<LmsSourceKey, boolean>;
  autoAssign: 'OFF' | 'ROUND_ROBIN';
  maxAttempts: number;
  retryMinutes: number[];
  autoCloseUnreachable: boolean;
  abandonedAfterMinutes: number;
  reclaimAfterMinutes: number | null;
  staleMinutes: Record<LmsStaleStage, number>;
  stageLabels: Record<LmsStage, string>;
  callPrepaidOrders: boolean;
  callScript: string | null;
  lostReasons: string[];
  storeForms: { notifyMe: boolean; callMeBack: boolean };
  retentionMonths: number | null;
}

export type UpdateLmsSettings = Partial<
  Omit<LmsSettings, 'sources' | 'staleMinutes' | 'stageLabels' | 'storeForms'> & {
    sources: Partial<LmsSettings['sources']>;
    staleMinutes: Partial<LmsSettings['staleMinutes']>;
    stageLabels: Partial<LmsSettings['stageLabels']>;
    storeForms: Partial<LmsSettings['storeForms']>;
  }
>;

export interface LmsLeadRow {
  id: string;
  kind: LmsLeadKind;
  source: LmsLeadSource;
  stage: LmsStage;
  lostReason: string | null;
  name: string;
  phone: string;
  productSummary: string | null;
  quantity: number | null;
  value: number | null;
  tags: string[];
  attemptCount: number;
  nextTaskAt: string | null;
  firstContactedAt: string | null;
  lastActivityAt: string;
  stageEnteredAt: string;
  doNotContact: boolean;
  /** Extra field values by key. */
  customFields: Record<string, string | number>;
  createdAt: string;
  assignedTo: { id: string; name: string } | null;
  order: { id: string; invoiceNumber: number } | null;
  isStale: boolean;
}

export interface LmsActivity {
  id: string;
  type: LmsActivityType;
  outcome: string | null;
  fromStage: LmsStage | null;
  toStage: LmsStage | null;
  text: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface LmsLeadDetail extends LmsLeadRow {
  phoneAlt: string | null;
  email: string | null;
  address: string | null;
  district: string | null;
  area: string | null;
  message: string | null;
  lastContactedAt: string | null;
  closedAt: string | null;
  consentText: string | null;
  consentAt: string | null;
  activities: LmsActivity[];
}

export type LmsListSort = 'recent' | 'newest' | 'oldest';

/** The Leads list's filters. The same keys go in the URL and in a saved view. */
export interface LmsLeadFilters {
  stage?: LmsStage;
  kind?: LmsLeadKind;
  source?: LmsLeadSource;
  q?: string;
  agent?: string;
  tag?: string;
  from?: string;
  to?: string;
  stale?: 'true';
  hasTask?: 'true' | 'false';
  sort?: LmsListSort;
  perPage?: '30' | '50' | '100';
}
export const LMS_FILTER_KEYS: (keyof LmsLeadFilters)[] = [
  'stage',
  'kind',
  'source',
  'q',
  'agent',
  'tag',
  'from',
  'to',
  'stale',
  'hasTask',
  'sort',
  'perPage',
];

export interface LmsLeadList {
  total: number;
  page: number;
  perPage: number;
  leads: LmsLeadRow[];
}

export type LmsStageCounts = Record<LmsStage | 'ALL', number>;

export type LmsFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'PHONE';

export const LMS_FIELD_TYPE_LABELS: Record<LmsFieldType, string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  DATE: 'Date',
  SELECT: 'Choice',
  PHONE: 'Phone number',
};

/** An optional extra field (LMS > Settings > Extra fields). */
export interface LmsFieldDef {
  id: string;
  key: string;
  label: string;
  type: LmsFieldType;
  options: string[];
  position: number;
  showInTable: boolean;
}

export interface CreateLmsLead {
  name: string;
  phone: string;
  phoneAlt?: string;
  email?: string;
  productSummary?: string;
  quantity?: number;
  value?: number;
  address?: string;
  district?: string;
  area?: string;
  tags?: string[];
  note?: string;
  customFields?: Record<string, string | number | null>;
}

export type UpdateLmsLead = Partial<{
  [K in keyof Omit<CreateLmsLead, 'note' | 'name' | 'phone' | 'tags'>]: CreateLmsLead[K] | null;
}> & {
  name?: string;
  phone?: string;
  tags?: string[];
  doNotContact?: boolean;
  customFields?: Record<string, string | number | null>;
};

export type LmsBulkAction = 'WON' | 'LOST' | 'ADD_TAG' | 'REMOVE_TAG' | 'DELETE';

export interface LmsAgentSummary {
  userId: string;
  name: string;
  isOwner: boolean;
}

export interface LmsSavedView {
  id: string;
  name: string;
  filters: LmsLeadFilters;
}

export const lmsApi = {
  me: () => api.get<LmsMe>('/v1/lms/me').then((r) => r.data),
  getSettings: () => api.get<LmsSettings>('/v1/lms/settings').then((r) => r.data),
  updateSettings: (body: UpdateLmsSettings) => api.patch<LmsSettings>('/v1/lms/settings', body).then((r) => r.data),

  listLeads: (filters: LmsLeadFilters, page: number) =>
    api.get<LmsLeadList>('/v1/lms/leads', { params: { ...filters, page } }).then((r) => r.data),
  counts: (filters: LmsLeadFilters) =>
    api.get<LmsStageCounts>('/v1/lms/leads/counts', { params: { ...filters, stage: undefined } }).then((r) => r.data),
  getLead: (id: string) => api.get<LmsLeadDetail>(`/v1/lms/leads/${id}`).then((r) => r.data),
  createLead: (body: CreateLmsLead) =>
    api.post<{ merged: boolean; leadId: string | null }>('/v1/lms/leads', body).then((r) => r.data),
  updateLead: (id: string, body: UpdateLmsLead) => api.patch<LmsLeadDetail>(`/v1/lms/leads/${id}`, body).then((r) => r.data),
  addNote: (id: string, text: string) => api.post<LmsLeadDetail>(`/v1/lms/leads/${id}/notes`, { text }).then((r) => r.data),
  closeLead: (id: string, outcome: 'WON' | 'LOST', reason?: string) =>
    api.post<LmsLeadDetail>(`/v1/lms/leads/${id}/close`, { outcome, reason }).then((r) => r.data),
  reopenLead: (id: string) => api.post<LmsLeadDetail>(`/v1/lms/leads/${id}/reopen`).then((r) => r.data),
  moveStage: (id: string, stage: 'NEW' | 'TRYING' | 'IN_TALKS') =>
    api.post<LmsLeadDetail>(`/v1/lms/leads/${id}/stage`, { stage }).then((r) => r.data),
  mergeLead: (id: string, otherId: string) =>
    api.post<LmsLeadDetail>(`/v1/lms/leads/${id}/merge`, { otherId }).then((r) => r.data),
  bulk: (ids: string[], action: LmsBulkAction, extra: { reason?: string; tag?: string } = {}) =>
    api.post<{ done: number; skipped: number }>('/v1/lms/leads/bulk', { ids, action, ...extra }).then((r) => r.data),

  fields: () => api.get<LmsFieldDef[]>('/v1/lms/fields').then((r) => r.data),
  createField: (body: { label: string; type: LmsFieldType; options?: string[]; showInTable?: boolean }) =>
    api.post<LmsFieldDef>('/v1/lms/fields', body).then((r) => r.data),
  updateField: (id: string, body: { label?: string; options?: string[]; showInTable?: boolean }) =>
    api.patch<LmsFieldDef>(`/v1/lms/fields/${id}`, body).then((r) => r.data),
  deleteField: (id: string) => api.delete(`/v1/lms/fields/${id}`).then((r) => r.data),
  reorderFields: (ids: string[]) => api.post<LmsFieldDef[]>('/v1/lms/fields/order', { ids }).then((r) => r.data),

  agents: () => api.get<LmsAgentSummary[]>('/v1/lms/agents').then((r) => r.data),
  views: () => api.get<LmsSavedView[]>('/v1/lms/views').then((r) => r.data),
  saveView: (name: string, filters: LmsLeadFilters) =>
    api.post<LmsSavedView>('/v1/lms/views', { name, filters }).then((r) => r.data),
  deleteView: (id: string) => api.delete(`/v1/lms/views/${id}`).then((r) => r.data),
};

/** True for the server's "your plan doesn't include this" answer (HTTP 402 PLAN_LIMIT_EXCEEDED). */
export function isPlanLocked(err: unknown): boolean {
  const res = (err as { response?: { status?: number; data?: { code?: string } } })?.response;
  return res?.status === 402 && res.data?.code === 'PLAN_LIMIT_EXCEEDED';
}
