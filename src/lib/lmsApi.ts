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
  /** Send the missed-call SMS after this unreached try; null = off. */
  missedCallSmsAfter: number | null;
  /** null = the built-in text. */
  missedCallSmsText: string | null;
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
  /** Made from a pasted chat (AI assist): the chat and the products read from it. */
  chat?: { text: string; items: LmsChatItem[] };
}

export type UpdateLmsLead = Partial<{
  [K in keyof Omit<CreateLmsLead, 'note' | 'name' | 'phone' | 'tags' | 'chat'>]: CreateLmsLead[K] | null;
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
  /** LOSE only: reopen by itself after this many days ("Not now"). */
  remindInDays?: number;
}

// ------------------------------------------------------------ Tasks (Step 7)

export type LmsTaskType = 'CALL' | 'WHATSAPP' | 'MEETING' | 'VISIT' | 'OTHER';
export type LmsTaskView = 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'DONE';

export const LMS_TASK_TYPE_LABELS: Record<LmsTaskType, string> = {
  CALL: 'Call',
  WHATSAPP: 'WhatsApp',
  MEETING: 'Meeting',
  VISIT: 'Visit',
  OTHER: 'Other',
};

export interface LmsTask {
  id: string;
  type: LmsTaskType;
  dueAt: string;
  note: string | null;
  isAutoRetry: boolean;
  reopensLead: boolean;
  doneAt: string | null;
  createdAt: string;
  assignee: { id: string; name: string } | null;
  lead: {
    id: string;
    name: string;
    phone: string;
    stage: LmsStage;
    kind: LmsLeadKind;
    attemptCount: number;
    order: { invoiceNumber: number } | null;
    open: boolean;
  };
}

export interface LmsTaskList {
  total: number;
  page: number;
  perPage: number;
  tasks: LmsTask[];
}

export type LmsTaskCounts = Record<'OVERDUE' | 'TODAY' | 'UPCOMING', number> & { due: number };

// ------------------------------------------------------------ Notifications (Step 8)

export type LmsNotificationType = 'ASSIGNED' | 'CAME_AGAIN' | 'TASK_DUE' | 'STALE' | 'AUTOMATION';

export interface LmsNotification {
  id: string;
  type: LmsNotificationType;
  text: string;
  leadId: string | null;
  readAt: string | null;
  createdAt: string;
}

/** The one poll behind the bell, the badges and the browser alerts. */
export interface LmsNotificationSummary {
  unread: number;
  latest: LmsNotification[];
  /** leads = new leads waiting for your first call; tasks = your overdue tasks. */
  badges: { leads: number; tasks: number };
}

/** A product people asked to hear about that's back in stock (Step 9). */
export interface LmsRestockItem {
  productId: string;
  name: string;
  waiting: number;
}

/** "Not now" reminder choices, in days. */
export const LMS_REMIND_DAYS = [3, 7, 14, 30];

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

/** One import row, already matched to our columns (LMS > Leads > Import). */
export interface LmsImportRow {
  /** The row's line in the file (the header is line 1). */
  line: number;
  date?: string;
  name?: string;
  phone: string;
  phoneAlt?: string;
  email?: string;
  product?: string;
  price?: number;
  quantity?: number;
  address?: string;
  district?: string;
  area?: string;
  note?: string;
  ref?: string;
  fields?: Record<string, string>;
}

export interface LmsImportBody {
  rows: LmsImportRow[];
  assignTo: string;
  stage: 'NEW' | 'WON' | 'LOST';
  reason?: string;
  tag?: string;
  fileName?: string;
}

export interface LmsImportResult {
  inserted: number;
  merged: number;
  skipped: { line: number; reason: string }[];
}

/** Rows the server takes per import call. */
export const LMS_IMPORT_CHUNK = 2000;

/** One lead in full, for Export CSV and Print. */
export interface LmsExportRow {
  id: string;
  createdAt: string;
  stage: LmsStage;
  lostReason: string | null;
  kind: LmsLeadKind;
  source: LmsLeadSource;
  name: string;
  phone: string;
  phoneAlt: string | null;
  email: string | null;
  address: string | null;
  district: string | null;
  division: string | null;
  area: string | null;
  productSummary: string | null;
  quantity: number | null;
  value: number | null;
  tags: string[];
  attemptCount: number;
  nextTaskAt: string | null;
  lastActivityAt: string;
  closedAt: string | null;
  doNotContact: boolean;
  customFields: Record<string, string | number>;
  externalRef: string | null;
  message: string | null;
  agent: string | null;
  order: { invoiceNumber: number; status: string } | null;
  lastOutcome: string | null;
  lastNote: string | null;
}

