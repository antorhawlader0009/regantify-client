import { api } from './api';

// Mirrors server/src/domains/domains.controller.ts (super-admin-new.md Step 9).

export type DomainStatus = 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'FAILED';

export interface DomainState {
  domain: string | null;
  status: DomainStatus | null;
  checkedAt: string | null;
  error: string | null;
  /** The host the store's CNAME must point at (the server's IP is never sent to a store). */
  cnameTarget: string | null;
  ready: boolean;
  /** The record host to type: '@' for the main domain, else www / shop... (null with no domain). */
  recordHost?: string | null;
  /** The company running the domain's DNS, guessed from its nameservers (null when it has none yet). */
  dnsHost?: DnsHost | null;
}

export type DnsHost = 'cloudflare' | 'namecheap' | 'hostinger' | 'godaddy' | 'porkbun' | 'other';

export interface AdminDomainRow {
  id: string;
  storeName: string;
  subdomain: string;
  customDomain: string;
  customDomainStatus: DomainStatus | null;
  customDomainCheckedAt: string | null;
  customDomainVerifiedAt: string | null;
  customDomainError: string | null;
}

export const DOMAIN_STATUS: Record<DomainStatus, { label: string; cls: string; hint: string }> = {
  PENDING: { label: 'Waiting for DNS', cls: 'bg-amber-50 text-amber-800', hint: 'Add the record below at your domain seller. It is checked every 30 minutes.' },
  VERIFIED: { label: 'DNS is right, HTTPS starting', cls: 'bg-blue-50 text-blue-700', hint: 'The record points at us. The secure certificate is being made; this usually takes a few minutes.' },
  ACTIVE: { label: 'Live', cls: 'bg-green-50 text-green-700', hint: 'Your store opens on this domain with a secure (https) address.' },
  FAILED: { label: 'Not pointing at us', cls: 'bg-red-50 text-red-700', hint: 'The record changed or was removed. Put it back as shown below.' },
};

export const domainsApi = {
  status: () => api.get<DomainState>('/v1/vendor/domain/status').then((r) => r.data),
  check: () => api.post<DomainState>('/v1/vendor/domain/check').then((r) => r.data),
  adminList: () => api.get<{ aRecords: string[]; cnameTarget: string | null; ready: boolean; domains: AdminDomainRow[] }>('/v1/admin/domains').then((r) => r.data),
  adminRecheck: (vendorId: string) => api.post(`/v1/admin/domains/${vendorId}/recheck`).then((r) => r.data),
  adminRemove: (vendorId: string, reason: string) => api.post(`/v1/admin/domains/${vendorId}/remove`, { reason }).then((r) => r.data),
};
