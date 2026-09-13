import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validation.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { purchaseService } from '../services/purchase.service.js';
import { purchaseRepository } from '../repositories/purchase.repository.js';
import { logActivity } from '../utils/audit.js';

const router = Router();

// GET /api/purchases (Query all purchase orders)
router.get('/', requireAuth, requirePermission('purchase:read'), async (req: any, res: any, next: any) => {
  try {
    const pos = await purchaseService.getPurchaseOrders();
    return res.status(200).json({ success: true, pos });
  } catch (error) {
    next(error);
  }
});

// GET /api/purchases/:id (Get single purchase order)
router.get('/:id', requireAuth, requirePermission('purchase:read'), async (req: any, res: any, next: any) => {
  try {
    const po = await purchaseService.getPurchaseOrder(req.params.id);
    return res.status(200).json({ success: true, po });
  } catch (error) {
    next(error);
  }
});

// POST /api/purchases (Create purchase order, standalone or from Quotation)
router.post(
  '/',
  requireAuth,
  requirePermission('purchase:write'),
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const po = await purchaseService.createPurchaseOrder(req.body, req.user.id);
      await logActivity(req.user.id, 'PO_CREATE', `Created Purchase Order: ${po.poNumber}`, req);
      return res.status(201).json({ success: true, po });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/purchases/:id (Update PO details)
router.put(
  '/:id',
  requireAuth,
  requirePermission('purchase:write'),
  async (req: any, res: any, next: any) => {
    try {
      const po = await purchaseService.updatePurchaseOrder(req.params.id, req.body);
      await logActivity(req.user.id, 'PO_UPDATE', `Updated Purchase Order: ${po.poNumber}`, req);
      return res.status(200).json({ success: true, po });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/purchases/:id/place (Confirm and Place Purchase Order)
router.post(
  '/:id/place',
  requireAuth,
  requirePermission('purchase:write'),
  async (req: any, res: any, next: any) => {
    try {
      const po = await purchaseService.placePurchaseOrder(req.params.id);
      await logActivity(req.user.id, 'PO_PLACE', `Placed Purchase Order: ${po.poNumber}`, req);
      return res.status(200).json({ success: true, po });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/purchases/:id/approve (Approve/Reject PO)
router.post(
  '/:id/approve',
  requireAuth,
  requirePermission('purchase:approve'),
  [body('approve').isBoolean().withMessage('approve (boolean) is required')],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const { approve } = req.body;
      const po = await purchaseService.approvePurchaseOrder(id, req.user.id, approve);
      await logActivity(
        req.user.id,
        approve ? 'PO_APPROVE' : 'PO_REJECT',
        `${approve ? 'Approved' : 'Rejected'} PO: ${po.poNumber}`,
        req
      );
      return res.status(200).json({ success: true, po });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/purchases/:id/receive (Receive deliveries)
router.post(
  '/:id/receive',
  requireAuth,
  requirePermission('inventory:write'),
  async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const po = await purchaseService.receiveDelivery(id, req.user.id);
      await logActivity(req.user.id, 'PO_RECEIVE_DELIVERY', `Received inventory delivery for PO: ${po.poNumber}`, req);
      return res.status(200).json({ success: true, po });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/purchases/:id/invoices (Create purchase invoice)
router.post(
  '/:id/invoices',
  requireAuth,
  requirePermission('finance:write'),
  [
    body('invoiceNumber').notEmpty().withMessage('Invoice number is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be positive'),
    body('status').isIn(['UNPAID', 'PAID']).withMessage('Status must be UNPAID or PAID')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const invoice = await purchaseService.createInvoice({
        ...req.body,
        purchaseOrderId: req.params.id
      });
      await logActivity(req.user.id, 'PO_INVOICE_CREATE', `Created invoice for PO: ${req.params.id}`, req);
      return res.status(201).json({ success: true, invoice });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
