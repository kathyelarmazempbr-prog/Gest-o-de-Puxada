import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initDb } from './src/server/db.ts';
import { authRouter } from './src/server/routes/auth.routes.ts';
import { usersRouter } from './src/server/routes/users.routes.ts';
import { factoriesRouter } from './src/server/routes/factories.routes.ts';
import { vehiclesRouter } from './src/server/routes/vehicles.routes.ts';
import { driversRouter } from './src/server/routes/drivers.routes.ts';
import { tripsRouter } from './src/server/routes/trips.routes.ts';
import { schedulesRouter } from './src/server/routes/schedules.routes.ts';
import { dashboardRouter } from './src/server/routes/dashboard.routes.ts';
import { auditRouter } from './src/server/routes/audit.routes.ts';
import { configRouter } from './src/server/routes/config.routes.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Initialize SQLite database
  await initDb();

  // Standard Middlewares
  app.use(cors());
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Mount API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/factories', factoriesRouter);
  app.use('/api/vehicles', vehiclesRouter);
  app.use('/api/drivers', driversRouter);
  app.use('/api/trips', tripsRouter);
  app.use('/api/schedules', schedulesRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/config', configRouter);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', app: 'Gestão de Puxada', timestamp: new Date().toISOString() });
  });

  // 404 for unhandled /api/* routes must ALWAYS return JSON, never HTML
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `Rota API não encontrada: ${req.method} ${req.url}` });
  });

  // Global JSON error handler for API
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.url.startsWith('/api')) {
      console.error('[API Error]', err);
      return res.status(err.status || 500).json({ 
        error: err.message || 'Erro interno no processamento da requisição' 
      });
    }
    next(err);
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite dev server in middleware mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Gestão de Puxada] Server running at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
