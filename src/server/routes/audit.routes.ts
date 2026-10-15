import { Router, Response } from 'express';
import { query } from '../db.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth.ts';

export const auditRouter = Router();

// GET /api/audit - List audit logs (DESENVOLVEDOR only)
auditRouter.get('/', requireAuth, requireRole(['DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { module, user_id, search, startDate, endDate, limit, offset } = req.query;

  let sql = `SELECT * FROM audit_logs WHERE 1=1`;
  const params: any[] = [];

  if (module) {
    sql += ` AND module = ?`;
    params.push(module);
  }

  if (user_id) {
    sql += ` AND user_id = ?`;
    params.push(user_id);
  }

  if (startDate) {
    sql += ` AND created_at >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    sql += ` AND created_at <= ?`;
    params.push(endDate + 'T23:59:59.999Z');
  }

  if (search) {
    sql += ` AND (LOWER(action) LIKE ? OR LOWER(user_name) LIKE ? OR LOWER(details) LIKE ?)`;
    const term = `%${String(search).toLowerCase()}%`;
    params.push(term, term, term);
  }

  sql += ` ORDER BY created_at DESC`;

  if (limit) {
    sql += ` LIMIT ?`;
    params.push(parseInt(String(limit), 10));
    if (offset) {
      sql += ` OFFSET ?`;
      params.push(parseInt(String(offset), 10));
    }
  } else {
    sql += ` LIMIT 100`;
  }

  const logs = query(sql, params);
  res.json(logs);
});
