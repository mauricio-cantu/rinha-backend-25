import { IProcessorHealthRepository } from "@shared/internal/interfaces/repositories/IProcessorHealthRepository";
import { IProcessorSelectionStrategy } from "@shared/internal/interfaces/strategies/IProcessorSelectionStrategy";
import { ProcessorAlias } from "../dtos";

export class RedisHealthStatusProcessorSelectionStrategy
  implements IProcessorSelectionStrategy
{
  private readonly FALLBACK_ACCEPTABLE_LATENCY_MS = 100;
  private readonly FALLBACK_LATENCY_PENALTY_MS = 100;

  constructor(
    private readonly processorHealthRepository: IProcessorHealthRepository
  ) {}

  async run(): Promise<ProcessorAlias | null> {
    const [defaultStatus, fallbackStatus] = await Promise.all([
      this.processorHealthRepository.getDefaultStatus(),
      this.processorHealthRepository.getFallbackStatus(),
    ]);

    const defaultAvailable = defaultStatus && !defaultStatus.failing;
    const fallbackAvailable = fallbackStatus && !fallbackStatus.failing;

    if (defaultAvailable && fallbackAvailable) {
      const adjustedFallbackTime =
        fallbackStatus.minResponseTime + this.FALLBACK_LATENCY_PENALTY_MS;

      const preferFallback =
        defaultStatus.minResponseTime > adjustedFallbackTime;
      return preferFallback ? "fallback" : "default";
    }

    if (defaultAvailable) {
      return "default";
    }

    if (
      fallbackAvailable &&
      fallbackStatus.minResponseTime <= this.FALLBACK_ACCEPTABLE_LATENCY_MS
    ) {
      return "fallback";
    }

    return null;
  }
}
