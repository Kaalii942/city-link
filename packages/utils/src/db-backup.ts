import { logger } from './logger.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Executes a full backup of the database (SQL Server or SQLite).
 */
export async function backupDatabase(prisma: any, dbName: string, backupFilePath: string): Promise<string> {
  try {
    logger.info(`Starting database backup for database [${dbName}] to file [${backupFilePath}]`);
    
    // Check if DATABASE_URL in environment is SQL Server or SQLite
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('sqlserver')) {
      const query = `BACKUP DATABASE [${dbName}] TO DISK = N'${backupFilePath}' WITH FORMAT, INIT, NAME = N'EIPMS-Full Database Backup', SKIP, NOREWIND, NOUNLOAD, STATS = 10;`;
      await prisma.$executeRawUnsafe(query);
    } else {
      const dir = path.dirname(backupFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const sqlitePath = path.resolve(process.cwd(), 'packages/database/prisma/dev.db');
      if (fs.existsSync(sqlitePath)) {
        fs.copyFileSync(sqlitePath, backupFilePath);
      }
    }
    
    logger.info(`Database backup completed successfully: ${backupFilePath}`);
    return backupFilePath;
  } catch (error) {
    logger.error('Database backup failed:', error);
    throw new Error(`Database backup failed: ${(error as Error).message}`);
  }
}

/**
 * Restores the database from a backup file (SQL Server or SQLite).
 */
export async function restoreDatabase(prisma: any, dbName: string, backupFilePath: string): Promise<void> {
  try {
    logger.info(`Starting database restore for [${dbName}] from file [${backupFilePath}]`);

    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('sqlserver')) {
      const restoreQuery = `
        USE [master];
        ALTER DATABASE [${dbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
        RESTORE DATABASE [${dbName}] FROM DISK = N'${backupFilePath}' WITH REPLACE;
        ALTER DATABASE [${dbName}] SET MULTI_USER;
      `;
      await prisma.$executeRawUnsafe(restoreQuery);
    } else {
      const sqlitePath = path.resolve(process.cwd(), 'packages/database/prisma/dev.db');
      if (fs.existsSync(backupFilePath)) {
        fs.copyFileSync(backupFilePath, sqlitePath);
      }
    }
    logger.info(`Database [${dbName}] restored successfully from ${backupFilePath}`);
  } catch (error) {
    logger.error('Database restore failed:', error);
    throw new Error(`Database restore failed: ${(error as Error).message}`);
  }
}
