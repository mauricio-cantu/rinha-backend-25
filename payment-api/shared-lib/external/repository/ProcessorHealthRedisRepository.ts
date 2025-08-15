import { IProcessorHealthRepository } from "@shared/internal/interfaces/repositories/IProcessorHealthRepository";
import { Redis } from "ioredis";
import { ProcessorAlias, ProcessorHealthResponse } from "../dtos";

export class ProcessorHealthRedisRepository
  implements IProcessorHealthRepository
{
  private TTL_SECONDS = 10;

  constructor(private readonly redisClient: Redis) {}

  private getKey(alias: ProcessorAlias): string {
    return `health:${alias}`;
  }

  private async setHealthStatus(
    alias: ProcessorAlias,
    data: ProcessorHealthResponse
  ) {
    await this.redisClient.set(
      this.getKey(alias),
      JSON.stringify(data),
      "EX",
      this.TTL_SECONDS
    );
  }

  async getDefaultStatus(): Promise<ProcessorHealthResponse | null> {
    const value = await this.redisClient.get(this.getKey("default"));
    return value ? (JSON.parse(value) as ProcessorHealthResponse) : null;
  }

  async getFallbackStatus(): Promise<ProcessorHealthResponse | null> {
    const value = await this.redisClient.get(this.getKey("fallback"));
    return value ? (JSON.parse(value) as ProcessorHealthResponse) : null;
  }

  async saveDefaultStatus(
    healthStatus: ProcessorHealthResponse
  ): Promise<void> {
    await this.setHealthStatus("default", healthStatus);
  }

  async saveFallbackStatus(
    healthStatus: ProcessorHealthResponse
  ): Promise<void> {
    await this.setHealthStatus("fallback", healthStatus);
  }
}
