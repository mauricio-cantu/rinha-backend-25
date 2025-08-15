import { PaymentDTO, ProcessedPayment } from "@shared/external/dtos";

export type BatchProcessingResult = (
  | { success: true; processedPayment: ProcessedPayment }
  | { success: false; payment: string }
)[];
