import { PaymentDTO, ProcessedPayment } from "@shared/external/dtos";
import { Payment } from "@shared/internal/domain/Payment";
import { IProcessorClientFactory } from "@shared/internal/interfaces/factories/IProcessorClientFactory";
import { IPaymentRepository } from "@shared/internal/interfaces/repositories/IPaymentRepository";
import { IProcessorSelectionStrategy } from "@shared/internal/interfaces/strategies/IProcessorSelectionStrategy";

export class ProcessPaymentUseCase {
  constructor(
    private readonly processorSelectionStrategy: IProcessorSelectionStrategy,
    private readonly processorClientFactory: IProcessorClientFactory,
    private readonly paymentRepository: IPaymentRepository
  ) {}

  async execute(paymentData: PaymentDTO) {
    console.log("[ProcessPaymentUseCase] Working...", paymentData);

    const processor = await this.processorSelectionStrategy.run();
    if (!processor) {
      // requeue
      throw new Error("No processor available");
    }
    const processorClient = this.processorClientFactory.create(processor);
    const payment = Payment.fromDto(paymentData);
    const sendPaymentResponse = await processorClient.sendPayment(payment);
    if (sendPaymentResponse.success) {
      const processedPayment: ProcessedPayment = {
        amount: payment.getAmount(),
        correlationId: payment.getCorrelationId(),
        requestedAt: payment.getRequestedAt(),
        processor,
      };
      await this.paymentRepository.save(processedPayment);
      console.log(
        "[ProcessPaymentUseCase] Finished processing payment",
        processedPayment
      );
    } else {
      // requeue
      throw new Error(`Failed sending payment to ${processor} processor.`);
    }
  }
}
