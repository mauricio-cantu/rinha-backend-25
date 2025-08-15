import { IProcessorClientFactory } from "@shared/internal/interfaces/factories/IProcessorClientFactory";
import { IProcessorClient } from "@shared/internal/interfaces/http/IProcessorClient";
import { UndiciProcessorClient } from "../http/UndiciProcessorClient";
import { ProcessorAlias } from "../dtos";

export class UndiciProcessorClientFactory implements IProcessorClientFactory {
  create(alias: ProcessorAlias): IProcessorClient {
    return UndiciProcessorClient.getInstance(alias);
  }
}
