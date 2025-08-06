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

interface TotalsOfProcessorsItem {
  processor: ProcessorAlias;
  amount: string;
  requestedAt: string;
}

export class GetPaymentsSummaryUseCase {
  constructor(private readonly paymentRepository: IPaymentRepository) {}

  async execute(
    params: GetPaymentsSummaryUseCaseParams
  ): Promise<GetPaymentsSummaryUseCaseResponse> {
    const { startDate, endDate } = params;
    const rawData = (await this.paymentRepository.getTotalsOfProcessors({
      from: startDate,
      to: endDate,
    })) as TotalsOfProcessorsItem[];

    const result: GetPaymentsSummaryUseCaseResponse = {
      default: { totalRequests: 0, totalAmount: 0 },
      fallback: { totalRequests: 0, totalAmount: 0 },
    };

    for (const payment of rawData) {
      if (payment) {
        const processor =
          payment.processor as keyof GetPaymentsSummaryUseCaseResponse;
        result[processor].totalRequests += 1;
        result[processor].totalAmount += parseFloat(payment.amount);
      }
    }

    return result;
  }
}
