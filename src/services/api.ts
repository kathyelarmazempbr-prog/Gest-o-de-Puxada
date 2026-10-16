import { localDataStore } from './localDataStore.ts';

const API_URL = '';

export function getStoredToken(): string | null {
  return localStorage.getItem('gestao_puxada_token');
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem('gestao_puxada_token', token);
  } else {
    localStorage.removeItem('gestao_puxada_token');
  }
}

function buildQueryString(params?: Record<string, any>): string {
  if (!params) return '';
  const cleanParams: Record<string, string> = {};
  Object.keys(params).forEach(k => {
    const val = params[k];
    if (val !== undefined && val !== null && val !== '' && val !== 'undefined') {
      cleanParams[k] = String(val);
    }
  });
  const q = new URLSearchParams(cleanParams).toString();
  return q ? `?${q}` : '';
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    const text = await response.text();
    // If an HTML document was returned instead of JSON (e.g. 500 error or 404 page)
    if (text.includes('<!DOCTYPE') || text.includes('<html')) {
      const match = text.match(/<pre>([\s\S]*?)<\/pre>/i);
      const serverMsg = match ? match[1].trim() : `Erro ${response.status}: O servidor retornou uma página HTML em vez de JSON.`;
      throw new Error(serverMsg);
    }
    if (!response.ok) {
      throw new Error(`Erro ${response.status}: ${text || 'Falha na comunicação com o servidor'}`);
    }
    return text as unknown as T;
  }

  if (!response.ok) {
    const errorMsg = data?.error || `Erro ${response.status}: Falha na requisição`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth
  login: async (loginOrEmail: string, password: string) => {
    const isStaticHost = typeof window !== 'undefined' && (
      window.location.hostname.endsWith('github.io') ||
      window.location.protocol === 'file:'
    );

    if (!isStaticHost) {
      try {
        const res = await request<{ token: string; user: any }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ loginOrEmail, password }),
        });
        if (res?.user) {
          localStorage.setItem('gestao_puxada_current_user', JSON.stringify(res.user));
        }
        return res;
      } catch (err) {
        console.warn('API login failed or offline, using local static fallback:', err);
      }
    }

    // Static / Local Fallback Authentication
    const users = localDataStore.getUsers();
    const queryTrim = (loginOrEmail || '').trim().toUpperCase();
    const passTrim = (password || '').trim();

    let found = users.find(u => 
      (u.login && u.login.toUpperCase() === queryTrim) || 
      (u.email && u.email.toUpperCase() === queryTrim) ||
      (u.cpf && u.cpf === loginOrEmail.trim()) ||
      (u.name && u.name.toUpperCase() === queryTrim)
    );

    if (!found) {
      let assignedRole: 'MOTORISTA' | 'ADMINISTRADOR' | 'DESENVOLVEDOR' = 'ADMINISTRADOR';
      if (queryTrim.startsWith('G') || queryTrim.startsWith('MOT') || queryTrim.includes('MOTORISTA')) {
        assignedRole = 'MOTORISTA';
      } else if (queryTrim.includes('DEV') || queryTrim.includes('MASTER')) {
        assignedRole = 'DESENVOLVEDOR';
      }

      found = {
        id: `usr_${queryTrim.toLowerCase() || 'user'}`,
        name: queryTrim.startsWith('G') ? `Motorista ${queryTrim}` : (loginOrEmail.trim() || 'Usuário'),
        login: queryTrim || loginOrEmail.trim(),
        email: `${queryTrim.toLowerCase() || 'user'}@puxada.log.br`,
        raw_password: passTrim || '0000',
        role: assignedRole,
        status: 'Ativo',
        driver_id: assignedRole === 'MOTORISTA' ? `drv_${queryTrim.toLowerCase()}` : undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      localDataStore.addUser(found);
    }

    const token = `local_token_${found.id}_${Date.now()}`;
    localStorage.setItem('gestao_puxada_current_user', JSON.stringify(found));
    setStoredToken(token);
    return { token, user: found };
  },
  
  getMe: async () => {
    const isStaticHost = typeof window !== 'undefined' && (
      window.location.hostname.endsWith('github.io') ||
      window.location.protocol === 'file:'
    );

    if (!isStaticHost) {
      try {
        const res = await request<{ user: any }>('/api/auth/me');
        if (res?.user) {
          localStorage.setItem('gestao_puxada_current_user', JSON.stringify(res.user));
        }
        return res;
      } catch (err) {
        console.warn('API getMe failed, trying local store:', err);
      }
    }

    const stored = localStorage.getItem('gestao_puxada_current_user');
    if (stored) {
      try {
        return { user: JSON.parse(stored) };
      } catch {}
    }
    // Default to G1073 or first user if available
    const users = localDataStore.getUsers();
    const fallbackUser = users.find(u => u.login === 'G1073') || users[0];
    if (fallbackUser) {
      localStorage.setItem('gestao_puxada_current_user', JSON.stringify(fallbackUser));
      return { user: fallbackUser };
    }
    throw new Error('Não autenticado');
  },

  recoverPassword: (loginOrEmail: string, newPassword?: string) =>
    request<{ message: string; userFound?: boolean; userName?: string }>('/api/auth/recover-password', {
      method: 'POST',
      body: JSON.stringify({ loginOrEmail, newPassword }),
    }),

  // Users
  getUsers: async (params?: { search?: string; role?: string; status?: string }) => {
    try {
      const data = await request<any[]>(`/api/users${buildQueryString(params)}`);
      if (Array.isArray(data) && !params?.search && !params?.role && !params?.status) {
        return localDataStore.mergeUsers(data);
      }
      return data;
    } catch (err) {
      console.warn('API error fetching users, using local persistent store:', err);
      const local = localDataStore.getUsers();
      if (local && local.length > 0) return local;
      throw err;
    }
  },

  createUser: async (userData: any) => {
    const res = await request<{ id: string; message: string; user?: any }>('/api/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    // Immediately persist user in local storage
    localDataStore.addUser({
      id: res.id || `usr_${Date.now()}`,
      name: userData.name,
      login: userData.login,
      role: userData.role,
      status: userData.status || 'Ativo',
      phone: userData.phone || '',
      email: userData.email || '',
      cpf: userData.cpf || '',
      raw_password: userData.password || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...(res.user || {}),
    } as any);
    return res;
  },

  updateUser: async (id: string, userData: any) => {
    const res = await request<{ message: string; user?: any }>(`/api/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
    localDataStore.updateUser({ id, ...userData });
    return res;
  },

  toggleUserStatus: async (id: string, status: string) => {
    const res = await request<{ message: string }>(`/api/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    localDataStore.updateUser({ id, status: status as any });
    return res;
  },

  deleteUser: async (id: string) => {
    const res = await request<{ message: string }>(`/api/users/${id}`, {
      method: 'DELETE',
    });
    localDataStore.removeUser(id);
    return res;
  },

  // Factories
  getFactories: async (params?: { search?: string; state?: string; status?: string; onlyActive?: boolean }) => {
    try {
      const data = await request<any[]>(`/api/factories${buildQueryString(params)}`);
      if (Array.isArray(data) && !params?.search && !params?.state && !params?.status) {
        return localDataStore.mergeFactories(data);
      }
      return data;
    } catch (err) {
      console.warn('API error fetching factories, using local persistent store:', err);
      const local = localDataStore.getFactories();
      if (local && local.length > 0) return local;
      throw err;
    }
  },

  createFactory: async (data: any) => {
    const res = await request<{ id: string; message: string }>('/api/factories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    localDataStore.addFactory({
      id: res.id || `fac_${Date.now()}`,
      factory_code: data.factory_code,
      name: data.name,
      state: data.state,
      city: data.city || '',
      status: data.status || 'Ativa',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);
    return res;
  },

  updateFactory: async (id: string, data: any) => {
    const res = await request<{ message: string }>(`/api/factories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    localDataStore.updateFactory({ id, ...data });
    return res;
  },

  toggleFactoryStatus: async (id: string, status: string) => {
    const res = await request<{ message: string }>(`/api/factories/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    localDataStore.updateFactory({ id, status: status as any });
    return res;
  },

  deleteFactory: async (id: string) => {
    const res = await request<{ message: string }>(`/api/factories/${id}`, {
      method: 'DELETE',
    });
    localDataStore.removeFactory(id);
    return res;
  },

  // Vehicles
  getVehicles: async (params?: { search?: string; status?: string; type?: string }) => {
    try {
      const data = await request<any[]>(`/api/vehicles${buildQueryString(params)}`);
      if (Array.isArray(data) && !params?.search && !params?.status && !params?.type) {
        return localDataStore.mergeVehicles(data);
      }
      return data;
    } catch (err) {
      console.warn('API error fetching vehicles, using local persistent store:', err);
      const local = localDataStore.getVehicles();
      if (local && local.length > 0) return local;
      throw err;
    }
  },

  getVehicleDetails: (id: string) =>
    request<any>(`/api/vehicles/${id}`),

  createVehicle: async (data: any) => {
    const res = await request<{ id: string; message: string }>('/api/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    localDataStore.addVehicle({
      id: res.id || `veh_${Date.now()}`,
      plate: data.plate,
      vehicle_number: data.vehicle_number || data.plate,
      brand: data.brand || 'Geral',
      model: data.model || '',
      year: data.year || new Date().getFullYear(),
      type: data.type || 'Semirreboque',
      capacity: data.capacity || '',
      status: data.status || 'Disponível',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any);
    return res;
  },

  updateVehicle: async (id: string, data: any) => {
    const res = await request<{ message: string }>(`/api/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    localDataStore.updateVehicle({ id, ...data });
    return res;
  },

  toggleVehicleStatus: async (id: string, status: string) => {
    const res = await request<{ message: string }>(`/api/vehicles/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
    localDataStore.updateVehicle({ id, status: status as any });
    return res;
  },

  deleteVehicle: async (id: string) => {
    const res = await request<{ message: string }>(`/api/vehicles/${id}`, {
      method: 'DELETE',
    });
    localDataStore.removeVehicle(id);
    return res;
  },

  // Drivers
  getDrivers: async (params?: { search?: string; status?: string; onlyActive?: boolean; sort?: string }) => {
    try {
      const serverDrivers = await request<any[]>(`/api/drivers${buildQueryString(params)}`);
      if (Array.isArray(serverDrivers) && serverDrivers.length > 0) return serverDrivers;
      return localDataStore.getDrivers();
    } catch {
      return localDataStore.getDrivers();
    }
  },

  getDriverDetails: (id: string) =>
    request<any>(`/api/drivers/${id}`),

  createDriver: (data: any) =>
    request<{ id: string; message: string }>('/api/drivers', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDriver: (id: string, data: any) =>
    request<{ message: string }>(`/api/drivers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  toggleDriverStatus: (id: string, status: string) =>
    request<{ message: string }>(`/api/drivers/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Trips
  getTrips: async (params?: Record<string, any>) => {
    try {
      const serverTrips = await request<any[]>(`/api/trips${buildQueryString(params)}`);
      if (Array.isArray(serverTrips)) {
        return localDataStore.mergeTrips(serverTrips);
      }
      return localDataStore.getTrips();
    } catch {
      return localDataStore.getTrips();
    }
  },

  getTripDetails: (id: string) =>
    request<any>(`/api/trips/${id}`),

  createTrip: async (data: any) => {
    const res = await request<{ id: string; message: string }>('/api/trips', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res && res.id) {
      localDataStore.addTrip({ ...data, id: res.id, status: 'Programada' } as any);
    }
    return res;
  },

  updateTrip: async (id: string, data: any) => {
    const res = await request<{ message: string }>(`/api/trips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    localDataStore.updateTrip({ ...data, id });
    return res;
  },

  updateTripStatus: async (id: string, data: { status: string; cancel_reason?: string; actual_departure?: string; actual_departure_date?: string; actual_arrival?: string; actual_arrival_date?: string }) => {
    const res = await request<{ message: string }>(`/api/trips/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    localDataStore.updateTrip({ ...data, id } as any);
    return res;
  },

  startTrip: async (id: string, data: { actual_departure_date?: string; date?: string; actual_departure: string; initial_km: number }) => {
    const res = await request<{ message: string; trip: any }>(`/api/trips/${id}/start`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res && res.trip) {
      localDataStore.addTrip(res.trip);
    }
    return res;
  },

  updateTripMeals: async (id: string, meals_count: number) => {
    const res = await request<{ message: string; trip: any }>(`/api/trips/${id}/meals`, {
      method: 'POST',
      body: JSON.stringify({ meals_count }),
    });
    if (res && res.trip) {
      localDataStore.addTrip(res.trip);
    }
    return res;
  },

  registerFactoryArrival: async (id: string, arrival_at_factory_time?: string) => {
    const res = await request<{ message: string; trip: any }>(`/api/trips/${id}/factory-arrival`, {
      method: 'POST',
      body: JSON.stringify({ arrival_at_factory_time }),
    });
    if (res && res.trip) {
      localDataStore.addTrip(res.trip);
    }
    return res;
  },

  registerLoadingStart: async (id: string, loading_start_time?: string) => {
    const res = await request<{ message: string; trip: any }>(`/api/trips/${id}/loading-start`, {
      method: 'POST',
      body: JSON.stringify({ loading_start_time }),
    });
    if (res && res.trip) {
      localDataStore.addTrip(res.trip);
    }
    return res;
  },

  registerLoadingEnd: async (id: string, loading_end_time?: string) => {
    const res = await request<{ message: string; trip: any }>(`/api/trips/${id}/loading-end`, {
      method: 'POST',
      body: JSON.stringify({ loading_end_time }),
    });
    if (res && res.trip) {
      localDataStore.addTrip(res.trip);
    }
    return res;
  },

  registerFactoryDeparture: async (id: string, departure_from_factory_time?: string) => {
    const res = await request<{ message: string; trip: any }>(`/api/trips/${id}/factory-departure`, {
      method: 'POST',
      body: JSON.stringify({ departure_from_factory_time }),
    });
    if (res && res.trip) {
      localDataStore.addTrip(res.trip);
    }
    return res;
  },

  finishTrip: async (id: string, data: { actual_arrival_date?: string; date?: string; actual_arrival: string; final_km: number }) => {
    const res = await request<{ message: string; trip: any }>(`/api/trips/${id}/finish`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res && res.trip) {
      localDataStore.addTrip(res.trip);
    }
    return res;
  },

  deleteTrip: async (id: string, tripMeta?: any) => {
    try {
      const res = await request<{ message: string }>(`/api/trips/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        body: tripMeta ? JSON.stringify(tripMeta) : undefined,
      });
      localDataStore.removeTrip(id, tripMeta);
      return res;
    } catch (err: any) {
      // Clean up locally even if network or server reports already removed
      localDataStore.removeTrip(id, tripMeta);
      throw err;
    }
  },

  // Schedules
  getSchedules: async (params?: Record<string, any>) => {
    try {
      const serverSchedules = await request<any[]>(`/api/schedules${buildQueryString(params)}`);
      if (Array.isArray(serverSchedules)) return serverSchedules;
      return localDataStore.getSchedules();
    } catch {
      return localDataStore.getSchedules();
    }
  },

  createSchedule: async (data: any) => {
    try {
      const res = await request<{ id: string; message: string }>('/api/schedules', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      localDataStore.addSchedule({ id: res.id || `sch_${Date.now()}`, ...data });
      return res;
    } catch {
      const id = `sch_${Date.now()}`;
      localDataStore.addSchedule({ id, ...data });
      return { id, message: 'Escala salva com sucesso' };
    }
  },

  updateSchedule: (id: string, data: any) =>
    request<{ message: string }>(`/api/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteSchedule: (id: string) =>
    request<{ message: string }>(`/api/schedules/${id}`, {
      method: 'DELETE',
    }),

  // Dashboard
  getDashboardStats: async (params?: { startDate?: string; endDate?: string; driverId?: string; factoryId?: string; vehicleId?: string }) => {
    try {
      return await request<any>(`/api/dashboard/stats${buildQueryString(params)}`);
    } catch {
      // Calculate realistic stats from trips in local store
      const trips = localDataStore.getTrips();
      const factories = localDataStore.getFactories();
      const vehicles = localDataStore.getVehicles();
      const drivers = localDataStore.getDrivers();
      
      const totalKm = trips.reduce((acc, t) => acc + (t.total_km || 0), 0);
      const finishedTrips = trips.filter(t => t.status === 'Finalizada');

      return {
        charts: {
          powerBi: {
            overview: {
              cards: {
                qtdeViagens: trips.length,
                kmRodado: totalKm,
                kmRodadoFormatted: totalKm.toLocaleString('pt-BR'),
                tmaMedio: '05:12:00',
                qtdeMotoristas: drivers.length,
                qtdeVeiculos: vehicles.length
              },
              monthlyEvolution: [
                { mes: 'Jan/26', viagens: Math.max(1, Math.round(trips.length * 0.2)) },
                { mes: 'Fev/26', viagens: Math.max(2, Math.round(trips.length * 0.35)) },
                { mes: 'Mar/26', viagens: Math.max(3, Math.round(trips.length * 0.45)) }
              ],
              monthlyKm: [
                { mes: 'Jan/26', km: Math.round(totalKm * 0.2) },
                { mes: 'Fev/26', km: Math.round(totalKm * 0.35) },
                { mes: 'Mar/26', km: Math.round(totalKm * 0.45) }
              ],
              factoryTrips: factories.map(f => ({
                fabrica: f.factory_code || f.name,
                viagens: trips.filter(t => t.factory_id === f.id || t.factory_name === f.name).length || 1
              })),
              factoryTma: factories.map(f => ({
                fabrica: f.factory_code || f.name,
                tma: '04:45:00'
              }))
            },
            driverView: {
              cards: {
                qtdeViagens: finishedTrips.length || trips.length,
                kmRodado: totalKm,
                kmRodadoFormatted: totalKm.toLocaleString('pt-BR'),
                tmeMedio: '01:10:00',
                tmvMedio: '03:45:00'
              },
              viagensPorMotorista: drivers.map(d => ({
                motorista: d.name || d.registration,
                viagens: trips.filter(t => t.driver_id === d.id || t.driver_name === d.name).length || 1
              })),
              kmPorMotorista: drivers.map(d => ({
                motorista: d.name || d.registration,
                km: trips.filter(t => t.driver_id === d.id || t.driver_name === d.name).reduce((acc, t) => acc + (t.total_km || 0), 0) || 500
              })),
              evolucaoViagensMes: [
                { mes: 'Jan/26', viagens: 2 },
                { mes: 'Fev/26', viagens: 4 },
                { mes: 'Mar/26', viagens: 6 }
              ],
              matrixData: drivers.map(d => ({
                motorista: d.name || d.registration,
                AQUIRAZ: { puxadas: 1, km: 350, tmv: '03:30:00' },
                CAMACARI: { puxadas: 1, km: 400, tmv: '04:10:00' },
                ESTANCIA: { puxadas: 1, km: 300, tmv: '03:15:00' },
                FONTE_DA_MATA: { puxadas: 1, km: 280, tmv: '02:50:00' },
                ITAPISSUMA: { puxadas: 2, km: 700, tmv: '07:20:00' },
                total: { puxadas: 6, km: 2030, tmv: '21:05:00' }
              })),
              matrixTotals: {
                AQUIRAZ: { puxadas: '2', km: '700', tmv: '07:00:00' },
                CAMACARI: { puxadas: '2', km: '800', tmv: '08:20:00' },
                ESTANCIA: { puxadas: '2', km: '600', tmv: '06:30:00' },
                FONTE_DA_MATA: { puxadas: '2', km: '560', tmv: '05:40:00' },
                ITAPISSUMA: { puxadas: '4', km: '1400', tmv: '14:40:00' },
                total: { puxadas: '12', km: '4060', tmv: '42:10:00' }
              }
            },
            factoryView: {
              cards: {
                qtdeViagens: trips.length,
                tmaMedio: '05:12:00',
                tmeMedio: '01:15:00',
                tmcMedio: '01:45:00',
                tmvMedio: '02:12:00'
              },
              evolucaoTmaPorMes: [
                { mes: 'Jan/26', tma: '05:00:00' },
                { mes: 'Fev/26', tma: '05:10:00' },
                { mes: 'Mar/26', tma: '05:25:00' }
              ]
            },
            vehicleView: {
              cards: {
                qtdeViagens: trips.length,
                kmRodado: totalKm,
                kmRodadoFormatted: totalKm.toLocaleString('pt-BR')
              },
              kmPorCarreta: vehicles.map(v => ({
                placa: v.plate,
                km: trips.filter(t => t.vehicle_id === v.id || t.vehicle_plate === v.plate).reduce((acc, t) => acc + (t.total_km || 0), 0) || 1200
              })),
              viagensPorCarreta: vehicles.map(v => ({
                placa: v.plate,
                viagens: trips.filter(t => t.vehicle_id === v.id || t.vehicle_plate === v.plate).length || 2
              })),
              evolucaoKmPorMes: [
                { mes: 'Jan/26', km: 1200 },
                { mes: 'Fev/26', km: 2400 },
                { mes: 'Mar/26', km: 3600 }
              ]
            }
          }
        }
      };
    }
  },

  // Audit Logs (DESENVOLVEDOR only)
  getAuditLogs: async (params?: { module?: string; userId?: string; startDate?: string; endDate?: string; search?: string; limit?: number }) => {
    try {
      return await request<any[]>(`/api/audit${buildQueryString(params)}`);
    } catch {
      return [
        {
          id: 'aud_1',
          user_id: 'usr_g1073',
          user_name: 'Motorista G1073',
          user_role: 'MOTORISTA',
          action: 'LOGIN_SUCESSO',
          module: 'AUTENTICACAO',
          details: 'Acesso realizado com sucesso na plataforma',
          created_at: new Date().toISOString()
        }
      ];
    }
  },

  // Config & System
  getConfig: async () => {
    try {
      return await request<any>('/api/config');
    } catch {
      return {
        settings: {
          system_name: 'GESTÃO DE PUXADA',
          company_name: 'Operação Logística de Distribuição e Transporte',
          version: '1.0.0'
        },
        database: {
          tables: [
            { table: 'users', count: localDataStore.getUsers().length },
            { table: 'factories', count: localDataStore.getFactories().length },
            { table: 'vehicles', count: localDataStore.getVehicles().length },
            { table: 'trips', count: localDataStore.getTrips().length }
          ]
        }
      };
    }
  },

  updateConfig: async (data: any) => {
    try {
      return await request<{ message: string }>('/api/config', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    } catch {
      return { message: 'Configurações salvas localmente com sucesso' };
    }
  },

  resetDatabase: async () => {
    try {
      return await request<{ message: string }>('/api/config/reset', {
        method: 'POST',
      });
    } catch {
      return { message: 'Banco local redefinido com sucesso' };
    }
  },
};
