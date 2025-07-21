import {
  HttpRequest,
  HttpResponse,
  IController,
} from "../../internal/interfaces/IController";
import { EnqueuePaymentUseCase } from "../../internal/use-cases/EnqueuePayment";

export class PaymentsController implements IController {
  constructor(private readonly useCase: EnqueuePaymentUseCase) {}

  async handle(request: HttpRequest): Promise<HttpResponse> {
    try {
      await this.useCase.execute(request.body);
      return {
        statusCode: 201,
        body: JSON.stringify({ message: "Pagamento recebido" }),
      };
    } catch (err: any) {
      return {
        statusCode: err.statusCode || 500,
        body: { error: err.message || "Internal server error" },
      };
    }
  }
}
