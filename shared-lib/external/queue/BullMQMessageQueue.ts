import { IMessageQueue } from "@shared/internal/interfaces/queue/IMessageQueue";
import { Queue } from "bullmq";

export class BullMQMessageQueue<T> implements IMessageQueue<T> {
  private queue: Queue;
  private jobName: string;

  constructor(redisUrl: string) {
    this.queue = new Queue(process.env.PAYMENTS_QUEUE!, {
      connection: { url: redisUrl },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 3000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    });
    this.jobName = process.env.PROCESS_PAYMENT_JOB_NAME!;
  }

  async enqueue(data: T): Promise<void> {
    await this.queue.add(this.jobName, data);
  }
}
