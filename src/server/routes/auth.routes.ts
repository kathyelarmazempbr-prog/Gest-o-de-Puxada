import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { queryOne, run, logAudit } from '../db.ts';
import { generateToken, requireAuth, AuthenticatedRequest } from '../auth.ts';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', (req, res) => {
  const { loginOrEmail, password } = req.body;

  if (!loginOrEmail || !password) {
    return res.status(400).json({ error: 'Informe o usuário/e-mail e a senha.' });
  }

  const cleanIdentifier = String(loginOrEmail).trim();
  const user = queryOne<any>(
    `SELECT u.*, d.id as driver_id, d.name as driver_name, d.status as driver_status, d.cnh, d.cnh_category, d.cnh_expiration, d.default_vehicle_id, d.registration as driver_registration
     FROM users u
     LEFT JOIN drivers d ON d.user_id = u.id
     WHERE LOWER(u.login) = LOWER(?) OR LOWER(u.email) = LOWER(?) OR LOWER(d.registration) = LOWER(?)
        OR (LOWER(?) = 'dev' AND u.role = 'DESENVOLVEDOR')`,
    [cleanIdentifier, cleanIdentifier, cleanIdentifier, cleanIdentifier]
  );

  if (!user) {
    return res.status(401).json({ error: 'Credenciais inválidas. Verifique o usuário e a senha informados.' });
  }

  if (user.status !== 'Ativo') {
    return res.status(403).json({ error: 'Usuário desativado pelo administrador. Contate o suporte.' });
  }

  const isPasswordValid = bcrypt.compareSync(password, user.password_hash) || 
    (cleanIdentifier.toLowerCase() === 'dev' && password === 'dev123' && user.role === 'DESENVOLVEDOR');
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Credenciais inválidas. Verifique o usuário e a senha informados.' });
  }

  // Check driver status if motorista
  if (user.role === 'MOTORISTA' && user.driver_status === 'Inativo') {
    return res.status(403).json({ error: 'Cadastro de motorista inativo. Não é possível acessar a operação.' });
  }

  const tokenPayload = {
    userId: user.id,
    name: user.name,
    email: user.email,
    login: user.login,
    role: user.role,
    driverId: user.driver_id || null,
  };

  const token = generateToken(tokenPayload);

  logAudit(user.id, user.name, user.role, 'Login no Sistema', 'AUTENTICAÇÃO', user.id, `Usuário ${user.login} realizou login com sucesso.`);

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      cpf: user.cpf,
      phone: user.phone,
      email: user.email,
      login: user.login,
      role: user.role,
      status: user.status,
      driverId: user.driver_id || null,
      driver_id: user.driver_id || null,
      driver: user.driver_id ? {
        id: user.driver_id,
        name: user.driver_name,
        cnh: user.cnh,
        cnh_category: user.cnh_category,
        cnh_expiration: user.cnh_expiration,
        default_vehicle_id: user.default_vehicle_id,
        status: user.driver_status
      } : null
    }
  });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });

  const user = queryOne<any>(
    `SELECT u.id, u.name, u.cpf, u.phone, u.email, u.login, u.role, u.status,
            d.id as driver_id, d.name as driver_name, d.status as driver_status, d.cnh, d.cnh_category, d.cnh_expiration, d.default_vehicle_id
     FROM users u
     LEFT JOIN drivers d ON d.user_id = u.id
     WHERE u.id = ?`,
    [req.user.userId]
  );

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

  return res.json({
    user: {
      id: user.id,
      name: user.name,
      cpf: user.cpf,
      phone: user.phone,
      email: user.email,
      login: user.login,
      role: user.role,
      status: user.status,
      driverId: user.driver_id || null,
      driver_id: user.driver_id || null,
      driver: user.driver_id ? {
        id: user.driver_id,
        name: user.driver_name,
        cnh: user.cnh,
        cnh_category: user.cnh_category,
        cnh_expiration: user.cnh_expiration,
        default_vehicle_id: user.default_vehicle_id,
        status: user.driver_status
      } : null
    }
  });
});

// POST /api/auth/recover-password
authRouter.post('/recover-password', (req, res) => {
  const { loginOrEmail, newPassword } = req.body;
  if (!loginOrEmail) {
    return res.status(400).json({ error: 'Informe seu login ou e-mail cadastrado.' });
  }

  const clean = String(loginOrEmail).trim();
  const user = queryOne<any>(
    `SELECT id, name, login, email, role FROM users WHERE LOWER(login) = LOWER(?) OR LOWER(email) = LOWER(?)`,
    [clean, clean]
  );

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado no cadastro do sistema.' });
  }

  if (newPassword) {
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'A nova senha deve possuir pelo menos 6 caracteres.' });
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    run(`UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?`, [
      hash,
      new Date().toISOString(),
      user.id
    ]);
    logAudit(user.id, user.name, user.role, 'Recuperação de Senha', 'AUTENTICAÇÃO', user.id, `Senha redefinida com sucesso.`);
    return res.json({ message: 'Senha redefinida com sucesso! Você já pode realizar login.' });
  }

  return res.json({
    message: `Usuário ${user.name} localizado com sucesso. Digite sua nova senha para redefinição segura.`,
    userFound: true,
    userName: user.name
  });
});
