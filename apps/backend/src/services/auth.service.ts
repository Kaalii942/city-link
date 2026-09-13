import jwt from 'jsonwebtoken';
import { config } from '@eipms/config';
import { prisma } from '@eipms/database';
import { logger, hashPassword, verifyPassword } from '@eipms/utils';
import { userRepository } from '../repositories/user.repository.js';
import { logActivity } from '../utils/audit.js';

export class AuthService {
  async login(username: string, password: string, ipAddress?: string, userAgent?: string) {
    logger.info(`Login attempt for user: ${username}`);
    const user = await userRepository.findByUsername(username);

    if (!user || !user.isActive) {
      logger.warn(`Login failed: User not found or inactive: ${username}`);
      throw new Error('Invalid username or password');
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      logger.warn(`Login failed: Incorrect password for user: ${username}`);
      throw new Error('Invalid username or password');
    }

    // Generate Tokens
    const accessToken = jwt.sign(
      { userId: user.id, username: user.username },
      config.JWT_SECRET,
      { expiresIn: config.JWT_EXPIRES_IN } as any
    );

    const refreshToken = jwt.sign(
      { userId: user.id, username: user.username },
      config.JWT_REFRESH_SECRET,
      { expiresIn: config.JWT_REFRESH_EXPIRES_IN } as any
    );

    // Create session in database
    const decodedRefresh: any = jwt.decode(refreshToken);
    const expiresAt = new Date(decodedRefresh.exp * 1000);

    await prisma.session.create({
      data: {
        userId: user.id,
        token: refreshToken,
        expiresAt,
        ipAddress,
        userAgent,
        isActive: true
      }
    });

    // Log login activity
    await logActivity(user.id, 'LOGIN', `User ${username} logged in successfully`, {
      headers: {},
      socket: { remoteAddress: ipAddress }
    } as any);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.userRoles.map((ur: any) => ur.role.name)
      },
      accessToken,
      refreshToken
    };
  }

  async logout(refreshToken: string) {
    const session = await prisma.session.findUnique({
      where: { token: refreshToken }
    });

    if (session) {
      // Invalidate session in DB
      await prisma.session.delete({
        where: { id: session.id }
      });
      logger.info(`Session invalidated. User logged out.`);
      await logActivity(session.userId, 'LOGOUT', `User logged out`, undefined);
    }
  }

  async refresh(refreshToken: string) {
    try {
      const decoded: any = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
      
      const session = await prisma.session.findUnique({
        where: { token: refreshToken }
      });

      if (!session || !session.isActive || session.expiresAt < new Date()) {
        throw new Error('Refresh token is invalid or expired');
      }

      const user = await userRepository.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User account is inactive or not found');
      }

      // Generate a new Access Token
      const accessToken = jwt.sign(
        { userId: user.id, username: user.username },
        config.JWT_SECRET,
        { expiresIn: config.JWT_EXPIRES_IN } as any
      );

      return { accessToken };
    } catch (error) {
      logger.warn('Token refresh failed:', (error as Error).message);
      throw new Error('Invalid refresh token');
    }
  }
}
export const authService = new AuthService();
