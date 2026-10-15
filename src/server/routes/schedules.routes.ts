import { Router, Response } from 'express';
import { query, queryOne, run, logAudit } from '../db.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth.ts';

export const schedulesRouter = Router();

// GET /api/schedules - List schedules with RBAC
schedulesRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { date, startDate, endDate, driverId, factoryId } = req.query;

  let sql = `
    SELECT s.*, 
           d.name as driver_name, d.registration as driver_registration, d.phone as driver_phone,
           v.plate as vehicle_plate, v.brand as vehicle_brand, v.model as vehicle_model,
           f.factory_code as factory_code, f.name as factory_name, f.city as factory_city, f.state as factory_state,
           u.name as created_by_name
    FROM schedules s
    JOIN drivers d ON d.id = s.driver_id
    JOIN vehicles v ON v.id = s.vehicle_id
    JOIN factories f ON f.id = s.factory_id
    LEFT JOIN users u ON u.id = s.created_by
    WHERE 1=1
  `;
  const params: any[] = [];

  // Motorista sees only their own schedule
  if (req.user?.role === 'MOTORISTA') {
    if (!req.user.driverId) return res.json([]);
    sql += ` AND s.driver_id = ?`;
    params.push(req.user.driverId);
  } else if (driverId) {
    sql += ` AND s.driver_id = ?`;
    params.push(driverId);
  }

  if (date) {
    sql += ` AND s.date = ?`;
    params.push(date);
  }

  if (startDate) {
    sql += ` AND s.date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    sql += ` AND s.date <= ?`;
    params.push(endDate);
  }

  if (factoryId) {
    sql += ` AND s.factory_id = ?`;
    params.push(factoryId);
  }

  sql += ` ORDER BY s.date DESC, s.shift_time ASC`;

  const schedules = query(sql, params);
  res.json(schedules);
});

// POST /api/schedules - Create schedule (ADMIN or DEV)
schedulesRouter.post('/', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { date, driver_id, vehicle_id, factory_id, shift_time, observation, status } = req.body;

  if (!date || !driver_id || !vehicle_id || !factory_id || !shift_time) {
    return res.status(400).json({ error: 'Data, motorista, veículo, fábrica e horário são obrigatórios na escala.' });
  }

  // Check driver status
  const driver = queryOne<any>(`SELECT id, name, status FROM drivers WHERE id = ?`, [driver_id]);
  if (!driver || driver.status !== 'Ativo') {
    return res.status(400).json({ error: 'Apenas motoristas com status Ativo podem ser adicionados à escala.' });
  }

  const id = `sch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const scheduleStatus = ['Confirmada', 'Pendente', 'Cancelada'].includes(status) ? status : 'Confirmada';

  run(
    `INSERT INTO schedules (id, date, driver_id, vehicle_id, factory_id, shift_time, observation, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      date,
      driver_id,
      vehicle_id,
      factory_id,
      shift_time,
      observation || null,
      scheduleStatus,
      req.user!.userId,
      now,
      now
    ]
  );

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Criação de Escala',
    'ESCALAS',
    id,
    `Adicionou escala para ${driver.name} em ${date} às ${shift_time}.`
  );

  res.status(201).json({ id, message: 'Escala cadastrada com sucesso.' });
});

// PUT /api/schedules/:id - Edit schedule
schedulesRouter.put('/:id', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { date, driver_id, vehicle_id, factory_id, shift_time, observation, status } = req.body;

  const current = queryOne<any>(`SELECT * FROM schedules WHERE id = ?`, [id]);
  if (!current) return res.status(404).json({ error: 'Escala não encontrada.' });

  const now = new Date().toISOString();
  run(
    `UPDATE schedules
     SET date = ?, driver_id = ?, vehicle_id = ?, factory_id = ?, shift_time = ?, observation = ?, status = ?, updated_at = ?
     WHERE id = ?`,
    [
      date || current.date,
      driver_id || current.driver_id,
      vehicle_id || current.vehicle_id,
      factory_id || current.factory_id,
      shift_time || current.shift_time,
      observation !== undefined ? observation : current.observation,
      status || current.status,
      now,
      id
    ]
  );

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Edição de Escala',
    'ESCALAS',
    id,
    `Atualizou escala ${id}.`
  );

  res.json({ message: 'Escala atualizada com sucesso.' });
});

// DELETE /api/schedules/:id - Delete or Cancel schedule
schedulesRouter.delete('/:id', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const current = queryOne<any>(`SELECT * FROM schedules WHERE id = ?`, [id]);
  if (!current) return res.status(404).json({ error: 'Escala não encontrada.' });

  run(`DELETE FROM schedules WHERE id = ?`, [id]);

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Exclusão de Escala',
    'ESCALAS',
    id,
    `Removeu registro de escala ${id}.`
  );

  res.json({ message: 'Escala removida com sucesso.' });
});
