import { IProcessorClientFactory } from "@shared/internal/interfaces/factories/IProcessorClientFactory";
import { IProcessorClient } from "@shared/internal/interfaces/http/IProcessorClient";
import { FetchProcessorClient } from "../http/FetchProcessorClient";

export class FetchProcessorClientFactory implements IProcessorClientFactory {
  create(alias: "default" | "fallback"): IProcessorClient {
    return new FetchProcessorClient(alias);
  }
}
