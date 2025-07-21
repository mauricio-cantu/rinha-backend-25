import { PaymentDTO } from "../interfaces/PaymentDTO";

export class Payment {
  private readonly correlationId: string;
  private readonly amount: number;
  private readonly requestedAt: string;

  constructor(correlationId: string, amount: number) {
    if (!correlationId) {
      throw new Error("Invalid correlationId. It must be a valid UUID.");
    }
    if (isNaN(amount) && amount <= 0) {
      throw new Error(
        "Invalid payment amount. It must be a valid number greater than zero."
      );
    }

    this.correlationId = correlationId;
    this.amount = amount;
    this.requestedAt = new Date().toISOString();
  }

  getCorrelationId() {
    return this.correlationId;
  }

  getAmount(): number {
    return this.amount;
  }

  getRequestedAt(): string {
    return this.requestedAt;
  }

  static fromDto(paymentDto: PaymentDTO): Payment {
    const { correlationId, amount } = paymentDto;
    return new Payment(correlationId, amount);
  }
}
