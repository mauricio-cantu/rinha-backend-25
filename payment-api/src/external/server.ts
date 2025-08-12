import http from "node:http";
import { hostname } from "node:os";
import path from "node:path";
import { parse } from "node:url";
import { Worker } from "node:worker_threads";
import { GetPaymentsSummaryUseCaseResponse } from "src/internal/use-cases/GetPaymentsSummaryUseCase";
import { sendToWorker, ServerWorkerMessage } from "./worker-utils";

const port = 3000;
const workerPath = path.resolve(__dirname, "server-worker.js");
const serverWorker = new Worker(workerPath);

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
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("ok");
      return;
    }

    if (method === "GET" && parsedUrl.pathname === "/payments-summary") {
      const result = await new Promise<GetPaymentsSummaryUseCaseResponse>(
        (resolve, reject) => {
          serverWorker.once("message", (message: ServerWorkerMessage) => {
            if (message.type === "payments-summary-response") {
              resolve(message.payload);
            } else {
              reject(new Error("Error from worker"));
            }
          });

          serverWorker.postMessage({
            type: "payments-summary",
            payload: parsedUrl.query,
          });
        }
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
      return;
    }
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server ${hostname()} rodando na porta ${port}`);
});
