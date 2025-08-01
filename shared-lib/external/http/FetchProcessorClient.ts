import { Payment } from "@shared/internal/domain/Payment";
import {
  IProcessorClient,
  Response,
} from "@shared/internal/interfaces/http/IProcessorClient";
import { ProcessorAlias, ProcessorHealthResponse } from "../dtos";

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

  async sendPayment(payment: Payment): Promise<Response> {
    const response = await fetch(`${this.baseUrl}/payments`, {
      body: JSON.stringify(payment),
      method: "POST",
    });

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

  async purgePayments(): Promise<void> {}
}
