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
  /** The caller's display name (full name, else phone). */
  name: string;
  storeName: string;
  isOwner: boolean;
  isManager: boolean;
  stageLabels: Record<LmsStage, string>;
  lostReasons: string[];
  autoAssign: 'OFF' | 'ROUND_ROBIN';
  /** On shift (true) or Away. */
  available: boolean;
  onShiftSince: string | null;
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
  order: LmsLeadOrder | null;
  /** Who touched it last and when (the old LMS's "status updater" + "last update"). */
  lastUpdate: { at: string; by: string | null };
  isStale: boolean;
}

/** The linked order, with what the Logistics column shows. */
export interface LmsLeadOrder {
  id: string;
  invoiceNumber: number;
  status: string;
  courierProvider: string | null;
  courierBookingStatus: string;
  courierStatus: string | null;
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
  division: string | null;
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

/** Leads per stage, plus ALL and FAKE (lost as "Fake / spam"). */
export type LmsStageCounts = Record<LmsStage | 'ALL' | 'FAKE', number>;

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
  /** Managers: "ME", "AUTO" (share out in turn) or a team member's userId. */
  assignTo?: string;
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

export type LmsBulkAction = 'WON' | 'LOST' | 'ADD_TAG' | 'REMOVE_TAG' | 'DELETE' | 'ASSIGN';

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

// ------------------------------------------------------------ Team (Step 6)

export interface LmsRosterAgent {
  userId: string;
  name: string;
  isOwner: boolean;
  isAgent: boolean;
  isManager: boolean;
  canPull: boolean;
  available: boolean;
  dailyCap: number | null;
  assignedToday: number;
  staffRole: string | null;
}

export type LmsAttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HOLIDAY';

export const LMS_ATTENDANCE_LABELS: Record<LmsAttendanceStatus, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LEAVE: 'Leave',
  HOLIDAY: 'Holiday',
};

export interface LmsAttendanceRow {
  date: string;
  userId: string;
  name: string;
  in: string | null;
  out: string | null;
  onShiftNow: boolean;
  status: LmsAttendanceStatus | null;
  remark: string | null;
  manual: boolean;
  updatedByName: string | null;
}

// ------------------------------------------------------------ Call Desk (Step 5)

/** The keypad outcomes. WIN / LOSE read "Confirm / Cancel order" on order leads, "Create order / Not interested" otherwise. */
export type LmsDeskOutcome = 'WIN' | 'CALL_LATER' | 'NO_ANSWER' | 'BUSY' | 'SWITCHED_OFF' | 'LOSE' | 'WRONG_NUMBER';
export type LmsDeskFilter = 'ORDERS' | 'OTHERS';
export type LmsDeskReason = 'CALLBACK' | 'RETRY' | 'NEW' | 'POOL';

export interface LmsDeskNext {
  lead: LmsLeadDetail | null;
  reason: LmsDeskReason | null;
  task: { dueAt: string; note: string | null } | null;
  /** The call script with {variables} still in it. */
  script: string | null;
  queue: { waiting: number; callbacksDue: number };
}

export interface RecordLmsContact {
  outcome: LmsDeskOutcome;
  note?: string;
  reason?: string;
  callbackAt?: string;
}

export interface LmsCustomerPanel {
  orders: {
    total: number;
    delivered: number;
    returned: number;
    cancelled: number;
    recent: { id: string; invoiceNumber: number; status: string; total: number; createdAt: string }[];
  };
  delivery: { delivered: number; finished: number; rate: number | null };
  blacklisted: boolean;
  notes: { text: string | null; actorName: string | null; createdAt: string }[];
}

export type LmsTemplateChannel = 'SMS' | 'WHATSAPP';

export interface LmsTemplate {
  id: string;
  channel: LmsTemplateChannel;
  name: string;
  body: string;
}

/** What Add Order fills in for `?fromLead=`. */
export interface LmsOrderPrefill {
  leadId: string;
  customerName: string;
  customerPhone: string;
  customerPhoneAlt: string | null;
  customerEmail: string | null;
  shippingAddress: string | null;
  shippingDistrict: string | null;
  shippingCity: string | null;
  customerNote: string | null;
  staffNote: string;
  items: {
    productId: string;
    variantId?: string;
    productName: string;
    productSku: string;
    productImage?: string;
    selectedOptions?: Record<string, string>;
    listPrice: number;
    unitPrice: number;
    quantity: number;
  }[];
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
  bulk: (ids: string[], action: LmsBulkAction, extra: { reason?: string; tag?: string; assignTo?: string | null } = {}) =>
    api.post<{ done: number; skipped: number }>('/v1/lms/leads/bulk', { ids, action, ...extra }).then((r) => r.data),

