import { IPaymentRepository } from "@shared/internal/interfaces/repositories/IPaymentRepository";
import { RedisClientType } from "redis";
import { DateRange, ProcessedPayment } from "../dtos";

export class PaymentRedisRepository implements IPaymentRepository {
  private readonly PAYMENTS_KEY = "payments";

  constructor(private readonly redisClient: RedisClientType) {}

  async save(paymentData: ProcessedPayment): Promise<void> {
    const timestamp = new Date(paymentData.requestedAt).getTime();
    const key = `payments:${paymentData.processor}`;
    const correlationKey = `payment:${paymentData.correlationId}`;

    await this.redisClient
      .multi()
      .zAdd(key, { score: timestamp, value: paymentData.correlationId })
      .hSet(correlationKey, {
        amount: paymentData.amount,
        requestedAt: paymentData.requestedAt,
        processor: paymentData.processor,
      })
      .exec();
  }

  async getTotalsOfProcessors(range: DateRange): Promise<unknown[]> {
    const start = new Date(range.from).getTime();
    const end = new Date(range.to).getTime();

    const [defaultIds, fallbackIds] = await Promise.all([
      this.redisClient.zRangeByScore("payments:default", start, end),
      this.redisClient.zRangeByScore("payments:fallback", start, end),
    ]);

    const allIds = [...defaultIds, ...fallbackIds];

    const multi = this.redisClient.multi();

    for (const correlationId of allIds) {
      multi.hGetAll(`payment:${correlationId}`);
    }

    return await multi.exec();
  }
}
