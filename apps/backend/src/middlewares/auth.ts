import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@eipms/config';
import { prisma } from '@eipms/database';
import { logger } from '@eipms/utils';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        email: string;
        roles: string[];
        permissions: string[];
      };
    }
  }
}

interface JwtPayload {
  userId: string;
  username: string;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required. Token missing.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;

    // Check if user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: {
                  include: {
                    permission: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User account is inactive or does not exist.' });
    }

    // Extract flat arrays of roles and permissions
    const roles = user.userRoles.map((ur: any) => ur.role.name);
    const permissionsSet = new Set<string>();
    
    for (const ur of user.userRoles) {
      for (const rp of ur.role.permissions) {
        permissionsSet.add(rp.permission.name);
      }
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      roles,
      permissions: Array.from(permissionsSet)
    };

    next();
  } catch (error) {
    logger.warn('Auth validation failed:', (error as Error).message);
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Authentication required.' });
    }

    // Super Admins bypass all permission checks
    if (req.user.roles.includes('Super Admin')) {
      return next();
    }

    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. You do not have the required permission: [${permission}]`
      });
    }

    next();
  };
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Authentication required.' });
    }

    if (req.user.roles.includes('Super Admin')) {
      return next();
    }

    if (!req.user.roles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. You do not have the required role: [${role}]`
      });
    }

    next();
  };
}
