import { Router } from 'express';
import { body } from 'express-validator';
import { validateRequest } from '../middlewares/validation.js';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { prisma, Prisma } from '@eipms/database';
import { logActivity } from '../utils/audit.js';

const router = Router();

// 1. Bulk Import Products
router.post(
  '/bulk-products',
  requireAuth,
  requirePermission('product:import'),
  [
    body('rows').isArray({ min: 1 }).withMessage('rows array is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const rows = req.body.rows;
      const results = { successCount: 0, errorCount: 0, errors: [] as string[] };

      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            if (!row.partNumber || !row.name) {
              throw new Error(`Row ${i + 1}: Name and Part Number are required.`);
            }

            // Check if brand exists or create it
            let brandId = undefined;
            if (row.brandName) {
              const brand = await tx.brand.upsert({
                where: { name: String(row.brandName).trim() },
                update: {},
                create: { name: String(row.brandName).trim() }
              });
              brandId = brand.id;
            }

            // Check if category exists or create it
            let categoryId = undefined;
            if (row.categoryName) {
              const category = await tx.category.upsert({
                where: { name: String(row.categoryName).trim() },
                update: {},
                create: { name: String(row.categoryName).trim() }
              });
              categoryId = category.id;
            }

            // Create or update product
            await tx.product.upsert({
              where: { partNumber: String(row.partNumber).trim() },
              update: {
                name: String(row.name).trim(),
                description: row.description ? String(row.description).trim() : undefined,
                brandId,
                categoryId,
                manufacturer: row.manufacturer ? String(row.manufacturer).trim() : undefined,
                purchasePrice: row.purchasePrice !== undefined ? new Prisma.Decimal(row.purchasePrice) : undefined,
                sellingPrice: row.sellingPrice !== undefined ? new Prisma.Decimal(row.sellingPrice) : undefined,
                unit: row.unit || undefined,
                quantity: row.quantity !== undefined ? Number(row.quantity) : undefined
              },
              create: {
                name: String(row.name).trim(),
                partNumber: String(row.partNumber).trim(),
                description: row.description ? String(row.description).trim() : null,
                brandId,
                categoryId,
                manufacturer: row.manufacturer ? String(row.manufacturer).trim() : null,
                purchasePrice: new Prisma.Decimal(row.purchasePrice || 0.00),
                sellingPrice: new Prisma.Decimal(row.sellingPrice || 0.00),
                unit: row.unit || 'Pcs',
                quantity: row.quantity !== undefined ? Number(row.quantity) : 0,
                status: 'ACTIVE'
              }
            });

            results.successCount++;
          } catch (err: any) {
            results.errorCount++;
            results.errors.push(`Row ${i + 1}: ${err.message}`);
          }
        }
      });

      await logActivity(req.user.id, 'PRODUCT_IMPORT', `Bulk imported products. Success: ${results.successCount}, Failed: ${results.errorCount}`, req);
      return res.status(200).json({ success: true, ...results });
    } catch (error) {
      next(error);
    }
  }
);

// 2. Bulk Import Customers
router.post(
  '/bulk-customers',
  requireAuth,
  requirePermission('customer:write'),
  [
    body('rows').isArray({ min: 1 }).withMessage('rows array is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const rows = req.body.rows;
      const results = { successCount: 0, errorCount: 0, errors: [] as string[] };

      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            if (!row.companyName || !row.contactPerson || !row.email || !row.phone) {
              throw new Error(`Row ${i + 1}: Company Name, Contact Person, Email, and Phone are required.`);
            }

            await tx.customer.create({
              data: {
                companyName: String(row.companyName).trim(),
                contactPerson: String(row.contactPerson).trim(),
                email: String(row.email).trim().toLowerCase(),
                phone: String(row.phone).trim(),
                departmentName: row.departmentName ? String(row.departmentName).trim() : null,
                address: row.address ? String(row.address).trim() : 'Local Station Address',
                projects: row.projects ? String(row.projects).trim() : null
              }
            });

            results.successCount++;
          } catch (err: any) {
            results.errorCount++;
            results.errors.push(`Row ${i + 1}: ${err.message}`);
          }
        }
      });

      await logActivity(req.user.id, 'CUSTOMER_IMPORT', `Bulk imported customers. Success: ${results.successCount}, Failed: ${results.errorCount}`, req);
      return res.status(200).json({ success: true, ...results });
    } catch (error) {
      next(error);
    }
  }
);

