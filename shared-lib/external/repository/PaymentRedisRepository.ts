import { IPaymentRepository } from "@shared/internal/interfaces/repositories/IPaymentRepository";
import { Redis } from "ioredis";
import { ProcessedPayment } from "../dtos";

export class PaymentRedisRepository implements IPaymentRepository {
  private readonly PAYMENTS_KEY = "payments";

  constructor(private readonly redisClient: Redis) {}

  async save(paymentData: ProcessedPayment): Promise<void> {
    const formatted = this.formatToSave(paymentData);
    this.redisClient.rpush(this.PAYMENTS_KEY, formatted);
  }

  async getTotalsOfProcessors(): Promise<string[]> {
    const fullData = this.redisClient.lrange(this.PAYMENTS_KEY, 0, -1);
    return fullData;
  }

  formatToSave(paymentData: ProcessedPayment) {
    return `${paymentData.correlationId},${paymentData.amount},${paymentData.processor},${paymentData.requestedAt}`;
  }
}
