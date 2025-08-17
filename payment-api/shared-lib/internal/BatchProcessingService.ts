import { PaymentDTO, ProcessedPayment } from "@shared/external/dtos";
import { ProcessPaymentUseCase } from "./use-cases/ProcessPaymentUseCase";
import { IProcessorSelectionStrategy } from "./interfaces/strategies/IProcessorSelectionStrategy";
import { BatchProcessingResult } from "src/external/types";
import { runWithInterval } from "src/utils";
import { SimpleQueue } from "./SimpleQueue";

export class BatchProcessingService {
  private readonly queue: SimpleQueue<PaymentDTO>;
  private readonly batchSize: number;
  private readonly batchInterval: number;
  private readonly processedPayments: ProcessedPayment[] = [];

  constructor(
    private readonly processorSelectionStrategy: IProcessorSelectionStrategy,
    private readonly processPaymentUseCase: ProcessPaymentUseCase,
    batchSize: number,
    batchInterval: number
  ) {
    this.queue = new SimpleQueue<PaymentDTO>();
    this.batchInterval = batchInterval;
    this.batchSize = batchSize;
    this.start();
  }

  start() {
    runWithInterval(this.processBatch.bind(this), this.batchInterval);
  }

  private async processBatch() {
    const batch = this.queue.batchDequeue(this.batchSize);
    if (!batch) return;
    const processor = await this.processorSelectionStrategy.run();
    const results = (await Promise.all(
      batch.map((payment) =>
        this.processPaymentUseCase
          .execute(payment, processor)
          .then((execution) =>
            execution.success
              ? { success: true, processedPayment: execution.processedPayment }
              : { success: false, payment }
          )
      )
    )) as BatchProcessingResult;

    results.forEach((result) => {
      if (result.success) {
        this.processedPayments.push(result.processedPayment);
      } else {
        // requeue
        this.queue.enqueue(result.payment);
      }
    });
  }

  add(payment: PaymentDTO) {
    this.queue.enqueue(payment);
  }

  getProcessedPayments() {
    return this.processedPayments;
  }
}
