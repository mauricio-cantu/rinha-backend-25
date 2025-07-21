import { FastifyRequest, FastifyReply } from "fastify";
import { IController } from "../../internal/interfaces/IController";

export function fastifyControllerAdapter(controller: IController) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const httpRequest = {
      body: request.body,
      params: request.params,
      query: request.query,
      headers: request.headers,
    };

    const httpResponse = await controller.handle(httpRequest);

    reply.status(httpResponse.statusCode).send(httpResponse.body);
  };
}
