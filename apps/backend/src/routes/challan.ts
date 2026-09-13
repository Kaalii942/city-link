import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validation.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { challanRepository } from '../repositories/challan.repository.js';
import { logActivity } from '../utils/audit.js';

const router = Router();

// GET all Challans
router.get('/', requireAuth, requirePermission('report:read'), async (req: any, res: any, next: any) => {
  try {
    const status = req.query.status as string;
    const search = req.query.search as string;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const result = await challanRepository.findAll({ status, search, page, limit });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// GET Challan details
router.get('/:id', requireAuth, requirePermission('report:read'), async (req: any, res: any, next: any) => {
  try {
    const challan = await challanRepository.findById(req.params.id);
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Delivery Challan not found.' });
    }
    return res.status(200).json({ success: true, challan });
  } catch (error) {
    next(error);
  }
});

// CREATE Delivery Challan
router.post(
  '/',
  requireAuth,
  requirePermission('product:write'),
  [
    body('companyName').notEmpty().withMessage('companyName is required'),
    body('items').isArray({ min: 1 }).withMessage('items array is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const challan = await challanRepository.create(req.body, req.user.id);
      await logActivity(req.user.id, 'CHALLAN_CREATE', `Created Delivery Challan ${challan.challanNumber}`, req);
      return res.status(201).json({ success: true, challan });
    } catch (error) {
      next(error);
    }
  }
);

// UPDATE Delivery Challan
router.put(
  '/:id',
  requireAuth,
  requirePermission('product:write'),
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const challan = await challanRepository.update(req.params.id, req.body, req.user.id);
      await logActivity(req.user.id, 'CHALLAN_UPDATE', `Updated Delivery Challan ${challan.challanNumber} status to ${challan.status}`, req);
      return res.status(200).json({ success: true, challan });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE Delivery Challan
router.delete('/:id', requireAuth, requirePermission('product:delete'), async (req: any, res: any, next: any) => {
  try {
    const challan = await challanRepository.findById(req.params.id);
    if (!challan) {
      return res.status(404).json({ success: false, message: 'Challan not found.' });
    }
    await challanRepository.delete(req.params.id);
    await logActivity(req.user.id, 'CHALLAN_DELETE', `Deleted Delivery Challan ${challan.challanNumber}`, req);
    return res.status(200).json({ success: true, message: 'Delivery Challan deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
