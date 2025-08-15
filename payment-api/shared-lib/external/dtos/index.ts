export interface PaymentDTO {
  amount: number;
  correlationId: string;
  requestedAt: string | null;
}

export interface ProcessedPayment {
  amount: number;
  correlationId: string;
  requestedAt: string;
  processor: string;
}

export interface ProcessorHealthResponse {
  failing: boolean;
  minResponseTime: number;
}

export interface SummaryItem {
  totalRequests: number;
  totalAmount: number;
}

export interface GetPaymentsSummaryResponse {
  default: SummaryItem;
  fallback: SummaryItem;
}

export type ProcessorAlias = "default" | "fallback";
