export interface IMessageQueue<T> {
  enqueue(jobName: string, data: T): Promise<void>;
}
