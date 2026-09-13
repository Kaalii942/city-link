import { prisma, SalesTaxInvoice, SalesTaxInvoiceItem, Prisma } from '@eipms/database';
import { generateDocumentNumber } from '../utils/numbering.js';

export class InvoiceRepository {
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
        { invoiceNumber: { contains: filters.search } },
        { companyName: { contains: filters.search } },
        { contactPerson: { contains: filters.search } },
        { poNo: { contains: filters.search } }
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.salesTaxInvoice.findMany({
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
      prisma.salesTaxInvoice.count({ where })
    ]);

    return { invoices, total };
  }

  async findById(id: string) {
    return prisma.salesTaxInvoice.findUnique({
      where: { id },
      include: {
        items: true,
        quotation: true
      }
    });
  }

  async create(data: any) {
    return prisma.$transaction(async (tx: any) => {
      const invoiceNumber = await generateDocumentNumber('INVOICE', tx);

      // Calculations
      const taxRate = new Prisma.Decimal(data.taxRate !== undefined ? data.taxRate : 18.00);
      let subTotalDecimal = new Prisma.Decimal(0);
      const itemsToCreate = [];

      for (const item of data.items) {
        const quantity = item.quantity;
        const unitPrice = new Prisma.Decimal(item.unitPrice || 0);
        const amountExcludingTax = unitPrice.mul(quantity);
        const itemTaxRate = taxRate;
        const taxAmount = amountExcludingTax.mul(itemTaxRate.div(100));
        const amountIncludingTax = amountExcludingTax.add(taxAmount);

        subTotalDecimal = subTotalDecimal.add(amountExcludingTax);

        itemsToCreate.push({
          srNo: item.srNo,
          partNumber: item.partNumber,
          description: item.description,
          manufacturer: item.manufacturer,
          quantity,
          unit: item.unit || 'Pcs',
          unitPrice,
          amountExcludingTax,
          taxRate: itemTaxRate,
          taxAmount,
          amountIncludingTax
        });
      }

      const totalTaxAmount = subTotalDecimal.mul(taxRate.div(100));
      const totalAmountDecimal = subTotalDecimal.add(totalTaxAmount);

      const invoice = await tx.salesTaxInvoice.create({
        data: {
          invoiceNumber,
          invoiceDate: new Date(data.invoiceDate),
          quotationId: data.quotationId || null,
          companyName: data.companyName,
          departmentName: data.departmentName,
          contactPerson: data.contactPerson,
          email: data.email,
          phone: data.phone,
          address: data.address,
          ntn: data.ntn,
          strn: data.strn,
          poNo: data.poNo,
          crNo: data.crNo,
          dcNo: data.dcNo,
          currency: data.currency || 'PKR',
          exchangeRate: new Prisma.Decimal(data.exchangeRate || 1.00),
          taxRate,
          taxAmount: totalTaxAmount,
          subTotal: subTotalDecimal,
          totalAmount: totalAmountDecimal,
          status: 'PENDING',
          remarks: data.remarks
        }
      });

      // Write items
      for (const item of itemsToCreate) {
        await tx.salesTaxInvoiceItem.create({
          data: {
            invoiceId: invoice.id,
            ...item
          }
        });
      }

      return invoice;
    });
  }

  async update(id: string, data: any) {
    return prisma.$transaction(async (tx: any) => {
      const updateData: any = {};
      if (data.invoiceDate) updateData.invoiceDate = new Date(data.invoiceDate);
      if (data.companyName) updateData.companyName = data.companyName;
      if (data.departmentName !== undefined) updateData.departmentName = data.departmentName;
      if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.ntn !== undefined) updateData.ntn = data.ntn;
      if (data.strn !== undefined) updateData.strn = data.strn;
      if (data.poNo !== undefined) updateData.poNo = data.poNo;
      if (data.crNo !== undefined) updateData.crNo = data.crNo;
      if (data.dcNo !== undefined) updateData.dcNo = data.dcNo;
      if (data.currency) updateData.currency = data.currency;
      if (data.exchangeRate !== undefined) updateData.exchangeRate = new Prisma.Decimal(data.exchangeRate);
      if (data.status) updateData.status = data.status;
      if (data.remarks !== undefined) updateData.remarks = data.remarks;

      const invoice = await tx.salesTaxInvoice.update({
        where: { id },
        data: updateData
      });

      return invoice;
    });
  }

  async delete(id: string) {
    return prisma.salesTaxInvoice.delete({
      where: { id }
    });
  }
}

export const invoiceRepository = new InvoiceRepository();
