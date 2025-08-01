import { PaymentDTO } from "@shared/external/dtos";

export class Payment {
  private readonly correlationId: string;
  private readonly amount: number;

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
  }

  getCorrelationId() {
    return this.correlationId;
  }

  getAmount(): number {
    return this.amount;
  }

  static fromDto(paymentDto: PaymentDTO): Payment {
    const { correlationId, amount } = paymentDto;
    return new Payment(correlationId, amount);
  }
}
