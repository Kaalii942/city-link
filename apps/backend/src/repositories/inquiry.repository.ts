import { prisma, Inquiry, InquiryItem } from '@eipms/database';
import { generateDocumentNumber } from '../utils/numbering.js';

export class InquiryRepository {
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
        { inquiryNumber: { contains: filters.search } },
        { companyName: { contains: filters.search } },
        { customerName: { contains: filters.search } },
        { subject: { contains: filters.search } }
      ];
    }

    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: true,
          quotations: {
            select: { id: true, quotationNumber: true, status: true }
          }
        }
      }),
      prisma.inquiry.count({ where })
    ]);

    return { inquiries, total };
  }

  async findById(id: string) {
    return prisma.inquiry.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        quotations: true
      }
    });
  }

  async create(data: any, createdById?: string) {
    return prisma.$transaction(async (tx: any) => {
      const inquiryNumber = await generateDocumentNumber('INQUIRY', tx);

      // Create Inquiry record
      const inquiry = await tx.inquiry.create({
        data: {
          inquiryNumber,
          inquiryDate: new Date(data.inquiryDate),
          customerName: data.customerName,
          companyName: data.companyName,
          departmentName: data.departmentName,
          phone: data.phone,
          email: data.email,
          address: data.address,
          referenceNumber: data.referenceNumber,
          subject: data.subject,
          remarks: data.remarks,
          status: 'PENDING',
          createdById
        }
      });

      // Create Inquiry items
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          // If productId is not provided, check if partNumber exists in Product catalog, else auto-save it!
          let productId = item.productId;
          if (!productId && item.partNumber) {
            const product = await tx.product.findUnique({
              where: { partNumber: item.partNumber }
            });
            if (product) {
              productId = product.id;
            }
          }

          await tx.inquiryItem.create({
            data: {
              inquiryId: inquiry.id,
              srNo: item.srNo,
              partNumber: item.partNumber,
              description: item.description,
              manufacturer: item.manufacturer,
              quantity: item.quantity,
              unit: item.unit || 'Pcs',
              remarks: item.remarks,
              productId
            }
          });
        }
      }

      return inquiry;
    });
  }

  async update(id: string, data: any) {
    return prisma.$transaction(async (tx: any) => {
      const updateData: any = {};
      if (data.inquiryDate) updateData.inquiryDate = new Date(data.inquiryDate);
      if (data.customerName) updateData.customerName = data.customerName;
      if (data.companyName) updateData.companyName = data.companyName;
      if (data.departmentName !== undefined) updateData.departmentName = data.departmentName;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.referenceNumber !== undefined) updateData.referenceNumber = data.referenceNumber;
      if (data.subject !== undefined) updateData.subject = data.subject;
      if (data.remarks !== undefined) updateData.remarks = data.remarks;
      if (data.status) updateData.status = data.status;

      const inquiry = await tx.inquiry.update({
        where: { id },
        data: updateData
      });

      if (data.items) {
        // Delete previous items
        await tx.inquiryItem.deleteMany({ where: { inquiryId: id } });

        // Add new items
        for (const item of data.items) {
          let productId = item.productId;
          if (!productId && item.partNumber) {
            const product = await tx.product.findUnique({
              where: { partNumber: item.partNumber }
            });
            if (product) {
              productId = product.id;
            }
          }

          await tx.inquiryItem.create({
            data: {
              inquiryId: id,
              srNo: item.srNo,
              partNumber: item.partNumber,
              description: item.description,
              manufacturer: item.manufacturer,
              quantity: item.quantity,
              unit: item.unit || 'Pcs',
              remarks: item.remarks,
              productId
            }
          });
        }
      }

      return inquiry;
    });
  }

  async delete(id: string) {
    return prisma.inquiry.delete({
      where: { id }
    });
  }
}

export const inquiryRepository = new InquiryRepository();
