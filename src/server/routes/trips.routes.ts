import { Router, Response } from 'express';
import { query, queryOne, run, logAudit } from '../db.ts';
import { requireAuth, requireRole, AuthenticatedRequest } from '../auth.ts';

export const tripsRouter = Router();

// GET /api/trips - List trips with filters and RBAC isolation
tripsRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { 
    search, status, driverId, vehicleId, factoryId, 
    startDate, endDate, state, todayOnly, limit, offset 
  } = req.query;

  let sql = `
    SELECT t.*, 
           d.name as driver_name, d.cpf as driver_cpf, d.registration as driver_registration, d.phone as driver_phone,
           v.plate as vehicle_plate, v.vehicle_number as vehicle_number, v.brand as vehicle_brand, v.model as vehicle_model,
           f.factory_code as factory_code, f.name as factory_name, f.state as factory_state, f.city as factory_city,
           u.name as created_by_name
    FROM trips t
    LEFT JOIN drivers d ON d.id = t.driver_id
    LEFT JOIN vehicles v ON v.id = t.vehicle_id
    LEFT JOIN factories f ON f.id = t.factory_id
    LEFT JOIN users u ON u.id = t.created_by
    WHERE 1=1
  `;
  const params: any[] = [];

  // RULE 9: Strict RBAC at backend level - Driver can only see their own trips!
  if (req.user?.role === 'MOTORISTA') {
    if (!req.user.driverId) {
      return res.json([]);
    }
    sql += ` AND t.driver_id = ?`;
    params.push(req.user.driverId);
  } else if (driverId) {
    sql += ` AND t.driver_id = ?`;
    params.push(driverId);
  }

  if (todayOnly === 'true') {
    const today = new Date().toISOString().split('T')[0];
    sql += ` AND t.date = ?`;
    params.push(today);
  }

  if (status) {
    sql += ` AND t.status = ?`;
    params.push(status);
  }

  if (vehicleId) {
    sql += ` AND t.vehicle_id = ?`;
    params.push(vehicleId);
  }

  if (factoryId) {
    sql += ` AND t.factory_id = ?`;
    params.push(factoryId);
  }

  if (state) {
    sql += ` AND f.state = ?`;
    params.push(state);
  }

  if (startDate) {
    sql += ` AND t.date >= ?`;
    params.push(startDate);
  }

  if (endDate) {
    sql += ` AND t.date <= ?`;
    params.push(endDate);
  }

  if (search) {
    sql += ` AND (LOWER(d.name) LIKE ? OR LOWER(v.plate) LIKE ? OR LOWER(f.name) LIKE ? OR LOWER(f.city) LIKE ?)`;
    const term = `%${String(search).toLowerCase()}%`;
    params.push(term, term, term, term);
  }

  sql += ` ORDER BY t.date DESC, t.planned_departure DESC`;

  if (limit) {
    sql += ` LIMIT ?`;
    params.push(parseInt(String(limit), 10));
    if (offset) {
      sql += ` OFFSET ?`;
      params.push(parseInt(String(offset), 10));
    }
  }

  const trips = query(sql, params);
  res.json(trips);
});

// GET /api/trips/:id - Trip details with RBAC check
tripsRouter.get('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const trip = queryOne<any>(
    `SELECT t.*, 
            d.name as driver_name, d.cpf as driver_cpf, d.registration as driver_registration, d.phone as driver_phone, d.cnh as driver_cnh, d.cnh_category as driver_cnh_category,
            v.plate as vehicle_plate, v.vehicle_number as vehicle_number, v.brand as vehicle_brand, v.model as vehicle_model, v.type as vehicle_type, v.capacity as vehicle_capacity,
            f.factory_code as factory_code, f.name as factory_name, f.state as factory_state, f.city as factory_city,
            u.name as created_by_name
     FROM trips t
     LEFT JOIN drivers d ON d.id = t.driver_id
     LEFT JOIN vehicles v ON v.id = t.vehicle_id
     LEFT JOIN factories f ON f.id = t.factory_id
     LEFT JOIN users u ON u.id = t.created_by
     WHERE t.id = ?`,
    [id]
  );

  if (!trip) {
    return res.status(404).json({ error: 'Viagem não encontrada.' });
  }

  // RULE 9: Motorista can NEVER view another driver's trip (Strict Backend Check - Test 2)
  if (req.user?.role === 'MOTORISTA') {
    if (req.user.driverId !== trip.driver_id) {
      return res.status(403).json({ error: 'Acesso negado. Você não tem permissão para visualizar detalhes desta viagem.' });
    }
  }

  // Fetch status audit trail for this trip
  const auditLogs = query(
    `SELECT * FROM audit_logs WHERE record_id = ? ORDER BY created_at ASC`,
    [id]
  );

  res.json({ ...trip, audit_logs: auditLogs });
});

