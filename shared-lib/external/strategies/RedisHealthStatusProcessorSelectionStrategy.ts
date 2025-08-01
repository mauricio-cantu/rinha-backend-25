import { IProcessorHealthRepository } from "@shared/internal/interfaces/repositories/IProcessorHealthRepository";
import { IProcessorSelectionStrategy } from "@shared/internal/interfaces/strategies/IProcessorSelectionStrategy";
import { ProcessorAlias } from "../dtos";

export class RedisHealthStatusProcessorSelectionStrategy
  implements IProcessorSelectionStrategy
{
  private readonly FALLBACK_ACCEPTABLE_LATENCY_MS = 100;

  constructor(
    private readonly processorHealthRepository: IProcessorHealthRepository
  ) {}

  async run(): Promise<ProcessorAlias | null> {
    const [defaultStatus, fallbackStatus] = await Promise.all([
      this.processorHealthRepository.getDefaultStatus(),
      this.processorHealthRepository.getFallbackStatus(),
    ]);

    // priorize sempre o default pela taxa menor
    if (defaultStatus && !defaultStatus.failing) return "default";

    // usa o fallback só se estiver com uma tempo mínimo baixo de resposta
    if (
      fallbackStatus &&
      !fallbackStatus.failing &&
      fallbackStatus.minResponseTime <= this.FALLBACK_ACCEPTABLE_LATENCY_MS
    )
      return "fallback";

    return null;
  }
}
