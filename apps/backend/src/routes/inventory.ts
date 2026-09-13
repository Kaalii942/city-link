import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validation.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { inventoryService } from '../services/inventory.service.js';
import { logActivity } from '../utils/audit.js';

const router = Router();

// GET /api/inventory/movements (Fetch all stock logs)
router.get(
  '/movements',
  requireAuth,
  requirePermission('inventory:read'),
  async (req: any, res: any, next: any) => {
    try {
      const movements = await inventoryService.getMovements();
      return res.status(200).json({ success: true, movements });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/inventory/movements/:productId (Fetch movements for a specific product)
router.get(
  '/movements/:productId',
  requireAuth,
  requirePermission('inventory:read'),
  async (req: any, res: any, next: any) => {
    try {
      const movements = await inventoryService.getProductMovements(req.params.productId);
      return res.status(200).json({ success: true, movements });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/inventory/adjust (Manual inventory adjust operations)
router.post(
  '/adjust',
  requireAuth,
  requirePermission('inventory:write'),
  [
    body('productId').isUUID().withMessage('Valid productId is required'),
    body('type').isIn(['STOCK_IN', 'STOCK_OUT', 'TRANSFER', 'DAMAGE', 'RETURN', 'RESERVE']).withMessage('Invalid movement type'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be positive')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const movement = await inventoryService.adjustStock({
        ...req.body,
        userId: req.user.id
      });

      await logActivity(
        req.user.id,
        `STOCK_${req.body.type}`,
        `Manual stock adjustment of ${req.body.quantity} for product ID: ${req.body.productId}. Type: ${req.body.type}`,
        req
      );

      return res.status(200).json({ success: true, movement });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
