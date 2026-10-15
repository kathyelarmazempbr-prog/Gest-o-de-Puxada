import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, run, logAudit } from '../db.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth.ts';

export const driversRouter = Router();

// GET /api/drivers - List drivers (ADMIN or DEV, or own record for MOTORISTA)
driversRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  // Self-healing: ensure any user created with role 'MOTORISTA' has a matching entry in 'drivers'
  try {
    const unlinkedDrivers = query<any>(`
      SELECT u.id as user_id, u.name, u.login, u.phone, u.cpf, u.status, u.created_at
      FROM users u
      LEFT JOIN drivers d ON d.user_id = u.id
      WHERE u.role = 'MOTORISTA' AND d.id IS NULL
    `);
    for (const ud of unlinkedDrivers) {
      const drvId = `drv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      run(
        `INSERT INTO drivers (id, user_id, name, registration, phone, cpf, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [drvId, ud.user_id, ud.name, ud.login, ud.phone, ud.cpf, ud.status || 'Ativo', ud.created_at, ud.created_at]
      );
    }
  } catch {}

  const { search, status, onlyActive, sort } = req.query;

  let sql = `
    SELECT d.*, 
           u.email as user_email, u.login as user_login, u.status as user_status,
           v.plate as default_vehicle_plate, v.brand as default_vehicle_brand, v.model as default_vehicle_model,
           (SELECT COUNT(*) FROM trips t WHERE t.driver_id = d.id) as total_trips,
           (SELECT COUNT(*) FROM trips t WHERE t.driver_id = d.id AND t.status IN ('Programada', 'Em deslocamento', 'Na fábrica', 'Retornando')) as pending_trips
    FROM drivers d
    LEFT JOIN users u ON u.id = d.user_id
    LEFT JOIN vehicles v ON v.id = d.default_vehicle_id
    WHERE 1=1
  `;
  const params: any[] = [];

  // If the user is a MOTORISTA, they view their own driver record (Rule 9)
  if (req.user?.role === 'MOTORISTA') {
    sql += ` AND (d.user_id = ? OR d.id = ?)`;
    params.push(req.user.userId, req.user.driverId || '');
  }

  const cleanStatus = status && status !== 'undefined' && status !== '' ? String(status).trim() : null;
  const cleanSearch = search && search !== 'undefined' && search !== '' ? String(search).trim() : null;

  if (onlyActive === 'true') {
    sql += ` AND d.status = 'Ativo'`;
  } else if (cleanStatus) {
    sql += ` AND d.status = ?`;
    params.push(cleanStatus);
  }

  if (cleanSearch) {
    sql += ` AND (LOWER(d.name) LIKE ? OR LOWER(d.registration) LIKE ? OR (d.phone IS NOT NULL AND d.phone LIKE ?) OR (d.cpf IS NOT NULL AND d.cpf LIKE ?) OR (d.cnh IS NOT NULL AND d.cnh LIKE ?))`;
    const term = `%${cleanSearch.toLowerCase()}%`;
    params.push(term, term, `%${cleanSearch}%`, `%${cleanSearch}%`, `%${cleanSearch}%`);
  }

  if (sort === 'name') {
    sql += ` ORDER BY d.name ASC`;
  } else {
    // Default: newest drivers first so newly added drivers appear immediately at the top
    sql += ` ORDER BY d.created_at DESC, d.name ASC`;
  }

  const drivers = query(sql, params);
  res.json(drivers);
});