// 3. Bulk Import Suppliers
router.post(
  '/bulk-suppliers',
  requireAuth,
  requirePermission('supplier:write'),
  [
    body('rows').isArray({ min: 1 }).withMessage('rows array is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const rows = req.body.rows;
      const results = { successCount: 0, errorCount: 0, errors: [] as string[] };

      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            if (!row.companyName || !row.contactName || !row.email || !row.phone) {
              throw new Error(`Row ${i + 1}: Company Name, Contact Name, Email, and Phone are required.`);
            }

            await tx.supplier.upsert({
              where: { companyName: String(row.companyName).trim() },
              update: {
                contactName: String(row.contactName).trim(),
                email: String(row.email).trim().toLowerCase(),
                phone: String(row.phone).trim(),
                address: row.address ? String(row.address).trim() : 'Supplier LAN Address',
                country: row.country ? String(row.country).trim() : 'International'
              },
              create: {
                companyName: String(row.companyName).trim(),
                contactName: String(row.contactName).trim(),
                email: String(row.email).trim().toLowerCase(),
                phone: String(row.phone).trim(),
                address: row.address ? String(row.address).trim() : 'Supplier LAN Address',
                country: row.country ? String(row.country).trim() : 'International'
              }
            });

            results.successCount++;
          } catch (err: any) {
            results.errorCount++;
            results.errors.push(`Row ${i + 1}: ${err.message}`);
          }
        }
      });

      await logActivity(req.user.id, 'SUPPLIER_IMPORT', `Bulk imported suppliers. Success: ${results.successCount}, Failed: ${results.errorCount}`, req);
      return res.status(200).json({ success: true, ...results });
    } catch (error) {
      next(error);
    }
  }
);

// 4. Bulk Import Previous Inventory levels
router.post(
  '/bulk-inventory',
  requireAuth,
  requirePermission('inventory:write'),
  [
    body('rows').isArray({ min: 1 }).withMessage('rows array is required')
  ],
  validateRequest,
  async (req: any, res: any, next: any) => {
    try {
      const rows = req.body.rows;
      const results = { successCount: 0, errorCount: 0, errors: [] as string[] };

      await prisma.$transaction(async (tx) => {
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            if (!row.partNumber || row.quantity === undefined) {
              throw new Error(`Row ${i + 1}: Part Number and Quantity are required.`);
            }

            const quantityNum = Number(row.quantity);

            // Find product
            const product = await tx.product.findUnique({
              where: { partNumber: String(row.partNumber).trim() }
            });

            if (!product) {
              throw new Error(`Row ${i + 1}: Product with partNumber '${row.partNumber}' not found. Please import product to catalog first.`);
            }

            // Update quantity
            await tx.product.update({
              where: { id: product.id },
              data: {
                quantity: quantityNum
              }
            });

            // Log stock movement
            await tx.stockMovement.create({
              data: {
                productId: product.id,
                type: 'STOCK_IN',
                quantity: quantityNum,
                referenceNo: 'EXCEL_IMPORT',
                remarks: 'Imported previous inventory levels from Excel Wizard.',
                createdById: req.user.id
              }
            });

            results.successCount++;
          } catch (err: any) {
            results.errorCount++;
            results.errors.push(`Row ${i + 1}: ${err.message}`);
          }
        }
      });

      await logActivity(req.user.id, 'INVENTORY_IMPORT', `Bulk imported previous inventory. Success: ${results.successCount}, Failed: ${results.errorCount}`, req);
      return res.status(200).json({ success: true, ...results });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
