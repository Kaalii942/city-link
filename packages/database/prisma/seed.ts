import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Define Permissions
  const permissionsList = [
    // Users & Roles
    { name: 'user:read', description: 'View users and roles' },
    { name: 'user:write', description: 'Create and edit users' },
    { name: 'user:delete', description: 'Delete users' },
    // Products
    { name: 'product:read', description: 'View products' },
    { name: 'product:write', description: 'Create and edit products' },
    { name: 'product:delete', description: 'Delete products' },
    { name: 'product:import', description: 'Import products from Excel' },
    { name: 'product:export', description: 'Export products to Excel/CSV' },
    // Categories & Brands
    { name: 'category:read', description: 'View categories' },
    { name: 'category:write', description: 'Create and edit categories' },
    { name: 'category:delete', description: 'Delete categories' },
    { name: 'brand:read', description: 'View brands' },
    { name: 'brand:write', description: 'Create and edit brands' },
    { name: 'brand:delete', description: 'Delete brands' },
    // Suppliers & Customers
    { name: 'supplier:read', description: 'View suppliers' },
    { name: 'supplier:write', description: 'Create and edit suppliers' },
    { name: 'supplier:delete', description: 'Delete suppliers' },
    { name: 'customer:read', description: 'View customers' },
    { name: 'customer:write', description: 'Create and edit customers' },
    { name: 'customer:delete', description: 'Delete customers' },
    // Purchase Orders
    { name: 'purchase:read', description: 'View purchase orders' },
    { name: 'purchase:write', description: 'Create and edit purchase orders' },
    { name: 'purchase:approve', description: 'Approve or reject purchase orders' },
    { name: 'purchase:delete', description: 'Delete purchase orders' },
    // Inventory
    { name: 'inventory:read', description: 'View inventory stock and movements' },
    { name: 'inventory:write', description: 'Stock in and stock out operations' },
    { name: 'inventory:transfer', description: 'Stock transfer between locations' },
    { name: 'inventory:adjust', description: 'Adjust stock levels' },
    // Warehouses
    { name: 'warehouse:read', description: 'View warehouses, sections, racks, shelves' },
    { name: 'warehouse:write', description: 'Create and edit warehouses and storage layout' },
    // Reports
    { name: 'report:read', description: 'View analytics and reports' },
    { name: 'report:export', description: 'Export reports to PDF/Excel' },
    // Settings
    { name: 'setting:read', description: 'View system settings' },
    { name: 'setting:write', description: 'Modify system settings' },
    { name: 'setting:backup', description: 'Trigger manual database backups' },
    { name: 'setting:restore', description: 'Restore database backups' },
    // Audit Logs
    { name: 'audit:read', description: 'View audit logs' }
  ];

  const dbPermissions: any[] = [];
  for (const perm of permissionsList) {
    const dbPerm = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description },
      create: perm
    });
    dbPermissions.push(dbPerm);
    console.log(`Permission upserted: ${perm.name}`);
  }

  // 2. Define Roles
  const rolesList = [
    { name: 'Super Admin', description: 'Complete system access' },
    { name: 'Admin', description: 'Administrative access with standard operations' },
    { name: 'Inventory Manager', description: 'Manages products, stocks, and categories' },
    { name: 'Purchase Manager', description: 'Manages suppliers, POs, and purchase invoices' },
    { name: 'Warehouse Manager', description: 'Manages warehouses layout and movements' },
    { name: 'Operator', description: 'Performs stock counts, stock in/out, and viewing' },
    { name: 'Viewer', description: 'Read-only access across the platform' }
  ];

  const dbRoles: Record<string, any> = {};
  for (const roleData of rolesList) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description },
      create: roleData
    });
    dbRoles[role.name] = role;
    console.log(`Role upserted: ${role.name}`);
  }

  // 3. Assign Permissions to Roles
  const rolePermissionsMapping: Record<string, string[]> = {
    'Super Admin': permissionsList.map(p => p.name),
    'Admin': permissionsList.filter(p => p.name !== 'setting:restore').map(p => p.name),
    'Inventory Manager': [
      'product:read', 'product:write', 'product:import', 'product:export',
      'category:read', 'category:write', 'brand:read', 'brand:write',
      'inventory:read', 'inventory:write', 'inventory:transfer', 'inventory:adjust',
      'warehouse:read', 'report:read', 'report:export'
    ],
    'Purchase Manager': [
      'purchase:read', 'purchase:write', 'purchase:approve',
      'supplier:read', 'supplier:write', 'product:read',
      'report:read', 'report:export'
    ],
    'Warehouse Manager': [
      'warehouse:read', 'warehouse:write', 'inventory:read', 'inventory:write',
      'inventory:transfer', 'product:read', 'report:read'
    ],
    'Operator': [
      'product:read', 'inventory:write', 'purchase:read', 'warehouse:read'
    ],
    'Viewer': permissionsList.filter(p => p.name.endsWith(':read')).map(p => p.name)
  };

  for (const [roleName, permissions] of Object.entries(rolePermissionsMapping)) {
    const role = dbRoles[roleName];
    // Remove existing permissions to prevent duplicates
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    // Insert new mapping
    for (const permName of permissions) {
      const perm = dbPermissions.find(p => p.name === permName);
      if (perm) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            permissionId: perm.id
          }
        });
      }
    }
    console.log(`Permissions associated for role: ${roleName}`);
  }

  // 4. Create default Super Admin User
  const saUsername = 'superadmin';
  const saEmail = 'admin@company.local';
  const saPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(saPassword, 10);

  const superAdminUser = await prisma.user.upsert({
    where: { username: saUsername },
    update: {
      email: saEmail,
      passwordHash,
      firstName: 'Super',
      lastName: 'Administrator',
      isActive: true
    },
    create: {
      username: saUsername,
      email: saEmail,
      passwordHash,
      firstName: 'Super',
      lastName: 'Administrator',
      isActive: true
    }
  });
  console.log(`Super Admin User upserted: ${superAdminUser.username}`);

  // Assign Super Admin Role to Super Admin User
  const saRole = dbRoles['Super Admin'];
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdminUser.id,
        roleId: saRole.id
      }
    },
    update: {},
    create: {
      userId: superAdminUser.id,
      roleId: saRole.id
    }
  });
  console.log(`Role 'Super Admin' assigned to user '${saUsername}'`);

  // 5. Create default warehouse, section, rack, and shelf
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-MAIN' },
    update: {},
    create: {
      name: 'Main Electronic Repository',
      code: 'WH-MAIN',
      location: 'Ground Floor, Building 3A, LAN Network Zone'
    }
  });

  const section = await prisma.section.upsert({
    where: {
      warehouseId_name: {
        warehouseId: warehouse.id,
        name: 'Microcontrollers & ICs'
      }
    },
    update: {},
    create: {
      name: 'Microcontrollers & ICs',
      warehouseId: warehouse.id
    }
  });

  const rack = await prisma.rack.upsert({
    where: {
      sectionId_name: {
        sectionId: section.id,
        name: 'Rack A'
      }
    },
    update: {},
    create: {
      name: 'Rack A',
      sectionId: section.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  const shelf = await prisma.shelf.upsert({
    where: {
      rackId_name: {
        rackId: rack.id,
        name: 'Shelf 1'
      }
    },
    update: {},
    create: {
      name: 'Shelf 1',
      rackId: rack.id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });
  console.log(`Warehouse, Section, Rack, and Shelf created`);

  // 6. Create dummy Categories
  const catMicro = await prisma.category.upsert({
    where: { name: 'Microcontrollers' },
    update: {},
    create: { name: 'Microcontrollers', description: 'MCU, ESP32, Arduino boards, STM32' }
  });

  const catSensors = await prisma.category.upsert({
    where: { name: 'Sensors' },
    update: {},
    create: { name: 'Sensors', description: 'Temperature, Pressure, Gyroscope, Optical Sensors' }
  });

  // Create Subcategory
  const subEsp = await prisma.category.upsert({
    where: { name: 'ESP Series' },
    update: { parentId: catMicro.id },
    create: { name: 'ESP Series', parentId: catMicro.id, description: 'ESP8266 and ESP32 series' }
  });
  console.log(`Categories created`);

  // 7. Create dummy Brands
  const brandEspressif = await prisma.brand.upsert({
    where: { name: 'Espressif Systems' },
    update: {},
    create: { name: 'Espressif Systems', description: 'Fabless semiconductor company' }
  });

  const brandTexas = await prisma.brand.upsert({
    where: { name: 'Texas Instruments' },
    update: {},
    create: { name: 'Texas Instruments', description: 'Semiconductor design and manufacturing' }
  });
  console.log(`Brands created`);

  // 8. Create dummy Supplier
  const supplierElectronics = await prisma.supplier.upsert({
    where: { companyName: 'ElectroParts Global Ltd' },
    update: {},
    create: {
      companyName: 'ElectroParts Global Ltd',
      contactName: 'John Doe',
      email: 'sales@electroparts.com',
      phone: '+1-555-0199',
      address: 'Suite 404, Tech Hub Plaza, Shenzhen, China',
      country: 'China',
      website: 'https://electroparts.com',
      ntn: 'NTN-8877665-4',
      gst: 'GST-998877-1',
      bankDetails: JSON.stringify({
        bankName: 'Industrial Bank of China',
        accountNo: 'ICBC-8899889988',
        iban: 'CN88ICBC8899889988'
      })
    }
  });
  console.log(`Suppliers created`);

  // 9. Create a dummy Customer
  const customerGovt = await prisma.customer.upsert({
    where: { id: 'c01a938b-d729-4d64-9dfc-27928e1d528b' },
    update: {},
    create: {
      id: 'c01a938b-d729-4d64-9dfc-27928e1d528b',
      companyName: 'National Space Agency (NSA)',
      departmentName: 'Aerospace Instrumentation Dept',
      contactPerson: 'Dr. Sarah Jenkins',
      email: 'sjenkins@nsa.gov.local',
      phone: '+92-51-111-222-333',
      address: 'Sector H-8, Islamabad, Pakistan',
      projects: 'Satellite Telemetry Upgrade Phase II'
    }
  });
  console.log(`Customer created`);

  // 10. Create dummy Products
  const prodEsp32 = await prisma.product.upsert({
    where: { partNumber: 'ESP32-WROOM-32D' },
    update: {
      quantity: 1200,
      warehouseId: warehouse.id,
      sectionId: section.id,
      rackId: rack.id,
      shelfId: shelf.id
    },
    create: {
      name: 'ESP32-WROOM-32D Wi-Fi+BT+BLE MCU Module',
      partNumber: 'ESP32-WROOM-32D',
      serialNumber: 'SN-ESP32-098872',
      description: 'High-performance Wi-Fi + Bluetooth + BLE MCU module for IoT applications.',
      brandId: brandEspressif.id,
      categoryId: catMicro.id,
      subCategoryId: subEsp.id,
      supplierId: supplierElectronics.id,
      countryOfOrigin: 'China',
      manufacturer: 'Espressif Systems',
      purchasePrice: 2.10,
      sellingPrice: 3.50,
      unit: 'Pcs',
      quantity: 1200,
      warehouseId: warehouse.id,
      sectionId: section.id,
      rackId: rack.id,
      shelfId: shelf.id,
      barcode: 'ESP32WROOM32D001',
      qrCode: 'QR-ESP32-WROOM-32D',
      status: 'ACTIVE',
      remarks: 'Primary inventory item. Keep stock above 200.'
    }
  });

  const prodMsp430 = await prisma.product.upsert({
    where: { partNumber: 'MSP430G2553IN20' },
    update: {
      quantity: 50,
      warehouseId: warehouse.id,
      sectionId: section.id,
      rackId: rack.id,
      shelfId: shelf.id
    },
    create: {
      name: 'MSP430 LaunchPad Microcontroller IC',
      partNumber: 'MSP430G2553IN20',
      serialNumber: 'SN-MSP430-1122',
      description: 'Texas Instruments Ultra-Low-Power Microcontroller',
      brandId: brandTexas.id,
      categoryId: catMicro.id,
      supplierId: supplierElectronics.id,
      countryOfOrigin: 'USA',
      manufacturer: 'Texas Instruments',
      purchasePrice: 1.85,
      sellingPrice: 2.80,
      unit: 'Pcs',
      quantity: 50,
      warehouseId: warehouse.id,
      sectionId: section.id,
      rackId: rack.id,
      shelfId: shelf.id,
      barcode: 'MSP430G2553IN20',
      qrCode: 'QR-MSP430-G2553',
      status: 'ACTIVE',
      remarks: 'Low stock warning test item. Threshold is 100.'
    }
  });
  console.log(`Products created`);

  // 11. Create a default System Setting
  await prisma.systemSetting.upsert({
    where: { key: 'currency' },
    update: {},
    create: { key: 'currency', value: 'USD', description: 'Base currency symbol used across EIPMS' }
  });
  await prisma.systemSetting.upsert({
    where: { key: 'tax_rate_default' },
    update: {},
    create: { key: 'tax_rate_default', value: '17.00', description: 'Standard General Sales Tax (GST) rate' }
  });
  await prisma.systemSetting.upsert({
    where: { key: 'company_name' },
    update: { value: 'CITY LINK (Engineering & Services)' },
    create: { key: 'company_name', value: 'CITY LINK (Engineering & Services)', description: 'Official enterprise company name' }
  });
  await prisma.systemSetting.upsert({
    where: { key: 'backup_directory' },
    update: {},
    create: { key: 'backup_directory', value: 'C:\\EIPMS_Backups', description: 'Default folder location for database backup files' }
  });
  console.log(`System Settings created`);

  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
