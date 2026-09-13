import { z } from 'zod';

// ============================================================================
// AUTHENTICATION SCHEMA & TYPES
// ============================================================================
export const LoginSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional()
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const CreateUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  roleIds: z.array(z.string()).min(1, 'At least one role is required')
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  roleIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional()
});

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

// ============================================================================
// PRODUCT, CATEGORY & BRAND SCHEMAS
// ============================================================================
export const ProductSchema = z.object({
  name: z.string().min(2, 'Product name is required'),
  partNumber: z.string().min(2, 'Part number is required'),
  serialNumber: z.string().optional(),
  description: z.string().optional(),
  brandId: z.string().uuid('Invalid Brand ID').optional().nullable(),
  categoryId: z.string().uuid('Invalid Category ID').optional().nullable(),
  subCategoryId: z.string().uuid('Invalid Sub-Category ID').optional().nullable(),
  supplierId: z.string().uuid('Invalid Supplier ID').optional().nullable(),
  countryOfOrigin: z.string().optional(),
  manufacturer: z.string().optional(),
  purchasePrice: z.number().positive('Purchase price must be positive'),
  sellingPrice: z.number().positive('Selling price must be positive'),
  unit: z.string().default('Pcs'),
  quantity: z.number().int().nonnegative('Quantity cannot be negative').default(0),
  warehouseId: z.string().uuid('Invalid Warehouse ID').optional().nullable(),
  sectionId: z.string().uuid('Invalid Section ID').optional().nullable(),
  rackId: z.string().uuid('Invalid Rack ID').optional().nullable(),
  shelfId: z.string().uuid('Invalid Shelf ID').optional().nullable(),
  barcode: z.string().optional(),
  qrCode: z.string().optional(),
  imagePath: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'OUT_OF_STOCK']).default('ACTIVE'),
  remarks: z.string().optional()
});

export type ProductInput = z.infer<typeof ProductSchema>;

export const CategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  description: z.string().optional(),
  parentId: z.string().uuid('Invalid parent ID').optional().nullable()
});

export type CategoryInput = z.infer<typeof CategorySchema>;

export const BrandSchema = z.object({
  name: z.string().min(2, 'Brand name must be at least 2 characters'),
  description: z.string().optional()
});

export type BrandInput = z.infer<typeof BrandSchema>;

// ============================================================================
// SUPPLIER & CUSTOMER SCHEMAS
// ============================================================================
export const SupplierSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  contactName: z.string().min(2, 'Contact person name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Phone number is required'),
  address: z.string().min(5, 'Full address is required'),
  country: z.string().min(2, 'Country is required'),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  ntn: z.string().optional(),
  gst: z.string().optional(),
  bankDetails: z.object({
    bankName: z.string(),
    accountNo: z.string(),
    iban: z.string().optional()
  }).optional()
});

export type SupplierInput = z.infer<typeof SupplierSchema>;

