import { prisma } from '@eipms/database';

export class SupplierRepository {
  async findAll() {
    return prisma.supplier.findMany({
      include: {
        _count: {
          select: { pos: true, products: true }
        }
      }
    });
  }

  async findById(id: string) {
    return prisma.supplier.findUnique({
      where: { id },
      include: {
        pos: true,
        products: true
      }
    });
  }

  async findByCompanyName(companyName: string) {
    return prisma.supplier.findUnique({
      where: { companyName }
    });
  }

  async create(data: any) {
    const bankDetailsStr = data.bankDetails ? JSON.stringify(data.bankDetails) : null;
    return prisma.supplier.create({
      data: {
        ...data,
        bankDetails: bankDetailsStr
      }
    });
  }

  async update(id: string, data: any) {
    const updateData = { ...data };
    if (data.bankDetails) {
      updateData.bankDetails = JSON.stringify(data.bankDetails);
    }
    return prisma.supplier.update({
      where: { id },
      data: updateData
    });
  }

  async delete(id: string) {
    return prisma.supplier.delete({
      where: { id }
    });
  }
}
export const supplierRepository = new SupplierRepository();
