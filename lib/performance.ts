/**
 * Performance Optimization Utilities
 * Provides caching, connection pooling, and query optimization
 */

import { performanceMonitor } from './monitoring';

// Simple in-memory cache with TTL
class Cache {
  private cache: Map<string, { value: any; expiresAt: number }> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  set(key: string, value: any, ttl: number = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, item] of Array.from(this.cache.entries())) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new Cache();

// Database query optimization utilities
export class QueryOptimizer {
  // Batch query results to reduce database round trips
  static async batchQuery<T, K>(
    items: T[],
    keySelector: (item: T) => K,
    queryFn: (keys: K[]) => Promise<Map<K, any>>
  ): Promise<Map<K, any>> {
    const uniqueKeys = Array.from(new Set(items.map(keySelector)));
    const results = await queryFn(uniqueKeys);
    return results;
  }

  // Pagination helper
  static getPaginationParams(page: number = 1, pageSize: number = 20) {
    const skip = (page - 1) * pageSize;
    const take = Math.min(pageSize, 100); // Max 100 items per page
    return { skip, take };
  }

  // Query result caching
  static cachedQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttl: number = 60000 // 1 minute default
  ): Promise<T> {
    const cached = cache.get(key);
    if (cached !== null) {
      return Promise.resolve(cached);
    }

    return queryFn().then(result => {
      cache.set(key, result, ttl);
      return result;
    });
  }
}

// Connection pool monitoring
export class ConnectionPoolMonitor {
  private maxConnections = 10;
  private currentConnections = 0;
  private connectionQueue: Array<() => void> = [];

  async acquireConnection(): Promise<void> {
    if (this.currentConnections < this.maxConnections) {
      this.currentConnections++;
      return;
    }

    return new Promise(resolve => {
      this.connectionQueue.push(resolve);
    });
  }

  releaseConnection() {
    this.currentConnections--;
    const next = this.connectionQueue.shift();
    if (next) {
      this.currentConnections++;
      next();
    }
  }

  getStats() {
    return {
      current: this.currentConnections,
      max: this.maxConnections,
      queued: this.connectionQueue.length,
      utilization: this.currentConnections / this.maxConnections
    };
  }
}

export const connectionPoolMonitor = new ConnectionPoolMonitor();

// Response time optimization
export class ResponseOptimizer {
  // Compress responses for large payloads
  static shouldCompress(payload: any): boolean {
    const size = JSON.stringify(payload).length;
    return size > 1024; // Compress if > 1KB
  }

  // Stream large responses
  static async *streamResponse<T>(
    items: T[],
    chunkSize: number = 100
  ): AsyncGenerator<T[]> {
    for (let i = 0; i < items.length; i += chunkSize) {
      yield items.slice(i, i + chunkSize);
      // Small delay to prevent overwhelming the client
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }

  // Optimize JSON serialization
  static safeJsonStringify(obj: any): string {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      // Handle circular references and other serialization issues
      const seen = new WeakSet();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return '[Circular]';
          }
          seen.add(value);
        }
        return value;
      });
    }
  }
}

// Memory usage monitoring
export class MemoryMonitor {
  private warningThreshold = 0.8; // 80% memory usage
  private criticalThreshold = 0.9; // 90% memory usage

  getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      return {
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
        rss: usage.rss,
        heapUsageRatio: usage.heapUsed / usage.heapTotal
      };
    }
    return null;
  }

  checkMemoryPressure(): 'normal' | 'warning' | 'critical' {
    const usage = this.getMemoryUsage();
    if (!usage) return 'normal';

    if (usage.heapUsageRatio > this.criticalThreshold) {
      return 'critical';
    } else if (usage.heapUsageRatio > this.warningThreshold) {
      return 'warning';
    }
    return 'normal';
  }

  suggestGarbageCollection() {
    if (typeof global !== 'undefined' && (global as any).gc) {
      (global as any).gc();
    }
  }
}

export const memoryMonitor = new MemoryMonitor();

// Request rate limiting helper
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  checkLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    let requests = this.requests.get(identifier) || [];
    
    // Remove old requests outside the window
    requests = requests.filter(timestamp => timestamp > windowStart);
    
    const allowed = requests.length < this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - requests.length);
    const resetTime = now + this.windowMs;
    
    if (allowed) {
      requests.push(now);
      this.requests.set(identifier, requests);
    }
    
    return { allowed, remaining, resetTime };
  }

  resetLimit(identifier: string) {
    this.requests.delete(identifier);
  }

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [identifier, requests] of Array.from(this.requests.entries())) {
      const filtered = requests.filter(timestamp => timestamp > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, filtered);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();

// Performance middleware helper
export function withPerformanceMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  operationName: string
): T {
  return (async (...args: Parameters<T>) => {
    const stopTimer = performanceMonitor.startTimer(operationName);
    try {
      const result = await fn(...args);
      return result;
    } catch (error) {
      throw error;
    } finally {
      stopTimer();
    }
  }) as T;
}

// Background task queue for performance
export class TaskQueue {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private maxConcurrent = 3;
  private currentConcurrent = 0;

  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.currentConcurrent >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.currentConcurrent < this.maxConcurrent) {
      const task = this.queue.shift();
      if (task) {
        this.currentConcurrent++;
        task()
          .finally(() => {
            this.currentConcurrent--;
            this.processQueue();
          });
      }
    }

    this.processing = false;
  }

  getQueueStats() {
    return {
      queued: this.queue.length,
      processing: this.currentConcurrent,
      maxConcurrent: this.maxConcurrent
    };
  }
}

export const taskQueue = new TaskQueue();