// GET /api/drivers/:id - Driver details and trip history
driversRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  // Rule 9: If user is MOTORISTA, they can ONLY view their own driver profile!
  if (req.user?.role === 'MOTORISTA') {
    if (req.user.driverId !== id) {
      return res.status(403).json({ error: 'Acesso negado. Você só tem permissão para visualizar seu próprio perfil de motorista.' });
    }
  }

  const driver = queryOne<any>(
    `SELECT d.*, 
            u.email as user_email, u.login as user_login, u.status as user_status,
            v.plate as default_vehicle_plate, v.brand as default_vehicle_brand, v.model as default_vehicle_model
     FROM drivers d
     LEFT JOIN users u ON u.id = d.user_id
     LEFT JOIN vehicles v ON v.id = d.default_vehicle_id
     WHERE d.id = ?`,
    [id]
  );

  if (!driver) return res.status(404).json({ error: 'Motorista não encontrado.' });

  const trips = query(
    `SELECT t.*, v.plate as vehicle_plate, v.model as vehicle_model, f.name as factory_name, f.city as factory_city, f.state as factory_state
     FROM trips t
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN factories f ON f.id = t.factory_id
     WHERE t.driver_id = ?
     ORDER BY t.date DESC, t.planned_departure DESC`,
    [id]
  );

  const schedules = query(
    `SELECT s.*, v.plate as vehicle_plate, f.name as factory_name, f.city as factory_city, f.state as factory_state
     FROM schedules s
     JOIN vehicles v ON v.id = s.vehicle_id
     JOIN factories f ON f.id = s.factory_id
     WHERE s.driver_id = ?
     ORDER BY s.date DESC, s.shift_time ASC`,
    [id]
  );

  res.json({ ...driver, trips, schedules });
});

