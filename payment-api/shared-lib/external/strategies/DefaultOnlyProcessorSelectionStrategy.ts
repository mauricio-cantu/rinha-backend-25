import { IProcessorSelectionStrategy } from "@shared/internal/interfaces/strategies/IProcessorSelectionStrategy";
import { ProcessorAlias } from "../dtos";

export class DefaultOnlyProcessorSelectionStrategy
  implements IProcessorSelectionStrategy
{
  async run(): Promise<ProcessorAlias> {
    return "default";
  }
}
