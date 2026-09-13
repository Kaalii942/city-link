import { Request, Response, NextFunction } from 'express';
import { logger } from '@eipms/utils';

export interface CustomError extends Error {
  statusCode?: number;
  details?: any;
}

export function errorHandler(
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log error stack with Winston
  logger.error(`API Error on ${req.method} ${req.url}:`, {
    message,
    statusCode,
    stack: err.stack,
    details: err.details
  });

  res.status(statusCode).json({
    success: false,
    message,
    details: err.details || null,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}
