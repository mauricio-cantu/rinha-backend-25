export interface IMessageQueue<T> {
  enqueue(data: T): Promise<void>;
}
