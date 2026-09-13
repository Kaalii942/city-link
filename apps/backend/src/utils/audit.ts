import { Request } from 'express';
import { prisma } from '@eipms/database';
import { logger } from '@eipms/utils';
import * as os from 'os';

/**
 * Creates an activity log entry in the database.
 */
export async function logActivity(
  userId: string | null,
  action: string,
  details: string,
  req?: Request
) {
  try {
    let ipAddress = '127.0.0.1';
    let machineName = os.hostname();

    if (req) {
      // Resolve client IP address
      const forwarded = req.headers['x-forwarded-for'];
      ipAddress = typeof forwarded === 'string' ? forwarded.split(',')[0] : req.socket.remoteAddress || '127.0.0.1';
    }

    await prisma.activityLog.create({
      data: {
        userId,
        action,
        details,
        ipAddress,
        machineName
      }
    });
  } catch (error) {
    logger.error('Failed to log activity to database:', error);
  }
}
