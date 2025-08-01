import { IMessageQueue } from "@shared/internal/interfaces/queue/IMessageQueue";
import { PaymentDTO } from "../../../shared-lib/external/dtos";

export class EnqueuePaymentUseCase {
  constructor(private readonly messageQueue: IMessageQueue<PaymentDTO>) {}

  async execute(paymentDto: PaymentDTO) {
    await this.messageQueue.enqueue(paymentDto);
  }
}
