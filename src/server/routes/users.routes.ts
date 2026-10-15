import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query, queryOne, run, logAudit } from '../db.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth.ts';

export const usersRouter = Router();

// GET /api/users - List users (ADMINISTRADOR or DESENVOLVEDOR)
usersRouter.get('/', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { search, role, status } = req.query;

  const cleanSearch = search && search !== 'undefined' && search !== '' ? String(search).trim() : null;
  const cleanRole = role && role !== 'undefined' && role !== '' ? String(role).trim() : null;
  const cleanStatus = status && status !== 'undefined' && status !== '' ? String(status).trim() : null;

  let sql = `
    SELECT u.id, u.name, u.cpf, u.phone, u.email, u.login, u.raw_password, u.role, u.status, u.created_at, u.updated_at,
           d.id as driver_id, d.registration as driver_registration, d.cnh, d.cnh_category, d.status as driver_status
    FROM users u
    LEFT JOIN drivers d ON d.user_id = u.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (cleanSearch) {
    sql += ` AND (LOWER(u.name) LIKE ? OR LOWER(u.email) LIKE ? OR LOWER(u.login) LIKE ? OR (u.cpf IS NOT NULL AND u.cpf LIKE ?) OR (u.phone IS NOT NULL AND u.phone LIKE ?))`;
    const term = `%${cleanSearch.toLowerCase()}%`;
    params.push(term, term, term, `%${cleanSearch}%`, `%${cleanSearch}%`);
  }

  if (cleanRole) {
    sql += ` AND u.role = ?`;
    params.push(cleanRole);
  }

  if (cleanStatus) {
    sql += ` AND u.status = ?`;
    params.push(cleanStatus);
  }

  sql += ` ORDER BY u.created_at DESC`;

  const users = query(sql, params);
  res.json(users);
});

// POST /api/users - Create new unified user (DESENVOLVEDOR, ADMINISTRADOR or MOTORISTA)
usersRouter.post('/', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { name, cpf, phone, email, login, password, role, status } = req.body;

  if (!name || !login || !role) {
    return res.status(400).json({ error: 'Nome completo, login/matrícula e perfil são obrigatórios.' });
  }

  if (!['DESENVOLVEDOR', 'ADMINISTRADOR', 'MOTORISTA'].includes(role)) {
    return res.status(400).json({ error: 'Perfil inválido. Selecione Desenvolvedor, Administrador ou Motorista.' });
  }

  const cleanName = String(name).trim();
  const cleanLogin = String(login).trim().toUpperCase();
  const cleanPhone = phone && String(phone).trim().length > 0 ? String(phone).trim() : null;
  const cleanCpf = cpf && String(cpf).trim().length > 0 ? String(cpf).trim() : null;
  const cleanEmail = email && String(email).trim().length > 0 ? String(email).trim().toLowerCase() : null;

  // Unique checks
  const existingLogin = queryOne(`SELECT id FROM users WHERE LOWER(login) = LOWER(?)`, [cleanLogin]);
  if (existingLogin) {
    return res.status(400).json({ error: `Este login/matrícula (${cleanLogin}) já está em uso por outro usuário.` });
  }

  if (cleanEmail) {
    const existingEmail = queryOne(`SELECT id FROM users WHERE LOWER(email) = LOWER(?)`, [cleanEmail]);
    if (existingEmail) {
      return res.status(400).json({ error: 'Este e-mail já está em uso por outro usuário.' });
    }
  }

  if (cleanCpf) {
    const existingCpf = queryOne(`SELECT id FROM users WHERE cpf = ?`, [cleanCpf]);
    if (existingCpf) {
      return res.status(400).json({ error: 'Já existe um usuário cadastrado com este CPF.' });
    }
  }

  // Password resolution (if blank, stays without password)
  const cleanRawPass = password && String(password).trim().length > 0 ? String(password).trim() : null;
  const passwordHash = cleanRawPass ? bcrypt.hashSync(cleanRawPass, 10) : '';
  const rawPassword = cleanRawPass || null;

  const id = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // Driver operational status vs User status
  const userStatus = status === 'Inativo' ? 'Inativo' : 'Ativo';
  const driverStatus = ['Ativo', 'Inativo', 'Férias', 'Afastado'].includes(status) ? status : 'Ativo';

  // 1. Insert into users table
  run(
    `INSERT INTO users (id, name, cpf, phone, email, login, password_hash, raw_password, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, cleanName, cleanCpf, cleanPhone, cleanEmail, cleanLogin, passwordHash, rawPassword, role, userStatus, now, now]
  );

  // 2. If role is MOTORISTA, also insert into drivers table to keep them unified!
  let driverId: string | null = null;
  if (role === 'MOTORISTA') {
    driverId = `drv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    run(
      `INSERT INTO drivers (id, user_id, name, cpf, registration, phone, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [driverId, id, cleanName, cleanCpf, cleanLogin, cleanPhone, driverStatus, now, now]
    );
  }

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Criação de Usuário',
    'USUÁRIOS',
    id,
    `Criou usuário ${cleanLogin} (${cleanName}) como ${role} com status ${userStatus}.`
  );

  res.status(201).json({ 
    id, 
    driverId,
    message: role === 'MOTORISTA' 
      ? `Motorista cadastrado com sucesso! Matrícula/Login: ${cleanLogin}`
      : `Administrador cadastrado com sucesso! Login: ${cleanLogin}`
  });
});

