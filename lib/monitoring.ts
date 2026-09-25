/**
 * Production Monitoring and Logging Utilities
 * Provides structured logging, error tracking, and performance monitoring
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogContext {
  userId?: string;
  workspaceId?: string;
  requestId?: string;
  route?: string;
  [key: string]: any;
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';
  private logLevel = process.env.LOG_LEVEL || 'info';

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.logLevel as LogLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage(LogLevel.WARN, message, context));
    }
  }

  error(message: string, error?: Error, context?: LogContext) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = {
        ...context,
        error: error?.message,
        stack: this.isProduction ? undefined : error?.stack
      };
      console.error(this.formatMessage(LogLevel.ERROR, message, errorContext));
    }
  }

  // API request logging
  logApiRequest(method: string, path: string, statusCode: number, duration: number, context?: LogContext) {
    const message = `${method} ${path} ${statusCode} (${duration}ms)`;
    const level = statusCode >= 500 ? LogLevel.ERROR : statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO;
    
    if (level === LogLevel.ERROR) {
      this.error(message, undefined, context);
    } else if (level === LogLevel.WARN) {
      this.warn(message, context);
    } else {
      this.info(message, context);
    }
  }

  // Database operation logging
  logDatabaseOperation(operation: string, model: string, duration: number, context?: LogContext) {
    const message = `DB ${operation} ${model} (${duration}ms)`;
    if (duration > 1000) {
      this.warn(message, context);
    } else {
      this.debug(message, context);
    }
  }

  // Authentication event logging
  logAuthEvent(event: string, userId?: string, context?: LogContext) {
    this.info(`Auth: ${event}`, { ...context, userId });
  }
}

export const logger = new Logger();

// Performance monitoring utilities
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();

  startTimer(operation: string): () => void {
    const startTime = Date.now();
    return () => {
      const duration = Date.now() - startTime;
      this.recordMetric(operation, duration);
    };
  }

  recordMetric(operation: string, duration: number) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);
    
    // Log slow operations
    if (duration > 1000) {
      logger.warn(`Slow operation: ${operation} took ${duration}ms`);
    }
  }

  getMetrics(operation: string) {
    const values = this.metrics.get(operation) || [];
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }

  getAllMetrics() {
    const result: Record<string, any> = {};
    for (const operation of Array.from(this.metrics.keys())) {
      result[operation] = this.getMetrics(operation);
    }
    return result;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Error tracking utilities
export class ErrorTracker {
  private errors: Array<{ error: Error; context: LogContext; timestamp: Date }> = [];

  trackError(error: Error, context?: LogContext) {
    this.errors.push({
      error,
      context: context || {},
      timestamp: new Date()
    });

    logger.error('Error tracked', error, context);

    // In production, you would send this to an error tracking service
    // like Sentry, Rollbar, or similar
    if (process.env.NODE_ENV === 'production') {
      this.sendToErrorService(error, context);
    }
  }

  private async sendToErrorService(error: Error, context?: LogContext) {
    // Integration with error tracking service would go here
    // Example: Sentry.captureException(error, { extra: context });
    logger.debug('Error would be sent to error tracking service', { error: error.message });
  }

  getRecentErrors(count: number = 10) {
    return this.errors.slice(-count);
  }

  clearErrors() {
    this.errors = [];
  }
}

export const errorTracker = new ErrorTracker();

// Health check utilities
export class HealthChecker {
  private checks: Map<string, () => Promise<boolean>> = new Map();

  registerCheck(name: string, check: () => Promise<boolean>) {
    this.checks.set(name, check);
  }

  async runChecks(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; checks: Record<string, boolean> }> {
    const results: Record<string, boolean> = {};
    let healthyCount = 0;

    for (const [name, check] of Array.from(this.checks.entries())) {
      try {
        const result = await check();
        results[name] = result;
        if (result) healthyCount++;
      } catch {
        results[name] = false;
      }
    }

    const totalChecks = this.checks.size;
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (healthyCount === totalChecks) {
      status = 'healthy';
    } else if (healthyCount > totalChecks / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return { status, checks: results };
  }
}

export const healthChecker = new HealthChecker();

// Register default health checks
if (typeof window === 'undefined') {
  const { db } = require('./db');
  
  healthChecker.registerCheck('database', async () => {
    try {
      await db.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  });
}