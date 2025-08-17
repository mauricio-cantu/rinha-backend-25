import {
  PaymentDTO,
  ProcessedPayment,
  ProcessorAlias,
} from "@shared/external/dtos";
import { IProcessorClientFactory } from "@shared/internal/interfaces/factories/IProcessorClientFactory";

type ProcessPaymentUseCaseResponse =
  | {
      success: true;
      processedPayment: ProcessedPayment;
    }
  | {
      success: false;
    };

export class ProcessPaymentUseCase {
  constructor(
    private readonly processorClientFactory: IProcessorClientFactory
  ) {}

  async execute(
    paymentData: PaymentDTO,
    processor: ProcessorAlias
  ): Promise<ProcessPaymentUseCaseResponse> {
    const processorClient = this.processorClientFactory.create(processor);
    const currentDate = new Date().toISOString();
    const sendPaymentResponse = await processorClient.sendPayment({
      ...paymentData,
      requestedAt: currentDate,
    });
    if (sendPaymentResponse.success) {
      const processedPayment: ProcessedPayment = {
        ...paymentData,
        requestedAt: currentDate,
        processor,
      };

      return {
        success: true,
        processedPayment,
      };
    } else {
      return {
        success: false,
      };
    }
  }
}
