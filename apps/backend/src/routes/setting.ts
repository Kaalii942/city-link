import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validation.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { prisma } from '@eipms/database';
import { config } from '@eipms/config';
import { backupDatabase, restoreDatabase } from '@eipms/utils';
import { logActivity } from '../utils/audit.js';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();

// GET /api/settings (List all system configuration keys)
router.get('/', requireAuth, requirePermission('setting:read'), async (req: any, res: any, next: any) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    return res.status(200).json({ success: true, settings });
  } catch (error) {
    next(error);
  }
});

// POST /api/settings (Bulk upsert configurations)
router.post(
  '/',
  requireAuth,
  requirePermission('setting:write'),
  [
    body('settings').isArray().withMessage('settings must be an array of key-value pairs'),
    body('settings.*.key').notEmpty().withMessage('setting key is required'),
    body('settings.*.value').notEmpty().withMessage('setting value is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const { settings } = req.body;

      for (const s of settings) {
        await prisma.systemSetting.upsert({
          where: { key: s.key },
          update: { value: s.value, description: s.description },
          create: { key: s.key, value: s.value, description: s.description }
        });
      }

      await logActivity(req.user.id, 'SETTINGS_UPDATE', `Updated system configurations`, req);
      return res.status(200).json({ success: true, message: 'Settings updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/settings/backup (Trigger manual database backup)
router.post(
  '/backup',
  requireAuth,
  requirePermission('setting:backup'),
  async (req: any, res: any, next: any) => {
    try {
      // Create backup directory if not exists
      if (!fs.existsSync(config.BACKUP_DIR)) {
        fs.mkdirSync(config.BACKUP_DIR, { recursive: true });
      }

      // Parse DB name from URL
      let dbName = 'eipms';
      const match = config.DATABASE_URL.match(/database=([^;]+)/i);
      if (match && match[1]) {
        dbName = match[1];
      }

      const timestamp = new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
      const filename = `${dbName}_manual_${timestamp}.bak`;
      const fullPath = path.join(config.BACKUP_DIR, filename);

      // Trigger SQL Server full backup raw command via prisma
      await backupDatabase(prisma, dbName, fullPath);

      await logActivity(req.user.id, 'DB_BACKUP_MANUAL', `Triggered manual database backup: ${fullPath}`, req);

      return res.status(200).json({
        success: true,
        message: 'Backup completed successfully',
        filePath: fullPath,
        fileName: filename
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/settings/backups-list (Lists backup files in backup directory)
router.get(
  '/backups-list',
  requireAuth,
  requirePermission('setting:read'),
  async (req: any, res: any, next: any) => {
    try {
      if (!fs.existsSync(config.BACKUP_DIR)) {
        return res.status(200).json({ success: true, backups: [] });
      }

      const files = fs.readdirSync(config.BACKUP_DIR);
      const backups = files
        .filter(file => file.endsWith('.bak'))
        .map(file => {
          const filePath = path.join(config.BACKUP_DIR, file);
          const stats = fs.statSync(filePath);
          return {
            fileName: file,
            filePath,
            sizeBytes: stats.size,
            createdAt: stats.birthtime
          };
        })
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return res.status(200).json({ success: true, backups });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/settings/restore (Restore database from local file)
router.post(
  '/restore',
  requireAuth,
  requirePermission('setting:restore'),
  [body('fileName').notEmpty().withMessage('fileName is required')],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const { fileName } = req.body;
      const fullPath = path.join(config.BACKUP_DIR, fileName);

      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ success: false, message: `Backup file [${fileName}] not found` });
      }

      let dbName = 'eipms';
      const match = config.DATABASE_URL.match(/database=([^;]+)/i);
      if (match && match[1]) {
        dbName = match[1];
      }

      // Restoring database is a blocking command that resets active connections.
      // We will perform it. Note that Prisma Client will temporarily disconnect and reconnect.
      await restoreDatabase(prisma, dbName, fullPath);

      // Log success inside system activities
      await logActivity(req.user.id, 'DB_RESTORE_MANUAL', `Restored database from file: ${fullPath}`, req);

      return res.status(200).json({
        success: true,
        message: 'Database restore initiated and completed successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