  fields: () => api.get<LmsFieldDef[]>('/v1/lms/fields').then((r) => r.data),
  createField: (body: { label: string; type: LmsFieldType; options?: string[]; showInTable?: boolean }) =>
    api.post<LmsFieldDef>('/v1/lms/fields', body).then((r) => r.data),
  updateField: (id: string, body: { label?: string; options?: string[]; showInTable?: boolean }) =>
    api.patch<LmsFieldDef>(`/v1/lms/fields/${id}`, body).then((r) => r.data),
  deleteField: (id: string) => api.delete(`/v1/lms/fields/${id}`).then((r) => r.data),
  reorderFields: (ids: string[]) => api.post<LmsFieldDef[]>('/v1/lms/fields/order', { ids }).then((r) => r.data),

  roster: () => api.get<LmsRosterAgent[]>('/v1/lms/agents/roster').then((r) => r.data),
  updateAgent: (userId: string, body: Partial<Pick<LmsRosterAgent, 'isAgent' | 'isManager' | 'canPull' | 'dailyCap'>>) =>
    api.patch<LmsRosterAgent>(`/v1/lms/agents/${userId}`, body).then((r) => r.data),
  setShift: (available: boolean) => api.patch<{ available: boolean }>('/v1/lms/me/shift', { available }).then((r) => r.data),
  assignLead: (id: string, userId: string | null) =>
    api.post<LmsLeadDetail>(`/v1/lms/leads/${id}/assign`, { userId }).then((r) => r.data),
  attendanceDay: (date: string) => api.get<LmsAttendanceRow[]>('/v1/lms/attendance', { params: { date } }).then((r) => r.data),
  attendanceMonth: (month: string) =>
    api.get<LmsAttendanceRow[]>('/v1/lms/attendance/month', { params: { month } }).then((r) => r.data),
  saveAttendance: (body: { userId: string; date: string; status: LmsAttendanceStatus; inTime?: string; outTime?: string; remark?: string }) =>
    api.put<LmsAttendanceRow[]>('/v1/lms/attendance', body).then((r) => r.data),
  clearAttendance: (userId: string, date: string) =>
    api.delete<LmsAttendanceRow[]>(`/v1/lms/attendance/${userId}/${date}`).then((r) => r.data),

  deskNext: (body: { filter?: LmsDeskFilter; skip?: string[] }) => api.post<LmsDeskNext>('/v1/lms/desk/next', body).then((r) => r.data),
  recordContact: (id: string, body: RecordLmsContact) =>
    api.post<{ lead: LmsLeadDetail; createOrder: boolean }>(`/v1/lms/leads/${id}/contact`, body).then((r) => r.data),
  sendMessage: (id: string, body: { channel: LmsTemplateChannel; text: string; templateName?: string }) =>
    api.post<{ link: string | null; lead: LmsLeadDetail }>(`/v1/lms/leads/${id}/message`, body).then((r) => r.data),
  customer: (id: string) => api.get<LmsCustomerPanel>(`/v1/lms/leads/${id}/customer`).then((r) => r.data),
  orderPrefill: (id: string) => api.get<LmsOrderPrefill>(`/v1/lms/leads/${id}/prefill`).then((r) => r.data),
  linkOrder: (id: string, orderId: string) =>
    api.post<LmsLeadDetail>(`/v1/lms/leads/${id}/link-order`, { orderId }).then((r) => r.data),

  templates: () => api.get<LmsTemplate[]>('/v1/lms/templates').then((r) => r.data),
  createTemplate: (body: Omit<LmsTemplate, 'id'>) => api.post<LmsTemplate>('/v1/lms/templates', body).then((r) => r.data),
  updateTemplate: (id: string, body: Omit<LmsTemplate, 'id'>) =>
    api.patch<LmsTemplate>(`/v1/lms/templates/${id}`, body).then((r) => r.data),
  deleteTemplate: (id: string) => api.delete(`/v1/lms/templates/${id}`).then((r) => r.data),

  landingBacklog: () => api.get<{ count: number }>('/v1/lms/capture/landing-backlog').then((r) => r.data),
  importLandingBacklog: () => api.post<{ imported: number }>('/v1/lms/capture/landing-backlog').then((r) => r.data),

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
