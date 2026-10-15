import { Router, Response } from 'express';
import { query, queryOne, run, logAudit } from '../db.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth.ts';

export const factoriesRouter = Router();

// GET /api/factories - List factories
factoriesRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { search, state, status, onlyActive } = req.query;

  let sql = `SELECT * FROM factories WHERE 1=1`;
  const params: any[] = [];

  if (onlyActive === 'true') {
    sql += ` AND status = 'Ativa'`;
  } else if (status) {
    sql += ` AND status = ?`;
    params.push(status);
  }

  if (state) {
    sql += ` AND state = ?`;
    params.push(state);
  }

  if (search) {
    sql += ` AND (LOWER(name) LIKE ? OR LOWER(factory_code) LIKE ? OR LOWER(city) LIKE ?)`;
    const term = `%${String(search).toLowerCase()}%`;
    params.push(term, term, term);
  }

  sql += ` ORDER BY factory_code ASC`;

  const factories = query(sql, params);
  res.json(factories);
});

// POST /api/factories - Create factory (ADMIN or DEV)
factoriesRouter.post('/', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { factory_code, name, state, city, status } = req.body;

  if (!factory_code || !name || !state) {
    return res.status(400).json({ error: 'Código, nome e estado são obrigatórios.' });
  }

  // Rule 14: Check duplicate factory code
  const existingCode = queryOne(`SELECT id FROM factories WHERE LOWER(factory_code) = LOWER(?)`, [factory_code.trim()]);
  if (existingCode) {
    return res.status(400).json({ error: 'Já existe uma fábrica com este código cadastrado.' });
  }

  const id = `fac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const factoryStatus = status === 'Inativa' ? 'Inativa' : 'Ativa';

  run(
    `INSERT INTO factories (id, factory_code, name, state, city, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, factory_code.trim(), name.trim(), state.trim().toUpperCase(), city ? city.trim() : '', factoryStatus, now, now]
  );

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Cadastro de Fábrica',
    'FÁBRICAS',
    id,
    `Cadastrou fábrica ${name} (Cód: ${factory_code}, ${city}-${state}).`
  );

  res.status(201).json({ id, message: 'Fábrica cadastrada com sucesso.' });
});

// PUT /api/factories/:id - Edit factory
factoriesRouter.put('/:id', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { factory_code, name, state, city, status } = req.body;

  const current = queryOne<any>(`SELECT * FROM factories WHERE id = ?`, [id]);
  if (!current) {
    return res.status(404).json({ error: 'Fábrica não encontrada.' });
  }

  if (factory_code && factory_code.trim().toLowerCase() !== current.factory_code.toLowerCase()) {
    const existingCode = queryOne(`SELECT id FROM factories WHERE LOWER(factory_code) = LOWER(?) AND id != ?`, [factory_code.trim(), id]);
    if (existingCode) {
      return res.status(400).json({ error: 'Já existe uma fábrica com este código cadastrado.' });
    }
  }

  const now = new Date().toISOString();
  run(
    `UPDATE factories
     SET factory_code = ?, name = ?, state = ?, city = ?, status = ?, updated_at = ?
     WHERE id = ?`,
    [
      factory_code ? factory_code.trim() : current.factory_code,
      name ? name.trim() : current.name,
      state ? state.trim().toUpperCase() : current.state,
      city ? city.trim() : current.city,
      status || current.status,
      now,
      id
    ]
  );

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Edição de Fábrica',
    'FÁBRICAS',
    id,
    `Atualizou dados da fábrica ${name || current.name}.`
  );

  res.json({ message: 'Fábrica atualizada com sucesso.' });
});

// PATCH /api/factories/:id/status - Toggle status
factoriesRouter.patch('/:id/status', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Ativa', 'Inativa'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido. Use Ativa ou Inativa.' });
  }

  const current = queryOne<any>(`SELECT * FROM factories WHERE id = ?`, [id]);
  if (!current) return res.status(404).json({ error: 'Fábrica não encontrada.' });

  const now = new Date().toISOString();
  run(`UPDATE factories SET status = ?, updated_at = ? WHERE id = ?`, [status, now, id]);

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Alteração de Status de Fábrica',
    'FÁBRICAS',
    id,
    `Alterou status da fábrica ${current.name} para ${status}.`
  );

  res.json({ message: `Status da fábrica alterado para ${status}.` });
});

// DELETE /api/factories/:id - Delete factory
factoriesRouter.delete('/:id', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const current = queryOne<any>(`SELECT * FROM factories WHERE id = ?`, [id]);
    if (!current) return res.status(404).json({ error: 'Fábrica não encontrada.' });

    // Check if factory has active or scheduled trips
    const activeTrips = queryOne<any>(
      `SELECT COUNT(*) as count FROM trips WHERE factory_id = ? AND status IN ('Programada', 'Em deslocamento', 'Na fábrica', 'Retornando')`,
      [id]
    )?.count || 0;

    if (activeTrips > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir a fábrica pois existem viagens ativas ou programadas vinculadas a ela. Conclua ou cancele as viagens primeiro.'
      });
    }

    // Clean up schedules for this factory
    run(`DELETE FROM schedules WHERE factory_id = ?`, [id]);

    // Clean up trips for this factory
    run(`DELETE FROM trips WHERE factory_id = ?`, [id]);

    // Delete factory
    run(`DELETE FROM factories WHERE id = ?`, [id]);

    logAudit(
      req.user!.userId,
      req.user!.name,
      req.user!.role,
      'Exclusão de Fábrica',
      'FÁBRICAS',
      id,
      `Excluiu a fábrica ${current.name} (${current.factory_code}).`
    );

    res.json({ message: `Fábrica ${current.name} excluída com sucesso.` });
  } catch (err: any) {
    console.error('Error deleting factory:', err);
    res.status(500).json({ error: err.message || 'Erro ao excluir fábrica.' });
  }
});
