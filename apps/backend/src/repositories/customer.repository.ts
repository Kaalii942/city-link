import { prisma } from '@eipms/database';

export class CustomerRepository {
  async findAll() {
    return prisma.customer.findMany();
  }

  async findById(id: string) {
    return prisma.customer.findUnique({
      where: { id }
    });
  }

  async findByCompanyName(companyName: string) {
    return prisma.customer.findFirst({
      where: { companyName }
    });
  }

  async create(data: any) {
    return prisma.customer.create({
      data
    });
  }

  async update(id: string, data: any) {
    return prisma.customer.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return prisma.customer.delete({
      where: { id }
    });
  }
}
export const customerRepository = new CustomerRepository();
