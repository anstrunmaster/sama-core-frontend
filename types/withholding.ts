export type WithholdingStatus =
  | 'DRAFT'
  | 'SIGNED'
  | 'SENT'
  | 'AUTHORIZED'
  | 'REJECTED'
  | 'VOIDED';

export type WithholdingTaxType = 'RENTA' | 'IVA' | 'ISD';

export interface WithholdingLine {
  id: string;
  tax_type: WithholdingTaxType;
  tax_code: string;
  concept_code: string;
  concept_name: string;
  base_amount: string | number;
  percentage: string | number;
  withheld_amount: string | number;
  fiscal_period_doc: string;
}

export interface Withholding {
  id: string;
  tenant_id: string;
  purchase_id: string | null;
  supplier_id: string;
  establishment: string;
  emission_point: string;
  sequential: string;
  document_number: string;
  access_key: string | null;
  authorization_number: string | null;
  internal_number: string;
  issue_date: string;
  fiscal_period: string;
  support_doc_type: string;
  support_doc_number: string;
  support_doc_authorization: string | null;
  support_doc_date: string;
  support_doc_total: string | number;
  payment_date: string;
  status: WithholdingStatus;
  sri_status: string | null;
  sri_messages: any;
  total_withheld: string | number;
  voided_at: string | null;
  voided_reason: string | null;
  created_at: string;
  updated_at: string;
  signed_at: string | null;
  sent_at: string | null;
  authorized_at: string | null;
  lines: WithholdingLine[];
}

export interface SriConcept {
  code: string;
  name: string;
  defaultPercentage: number;
  taxType: WithholdingTaxType;
}

export interface CreateWithholdingPayload {
  purchase_id?: string;
  supplier_id: string;
  establishment: string;
  emission_point: string;
  issue_date: string;
  support_doc_type: string;
  support_doc_number: string;
  support_doc_authorization?: string;
  support_doc_date: string;
  support_doc_total: number;
  payment_date: string;
  lines: Array<{
    tax_type: WithholdingTaxType;
    concept_code: string;
    concept_name?: string;
    base_amount: number;
    percentage: number;
    fiscal_period_doc: string;
  }>;
}

export interface WithholdingsListResponse {
  items: Withholding[];
  total: number;
  page: number;
  limit: number;
}
