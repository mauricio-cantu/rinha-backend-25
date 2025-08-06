import {
  HttpRequest,
  HttpResponse,
  IController,
} from "src/internal/interfaces/IController";
import { GetPaymentsSummaryUseCase } from "src/internal/use-cases/GetPaymentsSummaryUseCase";

export class GetSummaryController implements IController {
  constructor(private readonly useCase: GetPaymentsSummaryUseCase) {}

  async handle(request: HttpRequest): Promise<HttpResponse> {
    try {
      const { from, to } = request.query;
      const response = await this.useCase.execute({
        startDate: from,
        endDate: to,
      });
      return {
        statusCode: 201,
        body: response,
      };
    } catch (err: any) {
      return {
        statusCode: err.statusCode || 500,
        body: { error: err.message || "Internal server error" },
      };
    }
  }
}
