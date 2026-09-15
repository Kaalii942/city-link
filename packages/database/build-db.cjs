const { execSync } = require('child_process');
const path = require('path');

const dbUrl = process.env.DATABASE_URL || '';
let schemaFile = 'prisma/schema.prisma';

if (dbUrl.includes('postgres') || dbUrl.includes('postgresql')) {
  schemaFile = 'prisma/schema.postgresql.prisma';
} else if (dbUrl.includes('sqlserver')) {
  schemaFile = 'prisma/schema.sqlserver.prisma';
}

console.log(`[Database Build] Selected Prisma schema: ${schemaFile}`);

try {
  console.log(`[Database Build] Running prisma generate...`);
  execSync(`npx prisma generate --schema=${schemaFile}`, {
    cwd: path.resolve(__dirname),
    stdio: 'inherit'
  });

  console.log(`[Database Build] Compiling TypeScript...`);
  execSync(`npx tsc`, {
    cwd: path.resolve(__dirname),
    stdio: 'inherit'
  });
  console.log(`[Database Build] Success!`);
} catch (error) {
  console.error(`[Database Build Error] Failed to generate/compile database package:`, error);
  process.exit(1);
}
