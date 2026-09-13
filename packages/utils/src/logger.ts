import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `[${timestamp}] ${level}: ${message}\n${stack}`;
    }
    return `[${timestamp}] ${level}: ${message}`;
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console log transport
    new winston.transports.Console({
      format: consoleFormat
    }),
    // Rotating file logger for info and higher levels
    new winston.transports.DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'application-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),
    // Rotating file logger for error level only
    new winston.transports.DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d',
      level: 'error'
    })
  ]
});
