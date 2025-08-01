import { IProcessorClient } from "../http/IProcessorClient";

export interface IProcessorClientFactory {
  create(alias: "default" | "fallback"): IProcessorClient;
}
