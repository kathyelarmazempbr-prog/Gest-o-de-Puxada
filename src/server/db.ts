import initSqlJs from 'sql.js';
import type { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

let dbInstance: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.resolve(DATA_DIR, 'gestao_puxada.sqlite');
const BACKUP_FILE = path.resolve(DATA_DIR, 'gestao_puxada_backup.json');

export function saveDatabase(): void {
  if (!dbInstance) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);

    // Also maintain JSON mirror backup for double protection
    try {
      const tables = ['users', 'vehicles', 'factories', 'drivers', 'trips', 'schedules', 'audit_logs', 'system_settings'];
      const dump: Record<string, any[]> = {};
      for (const t of tables) {
        try {
          const stmt = dbInstance.prepare(`SELECT * FROM ${t}`);
          const rows: any[] = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          stmt.free();
          dump[t] = rows;
        } catch {
          dump[t] = [];
        }
      }
      fs.writeFileSync(BACKUP_FILE, JSON.stringify(dump, null, 2));
    } catch (e) {
      console.warn('Could not write JSON backup:', e);
    }
  } catch (err) {
    console.error('Failed to save database to disk:', err);
  }
}

function sanitizeParams(params: any[] = []): any[] {
  return params.map(p => (p === undefined ? null : p));
}

export function query<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  const clean = sanitizeParams(params);
  if (clean.length > 0) {
    stmt.bind(clean);
  }
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const res = query<T>(sql, params);
  return res.length > 0 ? res[0] : null;
}

export function run(sql: string, params: any[] = []): { changes: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  const clean = sanitizeParams(params);
  dbInstance.run(sql, clean);
  saveDatabase();
  return { changes: dbInstance.getRowsModified() };
}

