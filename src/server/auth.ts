import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { queryOne } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'gestao_puxada_super_secret_jwt_key_2026';

export interface TokenPayload {
  userId: string;
  name: string;
  email: string;
  login: string;
  role: 'DESENVOLVEDOR' | 'ADMINISTRADOR' | 'MOTORISTA';
  driverId?: string | null;
}

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso não autorizado. Token ausente ou inválido.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    
    // Check if user still exists and is active in database
    const user = queryOne(`SELECT id, status, role FROM users WHERE id = ?`, [decoded.userId]);
    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado.' });
    }
    if (user.status !== 'Ativo') {
      return res.status(403).json({ error: 'Acesso bloqueado. Este usuário está inativo no sistema.' });
    }

    // If driver, check driver status as well
    if (user.role === 'MOTORISTA') {
      const driver = queryOne<any>(`SELECT id, status FROM drivers WHERE user_id = ? OR registration = ?`, [user.id, (user as any).login]);
      if (driver) {
        decoded.driverId = driver.id;
        if (driver.status === 'Inativo') {
          return res.status(403).json({ error: 'Acesso bloqueado. O cadastro de motorista está inativo.' });
        }
      }
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão expirada ou inválida. Faça login novamente.' });
  }
}

export function requireRole(allowedRoles: Array<'DESENVOLVEDOR' | 'ADMINISTRADOR' | 'MOTORISTA'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Acesso não autorizado.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: `Acesso negado. Esta operação exige perfil ${allowedRoles.join(' ou ')}.` 
      });
    }

    next();
  };
}
