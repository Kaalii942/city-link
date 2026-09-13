import { prisma, StockMovement } from '@eipms/database';

export class InventoryRepository {
  async logMovement(data: {
    productId: string;
    type: string; // STOCK_IN, STOCK_OUT, TRANSFER, DAMAGE, RETURN, RESERVE
    quantity: number;
    sourceWarehouseId?: string | null;
    destWarehouseId?: string | null;
    referenceNo?: string;
    remarks?: string;
    createdById: string;
  }, tx?: any) {
    const client = tx || prisma;
    return client.stockMovement.create({
      data: {
        productId: data.productId,
        type: data.type,
        quantity: data.quantity,
        sourceWarehouseId: data.sourceWarehouseId || null,
        destWarehouseId: data.destWarehouseId || null,
        referenceNo: data.referenceNo,
        remarks: data.remarks,
        createdById: data.createdById
      }
    });
  }

  async findAllMovements() {
    return prisma.stockMovement.findMany({
      include: {
        product: {
          include: { brand: true, category: true }
        },
        sourceWarehouse: true,
        destWarehouse: true,
        creator: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findMovementsByProduct(productId: string) {
    return prisma.stockMovement.findMany({
      where: { productId },
      include: {
        sourceWarehouse: true,
        destWarehouse: true,
        creator: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}
export const inventoryRepository = new InventoryRepository();