function cleanAppointmentWindow(win?: any): string | null {
  if (!win || !String(win).trim()) return null;
  const str = String(win).trim();
  const times = str.match(/\b\d{1,2}:\d{2}\b/g);
  if (times && times.length >= 2) {
    return `${times[0]} – ${times[1]}`;
  }
  if (times && times.length === 1) {
    return times[0];
  }
  return str.replace(/de\s+/gi, '').replace(/\s*até\s*/gi, ' – ').replace(/➔|->/g, '–').trim();
}

function calculateTotalTripTime(
  departure: string, 
  arrival: string, 
  departureDate?: string, 
  arrivalDate?: string
): string {
  try {
    if (departureDate && arrivalDate && departure && arrival) {
      const depParts = departure.match(/(\d{1,2}):(\d{2})/);
      const arrParts = arrival.match(/(\d{1,2}):(\d{2})/);
      if (depParts && arrParts) {
        const depIso = `${departureDate}T${depParts[1].padStart(2, '0')}:${depParts[2]}:00`;
        const arrIso = `${arrivalDate}T${arrParts[1].padStart(2, '0')}:${arrParts[2]}:00`;
        const dt1 = new Date(depIso);
        const dt2 = new Date(arrIso);
        if (!isNaN(dt1.getTime()) && !isNaN(dt2.getTime())) {
          const diffMinutes = Math.round((dt2.getTime() - dt1.getTime()) / (1000 * 60));
          if (diffMinutes >= 0) {
            const hours = Math.floor(diffMinutes / 60);
            const mins = diffMinutes % 60;
            if (hours > 0 && mins > 0) {
              return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
            } else if (hours > 0) {
              return `${String(hours).padStart(2, '0')}h 00m`;
            } else {
              return `${mins}m`;
            }
          }
        }
      }
    }

    const depParts = departure.match(/(\d{1,2}):(\d{2})/);
    const arrParts = arrival.match(/(\d{1,2}):(\d{2})/);
    if (!depParts || !arrParts) return '—';
    
    const depH = parseInt(depParts[1], 10);
    const depM = parseInt(depParts[2], 10);
    const arrH = parseInt(arrParts[1], 10);
    const arrM = parseInt(arrParts[2], 10);
    
    let diffMinutes = (arrH * 60 + arrM) - (depH * 60 + depM);
    if (diffMinutes < 0) {
      diffMinutes += 24 * 60; // Virada de dia
    }
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    if (hours > 0 && mins > 0) {
      return `${String(hours).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
    } else if (hours > 0) {
      return `${String(hours).padStart(2, '0')}h 00m`;
    } else {
      return `${mins}m`;
    }
  } catch {
    return '—';
  }
}

function canOperateTrip(req: AuthenticatedRequest, trip: any): boolean {
  if (req.user?.role === 'ADMINISTRADOR' || req.user?.role === 'DESENVOLVEDOR') return true;
  if (req.user?.role === 'MOTORISTA') {
    return req.user.driverId === trip.driver_id || req.user.userId === trip.driver_user_id;
  }
  return false;
}

// POST /api/trips - Create new trip (ADMIN or DEV)
tripsRouter.post('/', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { 
    date, driver_id, vehicle_id, factory_id, 
    planned_departure, planned_arrival, observation,
    suggested_departure, appointment_window, order_number,
    appointment_image_url, products_image_url
  } = req.body;

  // RULE 1: Trip must have driver
  if (!driver_id) {
    return res.status(400).json({ error: 'Regra de negócio violada: Uma viagem obrigatoriamente deve possuir motorista.' });
  }

  // RULE 2: Trip must have vehicle
  if (!vehicle_id) {
    return res.status(400).json({ error: 'Regra de negócio violada: Uma viagem obrigatoriamente deve possuir veículo.' });
  }

  // RULE 3: Trip must have factory
  if (!factory_id) {
    return res.status(400).json({ error: 'Regra de negócio violada: Uma viagem obrigatoriamente deve possuir fábrica de destino.' });
  }

  // RULE 4: Trip must have date
  if (!date) {
    return res.status(400).json({ error: 'Regra de negócio violada: Uma viagem obrigatoriamente deve possuir data.' });
  }

  // Planned departure resolution (optional in new UI)
  const cleanPlannedDeparture = planned_departure || (appointment_window ? appointment_window.replace(/[^0-9:]/g, ' ').trim().split(/\s+/)[0] : '') || '08:00';

  // RULE 6: Inactive driver cannot receive new trip (TESTE 3)
  const driver = queryOne<any>(`SELECT id, name, status FROM drivers WHERE id = ?`, [driver_id]);
  if (!driver) {
    return res.status(404).json({ error: 'Motorista selecionado não foi encontrado.' });
  }
  if (driver.status !== 'Ativo') {
    return res.status(400).json({ 
      error: `Regra de negócio violada: O motorista ${driver.name} está com status "${driver.status}" e não pode receber nova viagem.` 
    });
  }

  // RULE 7: Inactive vehicle cannot receive new trip (TESTE 4)
  const vehicle = queryOne<any>(`SELECT id, plate, status FROM vehicles WHERE id = ?`, [vehicle_id]);
  if (!vehicle) {
    return res.status(404).json({ error: 'Veículo selecionado não foi encontrado.' });
  }
  if (vehicle.status === 'Inativo') {
    return res.status(400).json({ 
      error: `Regra de negócio violada: O veículo de placa ${vehicle.plate} está Inativo e não pode receber nova viagem.` 
    });
  }
  if (vehicle.status === 'Manutenção') {
    return res.status(400).json({ 
      error: `Regra de negócio violada: O veículo de placa ${vehicle.plate} está em Manutenção e não pode ser escalado.` 
    });
  }

  // RULE 8: Inactive factory cannot receive new trip
  const factory = queryOne<any>(`SELECT id, name, factory_code, status FROM factories WHERE id = ?`, [factory_id]);
  if (!factory) {
    return res.status(404).json({ error: 'Fábrica selecionada não foi encontrada.' });
  }
  if (factory.status !== 'Ativa') {
    return res.status(400).json({ 
      error: `Regra de negócio violada: A fábrica ${factory.name} (${factory.factory_code}) está Inativa e não pode receber novas viagens.` 
    });
  }

  const id = `trp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  run(
    `INSERT INTO trips (
      id, date, driver_id, vehicle_id, factory_id, 
      planned_departure, planned_arrival, status, observation,
      suggested_departure, appointment_window, order_number,
      appointment_image_url, products_image_url,
      created_by, created_at, updated_at
    )
     VALUES (?, ?, ?, ?, ?, ?, ?, 'Programada', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      date,
      driver_id,
      vehicle_id,
      factory_id,
      cleanPlannedDeparture,
      planned_arrival || null,
      observation || null,
      suggested_departure || null,
      cleanAppointmentWindow(appointment_window),
      order_number || null,
      appointment_image_url || null,
      products_image_url || null,
      req.user!.userId,
      now,
      now
    ]
  );

  // Update vehicle status to 'Disponível' or keep track
  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Criação de Viagem',
    'VIAGENS',
    id,
    `Criou viagem para ${driver.name} no veículo ${vehicle.plate} com destino a ${factory.name} em ${date} às ${cleanPlannedDeparture}.`
  );

  res.status(201).json({ id, message: 'Viagem criada com sucesso.' });
});

// PUT /api/trips/:id - Edit trip (ADMIN or DEV)
tripsRouter.put('/:id', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { 
    date, driver_id, vehicle_id, factory_id, 
    planned_departure, planned_arrival, observation,
    suggested_departure, appointment_window, order_number,
    appointment_image_url, products_image_url, status
  } = req.body;

  const current = queryOne<any>(`SELECT * FROM trips WHERE id = ?`, [id]);
  if (!current) return res.status(404).json({ error: 'Viagem não encontrada.' });

  if (current.status === 'Finalizada' || current.status === 'Cancelada') {
    if (req.user?.role !== 'DESENVOLVEDOR') {
      return res.status(403).json({ 
        error: `Apenas usuários com perfil de DESENVOLVEDOR podem alterar dados ou histórico de viagens já finalizadas ou canceladas.` 
      });
    }
  }

  const now = new Date().toISOString();
  run(
    `UPDATE trips
     SET date = ?, driver_id = ?, vehicle_id = ?, factory_id = ?, 
         planned_departure = ?, planned_arrival = ?, observation = ?,
         suggested_departure = ?, appointment_window = ?, order_number = ?,
         appointment_image_url = ?, products_image_url = ?,
         status = ?, updated_at = ?
     WHERE id = ?`,
    [
      date || current.date,
      driver_id || current.driver_id,
      vehicle_id || current.vehicle_id,
      factory_id || current.factory_id,
      planned_departure || current.planned_departure,
      planned_arrival !== undefined ? (planned_arrival || null) : current.planned_arrival,
      observation !== undefined ? (observation || null) : current.observation,
      suggested_departure !== undefined ? (suggested_departure || null) : current.suggested_departure,
      appointment_window !== undefined ? cleanAppointmentWindow(appointment_window) : current.appointment_window,
      order_number !== undefined ? (order_number ? String(order_number).trim() : null) : current.order_number,
      appointment_image_url !== undefined ? appointment_image_url : current.appointment_image_url,
      products_image_url !== undefined ? products_image_url : current.products_image_url,
      status || current.status,
      now,
      id
    ]
  );

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Edição de Viagem',
    'VIAGENS',
    id,
    `Atualizou programação da viagem ${id} (Data: ${date || current.date}, Destino: ${factory_id || current.factory_id}).`
  );

  res.json({ message: 'Viagem atualizada com sucesso.' });
});

// POST /api/trips/:id/start - Motorista / Admin inicia deslocamento
tripsRouter.post('/:id/start', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { actual_departure_date, date, actual_departure, initial_km } = req.body;

  const trip = queryOne<any>(
    `SELECT t.*, d.user_id as driver_user_id, d.name as driver_name, v.plate as vehicle_plate
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     JOIN vehicles v ON v.id = t.vehicle_id
     WHERE t.id = ?`,
    [id]
  );
  if (!trip) return res.status(404).json({ error: 'Viagem não encontrada.' });

  if (!canOperateTrip(req, trip)) {
    return res.status(403).json({ error: 'Acesso negado. Apenas o motorista escalado ou administradores podem iniciar esta viagem.' });
  }

  if (trip.status === 'Finalizada' || trip.status === 'Cancelada') {
    return res.status(400).json({ error: `Esta viagem já está com status ${trip.status}.` });
  }

  const cleanDeparture = actual_departure && String(actual_departure).trim() 
    ? String(actual_departure).trim() 
    : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // REGRA: A DATA PROGRAMADA (trip.date) permanece intacta e nunca é sobrescrita pela data de saída/execução!
  const depDate = (actual_departure_date && String(actual_departure_date).trim()) 
    || (date && String(date).trim()) 
    || new Date().toISOString().split('T')[0];

  const km = parseFloat(String(initial_km));
  if (isNaN(km) || km < 0) {
    return res.status(400).json({ error: 'Informe um KM Inicial (hodômetro de saída) válido.' });
  }

  const now = new Date().toISOString();
  run(
    `UPDATE trips
     SET status = 'Em deslocamento',
         actual_departure_date = ?,
         actual_departure = ?,
         initial_km = ?,
         updated_at = ?
     WHERE id = ?`,
    [depDate, cleanDeparture, km, now, id]
  );

  run(`UPDATE vehicles SET status = 'Em viagem', updated_at = ? WHERE id = ?`, [now, trip.vehicle_id]);

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Início de Viagem',
    'VIAGENS',
    id,
    `Iniciou deslocamento da viagem ${id}. Data Programada: ${trip.date}, Saída Real: ${depDate} às ${cleanDeparture}, KM Inicial: ${km}.`
  );

  const updatedTrip = queryOne<any>(
    `SELECT t.*, d.name as driver_name, v.plate as vehicle_plate, f.name as factory_name
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN factories f ON f.id = t.factory_id
     WHERE t.id = ?`,
    [id]
  );

  res.json({ message: 'Viagem iniciada com sucesso!', trip: updatedTrip });
});

// POST /api/trips/:id/meals - Motorista / Admin registra refeições
tripsRouter.post('/:id/meals', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { meals_count } = req.body;

  const trip = queryOne<any>(
    `SELECT t.*, d.user_id as driver_user_id, d.name as driver_name
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     WHERE t.id = ?`,
    [id]
  );
  if (!trip) return res.status(404).json({ error: 'Viagem não encontrada.' });

  if (!canOperateTrip(req, trip)) {
    return res.status(403).json({ error: 'Acesso negado. Apenas o motorista escalado ou administradores podem registrar refeições nesta viagem.' });
  }

  if (trip.status === 'Finalizada') {
    return res.status(400).json({ error: 'Esta viagem já foi finalizada e seus dados operacionais estão bloqueados para alteração.' });
  }

  if (trip.status === 'Cancelada') {
    return res.status(400).json({ error: 'Esta viagem foi cancelada e não pode receber registro de refeições.' });
  }

  const count = parseInt(String(meals_count), 10);
  if (isNaN(count) || count < 0) {
    return res.status(400).json({ error: 'Informe uma quantidade válida de refeições (número maior ou igual a zero).' });
  }

  const now = new Date().toISOString();
  run(
    `UPDATE trips
     SET meals_count = ?,
         updated_at = ?
     WHERE id = ?`,
    [count, now, id]
  );

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Registro de Refeições',
    'VIAGENS',
    id,
    `Atualizou total de refeições da viagem ${id} para ${count}.`
  );

  const updatedTrip = queryOne<any>(
    `SELECT t.*, d.name as driver_name, v.plate as vehicle_plate, f.name as factory_name
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN factories f ON f.id = t.factory_id
     WHERE t.id = ?`,
    [id]
  );

  res.json({ message: 'Refeições registradas com sucesso!', trip: updatedTrip });
});

// POST /api/trips/:id/factory-arrival - Motorista / Operador registra chegada na portaria da fábrica
tripsRouter.post('/:id/factory-arrival', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { arrival_at_factory_time } = req.body;

  const trip = queryOne<any>(
    `SELECT t.*, d.user_id as driver_user_id, d.name as driver_name
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     WHERE t.id = ?`,
    [id]
  );
  if (!trip) return res.status(404).json({ error: 'Viagem não encontrada.' });

  if (!canOperateTrip(req, trip)) {
    return res.status(403).json({ error: 'Acesso negado. Apenas o motorista escalado ou administradores podem registrar chegada na fábrica.' });
  }

  if (trip.status === 'Finalizada') {
    return res.status(400).json({ error: 'Esta viagem já foi finalizada e seus registros estão encerrados.' });
  }
  if (trip.status === 'Cancelada') {
    return res.status(400).json({ error: 'Esta viagem foi cancelada.' });
  }

  const timestamp = arrival_at_factory_time && String(arrival_at_factory_time).trim()
    ? String(arrival_at_factory_time).trim()
    : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const now = new Date().toISOString();
  run(
    `UPDATE trips
     SET arrival_at_factory_time = ?,
         status = 'Na fábrica',
         updated_at = ?
     WHERE id = ?`,
    [timestamp, now, id]
  );

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Chegada na Fábrica',
    'VIAGENS',
    id,
    `Registrou chegada na portaria da fábrica da viagem ${id} às ${timestamp}.`
  );

  const updatedTrip = queryOne<any>(
    `SELECT t.*, d.name as driver_name, v.plate as vehicle_plate, f.name as factory_name
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN factories f ON f.id = t.factory_id
     WHERE t.id = ?`,
    [id]
  );

  res.json({ message: 'Chegada na fábrica registrada com sucesso!', trip: updatedTrip });
});

// POST /api/trips/:id/loading-start - Motorista / Operador registra início de carregamento
tripsRouter.post('/:id/loading-start', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { loading_start_time } = req.body;

  const trip = queryOne<any>(
    `SELECT t.*, d.user_id as driver_user_id, d.name as driver_name
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     WHERE t.id = ?`,
    [id]
  );
  if (!trip) return res.status(404).json({ error: 'Viagem não encontrada.' });

  if (!canOperateTrip(req, trip)) {
    return res.status(403).json({ error: 'Acesso negado. Apenas o motorista escalado ou administradores podem registrar o início do carregamento.' });
  }

  if (trip.status === 'Finalizada') {
    return res.status(400).json({ error: 'Esta viagem já foi finalizada.' });
  }
  if (trip.status === 'Cancelada') {
    return res.status(400).json({ error: 'Esta viagem foi cancelada.' });
  }

  const timestamp = loading_start_time && String(loading_start_time).trim()
    ? String(loading_start_time).trim()
    : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const now = new Date().toISOString();
  run(
    `UPDATE trips
     SET loading_start_time = ?,
         status = 'Na fábrica',
         updated_at = ?
     WHERE id = ?`,
    [timestamp, now, id]
  );

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Início de Carregamento',
    'VIAGENS',
    id,
    `Registrou início de carregamento na fábrica da viagem ${id} às ${timestamp}.`
  );

  const updatedTrip = queryOne<any>(
    `SELECT t.*, d.name as driver_name, v.plate as vehicle_plate, f.name as factory_name
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN factories f ON f.id = t.factory_id
     WHERE t.id = ?`,
    [id]
  );

  res.json({ message: 'Início de carregamento registrado com sucesso!', trip: updatedTrip });
});

// POST /api/trips/:id/loading-end - Motorista / Operador registra término de carregamento
tripsRouter.post('/:id/loading-end', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { loading_end_time } = req.body;

  const trip = queryOne<any>(
    `SELECT t.*, d.user_id as driver_user_id, d.name as driver_name
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     WHERE t.id = ?`,
    [id]
  );
  if (!trip) return res.status(404).json({ error: 'Viagem não encontrada.' });

  if (!canOperateTrip(req, trip)) {
    return res.status(403).json({ error: 'Acesso negado. Apenas o motorista escalado ou administradores podem registrar o término do carregamento.' });
  }

  if (trip.status === 'Finalizada') {
    return res.status(400).json({ error: 'Esta viagem já foi finalizada.' });
  }
  if (trip.status === 'Cancelada') {
    return res.status(400).json({ error: 'Esta viagem foi cancelada.' });
  }

  const timestamp = loading_end_time && String(loading_end_time).trim()
    ? String(loading_end_time).trim()
    : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const now = new Date().toISOString();
  run(
    `UPDATE trips
     SET loading_end_time = ?,
         departure_from_factory_time = COALESCE(departure_from_factory_time, ?),
         status = 'Retornando',
         updated_at = ?
     WHERE id = ?`,
    [timestamp, timestamp, now, id]
  );

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Término de Carregamento',
    'VIAGENS',
    id,
    `Registrou finalização de carregamento da viagem ${id} às ${timestamp}. Status atualizado para Retornando.`
  );

  const updatedTrip = queryOne<any>(
    `SELECT t.*, d.name as driver_name, v.plate as vehicle_plate, f.name as factory_name
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN factories f ON f.id = t.factory_id
     WHERE t.id = ?`,
    [id]
  );

  res.json({ message: 'Finalização de carregamento registrada com sucesso!', trip: updatedTrip });
});

// POST /api/trips/:id/factory-departure - Motorista / Operador registra saída da portaria da fábrica
tripsRouter.post('/:id/factory-departure', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { departure_from_factory_time } = req.body;

  const trip = queryOne<any>(
    `SELECT t.*, d.user_id as driver_user_id, d.name as driver_name
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     WHERE t.id = ?`,
    [id]
  );
  if (!trip) return res.status(404).json({ error: 'Viagem não encontrada.' });

  if (!canOperateTrip(req, trip)) {
    return res.status(403).json({ error: 'Acesso negado. Apenas o motorista escalado ou administradores podem registrar a saída da fábrica.' });
  }

  if (trip.status === 'Finalizada') {
    return res.status(400).json({ error: 'Esta viagem já foi finalizada.' });
  }
  if (trip.status === 'Cancelada') {
    return res.status(400).json({ error: 'Esta viagem foi cancelada.' });
  }

  const timestamp = departure_from_factory_time && String(departure_from_factory_time).trim()
    ? String(departure_from_factory_time).trim()
    : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const now = new Date().toISOString();
  run(
    `UPDATE trips
     SET departure_from_factory_time = ?,
         status = 'Retornando',
         updated_at = ?
     WHERE id = ?`,
    [timestamp, now, id]
  );

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Saída da Fábrica',
    'VIAGENS',
    id,
    `Registrou saída da portaria da fábrica da viagem ${id} às ${timestamp}. Status atualizado para Retornando.`
  );

  const updatedTrip = queryOne<any>(
    `SELECT t.*, d.name as driver_name, v.plate as vehicle_plate, f.name as factory_name
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN factories f ON f.id = t.factory_id
     WHERE t.id = ?`,
    [id]
  );

  res.json({ message: 'Saída da fábrica registrada com sucesso!', trip: updatedTrip });
});

// POST /api/trips/:id/finish - Motorista / Admin finaliza viagem
tripsRouter.post('/:id/finish', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { actual_arrival_date, date, actual_arrival, final_km } = req.body;

  const trip = queryOne<any>(
    `SELECT t.*, d.user_id as driver_user_id, d.name as driver_name, v.plate as vehicle_plate
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     JOIN vehicles v ON v.id = t.vehicle_id
     WHERE t.id = ?`,
    [id]
  );
  if (!trip) return res.status(404).json({ error: 'Viagem não encontrada.' });

  if (!canOperateTrip(req, trip)) {
    return res.status(403).json({ error: 'Acesso negado. Apenas o motorista escalado ou administradores podem finalizar esta viagem.' });
  }

  if (trip.status === 'Finalizada') {
    return res.status(400).json({ error: 'Esta viagem já foi finalizada.' });
  }
  if (trip.status === 'Cancelada') {
    return res.status(400).json({ error: 'Esta viagem foi cancelada e não pode ser finalizada.' });
  }

  const cleanArrival = actual_arrival && String(actual_arrival).trim() 
    ? String(actual_arrival).trim() 
    : new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  // REGRA: A DATA PROGRAMADA (trip.date) permanece intacta e nunca é sobrescrita pela data de finalização!
  const arrDate = (actual_arrival_date && String(actual_arrival_date).trim())
    || (date && String(date).trim())
    || new Date().toISOString().split('T')[0];

  const endKm = parseFloat(String(final_km));
  if (isNaN(endKm) || endKm < 0) {
    return res.status(400).json({ error: 'Informe um KM Final (hodômetro de chegada) válido.' });
  }

  const startKm = typeof trip.initial_km === 'number' ? trip.initial_km : 0;
  if (trip.initial_km !== null && trip.initial_km !== undefined && endKm < startKm) {
    return res.status(400).json({ error: `O KM Final (${endKm}) não pode ser menor que o KM Inicial (${startKm}).` });
  }

  const totalKm = Math.max(0, endKm - startKm);
  const depTime = trip.actual_departure || trip.planned_departure || '08:00';
  const depDate = trip.actual_departure_date || trip.date;
  
  // Cálculo do Tempo Total a partir do intervalo entre a Saída Real e a Chegada Real
  const totalTime = calculateTotalTripTime(depTime, cleanArrival, depDate, arrDate);

  const now = new Date().toISOString();
  run(
    `UPDATE trips
     SET status = 'Finalizada',
         actual_arrival_date = ?,
         actual_arrival = ?,
         final_km = ?,
         total_km = ?,
         total_time = ?,
         updated_at = ?
     WHERE id = ?`,
    [arrDate, cleanArrival, endKm, totalKm, totalTime, now, id]
  );

  // Set vehicle to Disponível if no other active trips
  const otherActive = queryOne<any>(
    `SELECT COUNT(*) as count FROM trips WHERE vehicle_id = ? AND status IN ('Em deslocamento', 'Na fábrica', 'Retornando')`,
    [trip.vehicle_id]
  )?.count || 0;
  if (otherActive === 0) {
    run(`UPDATE vehicles SET status = 'Disponível', updated_at = ? WHERE id = ?`, [now, trip.vehicle_id]);
  }

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Finalização de Viagem',
    'VIAGENS',
    id,
    `Finalizou viagem ${id}. Data Programada: ${trip.date}, Saída Real: ${depDate} ${depTime}, Chegada Real: ${arrDate} ${cleanArrival}, KM Final: ${endKm}, KM Rodado: ${totalKm} km, Tempo Total: ${totalTime}.`
  );

  const updatedTrip = queryOne<any>(
    `SELECT t.*, d.name as driver_name, v.plate as vehicle_plate, f.name as factory_name
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN factories f ON f.id = t.factory_id
     WHERE t.id = ?`,
    [id]
  );

  res.json({ message: 'Viagem finalizada com sucesso!', trip: updatedTrip });
});

// PATCH /api/trips/:id/status - Update trip status (ADMIN or DEV)
tripsRouter.patch('/:id/status', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { status, cancel_reason, actual_departure, actual_departure_date, actual_arrival, actual_arrival_date } = req.body;

  const allowedStatuses = ['Programada', 'Em deslocamento', 'Na fábrica', 'Retornando', 'Finalizada', 'Cancelada'];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: 'Status de viagem inválido.' });
  }

  const trip = queryOne<any>(
    `SELECT t.*, d.name as driver_name, v.plate as vehicle_plate, f.name as factory_name
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN factories f ON f.id = t.factory_id
     WHERE t.id = ?`,
    [id]
  );

  if (!trip) return res.status(404).json({ error: 'Viagem não encontrada.' });

  if (trip.status === 'Cancelada') {
    return res.status(400).json({ error: 'Esta viagem já foi cancelada e não pode ter seu status alterado.' });
  }

  if (trip.status === 'Finalizada' && status !== 'Finalizada') {
    return res.status(400).json({ error: 'Esta viagem já foi finalizada.' });
  }

  if (status === 'Cancelada' && !cancel_reason) {
    return res.status(400).json({ error: 'Para cancelar uma viagem, informe obrigatoriamente a justificativa.' });
  }

  const now = new Date().toISOString();
  const dateNow = now.split('T')[0];
  const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  let actualDep = trip.actual_departure;
  let actualDepDate = trip.actual_departure_date;
  let actualArr = trip.actual_arrival;
  let actualArrDate = trip.actual_arrival_date;

  if (status === 'Em deslocamento') {
    if (!actualDep) actualDep = actual_departure || timeNow;
    if (!actualDepDate) actualDepDate = actual_departure_date || dateNow;
  }
  if (status === 'Finalizada') {
    if (!actualArr) actualArr = actual_arrival || timeNow;
    if (!actualArrDate) actualArrDate = actual_arrival_date || dateNow;
    if (!actualDep) actualDep = trip.actual_departure || trip.planned_departure || '08:00';
    if (!actualDepDate) actualDepDate = trip.actual_departure_date || trip.date;
  }

  let totalTime = trip.total_time;
  if (status === 'Finalizada' && actualDep && actualArr) {
    totalTime = calculateTotalTripTime(actualDep, actualArr, actualDepDate, actualArrDate);
  }

  run(
    `UPDATE trips
     SET status = ?, cancel_reason = ?, actual_departure_date = ?, actual_departure = ?, actual_arrival_date = ?, actual_arrival = ?, total_time = ?, updated_at = ?
     WHERE id = ?`,
    [
      status,
      cancel_reason || trip.cancel_reason,
      actualDepDate,
      actualDep,
      actualArrDate,
      actualArr,
      totalTime,
      now,
      id
    ]
  );

  // Update vehicle status based on trip status
  if (['Em deslocamento', 'Na fábrica', 'Retornando'].includes(status)) {
    run(`UPDATE vehicles SET status = 'Em viagem', updated_at = ? WHERE id = ?`, [now, trip.vehicle_id]);
  } else if (['Finalizada', 'Cancelada'].includes(status)) {
    run(`UPDATE vehicles SET status = 'Disponível', updated_at = ? WHERE id = ?`, [now, trip.vehicle_id]);
  }

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    `Alteração de Status: ${trip.status} ➔ ${status}`,
    'VIAGENS',
    id,
    `Status alterado de "${trip.status}" para "${status}". Motorista: ${trip.driver_name}, Veículo: ${trip.vehicle_plate}. ${cancel_reason ? 'Motivo: ' + cancel_reason : ''}`
  );

  res.json({ message: `Status da viagem alterado para ${status}.` });
});

// DELETE /api/trips/:id - Delete trip with resilient lookup and safe execution
tripsRouter.delete('/:id', requireAuth, requireRole(['ADMINISTRADOR', 'DESENVOLVEDOR']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const cleanId = String(id || '').trim();

  // 1. Primary lookup by exact ID
  let trip = queryOne<any>(`SELECT * FROM trips WHERE id = ?`, [cleanId]);

  // 2. Case-insensitive lookup
  if (!trip && cleanId) {
    trip = queryOne<any>(`SELECT * FROM trips WHERE LOWER(id) = LOWER(?)`, [cleanId]);
  }

  // 3. Fallback lookup by metadata provided in body or query params
  const { date, planned_departure, driver_name, vehicle_plate, driver_id, vehicle_id, factory_id, status } = req.body || {};
  if (!trip && (date || driver_name || vehicle_plate || driver_id)) {
    let fallbackSql = `
      SELECT t.* FROM trips t
      LEFT JOIN drivers d ON d.id = t.driver_id
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
      LEFT JOIN factories f ON f.id = t.factory_id
      WHERE 1=1
    `;
    const fParams: any[] = [];
    if (date) {
      fallbackSql += ` AND (t.date = ? OR t.actual_departure_date = ?)`;
      fParams.push(date, date);
    }
    if (planned_departure) {
      fallbackSql += ` AND (t.planned_departure = ? OR t.actual_departure = ?)`;
      fParams.push(planned_departure, planned_departure);
    }
    if (driver_id) {
      fallbackSql += ` AND t.driver_id = ?`;
      fParams.push(driver_id);
    } else if (driver_name) {
      fallbackSql += ` AND (d.name LIKE ? OR d.name = ?)`;
      fParams.push(`%${driver_name}%`, driver_name);
    }
    if (vehicle_id) {
      fallbackSql += ` AND t.vehicle_id = ?`;
      fParams.push(vehicle_id);
    } else if (vehicle_plate) {
      fallbackSql += ` AND (v.plate LIKE ? OR v.plate = ?)`;
      fParams.push(`%${vehicle_plate}%`, vehicle_plate);
    }
    if (factory_id) {
      fallbackSql += ` AND t.factory_id = ?`;
      fParams.push(factory_id);
    }
    if (status) {
      fallbackSql += ` AND t.status = ?`;
      fParams.push(status);
    }
    fallbackSql += ` ORDER BY t.created_at DESC LIMIT 1`;
    trip = queryOne<any>(fallbackSql, fParams);
  }

  // 4. Fallback lookup in schedules table if ID belonged to a scheduled departure
  if (!trip && cleanId) {
    const schedule = queryOne<any>(`SELECT * FROM schedules WHERE id = ?`, [cleanId]);
    if (schedule) {
      run(`DELETE FROM schedules WHERE id = ?`, [cleanId]);
      logAudit(
        req.user!.userId,
        req.user!.name,
        req.user!.role,
        'Exclusão de Escala',
        'ESCALAS',
        cleanId,
        `Excluiu a escala/viagem programada ${cleanId} (Data: ${schedule.date}).`
      );
      return res.json({ message: 'Escala/viagem programada excluída com sucesso.', id: cleanId });
    }
  }

  // 5. If not found in SQLite database at all:
  // Return success (already deleted) so client can safely purge local storage without red error
  if (!trip) {
    return res.json({ 
      message: 'Viagem removida com sucesso.', 
      alreadyDeleted: true,
      id: cleanId 
    });
  }

  // 6. Delete from trips table
  run(`DELETE FROM trips WHERE id = ?`, [trip.id]);

  // If vehicle has no other active trips, set it back to Disponível
  if (trip.vehicle_id) {
    const otherActive = queryOne<any>(
      `SELECT COUNT(*) as count FROM trips WHERE vehicle_id = ? AND status IN ('Em deslocamento', 'Na fábrica', 'Retornando')`,
      [trip.vehicle_id]
    )?.count || 0;
    if (otherActive === 0) {
      run(`UPDATE vehicles SET status = 'Disponível', updated_at = ? WHERE id = ?`, [new Date().toISOString(), trip.vehicle_id]);
    }
  }

  logAudit(
    req.user!.userId,
    req.user!.name,
    req.user!.role,
    'Exclusão de Viagem',
    'VIAGENS',
    trip.id,
    `Excluiu a viagem ${trip.id} (Data: ${trip.date}, Status: ${trip.status}).`
  );

  res.json({ message: 'Viagem excluída com sucesso.', id: trip.id });
});