export const CustomerSchema = z.object({
  companyName: z.string().min(2, 'Company name is required'),
  departmentName: z.string().optional(),
  contactPerson: z.string().min(2, 'Contact person name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(5, 'Phone number is required'),
  address: z.string().min(5, 'Full address is required'),
  projects: z.string().optional()
});

export type CustomerInput = z.infer<typeof CustomerSchema>;

// ============================================================================
// PURCHASE ORDER & INVOICE SCHEMAS
// ============================================================================
export const PurchaseItemSchema = z.object({
  productId: z.string().uuid('Invalid Product ID'),
  quantity: z.number().int().positive('Quantity must be positive'),
  unitPrice: z.number().positive('Unit price must be positive')
});

export const PurchaseOrderSchema = z.object({
  supplierId: z.string().uuid('Invalid Supplier ID'),
  orderDate: z.string().transform((val) => new Date(val)),
  expectedDate: z.string().transform((val) => new Date(val)).optional(),
  taxRate: z.number().nonnegative().default(0),
  discountRate: z.number().nonnegative().default(0),
  remarks: z.string().optional(),
  items: z.array(PurchaseItemSchema).min(1, 'At least one purchase item is required')
});

export type PurchaseOrderInput = z.infer<typeof PurchaseOrderSchema>;

export const InvoiceSchema = z.object({
  invoiceNumber: z.string().min(2, 'Invoice number is required'),
  purchaseOrderId: z.string().uuid('Invalid PO ID'),
  amount: z.number().positive('Invoice amount must be positive'),
  paymentDate: z.string().transform((val) => new Date(val)).optional(),
  status: z.enum(['UNPAID', 'PAID']).default('UNPAID')
});

export type InvoiceInput = z.infer<typeof InvoiceSchema>;

// ============================================================================
// INVENTORY & WAREHOUSE SCHEMAS
// ============================================================================
export const WarehouseSchema = z.object({
  name: z.string().min(2, 'Warehouse name is required'),
  code: z.string().min(2, 'Warehouse code is required'),
  location: z.string().min(5, 'Warehouse address/location is required')
});

export type WarehouseInput = z.infer<typeof WarehouseSchema>;

export const SectionSchema = z.object({
  name: z.string().min(1, 'Section name is required'),
  warehouseId: z.string().uuid('Invalid Warehouse ID')
});

export type SectionInput = z.infer<typeof SectionSchema>;

export const RackSchema = z.object({
  name: z.string().min(1, 'Rack name is required'),
  sectionId: z.string().uuid('Invalid Section ID')
});

export type RackInput = z.infer<typeof RackSchema>;

export const ShelfSchema = z.object({
  name: z.string().min(1, 'Shelf name is required'),
  rackId: z.string().uuid('Invalid Rack ID')
});

export type ShelfInput = z.infer<typeof ShelfSchema>;

export const StockMovementSchema = z.object({
  productId: z.string().uuid('Invalid Product ID'),
  type: z.enum(['STOCK_IN', 'STOCK_OUT', 'TRANSFER', 'DAMAGE', 'RETURN', 'RESERVE']),
  quantity: z.number().int().positive('Quantity must be positive'),
  sourceWarehouseId: z.string().uuid('Invalid Source Warehouse ID').optional().nullable(),
  destWarehouseId: z.string().uuid('Invalid Destination Warehouse ID').optional().nullable(),
  referenceNo: z.string().optional(),
  remarks: z.string().optional()
});

export type StockMovementInput = z.infer<typeof StockMovementSchema>;

// ============================================================================
// SYSTEM SETTINGS SCHEMA
// ============================================================================
export const SystemSettingsSchema = z.object({
  companyName: z.string().min(2, 'Company name is required').optional(),
  currency: z.string().min(1).max(5).optional(),
  taxRateDefault: z.number().nonnegative().optional(),
  backupDirectory: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().int().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpFrom: z.string().email().optional()
});

export type SystemSettingsInput = z.infer<typeof SystemSettingsSchema>;

// ============================================================================
// CUSTOMER INQUIRY SCHEMA & TYPES
// ============================================================================
export const InquiryItemSchema = z.object({
  srNo: z.number().int().positive(),
  partNumber: z.string().min(1, 'Part number is required'),
  description: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  quantity: z.number().int().positive('Quantity must be positive'),
  unit: z.string().default('Pcs'),
  remarks: z.string().optional().nullable(),
  productId: z.string().uuid().optional().nullable()
});

export const InquirySchema = z.object({
  inquiryNumber: z.string().optional(),
  inquiryDate: z.string().transform((val) => new Date(val)),
  customerName: z.string().min(1, 'Customer name is required'),
  companyName: z.string().min(1, 'Company name is required'),
  departmentName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),
  address: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  subject: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  status: z.enum(['PENDING', 'PROCESSING', 'QUOTED', 'CANCELLED', 'COMPLETED']).default('PENDING'),
  items: z.array(InquiryItemSchema).min(1, 'At least one item is required')
});

export type InquiryInput = z.infer<typeof InquirySchema>;
export type InquiryItemInput = z.infer<typeof InquiryItemSchema>;

