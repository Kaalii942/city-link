import { prisma } from '@eipms/database';

export class WarehouseRepository {
  // Warehouses
  async findAll() {
    return prisma.warehouse.findMany({
      include: {
        sections: {
          include: {
            racks: {
              include: {
                shelves: true
              }
            }
          }
        }
      }
    });
  }

  async findById(id: string) {
    return prisma.warehouse.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            racks: {
              include: {
                shelves: true
              }
            }
          }
        }
      }
    });
  }

  async findByCode(code: string) {
    return prisma.warehouse.findUnique({
      where: { code }
    });
  }

  async create(data: { name: string; code: string; location: string }) {
    return prisma.warehouse.create({
      data
    });
  }

  async update(id: string, data: { name?: string; code?: string; location?: string }) {
    return prisma.warehouse.update({
      where: { id },
      data
    });
  }

  async delete(id: string) {
    return prisma.warehouse.delete({
      where: { id }
    });
  }

  // Sections
  async findSections(warehouseId: string) {
    return prisma.section.findMany({
      where: { warehouseId },
      include: { racks: true }
    });
  }

  async createSection(data: { name: string; warehouseId: string }) {
    return prisma.section.create({
      data
    });
  }

  async deleteSection(id: string) {
    return prisma.section.delete({
      where: { id }
    });
  }

  // Racks
  async findRacks(sectionId: string) {
    return prisma.rack.findMany({
      where: { sectionId },
      include: { shelves: true }
    });
  }

  async createRack(data: { name: string; sectionId: string }) {
    return prisma.rack.create({
      data: {
        name: data.name,
        sectionId: data.sectionId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  async deleteRack(id: string) {
    return prisma.rack.delete({
      where: { id }
    });
  }

  // Shelves
  async findShelves(rackId: string) {
    return prisma.shelf.findMany({
      where: { rackId }
    });
  }

  async createShelf(data: { name: string; rackId: string }) {
    return prisma.shelf.create({
      data: {
        name: data.name,
        rackId: data.rackId,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  async deleteShelf(id: string) {
    return prisma.shelf.delete({
      where: { id }
    });
  }
}
export const warehouseRepository = new WarehouseRepository();
