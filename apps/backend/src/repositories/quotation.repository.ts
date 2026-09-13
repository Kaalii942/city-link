import { prisma, Quotation, QuotationItem, Prisma } from '@eipms/database';
import { generateDocumentNumber } from '../utils/numbering.js';

export class QuotationRepository {
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
        { quotationNumber: { contains: filters.search } },
        { companyName: { contains: filters.search } },
        { contactPerson: { contains: filters.search } },
        { referenceNumber: { contains: filters.search } }
      ];
    }

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: true,
          inquiry: {
            select: { id: true, inquiryNumber: true }
          },
          salesInvoices: {
            select: { id: true, invoiceNumber: true, status: true }
          },
          deliveryChallans: {
            select: { id: true, challanNumber: true, status: true }
          }
        }
      }),
      prisma.quotation.count({ where })
    ]);

    return { quotations, total };
  }

  async findById(id: string) {
    return prisma.quotation.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true
          }
        },
        inquiry: true,
        salesInvoices: true,
        deliveryChallans: true
      }
    });
  }

  async create(data: any, preparedById?: string) {
    return prisma.$transaction(async (tx: any) => {
      const quotationNumber = await generateDocumentNumber('QUOTATION', tx);

      // Extract exchange rates
      const taxRate = new Prisma.Decimal(data.taxRate || 0);
      const discountRate = new Prisma.Decimal(data.discountRate || 0);
      const exchangeRate = new Prisma.Decimal(data.exchangeRate || 1.00);
      const rmbRate = new Prisma.Decimal(data.rmbRate || 38.50);
      const usdRate = new Prisma.Decimal(data.usdRate || 278.50);
      const displayCurrencies = data.displayCurrencies || 'PKR,RMB,USD';

      // Safe Date parsing
      const quotationDate = data.quotationDate && !isNaN(Date.parse(data.quotationDate))
        ? new Date(data.quotationDate)
        : new Date();
      const validityDate = data.validityDate && !isNaN(Date.parse(data.validityDate))
        ? new Date(data.validityDate)
        : null;
      const tenderDate = data.tenderDate && !isNaN(Date.parse(data.tenderDate))
        ? new Date(data.tenderDate)
        : null;

      let subTotalDecimal = new Prisma.Decimal(0);
      const itemsToCreate = [];
      const createdProductsCache = new Map<string, string>();

      for (const item of data.items) {
        let productId = item.productId;
        if (!productId && item.partNumber) {
          const trimmedPartNumber = String(item.partNumber).trim();
          if (createdProductsCache.has(trimmedPartNumber)) {
            productId = createdProductsCache.get(trimmedPartNumber);
          } else {
            const product = await tx.product.findUnique({
              where: { partNumber: trimmedPartNumber }
            });
            if (product) {
              productId = product.id;
              createdProductsCache.set(trimmedPartNumber, product.id);
            } else {
              const newProd = await tx.product.create({
                data: {
                  name: item.description || trimmedPartNumber,
                  partNumber: trimmedPartNumber,
                  description: item.description,
                  manufacturer: item.manufacturer,
                  purchasePrice: new Prisma.Decimal(item.unitPriceRmb || item.zonePriceRmb || 0),
                  sellingPrice: new Prisma.Decimal(item.unitPricePkr || item.finalUnitPrice || 0),
                  unit: item.unit || 'Pcs',
                  quantity: 0,
                  status: 'ACTIVE'
                }
              });
              productId = newProd.id;
              createdProductsCache.set(trimmedPartNumber, newProd.id);
            }
          }
        }

        const quantity = Math.max(1, Number(item.quantity) || 1);
        
        // PKR Unit Price (Primary Base)
        const unitPricePkrVal = Number(item.unitPricePkr !== undefined ? item.unitPricePkr : (item.finalUnitPrice !== undefined ? item.finalUnitPrice : item.unitPrice || 0));
        const unitPricePkr = new Prisma.Decimal(unitPricePkrVal);
        const totalPricePkr = unitPricePkr.mul(quantity);

        // RMB Price (Zone Price RMB or calculated using rmbRate)
        const rmbRateNum = rmbRate.toNumber() > 0 ? rmbRate.toNumber() : 38.50;
        const unitPriceRmbVal = item.unitPriceRmb !== undefined && Number(item.unitPriceRmb) !== 0 
          ? Number(item.unitPriceRmb) 
          : (item.zonePriceRmb ? Number(item.zonePriceRmb) : (unitPricePkrVal > 0 ? Number((unitPricePkrVal / rmbRateNum).toFixed(4)) : 0));
        const unitPriceRmb = new Prisma.Decimal(unitPriceRmbVal);
        const totalPriceRmb = unitPriceRmb.mul(quantity);

        // USD Price (calculated using usdRate)
        const usdRateNum = usdRate.toNumber() > 0 ? usdRate.toNumber() : 278.50;
        const unitPriceUsdVal = item.unitPriceUsd !== undefined && Number(item.unitPriceUsd) !== 0 
          ? Number(item.unitPriceUsd) 
          : (unitPricePkrVal > 0 ? Number((unitPricePkrVal / usdRateNum).toFixed(4)) : 0);
        const unitPriceUsd = new Prisma.Decimal(unitPriceUsdVal);
        const totalPriceUsd = unitPriceUsd.mul(quantity);

        // Internet Price
        const internetUnitPriceVal = Number(item.internetUnitPrice !== undefined ? item.internetUnitPrice : (item.internetPrice || 0));
        const internetUnitPrice = new Prisma.Decimal(internetUnitPriceVal);
        const internetTotalPrice = internetUnitPrice.mul(quantity);

        subTotalDecimal = subTotalDecimal.add(totalPricePkr);

        itemsToCreate.push({
          srNo: item.srNo,
          partNumber: item.partNumber,
          description: item.description,
          manufacturer: item.manufacturer,
          quantity,
          unit: item.unit || 'Pcs',
          zonePriceRmb: unitPriceRmb,
          profitRatio: new Prisma.Decimal(item.profitRatio || 0),
          unitPrice: unitPricePkr,
          totalPrice: totalPricePkr,
          internetPrice: internetUnitPrice,
          finalUnitPrice: unitPricePkr,
          finalTotalPrice: totalPricePkr,
          unitPricePkr,
          totalPricePkr,
          unitPriceRmb,
          totalPriceRmb,
          unitPriceUsd,
          totalPriceUsd,
          zoneCurrency: item.zoneCurrency || 'RMB',
          internetCurrency: item.internetCurrency || 'RMB',
          internetUnitPrice,
          internetTotalPrice,
          productId
        });
      }

      const discountAmount = subTotalDecimal.mul(discountRate.div(100));
      const amountAfterDiscount = subTotalDecimal.sub(discountAmount);
      const taxAmount = amountAfterDiscount.mul(taxRate.div(100));
      const totalAmountDecimal = amountAfterDiscount.add(taxAmount);

      const quotation = await tx.quotation.create({
        data: {
          quotationNumber,
          quotationDate,
          validityDate,
          inquiryId: data.inquiryId || null,
          customerId: data.customerId || null,
          companyName: data.companyName,
          departmentName: data.departmentName,
          contactPerson: data.contactPerson,
          email: data.email,
          phone: data.phone,
          address: data.address,
          referenceNumber: data.referenceNumber,
          subject: data.subject || 'QUOTATION FOR ELECTRONIC COMPONENTS',
          tenderNumber: data.tenderNumber || null,
          tenderDate,
          ntn: data.ntn || null,
          strn: data.strn || null,
          signatoryName: data.signatoryName || 'Saqib Shafique',
          signatoryPhone: data.signatoryPhone || '0321-8507444',
          currency: data.currency || 'PKR',
          exchangeRate,
          rmbRate,
          usdRate,
          displayCurrencies,
          paymentTerms: data.paymentTerms || '100% after delivery',
          deliveryTime: data.deliveryTime || '08-12 Weeks',
          warranty: data.warranty || '01 year standard warranty',
          remarks: data.remarks,
          status: 'DRAFT',
          taxRate,
          taxAmount,
          discountRate,
          discountAmount,
          subTotal: subTotalDecimal,
          totalAmount: totalAmountDecimal,
          preparedById
        }
      });

      // Write items
      for (const item of itemsToCreate) {
        await tx.quotationItem.create({
          data: {
            quotationId: quotation.id,
            ...item
          }
        });
      }

      // 1. Generate Sales Tax Invoice automatically
      const invoiceNumber = await generateDocumentNumber('INVOICE', tx);
      const challanNumber = await generateDocumentNumber('CHALLAN', tx);
      const invoiceTaxRate = new Prisma.Decimal(18.00);
      const invoiceTaxAmount = subTotalDecimal.mul(invoiceTaxRate.div(100));
      const invoiceTotalAmount = subTotalDecimal.add(invoiceTaxAmount);

      const invoice = await tx.salesTaxInvoice.create({
        data: {
          invoiceNumber,
          invoiceDate: new Date(),
          quotationId: quotation.id,
          companyName: quotation.companyName,
          departmentName: quotation.departmentName,
          contactPerson: quotation.contactPerson,
          email: quotation.email,
          phone: quotation.phone,
          address: quotation.address,
          ntn: data.ntn || null,
          strn: data.strn || null,
          poNo: data.poNo || data.referenceNumber || null,
          crNo: data.crNo || null,
          dcNo: challanNumber,
          taxRate: invoiceTaxRate,
          taxAmount: invoiceTaxAmount,
          subTotal: subTotalDecimal,
          totalAmount: invoiceTotalAmount,
          status: 'PENDING',
          remarks: 'Automatically generated from Quotation'
        }
      });

      // Write Invoice items
      for (const item of itemsToCreate) {
        const amtExcl = item.finalUnitPrice.mul(item.quantity);
        const amtTax = amtExcl.mul(invoiceTaxRate.div(100));
        const amtIncl = amtExcl.add(amtTax);

        await tx.salesTaxInvoiceItem.create({
          data: {
            invoiceId: invoice.id,
            srNo: item.srNo,
            partNumber: item.partNumber,
            description: item.description,
            manufacturer: item.manufacturer,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.finalUnitPrice,
            amountExcludingTax: amtExcl,
            taxRate: invoiceTaxRate,
            taxAmount: amtTax,
            amountIncludingTax: amtIncl
          }
        });
      }

      // 2. Generate Delivery Challan automatically
      const challan = await tx.deliveryChallan.create({
        data: {
          challanNumber,
          dispatchDate: new Date(),
          quotationId: quotation.id,
          companyName: quotation.companyName,
          departmentName: quotation.departmentName,
          contactPerson: quotation.contactPerson,
          email: quotation.email,
          phone: quotation.phone,
          address: quotation.address,
          poNo: data.poNo || data.referenceNumber || null,
          crNo: data.crNo || null,
          invoiceReference: invoiceNumber,
          status: 'PENDING',
          remarks: 'Automatically generated from Quotation'
        }
      });

      // Write Challan items
      for (const item of itemsToCreate) {
        await tx.deliveryChallanItem.create({
          data: {
            challanId: challan.id,
            srNo: item.srNo,
            partNumber: item.partNumber,
            description: item.description,
            manufacturer: item.manufacturer,
            quantity: item.quantity,
            unit: item.unit,
            remarks: 'Automatically generated'
          }
        });
      }

      // If inquiryId is specified, update Inquiry status to "QUOTED"
      if (data.inquiryId) {
        await tx.inquiry.update({
          where: { id: data.inquiryId },
          data: { status: 'QUOTED' }
        });
      }

      return quotation;
    });
  }

  async update(id: string, data: any, approvedById?: string) {
    return prisma.$transaction(async (tx: any) => {
      const updateData: any = {};
      if (data.quotationDate) updateData.quotationDate = new Date(data.quotationDate);
      if (data.validityDate) updateData.validityDate = new Date(data.validityDate);
      if (data.companyName) updateData.companyName = data.companyName;
      if (data.departmentName !== undefined) updateData.departmentName = data.departmentName;
      if (data.contactPerson !== undefined) updateData.contactPerson = data.contactPerson;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.referenceNumber !== undefined) updateData.referenceNumber = data.referenceNumber;
      if (data.subject !== undefined) updateData.subject = data.subject;
      if (data.tenderNumber !== undefined) updateData.tenderNumber = data.tenderNumber;
      if (data.tenderDate !== undefined) updateData.tenderDate = data.tenderDate ? new Date(data.tenderDate) : null;
      if (data.ntn !== undefined) updateData.ntn = data.ntn;
      if (data.strn !== undefined) updateData.strn = data.strn;
      if (data.signatoryName !== undefined) updateData.signatoryName = data.signatoryName;
      if (data.signatoryPhone !== undefined) updateData.signatoryPhone = data.signatoryPhone;
      if (data.currency) updateData.currency = data.currency;
      if (data.exchangeRate !== undefined) updateData.exchangeRate = new Prisma.Decimal(data.exchangeRate);
      if (data.rmbRate !== undefined) updateData.rmbRate = new Prisma.Decimal(data.rmbRate);
      if (data.usdRate !== undefined) updateData.usdRate = new Prisma.Decimal(data.usdRate);
      if (data.displayCurrencies !== undefined) updateData.displayCurrencies = data.displayCurrencies;
      if (data.paymentTerms !== undefined) updateData.paymentTerms = data.paymentTerms;
      if (data.deliveryTime !== undefined) updateData.deliveryTime = data.deliveryTime;
      if (data.warranty !== undefined) updateData.warranty = data.warranty;
      if (data.remarks !== undefined) updateData.remarks = data.remarks;
      if (data.status) updateData.status = data.status;
      if (approvedById) updateData.approvedById = approvedById;

      const taxRate = new Prisma.Decimal(data.taxRate !== undefined ? data.taxRate : 0);
      const discountRate = new Prisma.Decimal(data.discountRate !== undefined ? data.discountRate : 0);
      const exchangeRate = new Prisma.Decimal(data.exchangeRate !== undefined ? data.exchangeRate : 1.00);
      const rmbRate = new Prisma.Decimal(data.rmbRate !== undefined ? data.rmbRate : 38.50);
      const usdRate = new Prisma.Decimal(data.usdRate !== undefined ? data.usdRate : 278.50);

      let subTotalDecimal = new Prisma.Decimal(0);
      const itemsToUpdateOrUpdate = [];
      const createdProductsCache = new Map<string, string>();

      if (data.items) {
        for (const item of data.items) {
          let productId = item.productId;
          if (!productId && item.partNumber) {
            const trimmedPartNumber = String(item.partNumber).trim();
            if (createdProductsCache.has(trimmedPartNumber)) {
              productId = createdProductsCache.get(trimmedPartNumber);
            } else {
              const product = await tx.product.findUnique({
                where: { partNumber: trimmedPartNumber }
              });
              if (product) {
                productId = product.id;
                createdProductsCache.set(trimmedPartNumber, product.id);
              } else {
                const newProd = await tx.product.create({
                  data: {
                    name: item.description || trimmedPartNumber,
                    partNumber: trimmedPartNumber,
                    description: item.description,
                    manufacturer: item.manufacturer,
                    purchasePrice: new Prisma.Decimal(item.unitPriceRmb || item.zonePriceRmb || 0),
                    sellingPrice: new Prisma.Decimal(item.unitPricePkr || item.finalUnitPrice || 0),
                    unit: item.unit || 'Pcs',
                    quantity: 0,
                    status: 'ACTIVE'
                  }
                });
                productId = newProd.id;
                createdProductsCache.set(trimmedPartNumber, newProd.id);
              }
            }
          }

          const quantity = Math.max(1, Number(item.quantity) || 1);
          
          // PKR Unit Price
          const unitPricePkrVal = Number(item.unitPricePkr !== undefined ? item.unitPricePkr : (item.finalUnitPrice !== undefined ? item.finalUnitPrice : item.unitPrice || 0));
          const unitPricePkr = new Prisma.Decimal(unitPricePkrVal);
          const totalPricePkr = unitPricePkr.mul(quantity);

          // RMB Price
          const rmbRateNum = rmbRate.toNumber() > 0 ? rmbRate.toNumber() : 38.50;
          const unitPriceRmbVal = item.unitPriceRmb !== undefined && Number(item.unitPriceRmb) !== 0 
            ? Number(item.unitPriceRmb) 
            : (item.zonePriceRmb ? Number(item.zonePriceRmb) : (unitPricePkrVal > 0 ? Number((unitPricePkrVal / rmbRateNum).toFixed(4)) : 0));
          const unitPriceRmb = new Prisma.Decimal(unitPriceRmbVal);
          const totalPriceRmb = unitPriceRmb.mul(quantity);

          // USD Price
          const usdRateNum = usdRate.toNumber() > 0 ? usdRate.toNumber() : 278.50;
          const unitPriceUsdVal = item.unitPriceUsd !== undefined && Number(item.unitPriceUsd) !== 0 
            ? Number(item.unitPriceUsd) 
            : (unitPricePkrVal > 0 ? Number((unitPricePkrVal / usdRateNum).toFixed(4)) : 0);
          const unitPriceUsd = new Prisma.Decimal(unitPriceUsdVal);
          const totalPriceUsd = unitPriceUsd.mul(quantity);

          // Internet Price
          const internetUnitPriceVal = Number(item.internetUnitPrice !== undefined ? item.internetUnitPrice : (item.internetPrice || 0));
          const internetUnitPrice = new Prisma.Decimal(internetUnitPriceVal);
          const internetTotalPrice = internetUnitPrice.mul(quantity);

          subTotalDecimal = subTotalDecimal.add(totalPricePkr);

          itemsToUpdateOrUpdate.push({
            srNo: item.srNo,
            partNumber: item.partNumber,
            description: item.description,
            manufacturer: item.manufacturer,
            quantity,
            unit: item.unit || 'Pcs',
            zonePriceRmb: unitPriceRmb,
            profitRatio: new Prisma.Decimal(item.profitRatio || 0),
            unitPrice: unitPricePkr,
            totalPrice: totalPricePkr,
            internetPrice: internetUnitPrice,
            finalUnitPrice: unitPricePkr,
            finalTotalPrice: totalPricePkr,
            unitPricePkr,
            totalPricePkr,
            unitPriceRmb,
            totalPriceRmb,
            unitPriceUsd,
            totalPriceUsd,
            zoneCurrency: item.zoneCurrency || 'RMB',
            internetCurrency: item.internetCurrency || 'RMB',
            internetUnitPrice,
            internetTotalPrice,
            productId
          });
        }

        const discountAmount = subTotalDecimal.mul(discountRate.div(100));
        const amountAfterDiscount = subTotalDecimal.sub(discountAmount);
        const taxAmount = amountAfterDiscount.mul(taxRate.div(100));
        const totalAmountDecimal = amountAfterDiscount.add(taxAmount);

        updateData.taxRate = taxRate;
        updateData.taxAmount = taxAmount;
        updateData.discountRate = discountRate;
        updateData.discountAmount = discountAmount;
        updateData.subTotal = subTotalDecimal;
        updateData.totalAmount = totalAmountDecimal;
      }

      const quotation = await tx.quotation.update({
        where: { id },
        data: updateData
      });

      if (data.items) {
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
        for (const item of itemsToUpdateOrUpdate) {
          await tx.quotationItem.create({
            data: {
              quotationId: id,
              ...item
            }
          });
        }
      }

      return quotation;
    });
  }

  async delete(id: string) {
    return prisma.quotation.delete({
      where: { id }
    });
  }
}

export const quotationRepository = new QuotationRepository();
