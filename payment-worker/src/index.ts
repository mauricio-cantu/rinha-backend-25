import { RedisHealthStatusProcessorSelectionStrategy } from "@shared/external/strategies/RedisHealthStatusProcessorSelectionStrategy";
import { ProcessPaymentUseCase } from "./use-cases/ProcessPaymentUseCase";
import { Worker } from "bullmq";
import { ProcessorHealthRedisRepository } from "@shared/external/repository/ProcessorHealthRedisRepository";
import { createClient, RedisClientType } from "redis";
import { UndiciProcessorClientFactory } from "@shared/external/factories/UndiciProcessorClientFactory";
import { PaymentRedisRepository } from "@shared/external/repository/PaymentRedisRepository";
import { PaymentDTO } from "@shared/external/dtos";

const DEFAULT_WORKER_CONCURRENCY = 50;

const queueName = process.env.PAYMENTS_QUEUE!;

const redis = createClient({
  url: process.env.REDIS_URL,
});

redis.connect().then(() => {
  const processorHealthRepository = new ProcessorHealthRedisRepository(
    // @ts-expect-error
    redis as RedisClientType
  );
  const processorSelectionStrategy =
    new RedisHealthStatusProcessorSelectionStrategy(processorHealthRepository);
  const processorClientFactory = new UndiciProcessorClientFactory();
  const paymentRepository = new PaymentRedisRepository(
    // @ts-expect-error
    redis as RedisClientType
  );
  const useCase = new ProcessPaymentUseCase(
    processorSelectionStrategy,
    processorClientFactory,
    paymentRepository
  );

  const worker = new Worker(
    queueName,
    async (job) => {
      await useCase.execute(job.data as PaymentDTO);
    },
    {
      connection: {
        url: process.env.REDIS_URL,
      },
      concurrency: Number(
        process.env.WORKER_CONCURRENCY || DEFAULT_WORKER_CONCURRENCY
      ),
    }
  );

  worker.on("completed", async (job) => {
    console.log(`[Payment worker] Job ${job.id} completed`);
    await job.remove();
  });

  worker.on("failed", (job, err) => {
    console.error(`[Payment worker] Job ${job?.id} failed:`, err.message);
  });
});