export function logAudit(userId: string, userName: string, userRole: string, action: string, module: string, recordId?: string, details?: string) {
  const id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  run(
    `INSERT INTO audit_logs (id, user_id, user_name, user_role, action, module, record_id, details, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, userName, userRole, action, module, recordId || null, details || null, now]
  );
}

export async function initDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
      dbInstance.run("PRAGMA foreign_keys = ON;");
      
      // Auto-migrate new columns
      try { dbInstance.run(`ALTER TABLE trips ADD COLUMN suggested_departure TEXT;`); } catch {}
      try { dbInstance.run(`ALTER TABLE trips ADD COLUMN appointment_window TEXT;`); } catch {}
      try { dbInstance.run(`ALTER TABLE trips ADD COLUMN order_number TEXT;`); } catch {}
      try { dbInstance.run(`ALTER TABLE trips ADD COLUMN appointment_image_url TEXT;`); } catch {}
      try { dbInstance.run(`ALTER TABLE trips ADD COLUMN products_image_url TEXT;`); } catch {}
      try { dbInstance.run(`ALTER TABLE trips ADD COLUMN initial_km REAL;`); } catch {}
      try { dbInstance.run(`ALTER TABLE trips ADD COLUMN final_km REAL;`); } catch {}
      try { dbInstance.run(`ALTER TABLE trips ADD COLUMN total_km REAL;`); } catch {}
      try { dbInstance.run(`ALTER TABLE trips ADD COLUMN total_time TEXT;`); } catch {}
      try { dbInstance.run(`ALTER TABLE trips ADD COLUMN meals_count INTEGER DEFAULT 0;`); } catch {}
      try { dbInstance.run(`ALTER TABLE trips ADD COLUMN arrival_at_factory_time TEXT;`); } catch {}
      try { dbInstance.run(`ALTER TABLE trips ADD COLUMN loading_start_time TEXT;`); } catch {}
      try { dbInstance.run(`ALTER TABLE trips ADD COLUMN loading_end_time TEXT;`); } catch {}
      try { dbInstance.run(`ALTER TABLE trips ADD COLUMN departure_from_factory_time TEXT;`); } catch {}
      try { dbInstance.run(`ALTER TABLE users ADD COLUMN raw_password TEXT;`); } catch {}
      try {
        dbInstance.run(`
          UPDATE trips 
          SET appointment_window = REPLACE(REPLACE(appointment_window, 'de ', ''), ' até ', ' – ') 
          WHERE appointment_window LIKE '%de % até %';
        `);
      } catch {}

      console.log('Loaded existing database from', DB_FILE);
      return dbInstance;
    } catch (e) {
      console.error('Error loading existing database file, recreating:', e);
    }
  }

  dbInstance = new SQL.Database();
  dbInstance.run("PRAGMA foreign_keys = ON;");

  // Create tables
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cpf TEXT,
      phone TEXT,
      email TEXT,
      login TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      raw_password TEXT,
      role TEXT NOT NULL CHECK(role IN ('DESENVOLVEDOR', 'ADMINISTRADOR', 'MOTORISTA')),
      status TEXT NOT NULL DEFAULT 'Ativo' CHECK(status IN ('Ativo', 'Inativo')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      plate TEXT UNIQUE NOT NULL,
      vehicle_number TEXT NOT NULL,
      brand TEXT NOT NULL,
      model TEXT DEFAULT '',
      year INTEGER NOT NULL,
      type TEXT NOT NULL,
      capacity TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Disponível' CHECK(status IN ('Disponível', 'Em viagem', 'Manutenção', 'Inativo')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS factories (
      id TEXT PRIMARY KEY,
      factory_code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      state TEXT NOT NULL,
      city TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Ativa' CHECK(status IN ('Ativa', 'Inativa')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE REFERENCES users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      cpf TEXT,
      registration TEXT UNIQUE NOT NULL,
      phone TEXT,
      cnh TEXT,
      cnh_category TEXT,
      cnh_expiration TEXT,
      default_vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'Ativo' CHECK(status IN ('Ativo', 'Inativo', 'Férias', 'Afastado')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      driver_id TEXT NOT NULL REFERENCES drivers(id),
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
      factory_id TEXT NOT NULL REFERENCES factories(id),
      planned_departure TEXT NOT NULL,
      planned_arrival TEXT,
      actual_departure_date TEXT,
      actual_departure TEXT,
      actual_arrival_date TEXT,
      actual_arrival TEXT,
      status TEXT NOT NULL DEFAULT 'Programada' CHECK(status IN ('Programada', 'Em deslocamento', 'Na fábrica', 'Retornando', 'Finalizada', 'Cancelada')),
      observation TEXT,
      cancel_reason TEXT,
      suggested_departure TEXT,
      appointment_window TEXT,
      order_number TEXT,
      appointment_image_url TEXT,
      products_image_url TEXT,
      initial_km REAL,
      final_km REAL,
      total_km REAL,
      total_time TEXT,
      meals_count INTEGER DEFAULT 0,
      arrival_at_factory_time TEXT,
      loading_start_time TEXT,
      loading_end_time TEXT,
      departure_from_factory_time TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      driver_id TEXT NOT NULL REFERENCES drivers(id),
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
      factory_id TEXT NOT NULL REFERENCES factories(id),
      shift_time TEXT NOT NULL,
      observation TEXT,
      status TEXT NOT NULL DEFAULT 'Confirmada' CHECK(status IN ('Confirmada', 'Pendente', 'Cancelada')),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      action TEXT NOT NULL,
      module TEXT NOT NULL,
      record_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Run migrations for execution dates if upgrading existing databases
  try {
    dbInstance.run(`ALTER TABLE trips ADD COLUMN actual_departure_date TEXT`);
  } catch {}
  try {
    dbInstance.run(`ALTER TABLE trips ADD COLUMN actual_arrival_date TEXT`);
  } catch {}

  // Try to restore from JSON backup if available and tables are empty
  let restoredFromBackup = false;
  if (fs.existsSync(BACKUP_FILE)) {
    try {
      const backupRaw = fs.readFileSync(BACKUP_FILE, 'utf-8');
      const backupData = JSON.parse(backupRaw);
      const userList = backupData.users || [];
      if (userList.length > 0) {
        for (const u of userList) {
          dbInstance.run(
            `INSERT OR REPLACE INTO users (id, name, cpf, phone, email, login, password_hash, raw_password, role, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [u.id, u.name, u.cpf || null, u.phone || null, u.email || null, u.login, u.password_hash, u.raw_password || null, u.role, u.status, u.created_at, u.updated_at]
          );
        }
        for (const v of backupData.vehicles || []) {
          dbInstance.run(
            `INSERT OR REPLACE INTO vehicles (id, plate, vehicle_number, brand, model, year, type, capacity, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [v.id, v.plate, v.vehicle_number, v.brand, v.model, v.year, v.type, v.capacity, v.status, v.created_at, v.updated_at]
          );
        }
        for (const f of backupData.factories || []) {
          dbInstance.run(
            `INSERT OR REPLACE INTO factories (id, factory_code, name, state, city, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [f.id, f.factory_code, f.name, f.state, f.city, f.status, f.created_at, f.updated_at]
          );
        }
        for (const d of backupData.drivers || []) {
          dbInstance.run(
            `INSERT OR REPLACE INTO drivers (id, user_id, name, cpf, registration, phone, cnh, cnh_category, cnh_expiration, default_vehicle_id, status, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [d.id, d.user_id, d.name, d.cpf, d.registration, d.phone, d.cnh, d.cnh_category, d.cnh_expiration, d.default_vehicle_id, d.status, d.created_at, d.updated_at]
          );
        }
        for (const t of backupData.trips || []) {
          dbInstance.run(
            `INSERT OR REPLACE INTO trips (id, date, driver_id, vehicle_id, factory_id, planned_departure, planned_arrival, actual_departure_date, actual_departure, actual_arrival_date, actual_arrival, arrival_at_factory_time, loading_start_time, loading_end_time, departure_from_factory_time, status, observation, cancel_reason, suggested_departure, appointment_window, order_number, appointment_image_url, products_image_url, initial_km, final_km, total_km, total_time, meals_count, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [t.id, t.date, t.driver_id, t.vehicle_id, t.factory_id, t.planned_departure, t.planned_arrival, t.actual_departure_date || null, t.actual_departure || null, t.actual_arrival_date || null, t.actual_arrival || null, t.arrival_at_factory_time || null, t.loading_start_time || null, t.loading_end_time || null, t.departure_from_factory_time || null, t.status, t.observation, t.cancel_reason, t.suggested_departure, t.appointment_window, t.order_number, t.appointment_image_url, t.products_image_url, t.initial_km, t.final_km, t.total_km, t.total_time, t.meals_count, t.created_by, t.created_at, t.updated_at]
          );
        }
        for (const s of backupData.schedules || []) {
          dbInstance.run(
            `INSERT OR REPLACE INTO schedules (id, date, driver_id, vehicle_id, factory_id, shift_time, observation, status, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [s.id, s.date, s.driver_id, s.vehicle_id, s.factory_id, s.shift_time, s.observation, s.status, s.created_by, s.created_at, s.updated_at]
          );
        }
        for (const a of backupData.audit_logs || []) {
          dbInstance.run(
            `INSERT OR REPLACE INTO audit_logs (id, user_id, user_name, user_role, action, module, record_id, details, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [a.id, a.user_id, a.user_name, a.user_role, a.action, a.module, a.record_id, a.details, a.created_at]
          );
        }
        restoredFromBackup = true;
        console.log('[DB] Restored records from JSON backup successfully');
      }
    } catch (err) {
      console.warn('[DB] Failed to restore from JSON backup:', err);
    }
  }

  // Seed default developer and sample data ONLY if database is truly empty
  if (!restoredFromBackup) {
    await seedInitialData(dbInstance);
  }

  saveDatabase();
  console.log('Database initialized.');
  return dbInstance;
}