export interface LmsExport {
  total: number;
  /** More leads match than were sent (the limit). */
  truncated: boolean;
  rows: LmsExportRow[];
}

export type LmsReportRange = '7D' | '30D' | '90D';

/** A number for this period and the one before it (null = nothing to divide). */
export interface LmsCompared {
  current: number | null;
  previous: number | null;
}

export interface LmsReportAgentRow {
  userId: string;
  name: string;
  leadsHandled: number;
  contacts: number;
  calls: number;
  reached: number;
  reachRate: number | null;
  won: number;
  lost: number;
  winRate: number | null;
  firstContactMinutes: number | null;
  overdueTasks: number;
  confirmedOrders: number;
  delivered: number;
  returned: number;
  deliveredRate: number | null;
}

export interface LmsReport {
  range: LmsReportRange;
  period: { from: string; to: string; prevFrom: string; prevTo: string };
  agent: { userId: string; name: string } | null;
  team: {
    newLeads: LmsCompared;
    contacts: LmsCompared;
    reachRate: LmsCompared;
    winRate: LmsCompared;
    won: LmsCompared;
    firstContactMinutes: LmsCompared;
    openBacklog: number;
    staleNow: number;
  };
  agents: LmsReportAgentRow[];
  sources: { key: string; source: LmsLeadSource; form: string | null; leads: number; won: number; lost: number; winRate: number | null; valueWon: number }[];
  stageFlow: { stage: LmsStage; leads: number; avgMinutes: number | null }[];
  lostReasons: { reason: string; leads: number }[];
  outcomes: { outcome: string; calls: number }[];
  byHour: { hour: number; calls: number; reached: number; reachRate: number | null }[];
}

export interface LmsMyDay {
  contacts: number;
  won: number;
  tasksDue: number;
}

/** AI assist uses this month (LMS-plan.md Step 12). */
export interface LmsAiUsage {
  used: number;
  limit: number;
}

/** A product read out of a pasted chat: matched to the catalog (productId), or as the customer said it. */
export interface LmsChatItem {
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice?: number | null;
}

export interface LmsChatRead {
  name: string | null;
  phone: string | null;
  phoneAlt: string | null;
  address: string | null;
  district: string | null;
  area: string | null;
  note: string | null;
  items: LmsChatItem[];
  productSummary: string | null;
  value: number | null;
  usage: LmsAiUsage;
}

/** LMS > Settings > Automations (LMS-plan.md Step 13). */
export type LmsAutomationTrigger = 'LEAD_CREATED' | 'STAGE_CHANGED' | 'WON' | 'LOST' | 'NO_ACTIVITY' | 'TASK_OVERDUE';

export interface LmsAutomationConditions {
  kind?: LmsLeadKind;
  source?: LmsLeadSource;
  stage?: LmsStage;
  productId?: string;
  tag?: string;
  valueAtLeast?: number;
  district?: string;
  lostReason?: string;
}

export type LmsAutomationAction =
  | { type: 'ASSIGN'; to: string }
  | { type: 'ADD_TAG'; tag: string }
  | { type: 'CREATE_TASK'; taskType: LmsTaskType; inMinutes: number; note?: string; person: string }
  | { type: 'SEND_SMS'; templateId: string }
  | { type: 'NOTIFY'; person: string };

export interface LmsAutomationInput {
  name: string;
  enabled?: boolean;
  trigger: LmsAutomationTrigger;
  hours?: number;
  toStage?: LmsStage;
  conditions: LmsAutomationConditions;
  actions: LmsAutomationAction[];
}

export interface LmsAutomation extends Required<Pick<LmsAutomationInput, 'name' | 'trigger' | 'conditions' | 'actions'>> {
  id: string;
  enabled: boolean;
  hours: number | null;
  toStage: LmsStage | null;
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
}

