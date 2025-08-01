import { ProcessorHealthResponse } from "@shared/external/dtos";
import { Payment } from "@shared/internal/domain/Payment";

export type Response<T = any> =
  | {
      success: true;
      data: T | null;
    }
  | {
      success: false;
      error: string | null;
    };

export interface IProcessorClient {
  sendPayment(payment: Payment): Promise<Response>;
  checkHealth(): Promise<Response<ProcessorHealthResponse>>;
  purgePayments(): Promise<void>;
}
