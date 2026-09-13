import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { config } from '@eipms/config';
import { logger } from '@eipms/utils';
import { errorHandler } from './middlewares/error-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import Routes (to be created next)
import authRoutes from './routes/auth.js';
import productRoutes from './routes/product.js';
import supplierRoutes from './routes/supplier.js';
import customerRoutes from './routes/customer.js';
import purchaseRoutes from './routes/purchase.js';
import inventoryRoutes from './routes/inventory.js';
import warehouseRoutes from './routes/warehouse.js';
import reportRoutes from './routes/report.js';
import settingRoutes from './routes/setting.js';
import auditRoutes from './routes/audit.js';
import inquiryRoutes from './routes/inquiry.js';
import quotationRoutes from './routes/quotation.js';
import invoiceRoutes from './routes/invoice.js';
import challanRoutes from './routes/challan.js';
import importRoutes from './routes/import-export.js';

const app = express();

// Security Middlewares
app.use(helmet());

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000'
];

if (config.FRONTEND_URL) {
  allowedOrigins.push(config.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (Electron desktop app, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (
      config.NODE_ENV !== 'production' ||
      allowedOrigins.includes(origin) ||
      (config.FRONTEND_URL && origin.replace(/\/$/, '') === config.FRONTEND_URL.replace(/\/$/, ''))
    ) {
      return callback(null, true);
    }
    callback(new Error('CORS policy violation: Access from this origin is prohibited.'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Parsing Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// HTTP Request Logging using Winston
const morganStream = {
  write: (message: string) => logger.info(message.trim())
};
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', { stream: morganStream }));

// Serve uploaded attachments
app.use('/uploads', express.static(config.UPLOAD_DIR));

// Serve production frontend assets if available
const frontendPath = path.resolve(process.cwd(), 'apps/frontend/dist');
const altFrontendPath = path.resolve(__dirname, '../frontend');
const activeFrontend = fs.existsSync(frontendPath) ? frontendPath : (fs.existsSync(altFrontendPath) ? altFrontendPath : null);

if (activeFrontend) {
  logger.info(`Serving production frontend assets from: ${activeFrontend}`);
  app.use(express.static(activeFrontend));
}

// Health check endpoints
const healthHandler = (req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'ok', environment: config.NODE_ENV, timestamp: new Date() });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Mount Feature API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/inquiries', inquiryRoutes);
app.use('/api/quotations', quotationRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/challans', challanRoutes);
app.use('/api/import', importRoutes);

// Fallback to index.html for SPA frontend routing
if (activeFrontend) {
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(activeFrontend, 'index.html'));
  });
}

// Global Error Handler Middleware
app.use(errorHandler);

export default app;
