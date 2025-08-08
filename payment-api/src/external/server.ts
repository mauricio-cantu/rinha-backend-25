import { BullMQMessageQueue } from "@shared/external/queue/BullMQMessageQueue";
import { PaymentRedisRepository } from "@shared/external/repository/PaymentRedisRepository";
import http from "node:http";
import { hostname } from "node:os";
import { parse } from "node:url";
import { createClient } from "redis";
import { GetPaymentsSummaryUseCase } from "src/internal/use-cases/GetPaymentsSummaryUseCase";
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

      if (method === "GET" && parsedUrl.pathname === "/ping") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: `pong from ${hostname()}` }));
        return;
      }

      if (method === "POST" && parsedUrl.pathname === "/payments") {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", async () => {
          try {
            const data = JSON.parse(body);
            const result = await paymentsController.handle({ body: data });
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
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
  } catch (err) {
    console.error("fatal error on server", err);
    process.exit(1);
  }
};