// ============================================================================
// QUOTATION SCHEMA & TYPES
// ============================================================================
export const QuotationItemSchema = z.object({
  srNo: z.number().int().positive(),
  partNumber: z.string().min(1, 'Part number is required'),
  description: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  quantity: z.number().int().positive(),
  unit: z.string().default('Pcs'),
  zonePriceRmb: z.number().nonnegative(),
  profitRatio: z.number().nonnegative(),
  unitPrice: z.number().nonnegative(),
  totalPrice: z.number().nonnegative(),
  internetPrice: z.number().optional().nullable(),
  finalUnitPrice: z.number().nonnegative(),
  finalTotalPrice: z.number().nonnegative(),
  productId: z.string().uuid().optional().nullable()
});

export const QuotationSchema = z.object({
  quotationNumber: z.string().optional(),
  quotationDate: z.string().transform((val) => new Date(val)),
  validityDate: z.string().transform((val) => new Date(val)).optional().nullable(),
  inquiryId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  companyName: z.string().min(1, 'Company name is required'),
  departmentName: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  email: z.string().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  referenceNumber: z.string().optional().nullable(),
  currency: z.string().default('PKR'),
  exchangeRate: z.number().positive().default(1),
  paymentTerms: z.string().optional().nullable(),
  deliveryTime: z.string().optional().nullable(),
  warranty: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  status: z.enum(['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED']).default('DRAFT'),
  taxRate: z.number().nonnegative().default(0),
  discountRate: z.number().nonnegative().default(0),
  items: z.array(QuotationItemSchema).min(1, 'At least one item is required')
});

export type QuotationInput = z.infer<typeof QuotationSchema>;
export type QuotationItemInput = z.infer<typeof QuotationItemSchema>;

// ============================================================================
// SALES TAX INVOICE SCHEMA & TYPES
// ============================================================================
export const SalesTaxInvoiceItemSchema = z.object({
  srNo: z.number().int().positive(),
  partNumber: z.string().min(1, 'Part number is required'),
  description: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  quantity: z.number().int().positive(),
  unit: z.string().default('Pcs'),
  unitPrice: z.number().nonnegative()
});

export const SalesTaxInvoiceSchema = z.object({
  invoiceNumber: z.string().optional(),
  invoiceDate: z.string().transform((val) => new Date(val)),
  quotationId: z.string().uuid().optional().nullable(),
  companyName: z.string().min(1, 'Company name is required'),
  departmentName: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  email: z.string().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  ntn: z.string().optional().nullable(),
  strn: z.string().optional().nullable(),
  poNo: z.string().optional().nullable(),
  crNo: z.string().optional().nullable(),
  dcNo: z.string().optional().nullable(),
  taxRate: z.number().nonnegative().default(18),
  remarks: z.string().optional().nullable(),
  items: z.array(SalesTaxInvoiceItemSchema).min(1, 'At least one invoice item is required')
});

export type SalesTaxInvoiceInput = z.infer<typeof SalesTaxInvoiceSchema>;
export type SalesTaxInvoiceItemInput = z.infer<typeof SalesTaxInvoiceItemSchema>;

// ============================================================================
// DELIVERY CHALLAN SCHEMA & TYPES
// ============================================================================
export const DeliveryChallanItemSchema = z.object({
  srNo: z.number().int().positive(),
  partNumber: z.string().min(1, 'Part number is required'),
  description: z.string().optional().nullable(),
  manufacturer: z.string().optional().nullable(),
  quantity: z.number().int().positive(),
  unit: z.string().default('Pcs'),
  remarks: z.string().optional().nullable()
});

export const DeliveryChallanSchema = z.object({
  challanNumber: z.string().optional(),
  dispatchDate: z.string().transform((val) => new Date(val)),
  quotationId: z.string().uuid().optional().nullable(),
  companyName: z.string().min(1, 'Company name is required'),
  departmentName: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  email: z.string().optional().nullable().or(z.literal('')),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  invoiceReference: z.string().optional().nullable(),
  vehicleNumber: z.string().optional().nullable(),
  driverName: z.string().optional().nullable(),
  receiver: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
  items: z.array(DeliveryChallanItemSchema).min(1, 'At least one item is required')
});

export type DeliveryChallanInput = z.infer<typeof DeliveryChallanSchema>;
export type DeliveryChallanItemInput = z.infer<typeof DeliveryChallanItemSchema>;

