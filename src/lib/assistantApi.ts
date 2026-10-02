import { api } from './api';

// Vendor dashboard > Ask AI — mirrors server/src/assistant/. The server keeps
// no chats: the panel sends the recent messages with every question, plus the
// dashboard pages and the open page's fields so the assistant can link and fill.

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantRoute {
  path: string;
  label: string;
}

export type AssistantFieldKind = 'text' | 'number' | 'textarea' | 'select' | 'richtext' | 'email' | 'tel' | 'url' | 'date';

export interface AssistantField {
  id: string;
  label: string;
  kind: AssistantFieldKind;
  value?: string;
  options?: string[];
}

export interface AssistantFill {
  id: string;
  label: string;
  value: string;
}

export interface AssistantAnswer {
  reply: string;
  links: AssistantRoute[];
  fills: AssistantFill[];
}

export const assistantApi = {
  chat: (messages: AssistantMessage[], routes: AssistantRoute[], page: { path: string; fields: AssistantField[] }) =>
    api.post<AssistantAnswer>('/v1/assistant/chat', { messages, routes, page }).then((r) => r.data),
};
