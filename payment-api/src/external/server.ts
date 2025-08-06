import { BullMQMessageQueue } from "@shared/external/queue/BullMQMessageQueue";
import Fastify from "fastify";
import { hostname } from "node:os";
import { EnqueuePaymentUseCase } from "../internal/use-cases/EnqueuePayment";
import { fastifyControllerAdapter } from "./adapters/fastifyControllerAdapter";
import { PaymentsController } from "./controllers/PaymentController";
import { GetPaymentsSummaryUseCase } from "src/internal/use-cases/GetPaymentsSummaryUseCase";
import { PaymentRedisRepository } from "@shared/external/repository/PaymentRedisRepository";
import { createClient } from "redis";
import { GetSummaryController } from "./controllers/GetSummaryController";

const port = 3000;
const redisUrl = process.env.REDIS_URL!;
const ff = Fastify();

const redis = createClient({
  url: process.env.REDIS_URL,
});

export const startServer = async () => {
  try {
    await redis.connect();

    // Payments queue setup
    const bullMQQueue = new BullMQMessageQueue(redisUrl);

    // @ts-expect-error
    const paymentRedisRepository = new PaymentRedisRepository(redis);

    // Link use cases to controllers
    const enqueuePaymentUseCase = new EnqueuePaymentUseCase(bullMQQueue);
    const paymentsController = new PaymentsController(enqueuePaymentUseCase);
    const getPaymentsSummaryUseCase = new GetPaymentsSummaryUseCase(
      paymentRedisRepository
    );
    const getSummaryController = new GetSummaryController(
      getPaymentsSummaryUseCase
    );

    const fastifyPaymentsController =
      fastifyControllerAdapter(paymentsController);
    const fastifyGetSummaryController =
      fastifyControllerAdapter(getSummaryController);

    // Routes
    ff.post("/payments", fastifyPaymentsController);
    ff.get("/payments-summary", fastifyGetSummaryController);
    ff.get("/ping", async () => {
      return { message: `pong from ${hostname()}` };
    });

    await ff.listen({ port, host: "0.0.0.0" });
    ff.log.info(`Server ${hostname()} running on port ${port}`);
  } catch (err) {
    ff.log.info("fatal error on server", err);
    process.exit(1);
  }
};
