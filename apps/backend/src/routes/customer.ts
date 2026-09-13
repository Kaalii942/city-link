import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validation.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { customerRepository } from '../repositories/customer.repository.js';
import { logActivity } from '../utils/audit.js';

const router = Router();

router.get('/', requireAuth, requirePermission('customer:read'), async (req: any, res: any, next: any) => {
  try {
    const customers = await customerRepository.findAll();
    return res.status(200).json({ success: true, customers });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', requireAuth, requirePermission('customer:read'), async (req: any, res: any, next: any) => {
  try {
    const customer = await customerRepository.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    return res.status(200).json({ success: true, customer });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  requireAuth,
  requirePermission('customer:write'),
  [
    body('companyName').notEmpty().withMessage('Company name is required'),
    body('contactPerson').notEmpty().withMessage('Contact person is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('address').notEmpty().withMessage('Address is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const customer = await customerRepository.create(req.body);
      await logActivity(req.user.id, 'CUSTOMER_CREATE', `Created customer: ${customer.companyName}`, req);
      return res.status(201).json({ success: true, customer });
    } catch (error) {
      next(error);
    }
  }
);

router.put(
  '/:id',
  requireAuth,
  requirePermission('customer:write'),
  async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const existing = await customerRepository.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      const customer = await customerRepository.update(id, req.body);
      await logActivity(req.user.id, 'CUSTOMER_UPDATE', `Updated customer: ${customer.companyName}`, req);
      return res.status(200).json({ success: true, customer });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  '/:id',
  requireAuth,
  requirePermission('customer:delete'),
  async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const existing = await customerRepository.findById(id);
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      await customerRepository.delete(id);
      await logActivity(req.user.id, 'CUSTOMER_DELETE', `Deleted customer: ${existing.companyName}`, req);
      return res.status(200).json({ success: true, message: 'Customer deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
