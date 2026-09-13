import { prisma } from '@eipms/database';

export class CategoryRepository {
  async findAll() {
    return prisma.category.findMany({
      include: {
        parent: true,
        children: true
      }
    });
  }

  async findById(id: string) {
    return prisma.category.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true
      }
    });
  }

  async findByName(name: string) {
    return prisma.category.findUnique({
      where: { name }
    });
  }

  async create(data: { name: string; description?: string; parentId?: string | null }) {
    return prisma.category.create({
      data: {
        name: data.name,
        description: data.description,
        parentId: data.parentId || null
      }
    });
  }

  async update(id: string, data: { name?: string; description?: string; parentId?: string | null }) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.parentId !== undefined) updateData.parentId = data.parentId || null;

    return prisma.category.update({
      where: { id },
      data: updateData
    });
  }

  async delete(id: string) {
    return prisma.category.delete({
      where: { id }
    });
  }
}
export const categoryRepository = new CategoryRepository();
