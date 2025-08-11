import { IProcessorHealthRepository } from "@shared/internal/interfaces/repositories/IProcessorHealthRepository";
import { IProcessorSelectionStrategy } from "@shared/internal/interfaces/strategies/IProcessorSelectionStrategy";
import { ProcessorAlias } from "../dtos";

export class RedisHealthStatusProcessorSelectionStrategy
  implements IProcessorSelectionStrategy
{
  private readonly FALLBACK_LATENCY_PENALTY_PERCENTAGE = 0.5;

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

    if (defaultAvailable && !fallbackAvailable) return "default";

    if (
      fallbackAvailable &&
      !defaultAvailable &&
      fallbackStatus.minResponseTime < 500
    )
      return "fallback";

    if (defaultAvailable && fallbackAvailable) {
      const adjustedFallbackTime =
        fallbackStatus.minResponseTime *
        (1 + this.FALLBACK_LATENCY_PENALTY_PERCENTAGE);

      const preferFallback =
        defaultStatus.minResponseTime > adjustedFallbackTime;
      return preferFallback ? "fallback" : "default";
    }

    return "default";
  }
}
