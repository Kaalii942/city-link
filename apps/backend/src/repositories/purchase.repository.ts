import { prisma, PurchaseOrder, Prisma } from '@eipms/database';
import { generateDocumentNumber } from '../utils/numbering.js';

export class PurchaseRepository {
  async findAll() {
    return prisma.purchaseOrder.findMany({
      include: {
        supplier: true,
        creator: true,
        approver: true,
        quotation: {
          include: {
            deliveryChallans: {
              include: { items: true }
            }
          }
        },
        items: {
          include: {
            product: true
          }
        },
        invoices: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findById(id: string) {
    return prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        creator: true,
        approver: true,
        quotation: {
          include: {
            deliveryChallans: {
              include: { items: true }
            }
          }
        },
        items: {
          include: {
            product: true
          }
        },
        invoices: true
      }
    });
  }

  async findByPoNumber(poNumber: string) {
    return prisma.purchaseOrder.findUnique({
      where: { poNumber },
      include: { supplier: true, items: true, quotation: true }
    });
  }

  async create(data: {
    poNumber?: string;
    quotationId?: string;
    supplierId?: string;
    orderDate?: Date | string;
    expectedDate?: Date | string;
    companyName?: string;
    departmentName?: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    address?: string;
    referenceNumber?: string;
    currency?: string;
    exchangeRate?: number;
    rmbRate?: number;
    usdRate?: number;
    taxRate?: number;
    discountRate?: number;
    subTotal: number;
    totalAmount: number;
    remarks?: string;
    createdById: string;
    status?: string;
    items: Array<{
      srNo?: number;
      partNumber?: string;
      description?: string;
      manufacturer?: string;
      quantity: number;
      unit?: string;
      unitPrice?: number;
      totalLineAmount?: number;
      unitPricePkr?: number;
      totalPricePkr?: number;
      zoneCurrency?: string;
      unitPriceRmb?: number;
      totalPriceRmb?: number;
      unitPriceUsd?: number;
      totalPriceUsd?: number;
      internetCurrency?: string;
      internetUnitPrice?: number;
      internetTotalPrice?: number;
      productId?: string;
    }>;
  }) {
    return prisma.$transaction(async (tx: any) => {
      const generatedNo = data.poNumber || (await generateDocumentNumber('PO'));

      const safeOrderDate = data.orderDate ? new Date(data.orderDate) : new Date();
      const safeExpectedDate = data.expectedDate ? new Date(data.expectedDate) : null;
      const taxRate = data.taxRate || 0;
      const discountRate = data.discountRate || 0;
      const subTotal = data.subTotal || 0;
      const totalAmount = data.totalAmount || subTotal;

      const po = await tx.purchaseOrder.create({
        data: {
          poNumber: generatedNo,
          quotationId: data.quotationId || null,
          supplierId: data.supplierId || null,
          orderDate: safeOrderDate,
          expectedDate: safeExpectedDate,
          companyName: data.companyName || null,
          departmentName: data.departmentName || null,
          contactPerson: data.contactPerson || null,
          email: data.email || null,
          phone: data.phone || null,
          address: data.address || null,
          referenceNumber: data.referenceNumber || null,
          currency: data.currency || 'PKR',
          exchangeRate: new Prisma.Decimal(data.exchangeRate || 1.0),
          rmbRate: new Prisma.Decimal(data.rmbRate || 38.50),
          usdRate: new Prisma.Decimal(data.usdRate || 278.50),
          taxRate: new Prisma.Decimal(taxRate),
          taxAmount: new Prisma.Decimal(subTotal * (taxRate / 100)),
          discountRate: new Prisma.Decimal(discountRate),
          discountAmount: new Prisma.Decimal(subTotal * (discountRate / 100)),
          subTotal: new Prisma.Decimal(subTotal),
          totalAmount: new Prisma.Decimal(totalAmount),
          createdById: data.createdById,
          status: data.status || 'DRAFT',
          remarks: data.remarks || null
        }
      });

      // Create purchase items
      for (let idx = 0; idx < data.items.length; idx++) {
        const item = data.items[idx];
        await tx.purchaseItem.create({
          data: {
            purchaseOrderId: po.id,
            srNo: item.srNo || idx + 1,
            partNumber: item.partNumber || null,
            description: item.description || null,
            manufacturer: item.manufacturer || null,
            quantity: item.quantity,
            unit: item.unit || 'Pcs',
            unitPrice: new Prisma.Decimal(item.unitPrice || 0),
            totalLineAmount: new Prisma.Decimal(item.totalLineAmount || (item.quantity * (item.unitPrice || 0))),
            unitPricePkr: new Prisma.Decimal(item.unitPricePkr || 0),
            totalPricePkr: new Prisma.Decimal(item.totalPricePkr || 0),
            zoneCurrency: item.zoneCurrency || 'RMB',
            unitPriceRmb: new Prisma.Decimal(item.unitPriceRmb || 0),
            totalPriceRmb: new Prisma.Decimal(item.totalPriceRmb || 0),
            unitPriceUsd: new Prisma.Decimal(item.unitPriceUsd || 0),
            totalPriceUsd: new Prisma.Decimal(item.totalPriceUsd || 0),
            internetCurrency: item.internetCurrency || 'RMB',
            internetUnitPrice: new Prisma.Decimal(item.internetUnitPrice || 0),
            internetTotalPrice: new Prisma.Decimal(item.internetTotalPrice || 0),
            productId: item.productId || null
          }
        });
      }

      return po;
    });
  }

  async update(id: string, data: any) {
    return prisma.$transaction(async (tx: any) => {
      const updatePayload: any = {};
      if (data.companyName !== undefined) updatePayload.companyName = data.companyName;
      if (data.contactPerson !== undefined) updatePayload.contactPerson = data.contactPerson;
      if (data.email !== undefined) updatePayload.email = data.email;
      if (data.phone !== undefined) updatePayload.phone = data.phone;
      if (data.address !== undefined) updatePayload.address = data.address;
      if (data.status !== undefined) updatePayload.status = data.status;
      if (data.remarks !== undefined) updatePayload.remarks = data.remarks;
      if (data.placementDate !== undefined) updatePayload.placementDate = new Date(data.placementDate);
      if (data.currency !== undefined) updatePayload.currency = data.currency;
      if (data.exchangeRate !== undefined) updatePayload.exchangeRate = new Prisma.Decimal(data.exchangeRate);
      if (data.subTotal !== undefined) updatePayload.subTotal = new Prisma.Decimal(data.subTotal);
      if (data.totalAmount !== undefined) updatePayload.totalAmount = new Prisma.Decimal(data.totalAmount);

      const po = await tx.purchaseOrder.update({
        where: { id },
        data: updatePayload
      });

      if (data.items && Array.isArray(data.items)) {
        await tx.purchaseItem.deleteMany({ where: { purchaseOrderId: id } });
        for (let idx = 0; idx < data.items.length; idx++) {
          const item = data.items[idx];
          await tx.purchaseItem.create({
            data: {
              purchaseOrderId: po.id,
              srNo: item.srNo || idx + 1,
              partNumber: item.partNumber || null,
              description: item.description || null,
              manufacturer: item.manufacturer || null,
              quantity: item.quantity,
              unit: item.unit || 'Pcs',
              unitPrice: new Prisma.Decimal(item.unitPrice || 0),
              totalLineAmount: new Prisma.Decimal(item.totalLineAmount || (item.quantity * (item.unitPrice || 0))),
              unitPricePkr: new Prisma.Decimal(item.unitPricePkr || 0),
              totalPricePkr: new Prisma.Decimal(item.totalPricePkr || 0),
              zoneCurrency: item.zoneCurrency || 'RMB',
              unitPriceRmb: new Prisma.Decimal(item.unitPriceRmb || 0),
              totalPriceRmb: new Prisma.Decimal(item.totalPriceRmb || 0),
              unitPriceUsd: new Prisma.Decimal(item.unitPriceUsd || 0),
              totalPriceUsd: new Prisma.Decimal(item.totalPriceUsd || 0),
              internetCurrency: item.internetCurrency || 'RMB',
              internetUnitPrice: new Prisma.Decimal(item.internetUnitPrice || 0),
              internetTotalPrice: new Prisma.Decimal(item.internetTotalPrice || 0),
              productId: item.productId || null
            }
          });
        }
      }

      return po;
    });
  }

  async placeOrder(id: string) {
    return prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'PLACED',
        placementDate: new Date()
      }
    });
  }

  async updateStatus(
    id: string,
    status: string,
    approvedById?: string,
    tx?: any
  ) {
    const client = tx || prisma;
    const updateData: any = { status };
    if (approvedById) {
      updateData.approvedById = approvedById;
    }
    return client.purchaseOrder.update({
      where: { id },
      data: updateData
    });
  }

  async updatePaymentStatus(id: string, paymentStatus: string) {
    return prisma.purchaseOrder.update({
      where: { id },
      data: { paymentStatus }
    });
  }

  async updateDeliveryStatus(id: string, deliveryStatus: string) {
    return prisma.purchaseOrder.update({
      where: { id },
      data: { deliveryStatus }
    });
  }

  async getDashboardMetrics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayPurchases = await prisma.purchaseOrder.aggregate({
      where: {
        createdAt: { gte: today },
        status: { in: ['APPROVED', 'PLACED', 'ORDERED', 'COMPLETED'] }
      },
      _sum: { totalAmount: true }
    });

    const monthlyPurchases = await prisma.purchaseOrder.aggregate({
      where: {
        status: { in: ['APPROVED', 'PLACED', 'ORDERED', 'COMPLETED'] }
      },
      _sum: { totalAmount: true }
    });

    const pendingPurchasesCount = await prisma.purchaseOrder.count({
      where: { status: { in: ['DRAFT', 'PENDING', 'PENDING_APPROVAL'] } }
    });

    return {
      todayPurchases: Number(todayPurchases._sum.totalAmount || 0),
      monthlyPurchases: Number(monthlyPurchases._sum.totalAmount || 0),
      pendingPurchasesCount
    };
  }

  async createInvoice(data: {
    invoiceNumber: string;
    purchaseOrderId: string;
    amount: number;
    paymentDate?: Date;
    status: string;
    fileAttachmentPath?: string;
  }) {
    return prisma.$transaction(async (tx: any) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber: data.invoiceNumber,
          purchaseOrderId: data.purchaseOrderId,
          amount: new Prisma.Decimal(data.amount),
          paymentDate: data.paymentDate,
          status: data.status,
          fileAttachmentPath: data.fileAttachmentPath
        }
      });

      if (data.status === 'PAID') {
        await tx.purchaseOrder.update({
          where: { id: data.purchaseOrderId },
          data: { paymentStatus: 'PAID' }
        });
      } else {
        await tx.purchaseOrder.update({
          where: { id: data.purchaseOrderId },
          data: { paymentStatus: 'PARTIAL' }
        });
      }

      return invoice;
    });
  }
}

export const purchaseRepository = new PurchaseRepository();
