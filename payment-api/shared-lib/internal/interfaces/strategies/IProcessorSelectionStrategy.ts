import { ProcessorAlias } from "@shared/external/dtos";

export interface IProcessorSelectionStrategy {
  run(): Promise<ProcessorAlias | null>;
}
