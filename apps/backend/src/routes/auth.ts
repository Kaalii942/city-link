import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validation.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { authService } from '../services/auth.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { hashPassword } from '@eipms/utils';
import { logActivity } from '../utils/audit.js';

const router = Router();

// POST /api/auth/login
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const { username, password } = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      const result = await authService.login(username, password, ipAddress, userAgent);
      return res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/auth/logout
router.post('/logout', async (req: any, res: any, next: any) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req: any, res: any, next: any) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }
    const result = await authService.refresh(refreshToken);
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: any, res: any) => {
  return res.status(200).json({ success: true, user: req.user });
});

// GET /api/auth/users (Manage Users)
router.get('/users', requireAuth, requirePermission('user:read'), async (req: any, res: any, next: any) => {
  try {
    const users = await userRepository.findAll();
    return res.status(200).json({ success: true, users });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/users (Create User)
router.post(
  '/users',
  requireAuth,
  requirePermission('user:write'),
  [
    body('username').isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('roleIds').isArray({ min: 1 }).withMessage('At least one role is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      // Check username exists
      const existingUser = await userRepository.findByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Username is already taken' });
      }

      // Hash password
      const passwordHash = await hashPassword(req.body.password);
      const user = await userRepository.create({
        ...req.body,
        passwordHash
      });

      await logActivity(req.user.id, 'USER_CREATE', `Created user account: ${user.username}`, req);
      return res.status(201).json({ success: true, user });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/auth/users/:id (Update User)
router.put(
  '/users/:id',
  requireAuth,
  requirePermission('user:write'),
  async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const targetUser = await userRepository.findById(id);
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      const updateData = { ...req.body };
      if (req.body.password) {
        updateData.passwordHash = await hashPassword(req.body.password);
        delete updateData.password;
      }

      const user = await userRepository.update(id, updateData);
      await logActivity(req.user.id, 'USER_UPDATE', `Updated user account: ${user.username}`, req);
      return res.status(200).json({ success: true, user });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/auth/users/:id (Delete User)
router.delete(
  '/users/:id',
  requireAuth,
  requirePermission('user:delete'),
  async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      if (id === req.user.id) {
        return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
      }

      const user = await userRepository.delete(id);
      await logActivity(req.user.id, 'USER_DELETE', `Deleted user account: ${user.username}`, req);
      return res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/auth/roles
router.get('/roles', requireAuth, requirePermission('user:read'), async (req: any, res: any, next: any) => {
  try {
    const roles = await userRepository.findRoles();
    return res.status(200).json({ success: true, roles });
  } catch (error) {
    next(error);
  }
});

// GET /api/auth/permissions
router.get('/permissions', requireAuth, requirePermission('user:read'), async (req: any, res: any, next: any) => {
  try {
    const permissions = await userRepository.findPermissions();
    return res.status(200).json({ success: true, permissions });
  } catch (error) {
    next(error);
  }
});

export default router;
