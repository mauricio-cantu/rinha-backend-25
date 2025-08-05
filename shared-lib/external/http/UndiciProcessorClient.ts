import { Payment } from "@shared/internal/domain/Payment";
import {
  IProcessorClient,
  Response,
} from "@shared/internal/interfaces/http/IProcessorClient";
import { ProcessorAlias, ProcessorHealthResponse } from "../dtos";
import { Dispatcher, Pool } from "undici";

export class UndiciProcessorClient implements IProcessorClient {
  private readonly baseUrl: string;
  private readonly pool: Dispatcher;
  private static instances: Map<ProcessorAlias, UndiciProcessorClient> =
    new Map();

  private constructor(private alias: ProcessorAlias) {
    this.baseUrl = this.resolveBaseUrl(this.alias);
    this.pool = new Pool(this.baseUrl, {
      connections: Number(process.env.HTTP_CONNECTIONS_NUMBER || 10),
    });
  }

  // singleton por tipo de processor (default/fallback)
  static getInstance(alias: ProcessorAlias) {
    if (!UndiciProcessorClient.instances.has(alias)) {
      UndiciProcessorClient.instances.set(
        alias,
        new UndiciProcessorClient(alias)
      );
    }
    return UndiciProcessorClient.instances.get(alias)!;
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
    const body = JSON.stringify(payment);

    const { statusCode, body: responseBody } = await this.pool.request({
      path: `${this.baseUrl}/payments`,
      method: "POST",
      body,
    });

    const ok = statusCode === 200;

    if (!ok) {
      return {
        success: false,
        error: null,
      };
    }

    return {
      success: true,
      data: await responseBody.json(),
    };
  }

  async checkHealth(): Promise<Response<ProcessorHealthResponse>> {
    const { statusCode, body: responseBody } = await this.pool.request({
      path: `${this.baseUrl}/payments/service-health`,
      method: "GET",
    });

    const ok = statusCode === 200;

    if (!ok) {
      return {
        success: false,
        error: null,
      };
    }

    return {
      success: true,
      data: (await responseBody.json()) as ProcessorHealthResponse,
    };
  }

  async purgePayments(): Promise<void> {}
}
