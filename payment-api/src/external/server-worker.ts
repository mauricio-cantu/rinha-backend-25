import { PaymentDTO } from "@shared/external/dtos";
import { UndiciProcessorClientFactory } from "@shared/external/factories/UndiciProcessorClientFactory";
import { ProcessorHealthRedisRepository } from "@shared/external/repository/ProcessorHealthRedisRepository";
import { RedisHealthStatusProcessorSelectionStrategy } from "@shared/external/strategies/RedisHealthStatusProcessorSelectionStrategy";
import { BatchProcessingService } from "@shared/internal/BatchProcessingService";
import { ProcessPaymentUseCase } from "@shared/internal/use-cases/ProcessPaymentUseCase";
import { UpdateProcessorHealthUseCase } from "@shared/internal/use-cases/UpdateProcessorHealthUseCase";
import Redis from "ioredis";
import { parentPort } from "node:worker_threads";
import { runWithInterval } from "src/utils";
import { ServerWorkerMessage } from "./worker-utils";

const BATCH_CONCURRENCY = Number(process.env.BATCH_CONCURRENCY) || 50;
const BATCH_INTERVAL = Number(process.env.BATCH_INTERVAL) || 100;

const redis = new Redis({
  host: "redis",
  port: 6379,
});

const processorClientFactory = new UndiciProcessorClientFactory();
const processorHealthRepository = new ProcessorHealthRedisRepository(redis);
const processorSelectionStrategy =
  new RedisHealthStatusProcessorSelectionStrategy(processorHealthRepository);
const processPaymentUseCase = new ProcessPaymentUseCase(processorClientFactory);
const batchProcessingService = new BatchProcessingService(
  processorSelectionStrategy,
  processPaymentUseCase,
  BATCH_CONCURRENCY,
  BATCH_INTERVAL
);

// setup da troca de mensagens entre main thread e worker
parentPort?.on("message", async (message: ServerWorkerMessage) => {
  switch (message.type) {
    case "process-payment":
      const parsed = JSON.parse(message.payload) as PaymentDTO;
      // validação superficial
      if (!parsed || !parsed.correlationId || !parsed.amount) return;
      batchProcessingService.add(parsed);
      break;
    case "payments-summary":
      parentPort?.postMessage({
        type: "payments-summary-response",
        payload: batchProcessingService.getProcessedPayments(),
      } satisfies ServerWorkerMessage);
    default:
      break;
  }
});

// setup do healthcheck
const shouldRunHealthCheck = !!process.env.RUN_HEALTHCHECK;
if (shouldRunHealthCheck) {
  const HEALTHCHECK_INTERVAL_IN_MS = 5000;

  const healthCheckUseCase = new UpdateProcessorHealthUseCase(
    processorClientFactory,
    processorHealthRepository
  );

  runWithInterval(
    () => healthCheckUseCase.execute(),
    HEALTHCHECK_INTERVAL_IN_MS
  );
}
