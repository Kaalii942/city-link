import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validation.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { productService } from '../services/product.service.js';
import { categoryRepository } from '../repositories/category.repository.js';
import { brandRepository } from '../repositories/brand.repository.js';
import { productRepository } from '../repositories/product.repository.js';
import { logActivity } from '../utils/audit.js';

const router = Router();

// ============================================================================
// PRODUCT ENDPOINTS
// ============================================================================

// GET /api/products (Query products list)
router.get('/', requireAuth, requirePermission('product:read'), async (req: any, res: any, next: any) => {
  try {
    const { search, brandId, categoryId, subCategoryId, warehouseId, status, lowStockOnly, page, limit, sortBy, sortOrder } = req.query;
    
    const skip = page ? (parseInt(page as string, 10) - 1) * parseInt(limit as string, 10) : 0;
    const take = limit ? parseInt(limit as string, 10) : 25;

    const result = await productService.getProducts({
      search: search as string,
      brandId: brandId as string,
      categoryId: categoryId as string,
      subCategoryId: subCategoryId as string,
      warehouseId: warehouseId as string,
      status: status as string,
      lowStockOnly: lowStockOnly === 'true',
      skip,
      take,
      sortBy: sortBy as string,
      sortOrder: (sortOrder as 'asc' | 'desc') || 'desc'
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/:id (Get single product details)
router.get('/:id', requireAuth, requirePermission('product:read'), async (req: any, res: any, next: any) => {
  try {
    const product = await productService.getProduct(req.params.id);
    return res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
});

// GET /api/products/barcode/:barcode (Search product by barcode)
router.get('/barcode/:barcode', requireAuth, requirePermission('product:read'), async (req: any, res: any, next: any) => {
  try {
    const product = await productRepository.findByBarcode(req.params.barcode);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found with barcode' });
    }
    return res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
});

// POST /api/products (Create product)
router.post(
  '/',
  requireAuth,
  requirePermission('product:write'),
  [
    body('name').notEmpty().withMessage('Product name is required'),
    body('partNumber').notEmpty().withMessage('Part number is required'),
    body('purchasePrice').isFloat({ min: 0 }).withMessage('Valid purchase price is required'),
    body('sellingPrice').isFloat({ min: 0 }).withMessage('Valid selling price is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const product = await productService.createProduct(req.body, req.user.id);
      await logActivity(req.user.id, 'PRODUCT_CREATE', `Created product: ${product.name} (${product.partNumber})`, req);
      return res.status(201).json({ success: true, product });
    } catch (error) {
      next(error);
    }
  }
);

// PUT /api/products/:id (Update product)
router.put(
  '/:id',
  requireAuth,
  requirePermission('product:write'),
  async (req: any, res: any, next: any) => {
    try {
      const product = await productService.updateProduct(req.params.id, req.body, req.user.id);
      await logActivity(req.user.id, 'PRODUCT_UPDATE', `Updated product: ${product.name} (${product.partNumber})`, req);
      return res.status(200).json({ success: true, product });
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/products/:id (Delete product)
router.delete(
  '/:id',
  requireAuth,
  requirePermission('product:delete'),
  async (req: any, res: any, next: any) => {
    try {
      const { id } = req.params;
      const product = await productRepository.findById(id);
      await productService.deleteProduct(id, req.user.id);
      if (product) {
        await logActivity(req.user.id, 'PRODUCT_DELETE', `Deleted product: ${product.name} (${product.partNumber})`, req);
      }
      return res.status(200).json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/products/bulk-delete (Bulk delete products)
router.post(
  '/bulk-delete',
  requireAuth,
  requirePermission('product:delete'),
  [body('ids').isArray({ min: 1 }).withMessage('ids array must contain at least 1 product ID')],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      await productService.deleteProductsBulk(req.body.ids, req.user.id);
      await logActivity(req.user.id, 'PRODUCT_BULK_DELETE', `Deleted ${req.body.ids.length} products`, req);
      return res.status(200).json({ success: true, message: 'Products deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
);

// POST /api/products/bulk-import (Excel imports)
router.post(
  '/bulk-import',
  requireAuth,
  requirePermission('product:import'),
  [body('rows').isArray({ min: 1 }).withMessage('rows array is required')],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const result = await productService.importProducts(req.body.rows, req.user.id);
      await logActivity(
        req.user.id,
        'PRODUCT_IMPORT',
        `Imported products. Success: ${result.importedCount}, Failed: ${result.errorCount}`,
        req
      );
      return res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================================================
// CATEGORY ENDPOINTS
// ============================================================================

router.get('/categories/all', requireAuth, requirePermission('category:read'), async (req: any, res: any, next: any) => {
  try {
    const categories = await categoryRepository.findAll();
    return res.status(200).json({ success: true, categories });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/categories',
  requireAuth,
  requirePermission('category:write'),
  [body('name').notEmpty().withMessage('Category name is required')],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const category = await categoryRepository.create(req.body);
      await logActivity(req.user.id, 'CATEGORY_CREATE', `Created category: ${category.name}`, req);
      return res.status(201).json({ success: true, category });
    } catch (error) {
      next(error);
    }
  }
);

router.put('/categories/:id', requireAuth, requirePermission('category:write'), async (req: any, res: any, next: any) => {
  try {
    const category = await categoryRepository.update(req.params.id, req.body);
    await logActivity(req.user.id, 'CATEGORY_UPDATE', `Updated category: ${category.name}`, req);
    return res.status(200).json({ success: true, category });
  } catch (error) {
    next(error);
  }
});

router.delete('/categories/:id', requireAuth, requirePermission('category:delete'), async (req: any, res: any, next: any) => {
  try {
    const category = await categoryRepository.findById(req.params.id);
    await categoryRepository.delete(req.params.id);
    if (category) {
      await logActivity(req.user.id, 'CATEGORY_DELETE', `Deleted category: ${category.name}`, req);
    }
    return res.status(200).json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// BRAND ENDPOINTS
// ============================================================================

router.get('/brands/all', requireAuth, requirePermission('brand:read'), async (req: any, res: any, next: any) => {
  try {
    const brands = await brandRepository.findAll();
    return res.status(200).json({ success: true, brands });
  } catch (error) {
    next(error);
  }
});

router.post(
  '/brands',
  requireAuth,
  requirePermission('brand:write'),
  [body('name').notEmpty().withMessage('Brand name is required')],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const brand = await brandRepository.create(req.body);
      await logActivity(req.user.id, 'BRAND_CREATE', `Created brand: ${brand.name}`, req);
      return res.status(201).json({ success: true, brand });
    } catch (error) {
      next(error);
    }
  }
);

router.put('/brands/:id', requireAuth, requirePermission('brand:write'), async (req: any, res: any, next: any) => {
  try {
    const brand = await brandRepository.update(req.params.id, req.body);
    await logActivity(req.user.id, 'BRAND_UPDATE', `Updated brand: ${brand.name}`, req);
    return res.status(200).json({ success: true, brand });
  } catch (error) {
    next(error);
  }
});

router.delete('/brands/:id', requireAuth, requirePermission('brand:delete'), async (req: any, res: any, next: any) => {
  try {
    const brand = await brandRepository.findById(req.params.id);
    await brandRepository.delete(req.params.id);
    if (brand) {
      await logActivity(req.user.id, 'BRAND_DELETE', `Deleted brand: ${brand.name}`, req);
    }
    return res.status(200).json({ success: true, message: 'Brand deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
