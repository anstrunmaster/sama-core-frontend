import { request } from '@/lib/api/client';
import type {
  CreateWithholdingPayload,
  SriConcept,
  Withholding,
  WithholdingStatus,
  WithholdingsListResponse,
} from '@/types/withholding';

const BASE = '/withholdings';

export interface WithholdingsQuery {
  status?: WithholdingStatus;
  supplier_id?: string;
  purchase_id?: string;
  from_date?: string;
  to_date?: string;
  fiscal_period?: string;
  q?: string;
  page?: number;
  limit?: number;
}

function qs(params: Record<string, any>): string {
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') usp.append(k, String(v));
  });
  const s = usp.toString();
  return s ? `?${s}` : '';
}

export async function listWithholdings(q: WithholdingsQuery = {}) {
  return request<WithholdingsListResponse>(`${BASE}${qs(q)}`);
}

export async function getWithholding(id: string) {
  return request<Withholding>(`${BASE}/${id}`);
}

export async function createWithholding(payload: CreateWithholdingPayload) {
  return request<Withholding>(BASE, { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateWithholding(id: string, payload: CreateWithholdingPayload) {
  return request<Withholding>(`${BASE}/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function createFromPurchase(
  purchaseId: string,
  body?: { establishment?: string; emission_point?: string; issue_date?: string },
) {
  return request<Withholding>(`${BASE}/from-purchase/${purchaseId}`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
  });
}

export async function signWithholding(id: string) {
  return request<Withholding>(`${BASE}/${id}/sign`, { method: 'POST' });
}

export async function sendWithholding(id: string) {
  return request<Withholding>(`${BASE}/${id}/send`, { method: 'POST' });
}

export async function authorizeWithholding(id: string) {
  return request<Withholding>(`${BASE}/${id}/authorize`, { method: 'POST' });
}

export async function processWithholding(id: string) {
  return request<Withholding>(`${BASE}/${id}/process`, { method: 'POST' });
}

export async function voidWithholding(id: string, reason: string) {
  return request<Withholding>(`${BASE}/${id}/void`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function getConcepts(type?: 'RENTA' | 'IVA' | 'ISD') {
  return request<{ items: SriConcept[] }>(`${BASE}/concepts${type ? `?type=${type}` : ''}`);
}

export function ridePdfUrl(id: string): string {
  return `${process.env.NEXT_PUBLIC_API_URL ?? ''}${BASE}/${id}/ride.pdf`;
}
