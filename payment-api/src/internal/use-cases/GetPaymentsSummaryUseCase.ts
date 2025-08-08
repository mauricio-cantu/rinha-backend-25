import { ProcessorAlias } from "@shared/external/dtos";
import { IPaymentRepository } from "@shared/internal/interfaces/repositories/IPaymentRepository";

export interface GetPaymentsSummaryUseCaseParams {
  startDate: string;
  endDate: string;
}

export interface SummaryItem {
  totalRequests: number;
  totalAmount: number;
}

export interface GetPaymentsSummaryUseCaseResponse {
  default: SummaryItem;
  fallback: SummaryItem;
}

export class GetPaymentsSummaryUseCase {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(
    params: GetPaymentsSummaryUseCaseParams
  ): Promise<GetPaymentsSummaryUseCaseResponse> {
    const { startDate, endDate } = params;
    const rawData =
      (await this.paymentRepository.getTotalsOfProcessors()) as string[];

    const result = {
      default: { totalRequests: 0, totalAmount: 0 },
      fallback: { totalRequests: 0, totalAmount: 0 },
    };

    for (const payment of rawData) {
      const [_, amount, processor, requestedAt] = payment.split(",");
      if (!this.isDateInRange(requestedAt, startDate, endDate)) continue;
      const processorAlias = processor as ProcessorAlias;
      result[processorAlias].totalRequests += 1;
      result[processorAlias].totalAmount += parseFloat(amount);
    }

    return {
      default: {
        totalAmount: Math.round(result.default.totalAmount * 100) / 100,
        totalRequests: result.default.totalRequests,
      },
      fallback: {
        totalAmount: Math.round(result.fallback.totalAmount * 100) / 100,
        totalRequests: result.fallback.totalRequests,
      },
    };
  }

  isDateInRange(date: string, fromDate: string, toDate: string) {
    const dateToCheck = new Date(date);
    const from = new Date(fromDate);
    const to = new Date(toDate);
    return dateToCheck >= from && dateToCheck <= to;
  }
}
