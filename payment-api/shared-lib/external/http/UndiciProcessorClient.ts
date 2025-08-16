import {
  IProcessorClient,
  Response,
} from "@shared/internal/interfaces/http/IProcessorClient";
import { Pool } from "undici";
import { PaymentDTO, ProcessorAlias, ProcessorHealthResponse } from "../dtos";

export class UndiciProcessorClient implements IProcessorClient {
  private readonly baseUrl: string;
  private readonly pool: Pool;
  private static instances: Map<ProcessorAlias, UndiciProcessorClient> =
    new Map();
  private readonly TIMEOUT_IN_MS = 7000;

  private constructor(private alias: ProcessorAlias) {
    this.baseUrl = this.resolveBaseUrl(this.alias);
    this.pool = new Pool(this.baseUrl, {
      connections: Number(process.env.HTTP_CONNECTIONS_NUMBER || 10),
    });
  }

  // singleton por tipo de processor (default/fallback)
  static getInstance(alias: ProcessorAlias) {
    if (!this.instances.has(alias)) {
      this.instances.set(alias, new UndiciProcessorClient(alias));
    }
    return this.instances.get(alias)!;
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

  async sendPayment(payment: PaymentDTO): Promise<Response> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(),
      this.TIMEOUT_IN_MS
    );
    try {
      const { statusCode, body: responseBody } = await this.pool.request({
        path: `${this.baseUrl}/payments`,
        bodyTimeout: this.TIMEOUT_IN_MS,
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortController.signal,
        method: "POST",
        body: JSON.stringify(payment),
      });

      const ok = statusCode === 200;

      clearTimeout(timeoutId);

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
    } catch {
      return {
        success: false,
        error: null,
      };
    }
  }

  async checkHealth(): Promise<Response<ProcessorHealthResponse>> {
    const abortController = new AbortController();
    const timeoutId = setTimeout(
      () => abortController.abort(),
      this.TIMEOUT_IN_MS
    );
    try {
      const { statusCode, body: responseBody } = await this.pool.request({
        path: `${this.baseUrl}/payments/service-health`,
        bodyTimeout: this.TIMEOUT_IN_MS,
        method: "GET",
        signal: abortController.signal,
        headers: {
          "Content-Type": "application/json",
        },
      });

      const ok = statusCode === 200;

      clearTimeout(timeoutId);

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
    } catch {
      return {
        success: false,
        error: null,
      };
    }
  }

  async purgePayments(): Promise<void> {
    await this.pool.request({
      path: `${this.baseUrl}/admin/purge-payments`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Rinha-Token": "123",
      },
    });
  }
}
