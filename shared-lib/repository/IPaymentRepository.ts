import { PaymentDTO } from "../interfaces/PaymentDTO";

export interface IPaymentRepository {
  save(paymentData: PaymentDTO): Promise<void>;
}
