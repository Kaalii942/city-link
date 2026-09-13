import { prisma, Product, Prisma } from '@eipms/database';

export interface ProductFilterParams {
  search?: string;
  brandId?: string;
  categoryId?: string;
  subCategoryId?: string;
  warehouseId?: string;
  status?: string;
  lowStockOnly?: boolean;
  skip?: number;
  take?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class ProductRepository {
  private buildWhereClause(params: ProductFilterParams) {
    const where: any = {};

    if (params.brandId) where.brandId = params.brandId;
    if (params.categoryId) where.categoryId = params.categoryId;
    if (params.subCategoryId) where.subCategoryId = params.subCategoryId;
    if (params.warehouseId) where.warehouseId = params.warehouseId;
    if (params.status) where.status = params.status;

    if (params.lowStockOnly) {
      // In MS SQL, we check if quantity is less than standard low stock threshold (e.g. 100) or check custom thresholds
      where.quantity = { lt: 100 };
    }

    if (params.search) {
      where.OR = [
        { name: { contains: params.search } },
        { partNumber: { contains: params.search } },
        { serialNumber: { contains: params.search } },
        { barcode: { contains: params.search } },
        { description: { contains: params.search } },
        { manufacturer: { contains: params.search } }
      ];
    }

    return where;
  }

  async findAndCount(params: ProductFilterParams) {
    const where = this.buildWhereClause(params);
    const skip = params.skip ?? 0;
    const take = params.take ?? 25;
    const sortBy = params.sortBy ?? 'createdAt';
    const sortOrder = params.sortOrder ?? 'desc';

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          brand: true,
          category: true,
          subCategory: true,
          supplier: true,
          warehouse: true,
          section: true,
          rack: true,
          shelf: true
        },
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder
        }
      }),
      prisma.product.count({ where })
    ]);

    return { products, total };
  }

  async findById(id: string) {
    return prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        subCategory: true,
        supplier: true,
        warehouse: true,
        section: true,
        rack: true,
        shelf: true
      }
    });
  }

  async findByPartNumber(partNumber: string) {
    return prisma.product.findUnique({
      where: { partNumber },
      include: { brand: true, category: true }
    });
  }

  async findByBarcode(barcode: string) {
    return prisma.product.findUnique({
      where: { barcode },
      include: { warehouse: true, brand: true, category: true }
    });
  }

  private sanitizeData(data: any) {
    const sanitized = { ...data };
    const fields = ['supplierId', 'brandId', 'categoryId', 'subCategoryId', 'warehouseId', 'sectionId', 'rackId', 'shelfId'];
    for (const f of fields) {
      if (sanitized[f] === '' || sanitized[f] === undefined) {
        sanitized[f] = null;
      }
    }
    return sanitized;
  }

  async create(data: any) {
    const sanitized = this.sanitizeData(data);
    return prisma.product.create({
      data: {
        ...sanitized,
        purchasePrice: new Prisma.Decimal(sanitized.purchasePrice),
        sellingPrice: new Prisma.Decimal(sanitized.sellingPrice)
      }
    });
  }

  async update(id: string, data: any) {
    const sanitized = this.sanitizeData(data);
    const updateData = { ...sanitized };
    if (sanitized.purchasePrice !== undefined) updateData.purchasePrice = new Prisma.Decimal(sanitized.purchasePrice);
    if (sanitized.sellingPrice !== undefined) updateData.sellingPrice = new Prisma.Decimal(sanitized.sellingPrice);

    return prisma.product.update({
      where: { id },
      data: updateData
    });
  }

  async updateStockQuantity(id: string, newQty: number, tx?: any) {
    const client = tx || prisma;
    return client.product.update({
      where: { id },
      data: { quantity: newQty }
    });
  }

  async delete(id: string) {
    return prisma.product.delete({
      where: { id }
    });
  }

  async deleteMany(ids: string[]) {
    return prisma.product.deleteMany({
      where: {
        id: { in: ids }
      }
    });
  }

  async getDashboardMetrics() {
    const totalProducts = await prisma.product.count({ where: { status: 'ACTIVE' } });
    
    // Sum inventory value
    const products = await prisma.product.findMany({
      select: {
        quantity: true,
        purchasePrice: true
      }
    });

    const inventoryValue = products.reduce((sum: number, prod: any) => {
      const price = Number(prod.purchasePrice);
      return sum + (prod.quantity * price);
    }, 0);

    const lowStockCount = await prisma.product.count({
      where: {
        quantity: { lt: 100 }, // threshold
        status: 'ACTIVE'
      }
    });

    return {
      totalProducts,
      inventoryValue,
      lowStockCount
    };
  }
}
export const productRepository = new ProductRepository();
