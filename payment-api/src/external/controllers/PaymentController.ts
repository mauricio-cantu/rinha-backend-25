import {
  HttpRequest,
  HttpResponse,
  IController,
} from "../../internal/interfaces/IController";
import { EnqueuePaymentUseCase } from "../../internal/use-cases/EnqueuePayment";

export class PaymentsController implements IController {
  constructor(private readonly useCase: EnqueuePaymentUseCase) {}

  async handle(request: HttpRequest): Promise<HttpResponse> {
    this.useCase.execute(request.body).catch((err) =>
      console.log("Falha no enfileiramento", {
        error: err,
        data: request.body,
      })
    );
    return {
      statusCode: 201,
      body: "ok",
    };
  }
}
