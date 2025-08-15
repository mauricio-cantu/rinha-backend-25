import { IProcessorClientFactory } from "@shared/internal/interfaces/factories/IProcessorClientFactory";
import { IProcessorHealthRepository } from "@shared/internal/interfaces/repositories/IProcessorHealthRepository";

export class UpdateProcessorHealthUseCase {
  constructor(
    private readonly processorClientFactory: IProcessorClientFactory,
    private readonly processorHealthRepository: IProcessorHealthRepository
  ) {}

  async execute() {
    const defaultClient = this.processorClientFactory.create("default");
    const fallbackClient = this.processorClientFactory.create("fallback");

    const [defaultStatus, fallbackStatus] = await Promise.all([
      defaultClient.checkHealth(),
      fallbackClient.checkHealth(),
    ]);

    if (defaultStatus.success) {
      await this.processorHealthRepository.saveDefaultStatus(
        defaultStatus.data!
      );
    }

    if (fallbackStatus.success) {
      await this.processorHealthRepository.saveFallbackStatus(
        fallbackStatus.data!
      );
    }
  }
}
