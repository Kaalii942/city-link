import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validation.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { invoiceRepository } from '../repositories/invoice.repository.js';
import { logActivity } from '../utils/audit.js';

const router = Router();

// GET all Invoices
router.get('/', requireAuth, requirePermission('report:read'), async (req: any, res: any, next: any) => {
  try {
    const status = req.query.status as string;
    const search = req.query.search as string;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const result = await invoiceRepository.findAll({ status, search, page, limit });
    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// GET Invoice details
router.get('/:id', requireAuth, requirePermission('report:read'), async (req: any, res: any, next: any) => {
  try {
    const invoice = await invoiceRepository.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Sales Tax Invoice not found.' });
    }
    return res.status(200).json({ success: true, invoice });
  } catch (error) {
    next(error);
  }
});

// CREATE Sales Tax Invoice
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
      const invoice = await invoiceRepository.create(req.body);
      await logActivity(req.user.id, 'INVOICE_CREATE', `Created Sales Tax Invoice ${invoice.invoiceNumber}`, req);
      return res.status(201).json({ success: true, invoice });
    } catch (error) {
      next(error);
    }
  }
);

// UPDATE Sales Tax Invoice
router.put(
  '/:id',
  requireAuth,
  requirePermission('product:write'),
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const invoice = await invoiceRepository.update(req.params.id, req.body);
      await logActivity(req.user.id, 'INVOICE_UPDATE', `Updated Sales Tax Invoice ${invoice.invoiceNumber} status to ${invoice.status}`, req);
      return res.status(200).json({ success: true, invoice });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE Sales Tax Invoice
router.delete('/:id', requireAuth, requirePermission('product:delete'), async (req: any, res: any, next: any) => {
  try {
    const invoice = await invoiceRepository.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }
    await invoiceRepository.delete(req.params.id);
    await logActivity(req.user.id, 'INVOICE_DELETE', `Deleted Sales Tax Invoice ${invoice.invoiceNumber}`, req);
    return res.status(200).json({ success: true, message: 'Invoice deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
