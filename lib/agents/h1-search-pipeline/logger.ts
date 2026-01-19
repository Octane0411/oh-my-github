/**
 * Structured Logging for Search Pipeline
 *
 * Provides centralized logging with:
 * - Request/response tracking
 * - Pipeline stage execution
 * - Performance metrics
 * - Error context
 * - Cost tracking
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogContext {
  requestId?: string;
  query?: string;
  mode?: string;
  stage?: string;
  duration?: number;
  error?: Error;
  metadata?: Record<string, unknown>;
}

/**
 * Format timestamp for logs
 */
function formatTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format log message with context
 */
function formatLogMessage(
  level: LogLevel,
  message: string,
  context?: LogContext
): string {
  const timestamp = formatTimestamp();
  const contextStr = context ? ` | ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Core logging function
 */
function log(level: LogLevel, message: string, context?: LogContext): void {
  const formatted = formatLogMessage(level, message, context);

  switch (level) {
    case "debug":
      console.debug(formatted);
      break;
    case "info":
      console.info(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
  }
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private requestId?: string;

  constructor(requestId?: string) {
    this.requestId = requestId;
  }

  debug(message: string, context?: Omit<LogContext, "requestId">): void {
    log("debug", message, { ...context, requestId: this.requestId });
  }

  info(message: string, context?: Omit<LogContext, "requestId">): void {
    log("info", message, { ...context, requestId: this.requestId });
  }

  warn(message: string, context?: Omit<LogContext, "requestId">): void {
    log("warn", message, { ...context, requestId: this.requestId });
  }

  error(message: string, context?: Omit<LogContext, "requestId">): void {
    log("error", message, { ...context, requestId: this.requestId });
  }

  /**
   * Log API request received
   */
  logRequest(query: string, mode: string): void {
    this.info("API request received", {
      query,
      mode,
      metadata: { endpoint: "/api/search" },
    });
  }

  /**
   * Log API response sent
   */
  logResponse(
    query: string,
    mode: string,
    resultCount: number,
    duration: number,
    cached: boolean = false
  ): void {
    this.info("API response sent", {
      query,
      mode,
      duration,
      metadata: {
        resultCount,
        cached,
        endpoint: "/api/search",
      },
    });
  }

  /**
   * Log pipeline stage start
   */
  logStageStart(stage: string, query: string, mode: string): void {
    this.debug(`Pipeline stage started: ${stage}`, {
      stage,
      query,
      mode,
    });
  }

  /**
   * Log pipeline stage completion
   */
  logStageComplete(
    stage: string,
    query: string,
    mode: string,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    this.info(`Pipeline stage completed: ${stage}`, {
      stage,
      query,
      mode,
      duration,
      metadata,
    });
  }

  /**
   * Log performance metrics
   */
  logPerformance(
    query: string,
    mode: string,
    metrics: {
      totalTime: number;
      queryTranslator: number;
      scout: number;
      screener: number;
      cached: boolean;
    }
  ): void {
    this.info("Performance metrics", {
      query,
      mode,
      metadata: {
        ...metrics,
        breakdown: {
          queryTranslator: `${metrics.queryTranslator}ms`,
          scout: `${metrics.scout}ms`,
          screener: `${metrics.screener}ms`,
        },
      },
    });
  }

  /**
   * Log cost estimate
   */
  logCost(
    query: string,
    mode: string,
    cost: {
      inputTokens: number;
      outputTokens: number;
      totalCost: number;
      provider: string;
    }
  ): void {
    this.info("Cost estimate", {
      query,
      mode,
      metadata: {
        provider: cost.provider,
        inputTokens: cost.inputTokens,
        outputTokens: cost.outputTokens,
        cost: `$${cost.totalCost.toFixed(4)}`,
      },
    });
  }

  /**
   * Log cache hit/miss
   */
  logCache(query: string, mode: string, hit: boolean): void {
    const message = hit ? "Cache HIT" : "Cache MISS";
    this.debug(message, {
      query,
      mode,
      metadata: { cached: hit },
    });
  }

  /**
   * Log error with context
   */
  logError(
    message: string,
    error: Error,
    context?: {
      query?: string;
      mode?: string;
      stage?: string;
    }
  ): void {
    this.error(message, {
      ...context,
      error,
      metadata: {
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack,
      },
    });
  }

  /**
   * Log warning with context
   */
  logWarning(
    message: string,
    context?: {
      query?: string;
      mode?: string;
      stage?: string;
      metadata?: Record<string, unknown>;
    }
  ): void {
    this.warn(message, context);
  }
}

/**
 * Create a new logger instance
 */
export function createLogger(requestId?: string): Logger {
  return new Logger(requestId);
}

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
