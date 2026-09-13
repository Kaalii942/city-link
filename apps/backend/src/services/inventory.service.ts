import { inventoryRepository } from '../repositories/inventory.repository.js';
import { productRepository } from '../repositories/product.repository.js';
import { prisma } from '@eipms/database';
import { logger } from '@eipms/utils';

export class InventoryService {
  async getMovements() {
    return inventoryRepository.findAllMovements();
  }

  async getProductMovements(productId: string) {
    return inventoryRepository.findMovementsByProduct(productId);
  }

  async adjustStock(data: {
    productId: string;
    type: 'STOCK_IN' | 'STOCK_OUT' | 'TRANSFER' | 'DAMAGE' | 'RETURN' | 'RESERVE';
    quantity: number;
    sourceWarehouseId?: string | null;
    destWarehouseId?: string | null;
    referenceNo?: string;
    remarks?: string;
    userId: string;
  }) {
    logger.info(`Stock adjustment requested: Product ${data.productId}, Type ${data.type}, Qty ${data.quantity}`);
    
    const product = await productRepository.findById(data.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    return prisma.$transaction(async (tx: any) => {
      let newQty = product.quantity;

      switch (data.type) {
        case 'STOCK_IN':
        case 'RETURN':
          newQty += data.quantity;
          break;
        
        case 'STOCK_OUT':
        case 'DAMAGE':
        case 'RESERVE':
          if (product.quantity < data.quantity) {
            throw new Error(`Insufficient stock available. Current stock: ${product.quantity}, Requested: ${data.quantity}`);
          }
          newQty -= data.quantity;
          break;

        case 'TRANSFER':
          if (product.quantity < data.quantity) {
            throw new Error(`Insufficient stock for transfer. Current stock: ${product.quantity}, Requested: ${data.quantity}`);
          }
          // The product remains in the warehouse hierarchy, but we can change the product's warehouseId
          if (data.destWarehouseId) {
            await tx.product.update({
              where: { id: product.id },
              data: { warehouseId: data.destWarehouseId }
            });
          }
          break;
        
        default:
          throw new Error('Invalid movement type');
      }

      // Update quantity if not a simple location transfer without quantity change
      if (data.type !== 'TRANSFER') {
        await productRepository.updateStockQuantity(product.id, newQty, tx);
      }

      // Log movement record
      const movement = await tx.stockMovement.create({
        data: {
          productId: product.id,
          type: data.type,
          quantity: data.quantity,
          sourceWarehouseId: data.sourceWarehouseId || product.warehouseId,
          destWarehouseId: data.destWarehouseId || null,
          referenceNo: data.referenceNo,
          remarks: data.remarks,
          createdById: data.userId
        }
      });

      logger.info(`Inventory adjustment complete. New quantity: ${newQty}`);
      return movement;
    });
  }
}
export const inventoryService = new InventoryService();
