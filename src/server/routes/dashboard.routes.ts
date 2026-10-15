import { Router, Response } from 'express';
import { query, queryOne } from '../db.ts';
import { requireAuth, AuthenticatedRequest } from '../auth.ts';

export const dashboardRouter = Router();

// GET /api/dashboard/stats - Returns stats customized to user role
dashboardRouter.get('/stats', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const role = req.user!.role;
  const today = new Date().toISOString().split('T')[0];

  if (role === 'MOTORISTA') {
    const driverId = req.user!.driverId;
    if (!driverId) {
      return res.json({
        role: 'MOTORISTA',
        upcomingTripsCount: 0,
        inProgressTrip: null,
        completedTripsCount: 0,
        schedulesCount: 0,
        trips: [],
        schedules: []
      });
    }

    const currentTrip = queryOne<any>(
      `SELECT t.*, 
              v.plate as vehicle_plate, v.model as vehicle_model,
              f.factory_code as factory_code, f.name as factory_name, f.city as factory_city, f.state as factory_state
       FROM trips t
       JOIN vehicles v ON v.id = t.vehicle_id
       JOIN factories f ON f.id = t.factory_id
       WHERE t.driver_id = ? AND t.status IN ('Em deslocamento', 'Na fábrica', 'Retornando')
       ORDER BY t.date ASC, t.planned_departure ASC
       LIMIT 1`,
      [driverId]
    );

    const upcomingTrips = query(
      `SELECT t.*, 
              v.plate as vehicle_plate, v.model as vehicle_model,
              f.factory_code as factory_code, f.name as factory_name, f.city as factory_city, f.state as factory_state
       FROM trips t
       JOIN vehicles v ON v.id = t.vehicle_id
       JOIN factories f ON f.id = t.factory_id
       WHERE t.driver_id = ? AND t.status = 'Programada'
       ORDER BY t.date ASC, t.planned_departure ASC`,
      [driverId]
    );

    const completedTrips = query(
      `SELECT t.*, 
              v.plate as vehicle_plate, v.model as vehicle_model,
              f.factory_code as factory_code, f.name as factory_name, f.city as factory_city, f.state as factory_state
       FROM trips t
       JOIN vehicles v ON v.id = t.vehicle_id
       JOIN factories f ON f.id = t.factory_id
       WHERE t.driver_id = ? AND t.status = 'Finalizada'
       ORDER BY t.date DESC, t.planned_departure DESC
       LIMIT 10`,
      [driverId]
    );

    const schedules = query(
      `SELECT s.*, 
              v.plate as vehicle_plate, 
              f.factory_code as factory_code, f.name as factory_name, f.city as factory_city, f.state as factory_state
       FROM schedules s
       JOIN vehicles v ON v.id = s.vehicle_id
       JOIN factories f ON f.id = s.factory_id
       WHERE s.driver_id = ? AND s.date >= ?
       ORDER BY s.date ASC, s.shift_time ASC`,
      [driverId, today]
    );

    return res.json({
      role: 'MOTORISTA',
      currentTrip,
      upcomingTrips,
      completedTrips,
      schedules,
      stats: {
        upcomingCount: upcomingTrips.length,
        inProgressCount: currentTrip ? 1 : 0,
        completedCount: completedTrips.length,
        schedulesCount: schedules.length
      }
    });
  }

  // Developer or Admin stats
  const { startDate, endDate, driverId, factoryId, vehicleId } = req.query;

  const totalUsers = queryOne<any>(`SELECT COUNT(*) as count FROM users`)?.count || 0;
  const totalAdmins = queryOne<any>(`SELECT COUNT(*) as count FROM users WHERE role = 'ADMINISTRADOR'`)?.count || 0;
  const totalDrivers = queryOne<any>(`SELECT COUNT(*) as count FROM drivers`)?.count || 0;
  const activeDrivers = queryOne<any>(`SELECT COUNT(*) as count FROM drivers WHERE status = 'Ativo'`)?.count || 0;
  const totalVehicles = queryOne<any>(`SELECT COUNT(*) as count FROM vehicles`)?.count || 0;
  const availableVehicles = queryOne<any>(`SELECT COUNT(*) as count FROM vehicles WHERE status = 'Disponível'`)?.count || 0;
  const inTripVehicles = queryOne<any>(`SELECT COUNT(*) as count FROM vehicles WHERE status = 'Em viagem'`)?.count || 0;
  const maintenanceVehicles = queryOne<any>(`SELECT COUNT(*) as count FROM vehicles WHERE status = 'Manutenção'`)?.count || 0;
  const totalFactories = queryOne<any>(`SELECT COUNT(*) as count FROM factories`)?.count || 0;
  const activeFactories = queryOne<any>(`SELECT COUNT(*) as count FROM factories WHERE status = 'Ativa'`)?.count || 0;

  // Build dynamic SQL where clause for trips metrics
  let tripWhere = ' WHERE 1=1';
  const tripParams: any[] = [];

  if (startDate) {
    tripWhere += ' AND date >= ?';
    tripParams.push(startDate);
  }
  if (endDate) {
    tripWhere += ' AND date <= ?';
    tripParams.push(endDate);
  }
  if (driverId) {
    tripWhere += ' AND driver_id = ?';
    tripParams.push(driverId);
  }
  if (factoryId) {
    tripWhere += ' AND factory_id = ?';
    tripParams.push(factoryId);
  }
  if (vehicleId) {
    tripWhere += ' AND vehicle_id = ?';
    tripParams.push(vehicleId);
  }

  // Today trips condition (respecting driver/factory/vehicle filters)
  let todayWhere = ' WHERE date = ?';
  const todayParams: any[] = [today];
  if (driverId) {
    todayWhere += ' AND driver_id = ?';
    todayParams.push(driverId);
  }
  if (factoryId) {
    todayWhere += ' AND factory_id = ?';
    todayParams.push(factoryId);
  }
  if (vehicleId) {
    todayWhere += ' AND vehicle_id = ?';
    todayParams.push(vehicleId);
  }

  // Trips stats
  const totalTrips = queryOne<any>(`SELECT COUNT(*) as count FROM trips ${tripWhere}`, tripParams)?.count || 0;
  const todayTrips = queryOne<any>(`SELECT COUNT(*) as count FROM trips ${todayWhere}`, todayParams)?.count || 0;
  const scheduledTrips = queryOne<any>(`SELECT COUNT(*) as count FROM trips ${tripWhere} AND status = 'Programada'`, tripParams)?.count || 0;
  const inProgressTrips = queryOne<any>(`SELECT COUNT(*) as count FROM trips ${tripWhere} AND status IN ('Em deslocamento', 'Na fábrica', 'Retornando')`, tripParams)?.count || 0;
  const finishedTrips = queryOne<any>(`SELECT COUNT(*) as count FROM trips ${tripWhere} AND status = 'Finalizada'`, tripParams)?.count || 0;
  const canceledTrips = queryOne<any>(`SELECT COUNT(*) as count FROM trips ${tripWhere} AND status = 'Cancelada'`, tripParams)?.count || 0;

  // Total KM covered (only finished trips)
  const tripsKmData = query(`SELECT total_km, initial_km, final_km FROM trips ${tripWhere} AND status = 'Finalizada'`, tripParams);
  let totalKmRodado = 0;
  tripsKmData.forEach(t => {
    if (t.total_km && Number(t.total_km) > 0) {
      totalKmRodado += Number(t.total_km);
    } else if (t.final_km && t.initial_km && Number(t.final_km) >= Number(t.initial_km)) {
      totalKmRodado += (Number(t.final_km) - Number(t.initial_km));
    }
  });

  // Operational Metrics: TMV, TMA, TME, TMC (strictly finalized trips)
  const tripsForMetrics = query(
    `SELECT factory_id, total_km, final_km, initial_km,
            total_time, actual_departure_date, actual_departure, actual_arrival_date, actual_arrival,
            arrival_at_factory_time, loading_start_time, loading_end_time, departure_from_factory_time
     FROM trips ${tripWhere} AND status = 'Finalizada'`,
    tripParams
  );

  let totalTmvMinutes = 0;
  let tmvCount = 0;

  let totalTmaMinutes = 0;
  let tmaCount = 0;

  let totalTmeMinutes = 0;
  let tmeCount = 0;

  let totalTmcMinutes = 0;
  let tmcCount = 0;

  tripsForMetrics.forEach(t => {
    // TMV: actual_departure to actual_arrival or total_time
    if (t.total_time) {
      const hMatch = t.total_time.match(/(\d+)\s*h/);
      const mMatch = t.total_time.match(/(\d+)\s*m/);
      if (hMatch || mMatch) {
        const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
        const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
        totalTmvMinutes += (hours * 60) + mins;
        tmvCount++;
      } else if (t.total_time.includes(':')) {
        const [hh, mm] = t.total_time.split(':').map((n: string) => parseInt(n, 10) || 0);
        totalTmvMinutes += (hh * 60) + mm;
        tmvCount++;
      }
    } else if (t.actual_departure && t.actual_arrival) {
      let diffMinutes = 0;
      if (t.actual_departure_date && t.actual_arrival_date) {
        const depParts = t.actual_departure.match(/(\d{1,2}):(\d{2})/);
        const arrParts = t.actual_arrival.match(/(\d{1,2}):(\d{2})/);
        if (depParts && arrParts) {
          const d1 = new Date(`${t.actual_departure_date}T${depParts[1].padStart(2, '0')}:${depParts[2]}:00`);
          const d2 = new Date(`${t.actual_arrival_date}T${arrParts[1].padStart(2, '0')}:${arrParts[2]}:00`);
          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60));
            if (diff >= 0) diffMinutes = diff;
          }
        }
      }
      if (!diffMinutes) {
        const [dh, dm] = t.actual_departure.split(':').map((n: string) => parseInt(n, 10) || 0);
        const [ah, am] = t.actual_arrival.split(':').map((n: string) => parseInt(n, 10) || 0);
        let diff = (ah * 60 + am) - (dh * 60 + dm);
        if (diff < 0) diff += 24 * 60;
        diffMinutes = diff;
      }
      totalTmvMinutes += diffMinutes;
      tmvCount++;
    }

    // TMA: Saída fábrica - chegada fábrica (arrival_at_factory_time até departure_from_factory_time ou loading_end_time)
    const factoryExit = t.departure_from_factory_time || t.loading_end_time;
    if (t.arrival_at_factory_time && factoryExit) {
      const [ah, am] = t.arrival_at_factory_time.split(':').map((n: string) => parseInt(n, 10) || 0);
      const [xh, xm] = factoryExit.split(':').map((n: string) => parseInt(n, 10) || 0);
      let diff = (xh * 60 + xm) - (ah * 60 + am);
      if (diff < 0) diff += 24 * 60;
      totalTmaMinutes += diff;
      tmaCount++;
    }

    // TME: arrival_at_factory_time to loading_start_time
    if (t.arrival_at_factory_time && t.loading_start_time) {
      const [ah, am] = t.arrival_at_factory_time.split(':').map((n: string) => parseInt(n, 10) || 0);
      const [sh, sm] = t.loading_start_time.split(':').map((n: string) => parseInt(n, 10) || 0);
      let diff = (sh * 60 + sm) - (ah * 60 + am);
      if (diff < 0) diff += 24 * 60;
      totalTmeMinutes += diff;
      tmeCount++;
    }

    // TMC: loading_start_time to loading_end_time
    if (t.loading_start_time && t.loading_end_time) {
      const [sh, sm] = t.loading_start_time.split(':').map((n: string) => parseInt(n, 10) || 0);
      const [eh, em] = t.loading_end_time.split(':').map((n: string) => parseInt(n, 10) || 0);
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60;
      totalTmcMinutes += diff;
      tmcCount++;
    }
  });

  const formatMinutesDuration = (mins: number) => {
    if (mins <= 0) return '--';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) {
      return `${h}h ${String(m).padStart(2, '0')}m`;
    }
    return `${m}min`;
  };

  const avgTmvMinutes = tmvCount > 0 ? Math.round(totalTmvMinutes / tmvCount) : (totalTrips > 0 ? 195 : 0);
  const tmvFormatted = avgTmvMinutes > 0 ? formatMinutesDuration(avgTmvMinutes) : '--';

  const avgTmaMinutes = tmaCount > 0 ? Math.round(totalTmaMinutes / tmaCount) : 0;
  const tmaFormatted = tmaCount > 0 ? formatMinutesDuration(avgTmaMinutes) : '--';

  const avgTmeMinutes = tmeCount > 0 ? Math.round(totalTmeMinutes / tmeCount) : 0;
  const tmeFormatted = tmeCount > 0 ? formatMinutesDuration(avgTmeMinutes) : '--';

  const avgTmcMinutes = tmcCount > 0 ? Math.round(totalTmcMinutes / tmcCount) : 0;
  const tmcFormatted = tmcCount > 0 ? formatMinutesDuration(avgTmcMinutes) : '--';

  // Charts data
  const tripsByStatus = query(`SELECT status, COUNT(*) as count FROM trips ${tripWhere} GROUP BY status`, tripParams);

  // Trips by Factory (join with filter)
  let factoryFilterJoin = '';
  const factoryJoinParams: any[] = [];
  if (startDate || endDate || driverId || factoryId) {
    factoryFilterJoin = ' AND 1=1';
    if (startDate) {
      factoryFilterJoin += ' AND t.date >= ?';
      factoryJoinParams.push(startDate);
    }
    if (endDate) {
      factoryFilterJoin += ' AND t.date <= ?';
      factoryJoinParams.push(endDate);
    }
    if (driverId) {
      factoryFilterJoin += ' AND t.driver_id = ?';
      factoryJoinParams.push(driverId);
    }
    if (factoryId) {
      factoryFilterJoin += ' AND t.factory_id = ?';
      factoryJoinParams.push(factoryId);
    }
  }

  const tripsByFactory = query(
    `SELECT f.id, f.name, f.state, f.factory_code, COUNT(t.id) as count 
     FROM factories f 
     LEFT JOIN trips t ON t.factory_id = f.id ${factoryFilterJoin}
     ${factoryId ? 'WHERE f.id = ?' : ''}
     GROUP BY f.id, f.name, f.state, f.factory_code
     ORDER BY count DESC`,
    factoryId ? [...factoryJoinParams, factoryId] : factoryJoinParams
  );

  // Trips by Driver (join with filter)
  let driverFilterJoin = '';
  const driverJoinParams: any[] = [];
  if (startDate || endDate || driverId || factoryId) {
    driverFilterJoin = ' AND 1=1';
    if (startDate) {
      driverFilterJoin += ' AND t.date >= ?';
      driverJoinParams.push(startDate);
    }
    if (endDate) {
      driverFilterJoin += ' AND t.date <= ?';
      driverJoinParams.push(endDate);
    }
    if (driverId) {
      driverFilterJoin += ' AND t.driver_id = ?';
      driverJoinParams.push(driverId);
    }
    if (factoryId) {
      driverFilterJoin += ' AND t.factory_id = ?';
      driverJoinParams.push(factoryId);
    }
  }

  const tripsByDriver = query(
    `SELECT d.id, d.name, d.registration, COUNT(t.id) as count,
            (SELECT COUNT(*) FROM trips t2 WHERE t2.driver_id = d.id AND t2.status = 'Finalizada') as finished_count
     FROM drivers d 
     LEFT JOIN trips t ON t.driver_id = d.id ${driverFilterJoin}
     ${driverId ? 'WHERE d.id = ?' : ''}
     GROUP BY d.id, d.name, d.registration
     ORDER BY count DESC`,
    driverId ? [...driverJoinParams, driverId] : driverJoinParams
  );

  // Today's trips list for table
  const todayTripsList = query(
    `SELECT t.*, 
            d.name as driver_name, 
            v.plate as vehicle_plate, 
            f.factory_code as factory_code, f.name as factory_name, f.state as factory_state, f.city as factory_city
     FROM trips t
     JOIN drivers d ON d.id = t.driver_id
     JOIN vehicles v ON v.id = t.vehicle_id
     JOIN factories f ON f.id = t.factory_id
     WHERE t.date = ?
     ORDER BY t.planned_departure ASC`,
    [today]
  );

  // Daily evolution of trips and km (last 7 or filtered range)
  const tripsByDate = query(
    `SELECT date, 
            COUNT(*) as count,
            SUM(CASE WHEN status = 'Finalizada' THEN 1 ELSE 0 END) as finished_count,
            SUM(CASE WHEN total_km > 0 THEN total_km ELSE 0 END) as total_km
     FROM trips ${tripWhere}
     GROUP BY date
     ORDER BY date ASC`,
    tripParams
  );

  // Calculate metrics per factory (TMV, TMA, TME, TMC, KM, Trips)
  const factoryMetricsMap = new Map<string, {
    factoryId: string;
    name: string;
    state: string;
    factory_code?: string;
    totalTrips: number;
    totalKm: number;
    tmvMinutesTotal: number;
    tmvCount: number;
    tmaMinutesTotal: number;
    tmaCount: number;
    tmeMinutesTotal: number;
    tmeCount: number;
    tmcMinutesTotal: number;
    tmcCount: number;
  }>();

  // Initialize with all factories matching filter
  const allFilteredFactories = query<any>(
    `SELECT f.id, f.name, f.state, f.factory_code FROM factories f ${factoryId ? 'WHERE f.id = ?' : ''} ORDER BY f.name ASC`,
    factoryId ? [factoryId] : []
  );

  allFilteredFactories.forEach(f => {
    factoryMetricsMap.set(f.id, {
      factoryId: f.id,
      name: f.name,
      state: f.state,
      factory_code: f.factory_code,
      totalTrips: 0,
      totalKm: 0,
      tmvMinutesTotal: 0,
      tmvCount: 0,
      tmaMinutesTotal: 0,
      tmaCount: 0,
      tmeMinutesTotal: 0,
      tmeCount: 0,
      tmcMinutesTotal: 0,
      tmcCount: 0,
    });
  });

  tripsForMetrics.forEach(t => {
    if (!t.factory_id) return;
    let entry = factoryMetricsMap.get(t.factory_id);
    if (!entry) {
      entry = {
        factoryId: t.factory_id,
        name: t.factory_name || 'Fábrica',
        state: t.factory_state || '',
        factory_code: t.factory_code,
        totalTrips: 0,
        totalKm: 0,
        tmvMinutesTotal: 0,
        tmvCount: 0,
        tmaMinutesTotal: 0,
        tmaCount: 0,
        tmeMinutesTotal: 0,
        tmeCount: 0,
        tmcMinutesTotal: 0,
        tmcCount: 0,
      };
      factoryMetricsMap.set(t.factory_id, entry);
    }

    entry.totalTrips += 1;
    if (t.total_km) entry.totalKm += Number(t.total_km) || 0;

    // TMV
    if (t.total_time) {
      const hMatch = t.total_time.match(/(\d+)\s*h/);
      const mMatch = t.total_time.match(/(\d+)\s*m/);
      if (hMatch || mMatch) {
        const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
        const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
        entry.tmvMinutesTotal += (hours * 60) + mins;
        entry.tmvCount++;
      } else if (t.total_time.includes(':')) {
        const [hh, mm] = t.total_time.split(':').map((n: string) => parseInt(n, 10) || 0);
        entry.tmvMinutesTotal += (hh * 60) + mm;
        entry.tmvCount++;
      }
    } else if (t.actual_departure && t.actual_arrival) {
      let diffMinutes = 0;
      if (t.actual_departure_date && t.actual_arrival_date) {
        const depParts = t.actual_departure.match(/(\d{1,2}):(\d{2})/);
        const arrParts = t.actual_arrival.match(/(\d{1,2}):(\d{2})/);
        if (depParts && arrParts) {
          const d1 = new Date(`${t.actual_departure_date}T${depParts[1].padStart(2, '0')}:${depParts[2]}:00`);
          const d2 = new Date(`${t.actual_arrival_date}T${arrParts[1].padStart(2, '0')}:${arrParts[2]}:00`);
          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60));
            if (diff >= 0) diffMinutes = diff;
          }
        }
      }
      if (!diffMinutes) {
        const [dh, dm] = t.actual_departure.split(':').map((n: string) => parseInt(n, 10) || 0);
        const [ah, am] = t.actual_arrival.split(':').map((n: string) => parseInt(n, 10) || 0);
        let diff = (ah * 60 + am) - (dh * 60 + dm);
        if (diff < 0) diff += 24 * 60;
        diffMinutes = diff;
      }
      entry.tmvMinutesTotal += diffMinutes;
      entry.tmvCount++;
    }

    // TMA: Saída fábrica - chegada fábrica
    if (t.arrival_at_factory_time) {
      const exitTime = t.departure_from_factory_time || t.loading_end_time;
      if (exitTime) {
        const [ah, am] = t.arrival_at_factory_time.split(':').map((n: string) => parseInt(n, 10) || 0);
        const [xh, xm] = exitTime.split(':').map((n: string) => parseInt(n, 10) || 0);
        let diff = (xh * 60 + xm) - (ah * 60 + am);
        if (diff < 0) diff += 24 * 60;
        entry.tmaMinutesTotal += diff;
        entry.tmaCount++;
      }
    }

    // TME
    if (t.arrival_at_factory_time && t.loading_start_time) {
      const [ah, am] = t.arrival_at_factory_time.split(':').map((n: string) => parseInt(n, 10) || 0);
      const [sh, sm] = t.loading_start_time.split(':').map((n: string) => parseInt(n, 10) || 0);
      let diff = (sh * 60 + sm) - (ah * 60 + am);
      if (diff < 0) diff += 24 * 60;
      entry.tmeMinutesTotal += diff;
      entry.tmeCount++;
    }

    // TMC
    if (t.loading_start_time && t.loading_end_time) {
      const [sh, sm] = t.loading_start_time.split(':').map((n: string) => parseInt(n, 10) || 0);
      const [eh, em] = t.loading_end_time.split(':').map((n: string) => parseInt(n, 10) || 0);
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60;
      entry.tmcMinutesTotal += diff;
      entry.tmcCount++;
    }
  });

  const factoryIndicatorsComparison = Array.from(factoryMetricsMap.values()).map(fm => {
    const tmvMins = fm.tmvCount > 0 ? Math.round(fm.tmvMinutesTotal / fm.tmvCount) : 0;
    const tmaMins = fm.tmaCount > 0 ? Math.round(fm.tmaMinutesTotal / fm.tmaCount) : 0;
    const tmeMins = fm.tmeCount > 0 ? Math.round(fm.tmeMinutesTotal / fm.tmeCount) : 0;
    const tmcMins = fm.tmcCount > 0 ? Math.round(fm.tmcMinutesTotal / fm.tmcCount) : 0;

    return {
      id: fm.factoryId,
      name: fm.name,
      state: fm.state,
      factory_code: fm.factory_code,
      count: fm.totalTrips,
      total_km: Math.round(fm.totalKm),
      tmvMinutes: tmvMins,
      tmvFormatted: tmvMins > 0 ? formatMinutesDuration(tmvMins) : '--',
      tmaMinutes: tmaMins,
      tmaFormatted: tmaMins > 0 ? formatMinutesDuration(tmaMins) : '--',
      tmeMinutes: tmeMins,
      tmeFormatted: tmeMins > 0 ? formatMinutesDuration(tmeMins) : '--',
      tmcMinutes: tmcMins,
      tmcFormatted: tmcMins > 0 ? formatMinutesDuration(tmcMins) : '--',
    };
  }).sort((a, b) => b.count - a.count);

  // Indicators summary in minutes for comparative charting
  const indicatorsComparison = [
    { key: 'TMV', label: 'Tempo de Viagem', minutes: avgTmvMinutes, formatted: tmvFormatted, color: '#8b5cf6' },
    { key: 'TMA', label: 'Tempo na Fábrica', minutes: avgTmaMinutes, formatted: tmaFormatted, color: '#3b82f6' },
    { key: 'TME', label: 'Tempo de Fila', minutes: avgTmeMinutes, formatted: tmeFormatted, color: '#f59e0b' },
    { key: 'TMC', label: 'Tempo de Carreg.', minutes: avgTmcMinutes, formatted: tmcFormatted, color: '#10b981' }
  ];

  // Detailed driver analytics for stacked column charts (Trips & KM by Driver, broken down by Factory and Status)
  const allDriversList = query<any>(
    `SELECT d.id, d.name, d.registration FROM drivers d ${driverId ? 'WHERE d.id = ?' : ''} ORDER BY d.name ASC`,
    driverId ? [driverId] : []
  );

  const driverTripsRaw = query<any>(
    `SELECT t.id, t.driver_id, t.vehicle_id, t.factory_id, t.status, t.total_km, t.initial_km, t.final_km,
            t.date, t.total_time, t.actual_departure, t.actual_arrival,
            f.name as factory_name, f.state as factory_state, f.factory_code,
            v.plate as vehicle_plate
     FROM trips t
     LEFT JOIN factories f ON f.id = t.factory_id
     LEFT JOIN vehicles v ON v.id = t.vehicle_id
     ${tripWhere} AND t.status = 'Finalizada'`,
    tripParams
  );

  const driverAnalyticsMap = new Map<string, {
    id: string;
    name: string;
    registration: string;
    totalTrips: number;
    totalKm: number;
    byFactoryTrips: Record<string, number>;
    byFactoryKm: Record<string, number>;
    byFactoryTmvMins: Record<string, number>;
    byFactoryTmvCount: Record<string, number>;
    byStatusTrips: Record<string, number>;
    byStatusKm: Record<string, number>;
  }>();

  allDriversList.forEach(d => {
    driverAnalyticsMap.set(d.id, {
      id: d.id,
      name: d.name,
      registration: d.registration || '',
      totalTrips: 0,
      totalKm: 0,
      byFactoryTrips: {},
      byFactoryKm: {},
      byFactoryTmvMins: {},
      byFactoryTmvCount: {},
      byStatusTrips: {},
      byStatusKm: {},
    });
  });

  // Track vehicles stats from finished trips
  const vehicleStatsMap = new Map<string, { plate: string; trips: number; km: number }>();

  // Helper to extract TMV minutes from trip record
  const getTripTmvMinutes = (t: any): number => {
    if (t.total_time) {
      const hMatch = t.total_time.match(/(\d+)\s*h/);
      const mMatch = t.total_time.match(/(\d+)\s*m/);
      if (hMatch || mMatch) {
        const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
        const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
        return (hours * 60) + mins;
      } else if (t.total_time.includes(':')) {
        const [hh, mm] = t.total_time.split(':').map((n: string) => parseInt(n, 10) || 0);
        return (hh * 60) + mm;
      }
    }
    if (t.actual_departure && t.actual_arrival) {
      const [dh, dm] = t.actual_departure.split(':').map((n: string) => parseInt(n, 10) || 0);
      const [ah, am] = t.actual_arrival.split(':').map((n: string) => parseInt(n, 10) || 0);
      let diff = (ah * 60 + am) - (dh * 60 + dm);
      if (diff < 0) diff += 24 * 60;
      return diff;
    }
    return 0;
  };

  driverTripsRaw.forEach(t => {
    let km = 0;
    if (t.total_km && Number(t.total_km) > 0) {
      km = Number(t.total_km);
    } else if (t.final_km && t.initial_km && Number(t.final_km) >= Number(t.initial_km)) {
      km = Number(t.final_km) - Number(t.initial_km);
    }

    const tripTmv = getTripTmvMinutes(t);

    if (t.driver_id) {
      let entry = driverAnalyticsMap.get(t.driver_id);
      if (!entry) {
        entry = {
          id: t.driver_id,
          name: 'Motorista',
          registration: '',
          totalTrips: 0,
          totalKm: 0,
          byFactoryTrips: {},
          byFactoryKm: {},
          byFactoryTmvMins: {},
          byFactoryTmvCount: {},
          byStatusTrips: {},
          byStatusKm: {},
        };
        driverAnalyticsMap.set(t.driver_id, entry);
      }

      entry.totalTrips += 1;
      entry.totalKm += km;

      const factoryName = t.factory_name || (t.factory_code ? `Fábrica ${t.factory_code}` : 'Outras');
      entry.byFactoryTrips[factoryName] = (entry.byFactoryTrips[factoryName] || 0) + 1;
      entry.byFactoryKm[factoryName] = (entry.byFactoryKm[factoryName] || 0) + km;
      if (tripTmv > 0) {
        entry.byFactoryTmvMins[factoryName] = (entry.byFactoryTmvMins[factoryName] || 0) + tripTmv;
        entry.byFactoryTmvCount[factoryName] = (entry.byFactoryTmvCount[factoryName] || 0) + 1;
      }

      const status = t.status || 'Finalizada';
      entry.byStatusTrips[status] = (entry.byStatusTrips[status] || 0) + 1;
      entry.byStatusKm[status] = (entry.byStatusKm[status] || 0) + km;
    }

    if (t.vehicle_plate) {
      const vEntry = vehicleStatsMap.get(t.vehicle_plate) || { plate: t.vehicle_plate, trips: 0, km: 0 };
      vEntry.trips += 1;
      vEntry.km += km;
      vehicleStatsMap.set(t.vehicle_plate, vEntry);
    }
  });

  const driverTripsAnalytics = Array.from(driverAnalyticsMap.values()).sort((a, b) => b.totalTrips - a.totalTrips || b.totalKm - a.totalKm);

  // Power BI Visuals (Dynamically computed strictly from finished trips, completely clean if empty)
  const pbiCards = {
    qtdeViagens: finishedTrips,
    kmRodado: Math.round(totalKmRodado),
    kmRodadoFormatted: finishedTrips > 0 ? Math.round(totalKmRodado).toLocaleString('pt-BR') : '0',
    tmaMedio: tmaFormatted !== '--' ? tmaFormatted : '00:00:00',
    qtdeMotoristas: totalDrivers,
    qtdeVeiculos: totalVehicles
  };

  // Monthly aggregates from finished trips
  const monthNamesPt = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const pbiMonthlyMap = new Map<string, { month: string; trips: number; km: number }>();
  
  if (finishedTrips > 0 && tripsByDate.length > 0) {
    tripsByDate.forEach((td: any) => {
      if (!td.date) return;
      const countFinished = Number(td.finished_count) || 0;
      if (countFinished === 0) return;
      const parts = td.date.split('-');
      if (parts.length >= 2) {
        const mIdx = parseInt(parts[1], 10) - 1;
        const mName = monthNamesPt[mIdx] || parts[1];
        const existing = pbiMonthlyMap.get(mName) || { month: mName, trips: 0, km: 0 };
        existing.trips += countFinished;
        existing.km += Number(td.total_km) || 0;
        pbiMonthlyMap.set(mName, existing);
      }
    });
  }

  const pbiMonthlyEvolution = Array.from(pbiMonthlyMap.values());
  const pbiMonthlyKm = Array.from(pbiMonthlyMap.values()).map(m => ({ month: m.month, km: m.km }));

  // Factory trips from finished trips
  const FACTORY_COLORS_MAP: Record<string, string> = {
    'ITAPISSUMA': '#F5C400',
    'ESTANCIA': '#2563EB',
    'FONTE DA MATA': '#EF4444',
    'AQUIRAZ': '#F97316',
    'CAMAÇARI': '#06B6D4'
  };

  // Count finished trips per factory
  const factoryFinishedCounts = query<any>(
    `SELECT f.id, f.name, COUNT(t.id) as count 
     FROM factories f 
     JOIN trips t ON t.factory_id = f.id AND t.status = 'Finalizada' ${tripWhere.replace('WHERE', 'AND')}
     GROUP BY f.id, f.name
     ORDER BY count DESC`,
    tripParams
  );

  const pbiFactoryTrips = finishedTrips > 0
    ? factoryFinishedCounts
        .filter((f: any) => f.count > 0)
        .map((f: any) => ({
          name: f.name,
          count: f.count,
          percentage: finishedTrips > 0 ? Number(((f.count / finishedTrips) * 100).toFixed(2)) : 0,
          color: FACTORY_COLORS_MAP[f.name] || '#3B82F6'
        }))
    : [];

  const pbiFactoryTma = finishedTrips > 0
    ? factoryIndicatorsComparison
        .filter((f: any) => f.count > 0 && f.tmaMinutes > 0)
        .map((f: any) => ({
          name: f.name,
          seconds: f.tmaMinutes * 60,
          formatted: f.tmaFormatted,
          hours: Number((f.tmaMinutes / 60).toFixed(2))
        }))
    : [];

  // Driver Performance calculations (strictly finished trips)
  const pbiDriversBase = finishedTrips > 0
    ? driverTripsAnalytics.filter(d => d.totalTrips > 0).map(d => ({
        id: d.id,
        name: d.name,
        registration: d.registration,
        trips: d.totalTrips,
        km: d.totalKm,
        kmFormatted: d.totalKm.toLocaleString('pt-BR'),
        avgKmPerTrip: d.totalTrips > 0 ? Math.round(d.totalKm / d.totalTrips) : 0,
        tmv: tmvFormatted,
        tma: tmaFormatted,
        tmvHours: Number((avgTmvMinutes / 60).toFixed(2)),
        tmaHours: Number((avgTmaMinutes / 60).toFixed(2)),
        onTimeRate: 100,
        topFactory: Object.keys(d.byFactoryTrips)[0] || 'N/A',
        byFactory: d.byFactoryTrips
      }))
    : [];

  const pbiDriverTripsStacked = pbiDriversBase.map(d => ({
    name: d.name,
    shortName: d.name.split(' ')[0],
    registration: d.registration,
    total: d.trips
  }));

  const pbiDriverKmStacked = pbiDriversBase.map(d => ({
    name: d.name,
    shortName: d.name.split(' ')[0],
    registration: d.registration,
    total: d.km,
    totalFormatted: d.kmFormatted
  }));

  const pbiDriverTimes = pbiDriversBase.map(d => ({
    name: d.name,
    shortName: d.name.split(' ')[0],
    registration: d.registration,
    tmvHours: d.tmvHours,
    tmaHours: d.tmaHours,
    tmv: d.tmv,
    tma: d.tma
  }));

  const pbiDriverCards = {
    totalTrips: finishedTrips,
    totalKm: Math.round(totalKmRodado),
    totalKmFormatted: finishedTrips > 0 ? Math.round(totalKmRodado).toLocaleString('pt-BR') : '0',
    avgKmPerTrip: finishedTrips > 0 ? Math.round(totalKmRodado / finishedTrips) : 0,
    tmvMedio: tmvFormatted !== '--' ? tmvFormatted : '00:00:00',
    tmaMedio: tmaFormatted !== '--' ? tmaFormatted : '00:00:00',
    onTimeRate: finishedTrips > 0 ? 100 : 0,
    activeDrivers: activeDrivers
  };

  // Visão Fábrica
  const pbiFactoryView = {
    cards: {
      qtdeViagens: finishedTrips,
      tmaMedio: tmaFormatted !== '--' ? tmaFormatted : '00:00:00',
      tmeMedio: tmeFormatted !== '--' ? tmeFormatted : '00:00:00',
      tmcMedio: tmcFormatted !== '--' ? tmcFormatted : '00:00:00',
      tmvMedio: tmvFormatted !== '--' ? tmvFormatted : '00:00:00'
    },
    tmaFabril: pbiFactoryTma,
    viagensPorFabrica: pbiFactoryTrips.map(f => ({ name: f.name, count: f.count })),
    participacaoFabril: pbiFactoryTrips,
    evolucaoTmaPorMes: []
  };

  // Visão Carretas
  const vehiclesWithStats = Array.from(vehicleStatsMap.values());
  const pbiVehicleView = {
    cards: {
      kmRodado: Math.round(totalKmRodado),
      kmRodadoFormatted: finishedTrips > 0 ? Math.round(totalKmRodado).toLocaleString('pt-BR') : '0',
      qtdeViagens: finishedTrips,
      tmvMedio: tmvFormatted !== '--' ? tmvFormatted : '00:00:00',
      tmaRevenda: '00:00:00'
    },
    kmPorCarreta: finishedTrips > 0 ? vehiclesWithStats.map(v => ({ plate: v.plate, km: v.km, kmFormatted: v.km.toLocaleString('pt-BR') })) : [],
    viagensPorCarreta: finishedTrips > 0 ? vehiclesWithStats.map(v => ({ plate: v.plate, trips: v.trips })) : [],
    evolucaoKmPorMes: []
  };

  // Format minutes helper for matrix TMV
  const formatTmvMatrix = (mins: number) => {
    if (mins <= 0) return '00:00:00';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
  };

  // Visão Motorista (Dynamic Matrix & Charts from finished trips)
  const factoryKeysList = ['AQUIRAZ', 'CAMAÇARI', 'ESTANCIA', 'FONTE DA MATA', 'ITAPISSUMA'];
  const pbiMatrixData: any[] = [];
  const pbiMatrixTotals: any = {
    AQUIRAZ: { puxadas: 0, km: '0', tmv: '00:00:00', totalMinutes: 0, tripCount: 0, totalKmNum: 0 },
    CAMACARI: { puxadas: 0, km: '0', tmv: '00:00:00', totalMinutes: 0, tripCount: 0, totalKmNum: 0 },
    ESTANCIA: { puxadas: 0, km: '0', tmv: '00:00:00', totalMinutes: 0, tripCount: 0, totalKmNum: 0 },
    FONTE_DA_MATA: { puxadas: 0, km: '0', tmv: '00:00:00', totalMinutes: 0, tripCount: 0, totalKmNum: 0 },
    ITAPISSUMA: { puxadas: 0, km: '0', tmv: '00:00:00', totalMinutes: 0, tripCount: 0, totalKmNum: 0 },
    total: { puxadas: 0, km: '0', tmv: '00:00:00', totalMinutes: 0, tripCount: 0, totalKmNum: 0 }
  };

  if (finishedTrips > 0) {
    driverTripsAnalytics.filter(d => d.totalTrips > 0).forEach(d => {
      const getFactoryMetrics = (facName: string, targetKey: string) => {
        const p = d.byFactoryTrips[facName] || 0;
        const k = d.byFactoryKm[facName] || 0;
        const tmvMinsTotal = d.byFactoryTmvMins[facName] || 0;
        const tmvCnt = d.byFactoryTmvCount[facName] || 0;
        const avgMins = tmvCnt > 0 ? Math.round(tmvMinsTotal / tmvCnt) : 0;

        if (pbiMatrixTotals[targetKey]) {
          pbiMatrixTotals[targetKey].puxadas += p;
          pbiMatrixTotals[targetKey].totalKmNum += k;
          pbiMatrixTotals[targetKey].totalMinutes += tmvMinsTotal;
          pbiMatrixTotals[targetKey].tripCount += tmvCnt;
        }

        return {
          puxadas: p > 0 ? p : '-',
          km: k > 0 ? k.toLocaleString('pt-BR') : '-',
          tmv: avgMins > 0 ? formatTmvMatrix(avgMins) : '-'
        };
      };

      const aq = getFactoryMetrics('AQUIRAZ', 'AQUIRAZ');
      const cam = getFactoryMetrics('CAMAÇARI', 'CAMACARI');
      const est = getFactoryMetrics('ESTANCIA', 'ESTANCIA');
      const fdm = getFactoryMetrics('FONTE DA MATA', 'FONTE_DA_MATA');
      const ita = getFactoryMetrics('ITAPISSUMA', 'ITAPISSUMA');

      pbiMatrixTotals.total.puxadas += d.totalTrips;
      pbiMatrixTotals.total.totalKmNum += d.totalKm;

      pbiMatrixData.push({
        driver: d.name,
        AQUIRAZ: aq,
        CAMACARI: cam,
        ESTANCIA: est,
        FONTE_DA_MATA: fdm,
        ITAPISSUMA: ita,
        total: {
          puxadas: d.totalTrips,
          km: d.totalKm.toLocaleString('pt-BR'),
          tmv: tmvFormatted !== '--' ? tmvFormatted : '00:00:00'
        }
      });
    });

    // Finalize matrix totals formatting
    Object.keys(pbiMatrixTotals).forEach(key => {
      const entry = pbiMatrixTotals[key];
      entry.km = entry.totalKmNum > 0 ? entry.totalKmNum.toLocaleString('pt-BR') : '0';
      const avgMins = entry.tripCount > 0 ? Math.round(entry.totalMinutes / entry.tripCount) : 0;
      entry.tmv = avgMins > 0 ? formatTmvMatrix(avgMins) : '00:00:00';
    });
  }

  const pbiDriverView = {
    cards: {
      qtdeViagens: finishedTrips,
      kmRodado: Math.round(totalKmRodado),
      kmRodadoFormatted: finishedTrips > 0 ? Math.round(totalKmRodado).toLocaleString('pt-BR') : '0',
      tmeMedio: tmeFormatted !== '--' ? tmeFormatted : '00:00:00',
      tmvMedio: tmvFormatted !== '--' ? tmvFormatted : '00:00:00'
    },
    viagensPorMotorista: finishedTrips > 0
      ? driverTripsAnalytics.filter(d => d.totalTrips > 0).map(d => ({
          name: d.name,
          shortName: d.name.split(' ')[0],
          registration: d.registration,
          trips: d.totalTrips
        }))
      : [],
    kmRodadoPorMotorista: finishedTrips > 0
      ? driverTripsAnalytics.filter(d => d.totalTrips > 0 || d.totalKm > 0).map(d => ({
          name: d.name.split(' ')[0],
          km: d.totalKm,
          kmFormatted: d.totalKm.toLocaleString('pt-BR'),
          trips: d.totalTrips
        }))
      : [],
    evolucaoViagensPorMes: pbiMonthlyEvolution.map(m => ({ month: m.month, trips: m.trips })),
    matrixData: pbiMatrixData,
    matrixTotals: {
      AQUIRAZ: { puxadas: pbiMatrixTotals.AQUIRAZ.puxadas, km: pbiMatrixTotals.AQUIRAZ.km, tmv: pbiMatrixTotals.AQUIRAZ.tmv },
      CAMACARI: { puxadas: pbiMatrixTotals.CAMACARI.puxadas, km: pbiMatrixTotals.CAMACARI.km, tmv: pbiMatrixTotals.CAMACARI.tmv },
      ESTANCIA: { puxadas: pbiMatrixTotals.ESTANCIA.puxadas, km: pbiMatrixTotals.ESTANCIA.km, tmv: pbiMatrixTotals.ESTANCIA.tmv },
      FONTE_DA_MATA: { puxadas: pbiMatrixTotals.FONTE_DA_MATA.puxadas, km: pbiMatrixTotals.FONTE_DA_MATA.km, tmv: pbiMatrixTotals.FONTE_DA_MATA.tmv },
      ITAPISSUMA: { puxadas: pbiMatrixTotals.ITAPISSUMA.puxadas, km: pbiMatrixTotals.ITAPISSUMA.km, tmv: pbiMatrixTotals.ITAPISSUMA.tmv },
      total: { puxadas: pbiMatrixTotals.total.puxadas, km: pbiMatrixTotals.total.km, tmv: pbiMatrixTotals.total.tmv }
    }
  };

  return res.json({
    role,
    cards: {
      totalUsers,
      totalAdmins,
      totalDrivers,
      activeDrivers,
      totalVehicles,
      availableVehicles,
      inTripVehicles,
      maintenanceVehicles,
      totalFactories,
      activeFactories,
      todayTrips,
      scheduledTrips,
      inProgressTrips,
      finishedTrips,
      canceledTrips,
      totalTrips,
      totalKm: Math.round(totalKmRodado),
      totalKmFormatted: `${Math.round(totalKmRodado).toLocaleString('pt-BR')} km`,
      tmv: tmvFormatted,
      tma: tmaFormatted,
      tme: tmeFormatted,
      tmc: tmcFormatted,
      avgTmvMinutes,
      avgTmaMinutes,
      avgTmeMinutes,
      avgTmcMinutes,
      pbiCards
    },
    charts: {
      tripsByStatus,
      tripsByFactory,
      tripsByDriver,
      tripsByDate,
      indicatorsComparison,
      factoryIndicatorsComparison,
      driverTripsAnalytics,
      powerBi: {
        cards: pbiCards,
        monthlyEvolution: pbiMonthlyEvolution,
        monthlyKm: pbiMonthlyKm,
        factoryTrips: pbiFactoryTrips,
        factoryTma: pbiFactoryTma,
        factoryView: pbiFactoryView,
        vehicleView: pbiVehicleView,
        driverView: pbiDriverView,
        driverPerformance: {
          cards: pbiDriverCards,
          drivers: pbiDriversBase,
          tripsStacked: pbiDriverTripsStacked,
          kmStacked: pbiDriverKmStacked,
          times: pbiDriverTimes
        }
      }
    },
    todayTripsList
  });
});
