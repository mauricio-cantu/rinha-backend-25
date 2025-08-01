export interface PaymentDTO {
  amount: number;
  correlationId: string;
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

export type ProcessorAlias = "default" | "fallback";
