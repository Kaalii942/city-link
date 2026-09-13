import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validation.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { warehouseRepository } from '../repositories/warehouse.repository.js';
import { logActivity } from '../utils/audit.js';

const router = Router();

// ============================================================================
// WAREHOUSE ENDPOINTS
// ============================================================================

router.get('/', requireAuth, requirePermission('warehouse:read'), async (req: any, res: any, next: any) => {
  try {
    const warehouses = await warehouseRepository.findAll();
    return res.status(200).json({ success: true, warehouses });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/',
  requireAuth,
  requirePermission('warehouse:write'),
  [
    body('name').notEmpty().withMessage('Warehouse name is required'),
    body('code').notEmpty().withMessage('Warehouse code is required'),
    body('location').notEmpty().withMessage('Warehouse location/address is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const existing = await warehouseRepository.findByCode(req.body.code);
      if (existing) {
        return res.status(400).json({ success: false, message: 'Warehouse code must be unique' });
      }

      const warehouse = await warehouseRepository.create(req.body);
      await logActivity(req.user.id, 'WAREHOUSE_CREATE', `Created warehouse: ${warehouse.name} (${warehouse.code})`, req);
      return res.status(201).json({ success: true, warehouse });
    } catch (error) {
      next(error);
    }
  }
);

router.put('/:id', requireAuth, requirePermission('warehouse:write'), async (req: any, res: any, next: any) => {
  try {
    const warehouse = await warehouseRepository.update(req.params.id, req.body);
    await logActivity(req.user.id, 'WAREHOUSE_UPDATE', `Updated warehouse: ${warehouse.name}`, req);
    return res.status(200).json({ success: true, warehouse });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, requirePermission('warehouse:write'), async (req: any, res: any, next: any) => {
  try {
    const existing = await warehouseRepository.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Warehouse not found' });
    }
    await warehouseRepository.delete(req.params.id);
    await logActivity(req.user.id, 'WAREHOUSE_DELETE', `Deleted warehouse: ${existing.name}`, req);
    return res.status(200).json({ success: true, message: 'Warehouse deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SECTION ENDPOINTS
// ============================================================================

router.get('/:warehouseId/sections', requireAuth, requirePermission('warehouse:read'), async (req: any, res: any, next: any) => {
  try {
    const sections = await warehouseRepository.findSections(req.params.warehouseId);
    return res.status(200).json({ success: true, sections });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/sections',
  requireAuth,
  requirePermission('warehouse:write'),
  [
    body('name').notEmpty().withMessage('Section name is required'),
    body('warehouseId').isUUID().withMessage('Valid warehouseId is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const section = await warehouseRepository.createSection(req.body);
      return res.status(201).json({ success: true, section });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/sections/:id', requireAuth, requirePermission('warehouse:write'), async (req: any, res: any, next: any) => {
  try {
    await warehouseRepository.deleteSection(req.params.id);
    return res.status(200).json({ success: true, message: 'Section deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// RACK ENDPOINTS
// ============================================================================

router.get('/sections/:sectionId/racks', requireAuth, requirePermission('warehouse:read'), async (req: any, res: any, next: any) => {
  try {
    const racks = await warehouseRepository.findRacks(req.params.sectionId);
    return res.status(200).json({ success: true, racks });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/racks',
  requireAuth,
  requirePermission('warehouse:write'),
  [
    body('name').notEmpty().withMessage('Rack name is required'),
    body('sectionId').isUUID().withMessage('Valid sectionId is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const rack = await warehouseRepository.createRack(req.body);
      return res.status(201).json({ success: true, rack });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/racks/:id', requireAuth, requirePermission('warehouse:write'), async (req: any, res: any, next: any) => {
  try {
    await warehouseRepository.deleteRack(req.params.id);
    return res.status(200).json({ success: true, message: 'Rack deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// SHELF ENDPOINTS
// ============================================================================

router.get('/racks/:rackId/shelves', requireAuth, requirePermission('warehouse:read'), async (req: any, res: any, next: any) => {
  try {
    const shelves = await warehouseRepository.findShelves(req.params.rackId);
    return res.status(200).json({ success: true, shelves });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/shelves',
  requireAuth,
  requirePermission('warehouse:write'),
  [
    body('name').notEmpty().withMessage('Shelf name is required'),
    body('rackId').isUUID().withMessage('Valid rackId is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const shelf = await warehouseRepository.createShelf(req.body);
      return res.status(201).json({ success: true, shelf });
    } catch (error) {
      next(error);
    }
  }
);

router.delete('/shelves/:id', requireAuth, requirePermission('warehouse:write'), async (req: any, res: any, next: any) => {
  try {
    await warehouseRepository.deleteShelf(req.params.id);
    return res.status(200).json({ success: true, message: 'Shelf deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
