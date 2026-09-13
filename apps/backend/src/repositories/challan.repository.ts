import { prisma, DeliveryChallan, DeliveryChallanItem, Prisma } from '@eipms/database';
import { generateDocumentNumber } from '../utils/numbering.js';

export class ChallanRepository {
  async findAll(filters: { status?: string; search?: string; page?: number; limit?: number }) {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.search) {
      where.OR = [
        { challanNumber: { contains: filters.search } },
        { companyName: { contains: filters.search } },
        { contactPerson: { contains: filters.search } },
        { vehicleNumber: { contains: filters.search } },
        { driverName: { contains: filters.search } }
      ];
    }

    const [challans, total] = await Promise.all([
      prisma.deliveryChallan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: true,
          quotation: {
            select: { id: true, quotationNumber: true }
          }
        }
      }),
      prisma.deliveryChallan.count({ where })
    ]);

    return { challans, total };
  }

  async findById(id: string) {
    return prisma.deliveryChallan.findUnique({
      where: { id },
      include: {
        items: true,
        quotation: true
      }
    });
  }

  async create(data: any, createdById?: string) {
    return prisma.$transaction(async (tx: any) => {
      const challanNumber = await generateDocumentNumber('CHALLAN', tx);

      const status = data.status || 'PENDING';

      const challan = await tx.deliveryChallan.create({
        data: {
          challanNumber,
          dispatchDate: new Date(data.dispatchDate),
          quotationId: data.quotationId || null,
          companyName: data.companyName,
          departmentName: data.departmentName,
          contactPerson: data.contactPerson,
          email: data.email,
          phone: data.phone,
          address: data.address,
          poNo: data.poNo || null,
          crNo: data.crNo || null,
          invoiceReference: data.invoiceReference,
          vehicleNumber: data.vehicleNumber,
          driverName: data.driverName,
          receiver: data.receiver,
          currency: data.currency || 'PKR',
          exchangeRate: new Prisma.Decimal(data.exchangeRate || 1.00),
          status,
          remarks: data.remarks
        }
      });

      // Write items
      for (const item of data.items) {
        await tx.deliveryChallanItem.create({
          data: {
            challanId: challan.id,
            srNo: item.srNo,
            partNumber: item.partNumber,
            description: item.description,
            manufacturer: item.manufacturer,
            quantity: item.quantity,
            unit: item.unit || 'Pcs',
            remarks: item.remarks
          }
        });

        // Deduct inventory immediately if dispatched/delivered
        if (status === 'DISPATCHED' || status === 'DELIVERED') {
          await this._deductStock(tx, item.partNumber, item.quantity, challanNumber, createdById);
        }
      }

      return challan;
    });
  }

  async update(id: string, data: any, createdById?: string) {
    return prisma.$transaction(async (tx: any) => {
      const oldChallan = await tx.deliveryChallan.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!oldChallan) {
        throw new Error('Delivery Challan not found');
      }

      const updateData: any = {};
      if (data.dispatchDate) updateData.dispatchDate = new Date(data.dispatchDate);
      if (data.companyName) updateData.companyName = data.companyName;
      if (data.departmentName !== undefined) updateData.departmentName = data.departmentName;
      if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.poNo !== undefined) updateData.poNo = data.poNo;
      if (data.crNo !== undefined) updateData.crNo = data.crNo;
      if (data.invoiceReference !== undefined) updateData.invoiceReference = data.invoiceReference;
      if (data.vehicleNumber !== undefined) updateData.vehicleNumber = data.vehicleNumber;
      if (data.driverName !== undefined) updateData.driverName = data.driverName;
      if (data.receiver !== undefined) updateData.receiver = data.receiver;
      if (data.currency) updateData.currency = data.currency;
      if (data.exchangeRate !== undefined) updateData.exchangeRate = new Prisma.Decimal(data.exchangeRate);
      if (data.status) updateData.status = data.status;
      if (data.remarks !== undefined) updateData.remarks = data.remarks;

      const updatedChallan = await tx.deliveryChallan.update({
        where: { id },
        data: updateData
      });

      // Deduct inventory if transitioning to DISPATCHED or DELIVERED from PENDING
      if (
        (data.status === 'DISPATCHED' || data.status === 'DELIVERED') &&
        oldChallan.status === 'PENDING'
      ) {
        for (const item of oldChallan.items) {
          await this._deductStock(tx, item.partNumber, item.quantity, oldChallan.challanNumber, createdById);
        }
      }

      return updatedChallan;
    });
  }

  async delete(id: string) {
    return prisma.deliveryChallan.delete({
      where: { id }
    });
  }

  // Stock deduction helper inside transactions
  async _deductStock(tx: any, partNumber: string, quantity: number, referenceNo: string, createdById?: string) {
    const product = await tx.product.findUnique({
      where: { partNumber }
    });

    if (product) {
      // 1. Deduct Product stock quantity
      await tx.product.update({
        where: { id: product.id },
        data: {
          quantity: {
            decrement: quantity
          }
        }
      });

      // 2. Log StockMovement
      await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: 'STOCK_OUT',
          quantity,
          referenceNo,
          remarks: 'Automatic stock deduction via Delivery Challan dispatch.',
          createdById: createdById || 'system-automatic-action'
        }
      });
    }
  }
}

export const challanRepository = new ChallanRepository();