export const lmsApi = {
  me: () => api.get<LmsMe>('/v1/lms/me').then((r) => r.data),
  getSettings: () => api.get<LmsSettings>('/v1/lms/settings').then((r) => r.data),
  updateSettings: (body: UpdateLmsSettings) => api.patch<LmsSettings>('/v1/lms/settings', body).then((r) => r.data),

  listLeads: (filters: LmsLeadFilters, page: number) =>
    api.get<LmsLeadList>('/v1/lms/leads', { params: { ...filters, page } }).then((r) => r.data),
  counts: (filters: LmsLeadFilters) =>
    api.get<LmsStageCounts>('/v1/lms/leads/counts', { params: { ...filters, stage: undefined } }).then((r) => r.data),
  exportLeads: (filters: LmsLeadFilters, limit?: number) =>
    api.get<LmsExport>('/v1/lms/leads/export', { params: { ...filters, limit } }).then((r) => r.data),
  importLeads: (body: LmsImportBody) => api.post<LmsImportResult>('/v1/lms/leads/import', body).then((r) => r.data),
  report: (range: LmsReportRange, agent?: string) =>
    api.get<LmsReport>('/v1/lms/reports', { params: { range, agent } }).then((r) => r.data),
  myDay: () => api.get<LmsMyDay>('/v1/lms/reports/my-day').then((r) => r.data),
  aiUsage: () => api.get<LmsAiUsage>('/v1/lms/ai/usage').then((r) => r.data),
  readChat: (text: string) => api.post<LmsChatRead>('/v1/lms/ai/chat', { text }).then((r) => r.data),
  aiSummary: (id: string) => api.post<{ lines: string[]; usage: LmsAiUsage }>(`/v1/lms/leads/${id}/ai/summary`).then((r) => r.data),
  aiDraft: (id: string, body: { channel: LmsTemplateChannel; templateId?: string; instruction?: string }) =>
    api.post<{ text: string; usage: LmsAiUsage }>(`/v1/lms/leads/${id}/ai/draft`, body).then((r) => r.data),
  automations: () => api.get<LmsAutomation[]>('/v1/lms/automations').then((r) => r.data),
  createAutomation: (body: LmsAutomationInput) => api.post<LmsAutomation>('/v1/lms/automations', body).then((r) => r.data),
  updateAutomation: (id: string, body: LmsAutomationInput) => api.put<LmsAutomation>(`/v1/lms/automations/${id}`, body).then((r) => r.data),
  toggleAutomation: (id: string, enabled: boolean) =>
    api.patch<LmsAutomation>(`/v1/lms/automations/${id}/enabled`, { enabled }).then((r) => r.data),
  deleteAutomation: (id: string) => api.delete(`/v1/lms/automations/${id}`).then((r) => r.data),
  getLead: (id: string) => api.get<LmsLeadDetail>(`/v1/lms/leads/${id}`).then((r) => r.data),
  createLead: (body: CreateLmsLead) =>
    api.post<{ merged: boolean; leadId: string | null }>('/v1/lms/leads', body).then((r) => r.data),
  updateLead: (id: string, body: UpdateLmsLead) => api.patch<LmsLeadDetail>(`/v1/lms/leads/${id}`, body).then((r) => r.data),
  addNote: (id: string, text: string) => api.post<LmsLeadDetail>(`/v1/lms/leads/${id}/notes`, { text }).then((r) => r.data),
  closeLead: (id: string, outcome: 'WON' | 'LOST', reason?: string, remindInDays?: number) =>
    api.post<LmsLeadDetail>(`/v1/lms/leads/${id}/close`, { outcome, reason, remindInDays }).then((r) => r.data),

  restock: () => api.get<LmsRestockItem[]>('/v1/lms/restock').then((r) => r.data),
  textWaiting: (productId: string, text?: string) =>
    api.post<{ sent: number; skipped: number; error: string | null }>(`/v1/lms/restock/${productId}/sms`, { text }).then((r) => r.data),
  notificationSummary: () => api.get<LmsNotificationSummary>('/v1/lms/notifications/summary').then((r) => r.data),
  markNotificationsRead: (body: { ids?: string[]; all?: boolean }) =>
    api.post<LmsNotificationSummary>('/v1/lms/notifications/read', body).then((r) => r.data),

  tasks: (params: { view: LmsTaskView; who?: string; page?: number }) =>
    api.get<LmsTaskList>('/v1/lms/tasks', { params }).then((r) => r.data),
  taskCounts: (who?: string) => api.get<LmsTaskCounts>('/v1/lms/tasks/counts', { params: { who } }).then((r) => r.data),
  leadTasks: (leadId: string) => api.get<LmsTask[]>(`/v1/lms/leads/${leadId}/tasks`).then((r) => r.data),
  createTask: (leadId: string, body: { type: LmsTaskType; dueAt: string; note?: string; assigneeId?: string }) =>
    api.post<LmsTask[]>(`/v1/lms/leads/${leadId}/tasks`, body).then((r) => r.data),
  completeTask: (id: string) => api.post<LmsTask[]>(`/v1/lms/tasks/${id}/done`).then((r) => r.data),
  removeTask: (id: string) => api.delete<LmsTask[]>(`/v1/lms/tasks/${id}`).then((r) => r.data),
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
