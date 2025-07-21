import { PaymentDTO } from "../../../shared-lib/interfaces/PaymentDTO";
import { IMessageQueue } from "../interfaces/IMessageQueue";

export class EnqueuePaymentUseCase {
  constructor(
    private readonly messageQueue: IMessageQueue<PaymentDTO>,
    private readonly jobName: string
  ) {}

  async execute(paymentDto: PaymentDTO) {
    await this.messageQueue.enqueue(this.jobName, paymentDto);
  }
}
