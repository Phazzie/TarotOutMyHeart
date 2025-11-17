/**
 * @fileoverview Winston logger configuration for structured JSON logging
 * @purpose Provides consistent, structured logging across the coordination server
 * @dataFlow Application → Logger → Console + File transports with rotation
 * @boundary System-wide logging boundary for observability and debugging
 * @example
 * import { logger } from './observability/logger'
 * logger.info('Task started', { taskId: '123', agentId: 'claude-1' })
 * logger.error('Failed to process', { error: err.message })
 */

import winston from 'winston'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import fs from 'fs'

// Ensure logs directory exists
const logsDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs')
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

/**
 * Log level configuration
 */
const logLevel = process.env.LOG_LEVEL || 'info'

/**
 * Log file paths
 */
const logFile = process.env.LOG_FILE || path.join(logsDir, 'coordination.log')
const errorFile = process.env.ERROR_LOG_FILE || path.join(logsDir, 'error.log')

/**
 * Log rotation configuration
 */
const maxFiles = parseInt(process.env.LOG_MAX_FILES || '14')
const maxSize = process.env.LOG_MAX_SIZE || '10m'

/**
 * Request correlation ID for tracing
 */
let correlationId: string = uuidv4()

/**
 * Set correlation ID for request tracing
 * @param id - Unique correlation ID for request tracing
 */
export function setCorrelationId(id: string): void {
  correlationId = id
}

/**
 * Get current correlation ID
 */
export function getCorrelationId(): string {
  return correlationId
}

/**
 * Reset correlation ID (useful for testing)
 */
export function resetCorrelationId(): void {
  correlationId = uuidv4()
}

/**
 * Custom format for JSON logging with correlation ID
 */
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      correlationId,
      ...meta
    })
  })
)

/**
 * Console format for development (readable)
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : ''
    return `${timestamp} [${level}] ${message}${metaStr}`
  })
)

/**
 * Create Winston logger instance with multiple transports
 */
export const logger = winston.createLogger({
  level: logLevel,
  format: customFormat,
  defaultMeta: { service: 'coordination-server' },
  transports: [
    // Console transport - readable format for development
    new winston.transports.Console({
      format: consoleFormat,
      level: logLevel
    }),

    // Combined log file - all logs in JSON format
    new winston.transports.File({
      filename: logFile,
      format: customFormat,
      maxsize: parseInt(maxSize.replace('m', '')) * 1024 * 1024,
      maxFiles,
      tailable: true
    }),

    // Error log file - only errors and above
    new winston.transports.File({
      filename: errorFile,
      level: 'error',
      format: customFormat,
      maxsize: parseInt(maxSize.replace('m', '')) * 1024 * 1024,
      maxFiles,
      tailable: true
    })
  ],
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: errorFile,
      format: customFormat
    })
  ],
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: errorFile,
      format: customFormat
    })
  ]
})

/**
 * Create a child logger with context
 * @param context - Object with contextual information (agentId, taskId, etc.)
 * @returns Child logger instance
 */
export function createContextLogger(context: Record<string, any>): any {
  return logger.child(context)
}

/**
 * Log info level message with structured fields
 * @param message - Log message
 * @param meta - Structured metadata fields
 */
export function logInfo(message: string, meta?: Record<string, any>): void {
  logger.info(message, meta)
}

/**
 * Log error level message with structured fields
 * @param message - Log message
 * @param error - Error object or message
 * @param meta - Additional structured metadata
 */
export function logError(message: string, error?: Error | string, meta?: Record<string, any>): void {
  if (error instanceof Error) {
    logger.error(message, {
      ...meta,
      error: error.message,
      stack: error.stack
    })
  } else if (typeof error === 'string') {
    logger.error(message, {
      ...meta,
      error
    })
  } else {
    logger.error(message, meta)
  }
}

/**
 * Log warning level message with structured fields
 * @param message - Log message
 * @param meta - Structured metadata fields
 */
export function logWarn(message: string, meta?: Record<string, any>): void {
  logger.warn(message, meta)
}

/**
 * Log debug level message with structured fields
 * @param message - Log message
 * @param meta - Structured metadata fields
 */
export function logDebug(message: string, meta?: Record<string, any>): void {
  logger.debug(message, meta)
}

export default logger
