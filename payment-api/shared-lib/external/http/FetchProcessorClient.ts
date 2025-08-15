import {
  IProcessorClient,
  Response,
} from "@shared/internal/interfaces/http/IProcessorClient";
import { PaymentDTO, ProcessorAlias, ProcessorHealthResponse } from "../dtos";

export class FetchProcessorClient implements IProcessorClient {
  private readonly baseUrl: string;

  constructor(private alias: "default" | "fallback") {
    this.baseUrl = this.resolveBaseUrl(this.alias);
  }

  private resolveBaseUrl(alias: ProcessorAlias): string {
    const envKey =
      alias === "default"
        ? "PAYMENT_PROCESSOR_URL_DEFAULT"
        : "PAYMENT_PROCESSOR_URL_FALLBACK";
    const url = process.env[envKey];
    if (!url) {
      throw new Error(`Missing env variable for ${envKey}`);
    }
    return url;
  }

  async checkHealth(): Promise<Response<ProcessorHealthResponse>> {
    const response = await fetch(`${this.baseUrl}/payments/service-health`);
    if (!response.ok) {
      return {
        success: false,
        error: null,
      };
    }
    return {
      success: true,
      data: await response.json(),
    };
  }

  purgePayments(): Promise<void> {
    throw new Error("Not implemented");
  }

  sendPayment(payment: PaymentDTO): Promise<Response> {
    throw new Error("Not implemented");
  }
}
