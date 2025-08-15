import { ProcessedPayment, ProcessorAlias } from "@shared/external/dtos";
import { UndiciProcessorClientFactory } from "@shared/external/factories/UndiciProcessorClientFactory";
import http from "node:http";
import { hostname } from "node:os";
import path from "node:path";
import { parse } from "node:url";
import { Worker } from "node:worker_threads";
import { isDateInRange } from "src/utils";
import { request } from "undici";
import { sendToWorker, ServerWorkerMessage } from "./worker-utils";

const port = 3000;

const workerPath = path.resolve(__dirname, "server-worker.js");
const serverWorker = new Worker(workerPath);

const processorClientFactory = new UndiciProcessorClientFactory();

const server = http.createServer(async (req, res) => {
  const { method, url } = req;
  const parsedUrl = parse(url || "", true);

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    if (method === "POST" && parsedUrl.pathname === "/payments") {
      sendToWorker(serverWorker, {
        type: "process-payment",
        payload: body,
      });
      res.statusCode = 200;
      res.end();
      return;
    }

    if (method === "GET" && parsedUrl.pathname === "/payments-summary") {
      const ownPaymentsPromise = new Promise<ProcessedPayment[]>(
        (resolve, reject) => {
          serverWorker.once("message", (message: ServerWorkerMessage) => {
            if (message.type === "payments-summary-response") {
              resolve(message.payload);
            } else {
              reject();
            }
          });

          serverWorker.postMessage({
            type: "payments-summary",
            payload: parsedUrl.query,
          });
        }
      );

      const foreignPaymentPromise = request(
        `${process.env.FOREIGN_API_URL}/private/processed-payments`
      );

      const { from, to } = parsedUrl.query;

      await Promise.all([ownPaymentsPromise, foreignPaymentPromise])
        .then(async ([ownPayments, foreignPaymentsResponse]) => {
          if (foreignPaymentsResponse.statusCode !== 200)
            throw new Error("Error getting foreign summary");

          const foreignPayments =
            (await foreignPaymentsResponse.body.json()) as ProcessedPayment[];

          const result = {
            default: { totalRequests: 0, totalAmount: 0 },
            fallback: { totalRequests: 0, totalAmount: 0 },
          };

          for (const payment of [...ownPayments, ...foreignPayments]) {
            if (
              !isDateInRange(payment.requestedAt, from as string, to as string)
            )
              continue;
            const processorAlias = payment.processor as ProcessorAlias;
            result[processorAlias].totalRequests += 1;
            result[processorAlias].totalAmount += payment.amount;
          }

          res.statusCode = 200;
          res.end(
            JSON.stringify({
              default: {
                totalAmount: Math.round(result.default.totalAmount * 100) / 100,
                totalRequests: result.default.totalRequests,
              },
              fallback: {
                totalAmount:
                  Math.round(result.fallback.totalAmount * 100) / 100,
                totalRequests: result.fallback.totalRequests,
              },
            })
          );
        })
        .catch(() => {
          res.statusCode = 500;
          res.end();
        });

      return;
    }

    if (method === "POST" && parsedUrl.pathname === "/purge-payments") {
      const defaultProcessorClient = processorClientFactory.create("default");
      const fallbackProcessorClient = processorClientFactory.create("fallback");
      Promise.all([
        defaultProcessorClient.purgePayments(),
        fallbackProcessorClient.purgePayments(),
      ]);
      res.statusCode = 200;
      res.end("ok");
      return;
    }

    if (
      method === "GET" &&
      parsedUrl.pathname === "/private/processed-payments"
    ) {
      await new Promise((resolve, reject) => {
        serverWorker.once("message", (message: ServerWorkerMessage) => {
          if (message.type === "payments-summary-response") {
            resolve(message.payload);
          } else {
            reject();
          }
        });

        serverWorker.postMessage({
          type: "payments-summary",
          payload: parsedUrl.query,
        });
      })
        .then((result) => {
          res.statusCode = 200;
          res.end(JSON.stringify(result));
        })
        .catch(() => {
          res.statusCode = 500;
          res.end();
        });
    }
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server ${hostname()} rodando na porta ${port}`);
});
