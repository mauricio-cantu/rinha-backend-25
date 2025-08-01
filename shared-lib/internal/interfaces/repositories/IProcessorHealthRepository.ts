import { ProcessorHealthResponse } from "@shared/external/dtos";

export interface IProcessorHealthRepository {
  getDefaultStatus(): Promise<ProcessorHealthResponse | null>;
  getFallbackStatus(): Promise<ProcessorHealthResponse | null>;
  saveDefaultStatus(healthStatus: ProcessorHealthResponse): Promise<void>;
  saveFallbackStatus(healthStatus: ProcessorHealthResponse): Promise<void>;
}
