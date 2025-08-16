import { ProcessedPayment } from "@shared/external/dtos";
import { UndiciProcessorClientFactory } from "@shared/external/factories/UndiciProcessorClientFactory";
import { ProcessorHealthRedisRepository } from "@shared/external/repository/ProcessorHealthRedisRepository";
import { DefaultOnlyProcessorSelectionStrategy } from "@shared/external/strategies/DefaultOnlyProcessorSelectionStrategy";
import Redis from "ioredis";
import { parentPort } from "node:worker_threads";
import { ProcessPaymentUseCase } from "src/internal/use-cases/ProcessPaymentUseCase";
import { UpdateProcessorHealthUseCase } from "src/internal/use-cases/UpdateProcessorHealthUseCase";
import { runWithInterval } from "src/utils";
import { BatchProcessingResult } from "./types";
import { ServerWorkerMessage } from "./worker-utils";
import { RedisHealthStatusProcessorSelectionStrategy } from "@shared/external/strategies/RedisHealthStatusProcessorSelectionStrategy";

const BATCH_CONCURRENCY = Number(process.env.BATCH_CONCURRENCY) || 50;
const BATCH_INTERVAL = Number(process.env.BATCH_INTERVAL) || 100;

const redis = new Redis({
  host: "redis",
  port: 6379,
});

const processorClientFactory = new UndiciProcessorClientFactory();
const processorHealthRepository = new ProcessorHealthRedisRepository(redis);
const processorSelectionStrategy = new DefaultOnlyProcessorSelectionStrategy();
const processPaymentUseCase = new ProcessPaymentUseCase(processorClientFactory);

const pendingPayments: string[] = [];
const processedPayments: ProcessedPayment[] = [];

// setup da troca de mensagens entre main thread e worker
parentPort?.on("message", async (message: ServerWorkerMessage) => {
  switch (message.type) {
    case "process-payment":
      pendingPayments.push(message.payload);
      break;
    case "payments-summary":
      parentPort?.postMessage({
        type: "payments-summary-response",
        payload: processedPayments,
      } satisfies ServerWorkerMessage);
    default:
      break;
  }
});

// setup processamento em lote
const processBatch = async () => {
  const batch = pendingPayments.splice(0, BATCH_CONCURRENCY);
  if (!batch.length) return;

  const processor = await processorSelectionStrategy.run();

  const results = (await Promise.all(
    batch.map((payment) =>
      processPaymentUseCase
        .execute(JSON.parse(payment), processor)
        .then((execution) =>
          execution.success
            ? { success: true, processedPayment: execution.processedPayment }
            : { success: false, payment }
        )
    )
  )) as BatchProcessingResult;

  results.forEach((result) => {
    if (result.success) {
      processedPayments.push(result.processedPayment);
    } else {
      // requeue
      pendingPayments.unshift(result.payment);
    }
  });
};
runWithInterval(() => processBatch(), BATCH_INTERVAL);

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
