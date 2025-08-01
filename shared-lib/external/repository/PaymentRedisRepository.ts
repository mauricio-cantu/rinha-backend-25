import { IPaymentRepository } from "@shared/internal/interfaces/repositories/IPaymentRepository";
import { RedisClientType } from "redis";
import { ProcessedPayment } from "../dtos";

export class PaymentRedisRepository implements IPaymentRepository {
  private readonly PAYMENTS_KEY = "payments";

  constructor(private readonly redisClient: RedisClientType) {}

  async save(paymentData: ProcessedPayment): Promise<void> {
    this.redisClient.lPush(this.PAYMENTS_KEY, JSON.stringify(paymentData));
  }
}