// PUT /api/users/:id - Edit user
usersRouter.put('/:id', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, cpf, phone, email, login, password, role, status } = req.body;

    const user = queryOne<any>(`SELECT * FROM users WHERE id = ?`, [id]);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Prevent modifying the master developer's role or status
    if (user.id === 'usr_dev_master' && ((role && role !== 'DESENVOLVEDOR') || status === 'Inativo')) {
      return res.status(400).json({ error: 'Não é permitido desativar ou alterar o perfil do desenvolvedor mestre.' });
    }

    const cleanName = name ? String(name).trim() : user.name;
    const cleanLogin = login ? String(login).trim().toUpperCase() : user.login;
    const cleanPhone = phone !== undefined ? (phone && String(phone).trim().length > 0 ? String(phone).trim() : null) : user.phone;
    // Explicitly allow setting email to null when cleared by user
    const cleanEmail = email !== undefined 
      ? (email && String(email).trim().length > 0 ? String(email).trim().toLowerCase() : null) 
      : user.email;
    const cleanCpf = cpf !== undefined ? (cpf && String(cpf).trim().length > 0 ? String(cpf).trim() : null) : user.cpf;

    // Unique checks excluding current user
    if (cleanCpf && cleanCpf !== user.cpf) {
      const existingCpf = queryOne(`SELECT id FROM users WHERE cpf = ? AND id != ?`, [cleanCpf, id]);
      if (existingCpf) return res.status(400).json({ error: 'Já existe outro usuário cadastrado com este CPF.' });
    }

    if (cleanLogin && cleanLogin.toLowerCase() !== user.login.toLowerCase()) {
      const existingLogin = queryOne(`SELECT id FROM users WHERE LOWER(login) = LOWER(?) AND id != ?`, [cleanLogin, id]);
      if (existingLogin) return res.status(400).json({ error: 'Esta matrícula já está em uso por outro usuário.' });
    }

    if (cleanEmail && cleanEmail !== (user.email ? user.email.toLowerCase() : null)) {
      const existingEmail = queryOne(`SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?`, [cleanEmail, id]);
      if (existingEmail) return res.status(400).json({ error: 'Este e-mail já está em uso por outro usuário.' });
    }

    const now = new Date().toISOString();
    let newPasswordHash = user.password_hash;
    let newRawPassword = user.raw_password || null;
    if (password !== undefined && password !== null) {
      const cleanPass = String(password).trim();
      if (cleanPass.length > 0) {
        if (cleanPass.length < 4) {
          return res.status(400).json({ error: 'A nova senha deve possuir no mínimo 4 caracteres.' });
        }
        newPasswordHash = bcrypt.hashSync(cleanPass, 10);
        newRawPassword = cleanPass;
      }
    }

    const newRole = role || user.role;
    const newStatus = status || user.status;

    run(
      `UPDATE users 
       SET name = ?, cpf = ?, phone = ?, email = ?, login = ?, password_hash = ?, raw_password = ?, role = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [
        cleanName,
        cleanCpf,
        cleanPhone,
        cleanEmail,
        cleanLogin,
        newPasswordHash,
        newRawPassword,
        newRole,
        newStatus,
        now,
        id
      ]
    );

    // If user is linked to a driver, keep driver record synchronized
    const linkedDriver = queryOne<any>(`SELECT id FROM drivers WHERE user_id = ?`, [id]);
    if (linkedDriver) {
      run(
        `UPDATE drivers 
         SET name = ?, registration = ?, phone = ?, status = ?, updated_at = ?
         WHERE id = ?`,
        [
          cleanName,
          cleanLogin,
          cleanPhone,
          newStatus === 'Inativo' ? 'Inativo' : 'Ativo',
          now,
          linkedDriver.id
        ]
      );
    } else if (newRole === 'MOTORISTA') {
      const driverId = `drv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      run(
        `INSERT INTO drivers (id, user_id, name, registration, phone, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [driverId, id, cleanName, cleanLogin, cleanPhone, newStatus === 'Inativo' ? 'Inativo' : 'Ativo', now, now]
      );
    }

    logAudit(
      req.user!.userId,
      req.user!.name,
      req.user!.role,
      'Edição de Usuário',
      'USUÁRIOS',
      id,
      `Atualizou cadastro do usuário ${cleanLogin} (E-mail: ${cleanEmail || 'Não informado'}, Status: ${newStatus}).`
    );

    const updatedUser = queryOne<any>(
      `SELECT u.id, u.name, u.cpf, u.phone, u.email, u.login, u.raw_password, u.role, u.status, u.created_at, u.updated_at,
              d.id as driver_id, d.registration as driver_registration, d.cnh, d.cnh_category, d.status as driver_status
       FROM users u
       LEFT JOIN drivers d ON d.user_id = u.id
       WHERE u.id = ?`,
      [id]
    );

    res.json({ message: 'Usuário atualizado com sucesso.', user: updatedUser });
  } catch (err: any) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: err.message || 'Erro ao atualizar dados do usuário.' });
  }
});

// PATCH /api/users/:id/status - Toggle or change status
usersRouter.patch('/:id/status', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['Ativo', 'Inativo'].includes(status)) {
    return res.status(400).json({ error: 'Status inválido. Use Ativo ou Inativo.' });
  }

  const user = queryOne<any>(`SELECT * FROM users WHERE id = ?`, [id]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  if (user.role === 'DESENVOLVEDOR') {
    return res.status(400).json({ error: 'O desenvolvedor mestre não pode ser desativado.' });
  }

  const now = new Date().toISOString();
  run(`UPDATE users SET status = ?, updated_at = ? WHERE id = ?`, [status, now, id]);

  if (status === 'Inativo') {
    run(`UPDATE drivers SET status = 'Inativo', updated_at = ? WHERE user_id = ?`, [now, id]);
  } else {
    run(`UPDATE drivers SET status = 'Ativo', updated_at = ? WHERE user_id = ?`, [now, id]);
  }

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Alteração de Status de Usuário',
    'USUÁRIOS',
    id,
    `Alterou status do usuário ${user.login} para ${status}.`
  );

  res.json({ message: `Status do usuário alterado para ${status}.` });
});

// DELETE /api/users/:id - Delete user and linked driver
usersRouter.delete('/:id', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const user = queryOne<any>(`SELECT * FROM users WHERE id = ?`, [id]);
  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  // Prevent deleting master developer
  if (user.id === 'usr_dev_master' || user.login === 'dev') {
    return res.status(400).json({ error: 'Não é permitido excluir o usuário Desenvolvedor Master.' });
  }

  // Prevent self-deletion
  if (req.user?.userId === id) {
    return res.status(400).json({ error: 'Você não pode excluir sua própria conta enquanto estiver conectado.' });
  }

  // Check if driver is linked
  const linkedDriver = queryOne<any>(`SELECT id FROM drivers WHERE user_id = ?`, [id]);
  if (linkedDriver) {
    // Check if there are active trips
    const activeTrips = queryOne<any>(
      `SELECT COUNT(*) as count FROM trips WHERE driver_id = ? AND status IN ('Em deslocamento', 'Na fábrica', 'Retornando')`,
      [linkedDriver.id]
    )?.count || 0;

    if (activeTrips > 0) {
      return res.status(400).json({ 
        error: 'Não é possível excluir este motorista pois existem viagens em andamento vinculadas a ele. Finalize ou cancele as viagens primeiro.' 
      });
    }

    // Clean up schedules and completed/planned trips associated with this driver to avoid orphan references
    run(`DELETE FROM schedules WHERE driver_id = ?`, [linkedDriver.id]);
    run(`DELETE FROM trips WHERE driver_id = ?`, [linkedDriver.id]);
    run(`DELETE FROM drivers WHERE id = ?`, [linkedDriver.id]);
  }

  // Delete the user record
  run(`DELETE FROM users WHERE id = ?`, [id]);

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Exclusão de Usuário',
    'USUÁRIOS',
    id,
    `Excluiu permanentemente o usuário ${user.login} (${user.name}, perfil: ${user.role}).`
  );

  res.json({ message: `Usuário ${user.name} (${user.login}) excluído com sucesso.` });
});
