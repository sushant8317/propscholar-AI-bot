interface CacheEntry {
  answer: string;
  timestamp: number;
  hits: number;
}

export class CacheService {
  private cache = new Map<string, CacheEntry>();
  private TTL = 3600000; // 1 hour

  normalize(q: string): string {
    return q
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, "")
      .replace(/\s+/g, " ");
  }

  get(query: string): string | null {
    const key = this.normalize(query);
    const entry = this.cache.get(key);

    if (!entry || Date.now() - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.answer;
  }

  set(query: string, answer: string): void {
    const key = this.normalize(query);
    this.cache.set(key, {
      answer,
      timestamp: Date.now(),
      hits: 0
    });
  }
}
