
import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import healthRoutes from './routes/health.routes.js';
import funnelRoutes from './routes/funnels.routes.js';
import orderRoutes from './routes/orders.routes.js';
import masterRoutes from './routes/masters.routes.js';
import auditRoutes from './routes/audit.routes.js';
import relationRoutes from './routes/relations.routes.js';
import duplicateRoutes from './routes/duplicates.routes.js';
import orderDraftRoutes from './routes/order-drafts.routes.js';
import orderIssueRoutes from './routes/order-issues.routes.js';
import savedViewRoutes from './routes/saved-views.routes.js';
import authRoutes from './routes/auth.routes.js';
import systemRoutes from './routes/system.routes.js';
import importRoutes from './routes/import.routes.js';
import { attachAuth } from './middleware/auth.js';
import { basicSecurityHeaders, requestContext } from './middleware/request-context.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

export function createApp() {
  const app = express();
  if (env.trustProxy) app.set('trust proxy', 1);
  app.use(requestContext);
  app.use(basicSecurityHeaders);
  app.use(cors({ origin: env.appOrigin === '*' ? true : env.appOrigin.split(',').map((item) => item.trim()) }));
  app.use(express.json({ limit: '2mb' }));
  app.use(attachAuth);

  app.get('/', (req, res) => {
    res.json({ ok: true, message: 'Pantauan Pesanan API berjalan.', requestId: req.requestId || null });
  });

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/import', importRoutes);
  app.use('/api/funnels', funnelRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/order-drafts', orderDraftRoutes);
  app.use('/api/order-issues', orderIssueRoutes);
  app.use('/api/saved-views', savedViewRoutes);
  app.use('/api/masters', masterRoutes);
  app.use('/api/audit-logs', auditRoutes);
  app.use('/api/relations', relationRoutes);
  app.use('/api/duplicates', duplicateRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
