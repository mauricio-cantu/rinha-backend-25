import { PaymentDTO } from "@shared/external/dtos";
import { UndiciProcessorClientFactory } from "@shared/external/factories/UndiciProcessorClientFactory";
import { BullMQMessageQueue } from "@shared/external/queue/BullMQMessageQueue";
import { PaymentRedisRepository } from "@shared/external/repository/PaymentRedisRepository";
import { ProcessorHealthRedisRepository } from "@shared/external/repository/ProcessorHealthRedisRepository";
import { RedisHealthStatusProcessorSelectionStrategy } from "@shared/external/strategies/RedisHealthStatusProcessorSelectionStrategy";
import { Worker as BMQWorker } from "bullmq";
import Redis from "ioredis";
import { parentPort } from "node:worker_threads";
import { EnqueuePaymentUseCase } from "src/internal/use-cases/EnqueuePayment";
import { GetPaymentsSummaryUseCase } from "src/internal/use-cases/GetPaymentsSummaryUseCase";
import { ProcessPaymentUseCase } from "src/internal/use-cases/ProcessPaymentUseCase";
import { UpdateProcessorHealthUseCase } from "src/internal/use-cases/UpdateProcessorHealthUseCase";
import { ServerWorkerMessage } from "./worker-utils";

const redisUrl = process.env.REDIS_URL!;
const redis = new Redis({
  host: "redis",
  port: 6379,
  keepAlive: 70_000,
});

(async () => {
  try {
    const bullMQQueue = new BullMQMessageQueue(redisUrl);
    const paymentRedisRepository = new PaymentRedisRepository(redis);
    const enqueuePaymentUseCase = new EnqueuePaymentUseCase(bullMQQueue);
    const getPaymentsSummaryUseCase = new GetPaymentsSummaryUseCase(
      paymentRedisRepository
    );
    const processorClientFactory = new UndiciProcessorClientFactory();
    const processorHealthRepository = new ProcessorHealthRedisRepository(redis);

    // setup da troca de mensagens entre main thread e worker
    parentPort?.on("message", async (message: ServerWorkerMessage) => {
      switch (message.type) {
        case "process-payment":
          enqueuePaymentUseCase
            .execute(JSON.parse(message.payload))
            .catch((err) => console.error("Erro ao enfileirar pagamento", err));
          break;
        case "payments-summary":
          const { from, to } = message.payload;
          const result = await getPaymentsSummaryUseCase.execute({
            startDate: from as string,
            endDate: to as string,
          });
          parentPort?.postMessage({
            type: "payments-summary-response",
            payload: result,
          } satisfies ServerWorkerMessage);
        default:
          break;
      }
    });

    // setup do worker de pagamentos
    const queueName = process.env.PAYMENTS_QUEUE!;
    const DEFAULT_WORKER_CONCURRENCY = 50;
    const processorSelectionStrategy =
      new RedisHealthStatusProcessorSelectionStrategy(
        processorHealthRepository
      );
    const processPaymentUseCase = new ProcessPaymentUseCase(
      processorSelectionStrategy,
      processorClientFactory,
      paymentRedisRepository
    );

    const concurrency = Number(
      process.env.WORKER_CONCURRENCY || DEFAULT_WORKER_CONCURRENCY
    );

    const worker = new BMQWorker(
      queueName,
      async (job) => {
        await processPaymentUseCase.execute(job.data as PaymentDTO);
      },
      {
        connection: {
          url: redisUrl,
        },
        concurrency,
      }
    );

    worker.on("completed", (job) => {
      console.log(`[Payment worker] Job ${job.id} completed`);
    });

    worker.on("failed", (job, err) => {
      console.error(`[Payment worker] Job ${job?.id} failed:`, err.message);
    });

    // setup do healthcheck
    const shouldRunHealthCheck = !!process.env.RUN_HEALTHCHECK;
    if (shouldRunHealthCheck) {
      const WORKER_INTERVAL_IN_MS = 5000;

      const healthCheckUseCase = new UpdateProcessorHealthUseCase(
        processorClientFactory,
        processorHealthRepository
      );
      (async () => {
        while (true) {
          try {
            await healthCheckUseCase.execute();
          } catch (err) {
            console.error("Error executing health check:", err);
          }
          await new Promise((resolve) =>
            setTimeout(resolve, WORKER_INTERVAL_IN_MS)
          );
        }
      })();
    }
  } catch (err) {
    console.error("error on server worker", err);
    process.exit(1);
  }
})();
