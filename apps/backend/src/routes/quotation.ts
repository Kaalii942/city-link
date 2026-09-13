import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validation.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { quotationRepository } from '../repositories/quotation.repository.js';
import { logActivity } from '../utils/audit.js';

const router = Router();

// Helper function to sanitize sensitive financial fields for non-finance staff
function sanitizeQuotationForUser(quotation: any, user: any) {
  const isSuperAdmin = user?.roles?.includes('Super Admin');
  const hasFinancePerm = user?.permissions?.includes('quotation:finance');

  if (isSuperAdmin || hasFinancePerm) {
    return quotation;
  }

  const sanitized = { ...quotation };
  // Hide administrative margin prices if restricted
  if (sanitized.items && Array.isArray(sanitized.items)) {
    sanitized.items = sanitized.items.map((item: any) => ({
      ...item,
      unitPriceRmb: undefined,
      totalPriceRmb: undefined,
      unitPriceUsd: undefined,
      totalPriceUsd: undefined,
      internetUnitPrice: undefined,
      internetTotalPrice: undefined
    }));
  }
  return sanitized;
}

// GET all Quotations
router.get('/', requireAuth, requirePermission('quotation:read'), async (req: any, res: any, next: any) => {
  try {
    const status = req.query.status as string;
    const search = req.query.search as string;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const result = await quotationRepository.findAll({ status, search, page, limit });
    const sanitizedQuotations = (result.quotations || []).map((q: any) => sanitizeQuotationForUser(q, req.user));

    return res.status(200).json({ success: true, ...result, quotations: sanitizedQuotations });
  } catch (error) {
    next(error);
  }
});

// GET Quotation details
router.get('/:id', requireAuth, requirePermission('quotation:read'), async (req: any, res: any, next: any) => {
  try {
    const quotation = await quotationRepository.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }
    const sanitized = sanitizeQuotationForUser(quotation, req.user);
    return res.status(200).json({ success: true, quotation: sanitized });
  } catch (error) {
    next(error);
  }
});

// CREATE Quotation
router.post(
  '/',
  requireAuth,
  requirePermission('quotation:write'),
  [
    body('companyName').notEmpty().withMessage('companyName is required'),
    body('items').isArray({ min: 1 }).withMessage('items array is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const quotation = await quotationRepository.create(req.body, req.user.id);
      await logActivity(req.user.id, 'QUOTATION_CREATE', `Created quotation ${quotation.quotationNumber}`, req);
      return res.status(201).json({ success: true, quotation });
    } catch (error) {
      next(error);
    }
  }
);

// UPDATE Quotation
router.put(
  '/:id',
  requireAuth,
  requirePermission('quotation:write'),
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const isApproved = req.body.status === 'APPROVED';
      const quotation = await quotationRepository.update(req.params.id, req.body, isApproved ? req.user.id : undefined);
      await logActivity(req.user.id, 'QUOTATION_UPDATE', `Updated quotation ${quotation.quotationNumber} to status ${quotation.status}`, req);
      return res.status(200).json({ success: true, quotation });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE Quotation
router.delete('/:id', requireAuth, requirePermission('quotation:delete'), async (req: any, res: any, next: any) => {
  try {
    const quotation = await quotationRepository.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ success: false, message: 'Quotation not found.' });
    }
    await quotationRepository.delete(req.params.id);
    await logActivity(req.user.id, 'QUOTATION_DELETE', `Deleted quotation ${quotation.quotationNumber}`, req);
    return res.status(200).json({ success: true, message: 'Quotation deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
