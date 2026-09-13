import { Router } from 'express';
import { requireAuth, requirePermission } from '../middlewares/auth.js';
import { prisma } from '@eipms/database';
import { productRepository } from '../repositories/product.repository.js';
import { purchaseRepository } from '../repositories/purchase.repository.js';

const router = Router();

// Helper to convert document total to PKR using saved exchange rate
function convertToPkr(amount: number, currency: string, rmbRate: number, usdRate: number): number {
  if (currency === 'RMB') {
    return amount * (rmbRate || 38.50);
  }
  if (currency === 'USD') {
    return amount * (usdRate || 278.50);
  }
  return amount; // PKR
}

// GET /api/reports/dashboard (Dashboard Aggregations & Real-Time Finance Metrics)
router.get(
  '/dashboard',
  requireAuth,
  async (req: any, res: any, next: any) => {
    try {
      const prodMetrics = await productRepository.getDashboardMetrics();

      const isSuperAdmin = req.user?.roles?.includes('Super Admin');
      const canAccessFinance = isSuperAdmin || req.user?.permissions?.includes('report:finance');

      // Fetch all Sales Tax Invoices with linked Quotation for exchange rates
      const salesInvoices = await prisma.salesTaxInvoice.findMany({
        include: { quotation: true }
      });

      // Fetch all Quotations
      const quotations = await prisma.quotation.findMany();

      // Fetch all Purchase Orders
      const purchaseOrders = await prisma.purchaseOrder.findMany();

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      let totalValuePkr = 0;
      let dailyValuePkr = 0;
      let pendingAmountPkr = 0;
      let paidAmountPkr = 0;

      let paidCount = 0;
      let partialCount = 0;
      let pendingCount = 0;
      let overdueCount = 0;

      salesInvoices.forEach((inv: any) => {
        const curr = inv.currency || inv.quotation?.currency || 'PKR';
        const rmbR = Number(inv.quotation?.rmbRate) || 38.50;
        const usdR = Number(inv.quotation?.usdRate) || 278.50;

        const totalPkr = convertToPkr(Number(inv.totalAmount) || 0, curr, rmbR, usdR);
        totalValuePkr += totalPkr;

        const invDate = new Date(inv.invoiceDate || inv.createdAt);
        if (invDate >= startOfToday) {
          dailyValuePkr += totalPkr;
        }

        if (inv.status === 'PAID') {
          paidAmountPkr += totalPkr;
          paidCount++;
        } else if (inv.status === 'PARTIAL') {
          const halfPkr = totalPkr * 0.5;
          paidAmountPkr += halfPkr;
          pendingAmountPkr += halfPkr;
          partialCount++;
        } else if (inv.status === 'CANCELLED') {
          // Exclude
        } else {
          pendingAmountPkr += totalPkr;
          pendingCount++;

          const diffDays = (new Date().getTime() - invDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 30) {
            overdueCount++;
          }
        }
      });

      if (salesInvoices.length === 0) {
        quotations.forEach((q: any) => {
          const qTotalPkr = convertToPkr(Number(q.totalAmount) || 0, q.currency, Number(q.rmbRate), Number(q.usdRate));
          totalValuePkr += qTotalPkr;
          const qDate = new Date(q.createdAt);
          if (qDate >= startOfToday) {
            dailyValuePkr += qTotalPkr;
          }
        });
      }

      purchaseOrders.forEach((po: any) => {
        const poDate = new Date(po.createdAt);
        if (poDate >= startOfToday) {
          const poTotalPkr = convertToPkr(Number(po.totalAmount) || 0, po.currency || 'PKR', Number(po.rmbRate) || 38.50, Number(po.usdRate) || 278.50);
          dailyValuePkr += poTotalPkr;
        }
      });

      const lowStockProducts = await prisma.product.findMany({
        where: {
          quantity: { lt: 100 },
          status: 'ACTIVE'
        },
        include: { brand: true, category: true },
        take: 5
      });

      const recentActivities = await prisma.activityLog.findMany({
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: 'desc' },
        take: 8
      });

      const topSuppliers = await prisma.supplier.findMany({
        include: {
          _count: { select: { pos: true } }
        },
        take: 5
      });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const movements = await prisma.stockMovement.findMany({
        where: { createdAt: { gte: sevenDaysAgo } },
        select: { type: true, quantity: true, createdAt: true }
      });

      const categories = await prisma.category.findMany({
        include: {
          products: {
            select: { quantity: true, purchasePrice: true }
          }
        }
      });

      const categoryDistribution = categories
        .map((cat: any) => {
          const value = cat.products.reduce(
            (sum: number, p: any) => sum + p.quantity * Number(p.purchasePrice),
            0
          );
          return { name: cat.name, value };
        })
        .filter((c: any) => c.value > 0);

      return res.status(200).json({
        success: true,
        metrics: {
          totalProducts: prodMetrics.totalProducts,
          inventoryValue: canAccessFinance ? prodMetrics.inventoryValue : 0,
          totalValuePkr: canAccessFinance ? totalValuePkr : 0,
          dailyValuePkr: canAccessFinance ? dailyValuePkr : 0,
          pendingAmountPkr: canAccessFinance ? pendingAmountPkr : 0,
          paidAmountPkr: canAccessFinance ? paidAmountPkr : 0,
          financialStatusBreakdown: canAccessFinance
            ? {
                paidCount,
                partialCount,
                pendingCount,
                overdueCount,
                paidAmountPkr,
                pendingAmountPkr
              }
            : {
                paidCount: 0,
                partialCount: 0,
                pendingCount: 0,
                overdueCount: 0,
                paidAmountPkr: 0,
                pendingAmountPkr: 0
              },
          lowStockCount: prodMetrics.lowStockCount
        },
        lowStockProducts,
        recentActivities,
        topSuppliers,
        stockFlow: movements,
        categoryDistribution: canAccessFinance ? categoryDistribution : []
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /api/reports/low-stock
router.get(
  '/low-stock',
  requireAuth,
  requirePermission('report:read'),
  async (req: any, res: any, next: any) => {
    try {
      const products = await prisma.product.findMany({
        where: {
          quantity: { lt: 100 },
          status: 'ACTIVE'
        },
        include: { category: true, brand: true, warehouse: true }
      });

      return res.status(200).json({ success: true, products });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
