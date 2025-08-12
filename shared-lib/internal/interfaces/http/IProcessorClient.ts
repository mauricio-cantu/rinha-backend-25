import { PaymentDTO, ProcessorHealthResponse } from "@shared/external/dtos";

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
  sendPayment(payment: PaymentDTO): Promise<Response>;
  checkHealth(): Promise<Response<ProcessorHealthResponse>>;
  purgePayments(): Promise<void>;
}
