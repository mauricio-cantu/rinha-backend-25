import { BullMQMessageQueue } from "@shared/external/queue/BullMQMessageQueue";
import Fastify from "fastify";
import { hostname } from "node:os";
import { EnqueuePaymentUseCase } from "../internal/use-cases/EnqueuePayment";
import { fastifyControllerAdapter } from "./adapters/fastifyControllerAdapter";
import { PaymentsController } from "./controllers/PaymentController";

const port = 3000;
const redisUrl = process.env.REDIS_URL!;
const ff = Fastify();

// Payments queue setup
const bullMQQueue = new BullMQMessageQueue(redisUrl);

// Link use cases to controllers
const enqueuePaymentUseCase = new EnqueuePaymentUseCase(bullMQQueue);
const paymentsController = new PaymentsController(enqueuePaymentUseCase);
const fastifyPaymentsController = fastifyControllerAdapter(paymentsController);

// Routes
ff.post("/payments", fastifyPaymentsController);
ff.get("/payments-summary", () => {});
ff.get("/ping", async () => {
  return { message: `pong from ${hostname()}` };
});

export const startServer = async () => {
  try {
    await ff.listen({ port, host: "0.0.0.0" });
    ff.log.info(`Server ${hostname()} running on port ${port}`);
  } catch (err) {
    ff.log.info("fatal error on server", err);
    process.exit(1);
  }
};
