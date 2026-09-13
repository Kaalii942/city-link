import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validation.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { supplierRepository } from '../repositories/supplier.repository.js';
import { logActivity } from '../utils/audit.js';

const router = Router();

router.get('/', requireAuth, requirePermission('supplier:read'), async (req: any, res: any, next: any) => {
  try {
    const suppliers = await supplierRepository.findAll();
    return res.status(200).json({ success: true, suppliers });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireAuth, requirePermission('supplier:read'), async (req: any, res: any, next: any) => {
  try {
    const supplier = await supplierRepository.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    return res.status(200).json({ success: true, supplier });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  requireAuth,
  requirePermission('supplier:write'),
  [
    body('companyName').notEmpty().withMessage('Company name is required'),
    body('contactName').notEmpty().withMessage('Contact name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('country').notEmpty().withMessage('Country is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const existing = await supplierRepository.findByCompanyName(req.body.companyName);
      if (existing) {
        return res.status(400).json({ success: false, message: 'Supplier company name already exists' });
      }

      const supplier = await supplierRepository.create(req.body);
      await logActivity(req.user.id, 'SUPPLIER_CREATE', `Created supplier: ${supplier.companyName}`, req);
      return res.status(201).json({ success: true, supplier });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  requireAuth,
  requirePermission('supplier:write'),
  async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const existing = await supplierRepository.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }

      if (req.body.companyName && req.body.companyName !== existing.companyName) {
        const dup = await supplierRepository.findByCompanyName(req.body.companyName);
        if (dup) {
          return res.status(400).json({ success: false, message: 'Supplier company name already exists' });
        }
      }

      const supplier = await supplierRepository.update(id, req.body);
      await logActivity(req.user.id, 'SUPPLIER_UPDATE', `Updated supplier: ${supplier.companyName}`, req);
      return res.status(200).json({ success: true, supplier });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  requireAuth,
  requirePermission('supplier:delete'),
  async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const existing = await supplierRepository.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Supplier not found' });
      }

      await supplierRepository.delete(id);
      await logActivity(req.user.id, 'SUPPLIER_DELETE', `Deleted supplier: ${existing.companyName}`, req);
      return res.status(200).json({ success: true, message: 'Supplier deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
