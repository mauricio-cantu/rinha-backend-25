import { UndiciProcessorClientFactory } from "@shared/external/factories/UndiciProcessorClientFactory";
import { BullMQMessageQueue } from "@shared/external/queue/BullMQMessageQueue";
import { PaymentRedisRepository } from "@shared/external/repository/PaymentRedisRepository";
import { ProcessorHealthRedisRepository } from "@shared/external/repository/ProcessorHealthRedisRepository";
import http from "node:http";
import { hostname } from "node:os";
import { parse } from "node:url";
import { createClient } from "redis";
import { GetPaymentsSummaryUseCase } from "src/internal/use-cases/GetPaymentsSummaryUseCase";
import { UpdateProcessorHealthUseCase } from "src/internal/use-cases/UpdateProcessorHealthUseCase";
import { EnqueuePaymentUseCase } from "../internal/use-cases/EnqueuePayment";
import { GetSummaryController } from "./controllers/GetSummaryController";
import { PaymentsController } from "./controllers/PaymentController";
const port = 3000;
const redisUrl = process.env.REDIS_URL!;

const redis = createClient({
  url: process.env.REDIS_URL,
  socket: {
    keepAlive: true,
  },
});

export const startServer = async () => {
  try {
    await redis.connect();

    // Payments queue setup
    const bullMQQueue = new BullMQMessageQueue(redisUrl);
    // @ts-expect-error
    const paymentRedisRepository = new PaymentRedisRepository(redis);

    // Use cases e controllers
    const enqueuePaymentUseCase = new EnqueuePaymentUseCase(bullMQQueue);
    const paymentsController = new PaymentsController(enqueuePaymentUseCase);
    const getPaymentsSummaryUseCase = new GetPaymentsSummaryUseCase(
      paymentRedisRepository
    );
    const getSummaryController = new GetSummaryController(
      getPaymentsSummaryUseCase
    );

    const server = http.createServer(async (req, res) => {
      const { method, url } = req;
      const parsedUrl = parse(url || "", true);
      if (method === "POST" && parsedUrl.pathname === "/payments") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          try {
            const data = JSON.parse(body);
            paymentsController.handle({ body: data });
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end("ok");
          } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal Server Error" }));
          }
        });
        return;
      }

      if (method === "GET" && parsedUrl.pathname === "/payments-summary") {
        try {
          const result = await getSummaryController.handle({
            query: parsedUrl.query,
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result.body));
        } catch (error) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Internal Server Error" }));
        }
        return;
      }

      // Not Found
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not Found" }));
    });

    server.listen(port, "0.0.0.0", () => {
      console.log(`Server ${hostname()} running on port ${port}`);
    });

    const shouldRunHealthCheck = !!process.env.RUN_HEALTHCHECK;
    if (shouldRunHealthCheck) {
      // setup do healthcheck
      const WORKER_INTERVAL_IN_MS = 5000;
      const processorClientFactory = new UndiciProcessorClientFactory();
      const processorHealthRepository = new ProcessorHealthRedisRepository(
        // @ts-expect-error
        redis
      );
      const healthCheckUseCase = new UpdateProcessorHealthUseCase(
        processorClientFactory,
        processorHealthRepository
      );
      (async () => {
        while (true) {
          try {
            await healthCheckUseCase.execute();
          } catch (err) {
            console.error("Error executing health check:", err);
          }
          await new Promise((resolve) =>
            setTimeout(resolve, WORKER_INTERVAL_IN_MS)
          );
        }
      })();
    }
  } catch (err) {
    console.error("fatal error on server", err);
    process.exit(1);
  }
};
