export class SimpleQueue<T> {
  private readonly items: T[] = [];
  private head = 0;

  enqueue(item: T) {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    if (this.head >= this.items.length) return undefined;
    const item = this.items[this.head];
    this.head++;
    return item;
  }

  batchDequeue(batchSize: number): T[] {
    const batch: T[] = [];
    for (let i = 0; i < batchSize; i++) {
      const item = this.dequeue();
      if (!item) break;
      batch.push(item);
    }
    return batch;
  }
}
