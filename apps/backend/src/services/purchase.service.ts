import { purchaseRepository } from '../repositories/purchase.repository.js';
import { productRepository } from '../repositories/product.repository.js';
import { inventoryRepository } from '../repositories/inventory.repository.js';
import { prisma } from '@eipms/database';
import { logger } from '@eipms/utils';

export class PurchaseService {
  async getPurchaseOrders() {
    return purchaseRepository.findAll();
  }

  async getPurchaseOrder(id: string) {
    const po = await purchaseRepository.findById(id);
    if (!po) {
      throw new Error('Purchase Order not found');
    }
    return po;
  }

  async createPurchaseOrder(data: any, userId: string) {
    let poNumber = data.poNumber;
    if (!poNumber) {
      const count = await prisma.purchaseOrder.count();
      poNumber = `PO-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;
    }

    const existing = await purchaseRepository.findByPoNumber(poNumber);
    if (existing) {
      throw new Error(`Purchase order with number [${poNumber}] already exists.`);
    }

    let subTotal = 0;
    const items = (data.items || []).map((item: any, idx: number) => {
      const uPrice = Number(item.unitPrice || item.unitPricePkr) || 0;
      const lineTotal = Number(item.totalLineAmount || item.totalPricePkr || (item.quantity * uPrice)) || 0;
      subTotal += lineTotal;

      return {
        srNo: item.srNo || idx + 1,
        partNumber: item.partNumber || item.orderCode || null,
        description: item.description || null,
        manufacturer: item.manufacturer || null,
        quantity: Number(item.quantity) || 1,
        unit: item.unit || 'Pcs',
        unitPrice: uPrice,
        totalLineAmount: lineTotal,
        unitPricePkr: Number(item.unitPricePkr || uPrice) || 0,
        totalPricePkr: Number(item.totalPricePkr || lineTotal) || 0,
        zoneCurrency: item.zoneCurrency || 'RMB',
        unitPriceRmb: Number(item.unitPriceRmb) || 0,
        totalPriceRmb: Number(item.totalPriceRmb) || 0,
        unitPriceUsd: Number(item.unitPriceUsd) || 0,
        totalPriceUsd: Number(item.totalPriceUsd) || 0,
        internetCurrency: item.internetCurrency || 'RMB',
        internetUnitPrice: Number(item.internetUnitPrice) || 0,
        internetTotalPrice: Number(item.internetTotalPrice) || 0,
        productId: item.productId || null
      };
    });

    const taxRate = Number(data.taxRate) || 0;
    const discountRate = Number(data.discountRate) || 0;
    const computedSubTotal = Number(data.subTotal) || subTotal;
    const taxAmount = computedSubTotal * (taxRate / 100);
    const discountAmount = computedSubTotal * (discountRate / 100);
    const totalAmount = Number(data.totalAmount) || (computedSubTotal + taxAmount - discountAmount);

    const po = await purchaseRepository.create({
      poNumber,
      quotationId: data.quotationId,
      supplierId: data.supplierId,
      orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
      expectedDate: data.expectedDate ? new Date(data.expectedDate) : undefined,
      companyName: data.companyName,
      departmentName: data.departmentName,
      contactPerson: data.contactPerson,
      email: data.email,
      phone: data.phone,
      address: data.address,
      referenceNumber: data.referenceNumber,
      currency: data.currency || 'PKR',
      exchangeRate: Number(data.exchangeRate) || 1.0,
      rmbRate: Number(data.rmbRate) || 38.50,
      usdRate: Number(data.usdRate) || 278.50,
      taxRate,
      discountRate,
      subTotal: computedSubTotal,
      totalAmount,
      remarks: data.remarks,
      createdById: userId,
      status: data.status || 'DRAFT',
      items
    });

    logger.info(`Purchase Order created: ${po.poNumber}`);
    return po;
  }

  async updatePurchaseOrder(id: string, data: any) {
    const existing = await this.getPurchaseOrder(id);
    if (!existing) {
      throw new Error('Purchase Order not found');
    }
    const updated = await purchaseRepository.update(id, data);
    logger.info(`Purchase Order updated: ${updated.poNumber}`);
    return updated;
  }

  async placePurchaseOrder(id: string) {
    const existing = await this.getPurchaseOrder(id);
    if (!existing) {
      throw new Error('Purchase Order not found');
    }
    const updated = await purchaseRepository.placeOrder(id);
    logger.info(`Purchase Order [${updated.poNumber}] placed successfully.`);
    return updated;
  }

  async approvePurchaseOrder(id: string, approvedById: string, approve: boolean) {
    const po = await this.getPurchaseOrder(id);
    const targetStatus = approve ? 'APPROVED' : 'REJECTED';
    const updated = await purchaseRepository.updateStatus(id, targetStatus, approvedById);
    logger.info(`Purchase Order [${po.poNumber}] ${targetStatus} by User ${approvedById}`);
    return updated;
  }

  async receiveDelivery(id: string, userId: string) {
    const po = await this.getPurchaseOrder(id);

    return prisma.$transaction(async (tx: any) => {
      const updatedPO = await purchaseRepository.updateStatus(id, 'COMPLETED', undefined, tx);
      await tx.purchaseOrder.update({
        where: { id },
        data: { deliveryStatus: 'DELIVERED' }
      });

      for (const item of po.items) {
        if (item.productId) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (product) {
            const newQty = product.quantity + item.quantity;
            await tx.product.update({
              where: { id: item.productId },
              data: { quantity: newQty }
            });

            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: 'STOCK_IN',
                quantity: item.quantity,
                referenceNo: po.poNumber,
                remarks: `Delivery received for PO #${po.poNumber}`,
                createdById: userId
              }
            });
          }
        }
      }

      return updatedPO;
    });
  }

  async createInvoice(data: any) {
    const invoice = await purchaseRepository.createInvoice(data);
    logger.info(`Purchase Invoice created: ${invoice.invoiceNumber}`);
    return invoice;
  }
}

export const purchaseService = new PurchaseService();
