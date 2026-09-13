import app from './app.js';
import { config } from '@eipms/config';
import { logger } from '@eipms/utils';
import { prisma } from '@eipms/database';
import schedule from 'node-schedule';
import * as path from 'path';
import * as fs from 'fs';

// Verify Database Connection and start server
async function startServer() {
  try {
    logger.info('Verifying connection to SQL Server database...');
    await prisma.$connect();
    logger.info('Database connection successful!');

    // Create UPLOAD_DIR if not exists
    if (!fs.existsSync(config.UPLOAD_DIR)) {
      fs.mkdirSync(config.UPLOAD_DIR, { recursive: true });
      logger.info(`Created upload directory: ${config.UPLOAD_DIR}`);
    }

    // Start server listening on all network interfaces for LAN connectivity
    const os = await import('os');
    const server = app.listen(config.PORT, '0.0.0.0', () => {
      logger.info(`🚀 EIPMS API Server running on port ${config.PORT} in [${config.NODE_ENV}] mode`);
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name] || []) {
          if (iface.family === 'IPv4' && !iface.internal) {
            logger.info(`🌐 Office LAN Central Server Endpoint: http://${iface.address}:${config.PORT}`);
          }
        }
      }
    });

    // Schedule Automatic Daily Backup at 12:00 AM
    schedule.scheduleJob('0 0 * * *', async () => {
      try {
        logger.info('Running automatic daily backup job...');
        
        // Find database name from connection string if possible or use default
        let dbName = 'eipms';
        const match = config.DATABASE_URL.match(/database=([^;]+)/i);
        if (match && match[1]) {
          dbName = match[1];
        }

        // Create backup directory if not exists
        if (!fs.existsSync(config.BACKUP_DIR)) {
          fs.mkdirSync(config.BACKUP_DIR, { recursive: true });
        }

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `${dbName}_auto_${dateStr}.bak`;
        const fullPath = path.join(config.BACKUP_DIR, filename);

        // Run backup based on provider
        if (config.DATABASE_URL.includes('sqlserver')) {
          await prisma.$executeRawUnsafe(
            `BACKUP DATABASE [${dbName}] TO DISK = N'${fullPath}' WITH FORMAT, INIT;`
          );
        } else {
          const sqlitePath = path.resolve(process.cwd(), 'packages/database/prisma/dev.db');
          if (fs.existsSync(sqlitePath)) {
            fs.copyFileSync(sqlitePath, fullPath);
          }
        }
        logger.info(`Automatic backup successful: ${fullPath}`);
        
        // Create an activity log record for automatic backup
        await prisma.activityLog.create({
          data: {
            action: 'AUTO_BACKUP',
            details: `Automatic daily database backup completed successfully. File: ${fullPath}`,
            ipAddress: '127.0.0.1',
            machineName: 'SERVER'
          }
        });
      } catch (backupError) {
        logger.error('Automatic backup scheduler failed:', backupError);
      }
    });

    // Handle process termination cleanly
    const shutdown = async () => {
      logger.info('Stopping server and disconnecting Prisma...');
      server.close(async () => {
        await prisma.$disconnect();
        logger.info('Server gracefully shutdown.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

  } catch (error) {
    logger.error('Failed to start EIPMS API Server:', error);
    process.exit(1);
  }
}

startServer();
