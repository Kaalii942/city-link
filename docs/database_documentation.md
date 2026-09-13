# EIPMS Database Documentation

This document defines the schema designs, indexes, tables structures, and backup/restore designs for the **Enterprise Inventory & Procurement Management System (EIPMS)**.

---

## 🛢️ SQL Server Relational Database Schema

EIPMS leverages **Microsoft SQL Server 2022** and **Prisma ORM**. The schemas are fully normalized (3NF), enforcing primary keys, foreign key constraints, unique indexes, and cascading delete references.

### Schema file
- [schema.prisma](file:///d:/City%20links/packages/database/prisma/schema.prisma)

---

## 📊 Normalized Tables Definitions

### 1. User & Access Roles Management
- **`User`**: System employee accounts. Includes fields `id` (UUID), `username`, `email`, `passwordHash`, `firstName`, `lastName`, and `isActive`.
- **`Role`**: Access scopes (e.g. `Inventory Manager`, `Super Admin`).
- **`Permission`**: Granular flags mapping allowed actions (e.g. `product:write`, `setting:restore`).
- **`RolePermission`**: Join table mapping permissions to roles.
- **`UserRole`**: Join table mapping roles to users.

### 2. Product Catalog
- **`Product`**: Mapped electronics assets. Mapped fields: `name`, `partNumber` (Unique Index), `serialNumber`, `description`, `purchasePrice` (Decimal), `sellingPrice` (Decimal), `unit`, `quantity`, `barcode` (Unique Index), `status`, `remarks`.
- **`Category`**: Mapped categories. Includes a self-referencing `parentId` to cleanly support recursive subcategories.
- **`Brand`**: Product manufacturers/brands.

### 3. Warehouses & Hierarchical Locations
Storage spaces are organized hierarchically:
`Warehouse` &rarr; `Section` &rarr; `Rack` &rarr; `Shelf`
- **`Warehouse`**: Physical locations. Mapped keys: `code` (Unique Index), `name`, `location`.
- **`Section`**: Named areas (e.g. "ICs Hall"). Unique key `[warehouseId, name]`.
- **`Rack`**: Physical storage racks. Unique key `[sectionId, name]`.
- **`Shelf`**: Specific shelves. Unique key `[rackId, name]`.

### 4. Procurement & Invoicing Transactions
- **`PurchaseOrder`**: logged acquisitions. Mapped keys: `poNumber` (Unique Index), `supplierId`, `orderDate`, `expectedDate`, `status` (PENDING, APPROVED, REJECTED, ORDERED, COMPLETED), `paymentStatus` (UNPAID, PARTIAL, PAID), `totalAmount` (Decimal), `createdById`, `approvedById`.
- **`PurchaseItem`**: Line items inside a PO mapping `productId`, `quantity`, and `unitPrice`.
- **`Invoice`**: Vendor invoices logs mapping `invoiceNumber`, `amount`, `paymentDate`, and `fileAttachmentPath`.

### 5. Inventory Stock Movements
- **`StockMovement`**: Immutable ledger of inventory alterations:
  `STOCK_IN`, `STOCK_OUT`, `TRANSFER`, `DAMAGE`, `RETURN`, `RESERVE`
  Records `productId`, `quantity`, `sourceWarehouseId`, `destWarehouseId`, `referenceNo`, `createdById`, and `createdAt` (Timestamp).

### 6. Logging & Administration
- **`ActivityLog`**: System audit trail mapping who did what, when, from which IP and network machine name.
- **`Session`**: Active JWT refresh tokens logs to coordinate multi-station logins security.
- **`SystemSetting`**: key-value settings.

---

## 🗄️ Indexes & Constraints Design
1. **Primary Keys:** Every table implements a standard clustered primary key (`id` as UUID or specific string keys like `key` on `SystemSetting`).
2. **Unique Constraints:** Enforced on `User.username`, `User.email`, `Product.partNumber`, `Product.barcode`, `Warehouse.code`, `PurchaseOrder.poNumber`, and `Invoice.invoiceNumber`.
3. **Compound Unique Indexes:** Enforced on storage layouts to prevent duplicate named items inside the same parent container:
   - `Section`: unique on `[warehouseId, name]`
   - `Rack`: unique on `[sectionId, name]`
   - `Shelf`: unique on `[rackId, name]`

---

## 🛡️ Database Backup & Restore Architecture

Since the system operates 100% offline, database backups and restores are executed directly on the SQL Server instance using Transact-SQL raw commands via the Prisma client:

### 1. Daily Auto Backup
Managed in [server.ts](file:///d:/City%20links/apps/backend/src/server.ts) using `node-schedule`. Every night at midnight, it triggers:
```sql
BACKUP DATABASE [eipms] TO DISK = N'C:\EIPMS_Backups\eipms_auto_YYYYMMDD.bak' WITH FORMAT, INIT;
```

### 2. Manual Backup & Restore
Triggered from the [Settings](file:///d:/City%20links/apps/frontend/src/pages/Settings.tsx) view. 
- Restores switch the target database to `SINGLE_USER` mode to terminate active client LAN connections before applying:
```sql
USE [master];
ALTER DATABASE [eipms] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
RESTORE DATABASE [eipms] FROM DISK = N'C:\EIPMS_Backups\backup_file.bak' WITH REPLACE;
ALTER DATABASE [eipms] SET MULTI_USER;
```
This is fully secure, standard, and self-contained.
