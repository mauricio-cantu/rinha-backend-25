import { Queue } from "bullmq";
import { IMessageQueue } from "../../internal/interfaces/IMessageQueue";

export class BullMQMessageQueue<T> implements IMessageQueue<T> {
  private queue: Queue;

  constructor(queueName: string, redisUrl: string) {
    this.queue = new Queue(queueName, {
      connection: { url: redisUrl },
    });
  }

  async enqueue(jobName: string, message: T): Promise<void> {
    await this.queue.add(jobName, message);
  }
}
