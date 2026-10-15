import { Router, Response } from 'express';
import { query, queryOne, run, logAudit } from '../db.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth.ts';

export const configRouter = Router();

// GET /api/config - Get system configuration and database health
configRouter.get('/', requireAuth, requireRole(['DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const settings = query(`SELECT * FROM system_settings`);
  
  const tables = ['users', 'drivers', 'vehicles', 'factories', 'trips', 'schedules', 'audit_logs'];
  const tableStats = tables.map(table => {
    const res = queryOne<any>(`SELECT COUNT(*) as count FROM ${table}`);
    return { table, count: res ? res.count : 0 };
  });

  res.json({
    settings: settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {}),
    database: {
      status: 'Online',
      engine: 'SQLite Relational (Persistent)',
      tables: tableStats
    }
  });
});

// PUT /api/config - Update system settings
configRouter.put('/', requireAuth, requireRole(['DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { system_name, company_name } = req.body;
  const now = new Date().toISOString();

  if (system_name) {
    run(`INSERT INTO system_settings (id, key, value, updated_at) VALUES ('stg_1', 'system_name', ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?`, [system_name, now, system_name, now]);
  }

  if (company_name) {
    run(`INSERT INTO system_settings (id, key, value, updated_at) VALUES ('stg_2', 'company_name', ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = ?`, [company_name, now, company_name, now]);
  }

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Configurações do Sistema',
    'CONFIGURAÇÕES',
    'SYS_CONFIG',
    `Atualizou parâmetros gerais do sistema.`
  );

  res.json({ message: 'Configurações atualizadas com sucesso.' });
});