async function seedInitialData(db: Database) {
  const now = new Date().toISOString();
  const salt = bcrypt.genSaltSync(10);

  // 1. Master Developer (Only if no developer exists)
  const existingDev = queryOne<any>(`SELECT id FROM users WHERE role = 'DESENVOLVEDOR'`);
  if (!existingDev) {
    const devPass = bcrypt.hashSync('dev123', salt);
    db.run(`
      INSERT INTO users (id, name, cpf, phone, email, login, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      'usr_dev_master',
      'Desenvolvedor Master',
      '000.000.000-00',
      '(11) 99999-0000',
      'dev@puxada.log.br',
      'dev',
      devPass,
      'DESENVOLVEDOR',
      'Ativo',
      now,
      now
    ]);
  }

  // Initial System Settings
  try {
    const hasSettings = queryOne<any>(`SELECT COUNT(*) as count FROM system_settings`)?.count || 0;
    if (hasSettings === 0) {
      db.run(`
        INSERT INTO system_settings (id, key, value, updated_at)
        VALUES (?, ?, ?, ?),
               (?, ?, ?, ?),
               (?, ?, ?, ?)
      `, [
        'stg_1', 'system_name', 'GESTÃO DE PUXADA', now,
        'stg_2', 'company_name', 'Operação Logística de Distribuição e Transporte', now,
        'stg_3', 'version', '1.0.0', now
      ]);
    } else {
      db.run(`UPDATE system_settings SET value = '1.0.0' WHERE key = 'version' AND value LIKE '%MVP%'`);
    }
  } catch {}
}
