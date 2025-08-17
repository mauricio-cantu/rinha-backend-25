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
      `${data.failing} ${data.minResponseTime}`,
      "EX",
      this.TTL_SECONDS
    );
  }

  private unpack(value: string): ProcessorHealthResponse {
    const spaceIndex = value.indexOf(" ");
    const failing = value.substring(0, spaceIndex);
    const minResponseTime = value.substring(spaceIndex + 1);
    return {
      failing: Boolean(failing),
      minResponseTime: Number(minResponseTime),
    };
  }

  async getDefaultStatus(): Promise<ProcessorHealthResponse | null> {
    const value = await this.redisClient.get(this.getKey("default"));
    return value ? this.unpack(value) : null;
  }

  async getFallbackStatus(): Promise<ProcessorHealthResponse | null> {
    const value = await this.redisClient.get(this.getKey("fallback"));
    return value ? this.unpack(value) : null;
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
