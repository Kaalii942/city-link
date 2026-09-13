import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { prisma } from '@eipms/database';

const router = Router();

// GET /api/audit (Retrieve activity log entries)
router.get(
  '/',
  requireAuth,
  requirePermission('audit:read'),
  async (req: any, res: any, next: any) => {
    try {
      const { search, page, limit } = req.query;
      const skip = page ? (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10) : 0;
      const take = limit ? parseInt(limit as string, 10) : 50;

      const where: any = {};
      if (search) {
        where.OR = [
          { action: { contains: search } },
          { details: { contains: search } },
          { ipAddress: { contains: search } },
          { machineName: { contains: search } },
          { user: { username: { contains: search } } }
        ];
      }

      const [logs, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          include: {
            user: { select: { username: true, firstName: true, lastName: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take
        }),
        prisma.activityLog.count({ where })
      ]);

      return res.status(200).json({ success: true, logs, total });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
