export class LruCache<T> {
  private values: Map<string, T> = new Map<string, T>();
  private maxEntries;

  constructor(maxEntries: number) {
    this.maxEntries = maxEntries;
  }

  public get(key: string): T | undefined {
    const hasKey = this.values.has(key);
    let entry: T | undefined;
    if (hasKey) {
      // peek the entry, re-insert for LRU strategy
      entry = this.values.get(key)!;
      this.values.delete(key);
      this.values.set(key, entry);
    }

    return entry;
  }

  public put(key: string, value: T) {
    if (this.values.size >= this.maxEntries) {
      // least-recently used cache eviction strategy
      const keyToDelete = this.values.keys().next().value;

      this.values.delete(keyToDelete);
    }

    this.values.set(key, value);
  }
}
