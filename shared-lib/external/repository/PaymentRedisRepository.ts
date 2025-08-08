import { IPaymentRepository } from "@shared/internal/interfaces/repositories/IPaymentRepository";
import { RedisClientType } from "redis";
import { ProcessedPayment } from "../dtos";

export class PaymentRedisRepository implements IPaymentRepository {
  private readonly PAYMENTS_KEY = "payments";

  constructor(private readonly redisClient: RedisClientType) {}

  async save(paymentData: ProcessedPayment): Promise<void> {
    const formatted = this.formatToSave(paymentData);
    this.redisClient.rPush(this.PAYMENTS_KEY, formatted);
  }

  async getTotalsOfProcessors(): Promise<string[]> {
    const fullData = this.redisClient.lRange(this.PAYMENTS_KEY, 0, -1);
    return fullData;
  }

  formatToSave(paymentData: ProcessedPayment) {
    const { correlationId, amount, processor, requestedAt } = paymentData;
    return `${correlationId},${amount},${processor},${requestedAt}`;
  }
}
