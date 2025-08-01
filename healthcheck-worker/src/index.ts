import { createClient, RedisClientType } from "redis";
import { UpdateProcessorHealthUseCase } from "./use-cases/UpdateProcessorHealthUseCase";
import { FetchProcessorClientFactory } from "@shared/external/factories/FetchProcessorClientFactory";
import { ProcessorHealthRedisRepository } from "@shared/external/repository/ProcessorHealthRedisRepository";

const redis = createClient({
  url: process.env.REDIS_URL,
});

redis
  .connect()
  .then(startHealthCheckLoop)
  .catch((err) => {
    console.log("Error in Redis connection", err);
  });

async function startHealthCheckLoop() {
  const WORKER_INTERVAL_IN_MS = 5000;

  const processorClientFactory = new FetchProcessorClientFactory();
  const processorHealthRepository = new ProcessorHealthRedisRepository(
    redis as RedisClientType
  );
  const useCase = new UpdateProcessorHealthUseCase(
    processorClientFactory,
    processorHealthRepository
  );

  while (true) {
    try {
      await useCase.execute();
    } catch (err) {
      console.error("Error executing health check:", err);
    }

    await new Promise((resolve) => setTimeout(resolve, WORKER_INTERVAL_IN_MS));
  }
}
