import { prisma } from '@eipms/database';

export class BrandRepository {
  async findAll() {
    return prisma.brand.findMany();
  }

  async findById(id: string) {
    return prisma.brand.findUnique({
      where: { id }
    });
  }

  async findByName(name: string) {
    return prisma.brand.findUnique({
      where: { name }
    });
  }

  async create(data: { name: string; description?: string }) {
    return prisma.brand.create({
      data
    });
  }

  async update(id: string, data: { name?: string; description?: string }) {
    return prisma.brand.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return prisma.brand.delete({
      where: { id }
    });
  }
}
export const brandRepository = new BrandRepository();
