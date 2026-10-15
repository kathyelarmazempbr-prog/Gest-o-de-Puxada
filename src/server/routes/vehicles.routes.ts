import { Router, Response } from 'express';
import { query, queryOne, run, logAudit } from '../db.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth.ts';

export const vehiclesRouter = Router();

// GET /api/vehicles - List vehicles
vehiclesRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { search, status, type } = req.query;

  let sql = `
    SELECT v.*, 
           d.id as driver_id, d.name as driver_name,
           (SELECT COUNT(*) FROM trips t WHERE t.vehicle_id = v.id) as total_trips,
           (SELECT COUNT(*) FROM trips t WHERE t.vehicle_id = v.id AND t.status IN ('Em deslocamento', 'Na fábrica', 'Retornando')) as active_trips
    FROM vehicles v
    LEFT JOIN drivers d ON d.default_vehicle_id = v.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) {
    sql += ` AND v.status = ?`;
    params.push(status);
  }

  if (type) {
    sql += ` AND v.type = ?`;
    params.push(type);
  }

  if (search) {
    sql += ` AND (LOWER(v.plate) LIKE ? OR LOWER(v.vehicle_number) LIKE ? OR LOWER(v.brand) LIKE ? OR LOWER(v.model) LIKE ?)`;
    const term = `%${String(search).toLowerCase()}%`;
    params.push(term, term, term, term);
  }

  sql += ` ORDER BY v.vehicle_number ASC`;

  const vehicles = query(sql, params);
  res.json(vehicles);
});

// GET /api/vehicles/:id - Details with trip history
vehiclesRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const vehicle = queryOne<any>(
    `SELECT v.*, d.id as driver_id, d.name as driver_name, d.phone as driver_phone
     FROM vehicles v
     LEFT JOIN drivers d ON d.default_vehicle_id = v.id
     WHERE v.id = ?`,
    [id]
  );

  if (!vehicle) return res.status(404).json({ error: 'Veículo não encontrado.' });

  const trips = query(
    `SELECT t.*, d.name as driver_name, f.name as factory_name, f.state as factory_state
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     JOIN factories f ON f.id = t.factory_id
     WHERE t.vehicle_id = ?
     ORDER BY t.date DESC, t.planned_departure DESC
     LIMIT 20`,
    [id]
  );

  res.json({ ...vehicle, trips });
});

// POST /api/vehicles - Create vehicle
vehiclesRouter.post('/', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { plate, vehicle_number, brand, model, year, type, capacity, status } = req.body;

  if (!plate || !String(plate).trim()) {
    return res.status(400).json({ error: 'A placa do veículo é obrigatória.' });
  }

  // Rule 12: Unique plate check
  const cleanPlate = String(plate).trim().toUpperCase();
  const existingPlate = queryOne(`SELECT id FROM vehicles WHERE UPPER(plate) = ?`, [cleanPlate]);
  if (existingPlate) {
    return res.status(400).json({ error: 'Já existe um veículo cadastrado com esta placa.' });
  }

  const id = `veh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();
  const validStatus = ['Disponível', 'Em viagem', 'Manutenção', 'Inativo'].includes(status) ? status : 'Disponível';

  // Fallbacks for optional fields
  const cleanVehicleNumber = vehicle_number && String(vehicle_number).trim() 
    ? String(vehicle_number).trim() 
    : cleanPlate.replace(/[^A-Z0-9]/g, '');
  const cleanBrand = brand && String(brand).trim() ? String(brand).trim() : 'Geral';
  const cleanModel = model && String(model).trim() ? String(model).trim().toUpperCase() : '';
  const cleanYear = year ? parseInt(String(year), 10) : new Date().getFullYear();
  const cleanType = type && String(type).trim() ? String(type).trim() : 'Semirreboque';
  const cleanCapacity = capacity && String(capacity).trim() ? String(capacity).trim() : '';

  run(
    `INSERT INTO vehicles (id, plate, vehicle_number, brand, model, year, type, capacity, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, cleanPlate, cleanVehicleNumber, cleanBrand, cleanModel, cleanYear, cleanType, cleanCapacity, validStatus, now, now]
  );

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Cadastro de Veículo',
    'VEÍCULOS',
    id,
    `Cadastrou veículo ${cleanPlate} (${cleanBrand} ${cleanModel}).`
  );

  res.status(201).json({ id, message: 'Veículo cadastrado com sucesso.' });
});

// PUT /api/vehicles/:id - Edit vehicle
vehiclesRouter.put('/:id', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { plate, vehicle_number, brand, model, year, type, capacity, status } = req.body;

  const current = queryOne<any>(`SELECT * FROM vehicles WHERE id = ?`, [id]);
  if (!current) return res.status(404).json({ error: 'Veículo não encontrado.' });

  const cleanPlate = plate ? String(plate).trim().toUpperCase() : current.plate;
  if (cleanPlate !== current.plate) {
    const existing = queryOne(`SELECT id FROM vehicles WHERE UPPER(plate) = ? AND id != ?`, [cleanPlate, id]);
    if (existing) {
      return res.status(400).json({ error: 'Já existe um veículo cadastrado com esta placa.' });
    }
  }

  const now = new Date().toISOString();
  run(
    `UPDATE vehicles
     SET plate = ?, vehicle_number = ?, brand = ?, model = ?, year = ?, type = ?, capacity = ?, status = ?, updated_at = ?
     WHERE id = ?`,
    [
      cleanPlate,
      vehicle_number ? String(vehicle_number).trim() : current.vehicle_number,
      brand !== undefined ? (brand ? String(brand).trim() : 'Geral') : current.brand,
      model !== undefined ? (model ? String(model).trim().toUpperCase() : '') : (current.model || ''),
      year ? parseInt(year, 10) : current.year,
      type !== undefined ? (type ? String(type).trim() : 'Semirreboque') : current.type,
      capacity !== undefined ? (capacity ? String(capacity).trim() : '') : (current.capacity || ''),
      status || current.status,
      now,
      id
    ]
  );

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Edição de Veículo',
    'VEÍCULOS',
    id,
    `Atualizou dados do veículo ${cleanPlate} (${status || current.status}).`
  );

  res.json({ message: 'Veículo atualizado com sucesso.' });
});

// PATCH /api/vehicles/:id/status
vehiclesRouter.patch('/:id/status', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Disponível', 'Em viagem', 'Manutenção', 'Inativo'].includes(status)) {
    return res.status(400).json({ error: 'Status de veículo inválido.' });
  }

  const current = queryOne<any>(`SELECT * FROM vehicles WHERE id = ?`, [id]);
  if (!current) return res.status(404).json({ error: 'Veículo não encontrado.' });

  const now = new Date().toISOString();
  run(`UPDATE vehicles SET status = ?, updated_at = ? WHERE id = ?`, [status, now, id]);

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Alteração de Status de Veículo',
    'VEÍCULOS',
    id,
    `Alterou status do veículo ${current.plate} para ${status}.`
  );

  res.json({ message: `Status do veículo alterado para ${status}.` });
});

// DELETE /api/vehicles/:id - Delete vehicle
vehiclesRouter.delete('/:id', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const vehicle = queryOne<any>(`SELECT * FROM vehicles WHERE id = ?`, [id]);
    if (!vehicle) {
      return res.status(404).json({ error: 'Veículo não encontrado.' });
    }

    // Check if vehicle has active trips
    const activeTrips = queryOne<any>(
      `SELECT COUNT(*) as count FROM trips WHERE vehicle_id = ? AND status IN ('Em deslocamento', 'Na fábrica', 'Retornando')`,
      [id]
    )?.count || 0;

    if (activeTrips > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir o veículo pois existem viagens em andamento vinculadas a ele. Conclua ou cancele as viagens primeiro.' 
      });
    }

    // Clear default vehicle in drivers
    run(`UPDATE drivers SET default_vehicle_id = NULL WHERE default_vehicle_id = ?`, [id]);

    // Clear schedules for this vehicle
    run(`DELETE FROM schedules WHERE vehicle_id = ?`, [id]);

    // Clear or delete historical trips
    run(`DELETE FROM trips WHERE vehicle_id = ?`, [id]);

    // Delete vehicle record
    run(`DELETE FROM vehicles WHERE id = ?`, [id]);

    logAudit(
      req.user!.userId,
      req.user!.name,
      req.user!.role,
      'Exclusão de Veículo',
      'VEÍCULOS',
      id,
      `Excluiu o veículo de placa ${vehicle.plate} (${vehicle.brand} ${vehicle.model}).`
    );

    res.json({ message: `Veículo ${vehicle.plate} excluído com sucesso.` });
  } catch (err: any) {
    console.error('Error deleting vehicle:', err);
    res.status(500).json({ error: err.message || 'Erro ao excluir veículo.' });
  }
});