// POST /api/drivers - Create driver (ADMIN or DEV)
driversRouter.post('/', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { 
    name, registration, phone, status, password,
    cpf, cnh, cnh_category, cnh_expiration, default_vehicle_id
  } = req.body;

  if (!name || !registration) {
    return res.status(400).json({ error: 'Nome completo e matrícula são obrigatórios.' });
  }

  // Unique Registration check
  const cleanReg = String(registration).trim();
  const existingReg = queryOne(`SELECT id FROM drivers WHERE LOWER(registration) = LOWER(?)`, [cleanReg]);
  if (existingReg) {
    return res.status(400).json({ error: 'Já existe um motorista cadastrado com esta matrícula.' });
  }

  // Check if login already exists in users (since login is the registration)
  const existingLogin = queryOne(`SELECT id FROM users WHERE LOWER(login) = LOWER(?)`, [cleanReg]);
  if (existingLogin) {
    return res.status(400).json({ error: 'Já existe um usuário no sistema com esta matrícula como login.' });
  }

  // Unique CPF check if provided
  let cleanCpf: string | null = null;
  if (cpf && String(cpf).trim()) {
    cleanCpf = String(cpf).trim();
    const existingCpf = queryOne(`SELECT id FROM drivers WHERE cpf = ?`, [cleanCpf]);
    if (existingCpf) {
      return res.status(400).json({ error: 'Já existe um motorista cadastrado com este CPF.' });
    }
  }

  // Phone is now optional
  const cleanPhone = phone && String(phone).trim().length > 0 ? String(phone).trim() : null;

  const now = new Date().toISOString();
  const driverStatus = ['Ativo', 'Inativo', 'Férias', 'Afastado'].includes(status) ? status : 'Ativo';
  const userStatus = driverStatus === 'Inativo' ? 'Inativo' : 'Ativo';

  // O login é a matrícula e senha configurável (sem preenchimento automático obrigatório)
  const driverPassword = password && String(password).trim().length > 0 ? String(password).trim() : '123456';
  const passHash = bcrypt.hashSync(driverPassword, 10);
  const finalUserId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const userEmail = `${cleanReg.toLowerCase().replace(/[^a-z0-9]/g, '')}@puxada.log.br`;

  run(
    `INSERT INTO users (id, name, cpf, phone, email, login, password_hash, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [finalUserId, name.trim(), cleanCpf, cleanPhone, userEmail, cleanReg, passHash, 'MOTORISTA', userStatus, now, now]
  );

  const driverId = `drv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  run(
    `INSERT INTO drivers (id, user_id, name, cpf, registration, phone, cnh, cnh_category, cnh_expiration, default_vehicle_id, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      driverId,
      finalUserId,
      name.trim(),
      cleanCpf,
      cleanReg,
      cleanPhone,
      cnh ? String(cnh).trim() : null,
      cnh_category ? String(cnh_category).trim().toUpperCase() : null,
      cnh_expiration || null,
      default_vehicle_id || null,
      driverStatus,
      now,
      now
    ]
  );

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Cadastro de Motorista',
    'MOTORISTAS',
    driverId,
    `Cadastrou motorista ${name} (Matrícula/Login: ${cleanReg}, Status: ${driverStatus}).`
  );

  res.status(201).json({ id: driverId, message: 'Motorista cadastrado com sucesso. O login de acesso é a matrícula.' });
});

// PUT /api/drivers/:id - Edit driver
driversRouter.put('/:id', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { 
    name, cpf, registration, phone, cnh, cnh_category, cnh_expiration, 
    default_vehicle_id, status, user_id
  } = req.body;

  const current = queryOne<any>(`SELECT * FROM drivers WHERE id = ?`, [id]);
  if (!current) return res.status(404).json({ error: 'Motorista não encontrado.' });

  // Unique CPF check
  if (cpf && cpf !== current.cpf) {
    const existingCpf = queryOne(`SELECT id FROM drivers WHERE cpf = ? AND id != ?`, [cpf.trim(), id]);
    if (existingCpf) return res.status(400).json({ error: 'Já existe um motorista cadastrado com este CPF.' });
  }

  // Unique Registration check
  if (registration && registration !== current.registration) {
    const existingReg = queryOne(`SELECT id FROM drivers WHERE registration = ? AND id != ?`, [registration.trim(), id]);
    if (existingReg) return res.status(400).json({ error: 'Já existe um motorista com esta matrícula.' });
  }

  const now = new Date().toISOString();
  run(
    `UPDATE drivers
     SET name = ?, cpf = ?, registration = ?, phone = ?, cnh = ?, cnh_category = ?, cnh_expiration = ?, default_vehicle_id = ?, status = ?, user_id = ?, updated_at = ?
     WHERE id = ?`,
    [
      name ? name.trim() : current.name,
      cpf ? cpf.trim() : current.cpf,
      registration ? registration.trim() : current.registration,
      phone ? phone.trim() : current.phone,
      cnh ? cnh.trim() : current.cnh,
      cnh_category ? cnh_category.trim().toUpperCase() : current.cnh_category,
      cnh_expiration || current.cnh_expiration,
      default_vehicle_id !== undefined ? default_vehicle_id : current.default_vehicle_id,
      status || current.status,
      user_id !== undefined ? user_id : current.user_id,
      now,
      id
    ]
  );

  // If driver status is changed to Inativo and has linked user, update user status to Inativo
  if (status === 'Inativo' && current.user_id) {
    run(`UPDATE users SET status = 'Inativo', updated_at = ? WHERE id = ?`, [now, current.user_id]);
  } else if (status === 'Ativo' && current.user_id) {
    run(`UPDATE users SET status = 'Ativo', updated_at = ? WHERE id = ?`, [now, current.user_id]);
  }

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Edição de Motorista',
    'MOTORISTAS',
    id,
    `Atualizou cadastro do motorista ${name || current.name} (Status: ${status || current.status}).`
  );

  res.json({ message: 'Motorista atualizado com sucesso.' });
});

// PATCH /api/drivers/:id/status
driversRouter.patch('/:id/status', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Ativo', 'Inativo', 'Férias', 'Afastado'].includes(status)) {
    return res.status(400).json({ error: 'Status de motorista inválido.' });
  }

  const current = queryOne<any>(`SELECT * FROM drivers WHERE id = ?`, [id]);
  if (!current) return res.status(404).json({ error: 'Motorista não encontrado.' });

  const now = new Date().toISOString();
  run(`UPDATE drivers SET status = ?, updated_at = ? WHERE id = ?`, [status, now, id]);

  if (current.user_id) {
    const userStatus = status === 'Inativo' ? 'Inativo' : 'Ativo';
    run(`UPDATE users SET status = ?, updated_at = ? WHERE id = ?`, [userStatus, now, current.user_id]);
  }

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Alteração de Status de Motorista',
    'MOTORISTAS',
    id,
    `Alterou status do motorista ${current.name} para ${status}.`
  );

  res.json({ message: `Status do motorista alterado para ${status}.` });
});
