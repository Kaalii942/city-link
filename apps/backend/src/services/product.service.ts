import { productRepository, ProductFilterParams } from '../repositories/product.repository.js';
import { categoryRepository } from '../repositories/category.repository.js';
import { brandRepository } from '../repositories/brand.repository.js';
import { prisma } from '@eipms/database';
import { logger } from '@eipms/utils';

export class ProductService {
  async getProducts(params: ProductFilterParams) {
    return productRepository.findAndCount(params);
  }

  async getProduct(id: string) {
    const product = await productRepository.findById(id);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  async createProduct(data: any, userId: string) {
    // Check duplicate part number
    const existing = await productRepository.findByPartNumber(data.partNumber);
    if (existing) {
      throw new Error(`Product with part number [${data.partNumber}] already exists.`);
    }

    const product = await productRepository.create(data);
    logger.info(`Product created: ${product.name} (Part No: ${product.partNumber})`);
    return product;
  }

  async updateProduct(id: string, data: any, userId: string) {
    // Verify product exists
    await this.getProduct(id);

    if (data.partNumber) {
      const existing = await productRepository.findByPartNumber(data.partNumber);
      if (existing && existing.id !== id) {
        throw new Error(`Part number [${data.partNumber}] is already assigned to another product.`);
      }
    }

    const updated = await productRepository.update(id, data);
    logger.info(`Product updated: ${updated.name}`);
    return updated;
  }

  async deleteProduct(id: string, userId: string) {
    await this.getProduct(id);
    await productRepository.delete(id);
    logger.info(`Product deleted with ID: ${id}`);
  }

  async deleteProductsBulk(ids: string[], userId: string) {
    await productRepository.deleteMany(ids);
    logger.info(`Bulk products deleted. Count: ${ids.length}`);
  }

  async importProducts(rows: any[], userId: string) {
    logger.info(`Starting bulk import of ${rows.length} products`);
    let importedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Run in transaction or series to prevent partial failures or log specific row issues
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        if (!row.name || !row.partNumber || row.purchasePrice === undefined || row.sellingPrice === undefined) {
          throw new Error(`Row ${i + 1}: Missing required fields (name, partNumber, purchasePrice, sellingPrice)`);
        }

        // Check if brand exists or create it
        let brandId = null;
        if (row.brandName) {
          const brand = await brandRepository.findByName(row.brandName);
          if (brand) {
            brandId = brand.id;
          } else {
            const newBrand = await brandRepository.create({ name: row.brandName });
            brandId = newBrand.id;
          }
        }

        // Check if category exists or create it
        let categoryId = null;
        if (row.categoryName) {
          const category = await categoryRepository.findByName(row.categoryName);
          if (category) {
            categoryId = category.id;
          } else {
            const newCat = await categoryRepository.create({ name: row.categoryName });
            categoryId = newCat.id;
          }
        }

        // Insert
        await this.createProduct({
          name: row.name,
          partNumber: row.partNumber,
          serialNumber: row.serialNumber || null,
          description: row.description || null,
          brandId,
          categoryId,
          purchasePrice: Number(row.purchasePrice),
          sellingPrice: Number(row.sellingPrice),
          quantity: Number(row.quantity || 0),
          unit: row.unit || 'Pcs',
          countryOfOrigin: row.countryOfOrigin || null,
          manufacturer: row.manufacturer || null,
          remarks: row.remarks || null,
          status: 'ACTIVE'
        }, userId);

        importedCount++;
      } catch (err) {
        errorCount++;
        errors.push(`Row ${i + 1}: ${(err as Error).message}`);
      }
    }

    return {
      success: true,
      importedCount,
      errorCount,
      errors
    };
  }
}
export const productService = new ProductService();
