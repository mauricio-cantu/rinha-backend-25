import { ProcessedPayment } from "@shared/external/dtos/";

export interface IPaymentRepository {
  save(paymentData: ProcessedPayment): Promise<void>;
}
