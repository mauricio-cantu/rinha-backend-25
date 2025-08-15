import { ProcessedPayment } from "@shared/external/dtos";
import { ParsedUrlQuery } from "querystring";
import { Worker } from "worker_threads";

export type ServerWorkerMessage =
  | {
      type: "process-payment";
      payload: string; // recebe json não parseado
    }
  | {
      type: "payments-summary";
      payload: ParsedUrlQuery;
    }
  | {
      type: "payments-summary-response";
      payload: ProcessedPayment[];
    };

export const sendToWorker = (worker: Worker, message: ServerWorkerMessage) => {
  worker.postMessage(message);
};
