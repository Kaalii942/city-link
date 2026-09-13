import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validation.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { inquiryRepository } from '../repositories/inquiry.repository.js';
import { logActivity } from '../utils/audit.js';

const router = Router();

// GET all Inquiries with pagination and filter
router.get('/', requireAuth, requirePermission('report:read'), async (req: any, res: any, next: any) => {
  try {
    const status = req.query.status as string;
    const search = req.query.search as string;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const result = await inquiryRepository.findAll({ status, search, page, limit });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// GET Inquiry details
router.get('/:id', requireAuth, requirePermission('report:read'), async (req: any, res: any, next: any) => {
  try {
    const inquiry = await inquiryRepository.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Customer Inquiry not found.' });
    }
    return res.status(200).json({ success: true, inquiry });
  } catch (error) {
    next(error);
  }
});

// CREATE Inquiry
router.post(
  '/',
  requireAuth,
  requirePermission('product:write'),
  [
    body('customerName').notEmpty().withMessage('customerName is required'),
    body('companyName').notEmpty().withMessage('companyName is required'),
    body('items').isArray({ min: 1 }).withMessage('items array is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const inquiry = await inquiryRepository.create(req.body, req.user.id);
      await logActivity(req.user.id, 'INQUIRY_CREATE', `Created inquiry ${inquiry.inquiryNumber}`, req);
      return res.status(201).json({ success: true, inquiry });
    } catch (error) {
      next(error);
    }
  }
);

// UPDATE Inquiry
router.put(
  '/:id',
  requireAuth,
  requirePermission('product:write'),
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const inquiry = await inquiryRepository.update(req.params.id, req.body);
      await logActivity(req.user.id, 'INQUIRY_UPDATE', `Updated inquiry ${inquiry.inquiryNumber}`, req);
      return res.status(200).json({ success: true, inquiry });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE Inquiry
router.delete('/:id', requireAuth, requirePermission('product:delete'), async (req: any, res: any, next: any) => {
  try {
    const inquiry = await inquiryRepository.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({ success: false, message: 'Inquiry not found.' });
    }
    await inquiryRepository.delete(req.params.id);
    await logActivity(req.user.id, 'INQUIRY_DELETE', `Deleted inquiry ${inquiry.inquiryNumber}`, req);
    return res.status(200).json({ success: true, message: 'Inquiry deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
