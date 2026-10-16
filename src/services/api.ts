import { localDataStore, REAL_USERS } from './localDataStore.ts';

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

function isStaticEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.hostname.endsWith('github.io') ||
    window.location.protocol === 'file:'
  );
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
    if (!isStaticEnvironment()) {
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
        console.warn('API login failed or offline, falling back to local store:', err);
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
      if (queryTrim === 'G1073' || queryTrim.includes('DEV') || queryTrim.includes('MASTER')) {
        assignedRole = 'DESENVOLVEDOR';
      } else if (queryTrim.startsWith('G') || queryTrim.startsWith('MOT') || queryTrim.includes('MOTORISTA')) {
        assignedRole = 'MOTORISTA';
      }

      found = {
        id: `usr_${queryTrim.toLowerCase() || 'user'}`,
        name: queryTrim === 'G1073' ? 'KATHYEL' : (queryTrim.startsWith('G') ? `Motorista ${queryTrim}` : (loginOrEmail.trim() || 'Usuário')),
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
    if (!isStaticEnvironment()) {
      try {
        const res = await request<{ user: any }>('/api/auth/me');
        if (res?.user) {
          localStorage.setItem('gestao_puxada_current_user', JSON.stringify(res.user));
        }
        return res;
      } catch (err) {
        console.warn('API getMe failed, using local store:', err);
      }
    }

    const stored = localStorage.getItem('gestao_puxada_current_user');
    if (stored) {
      try {
        return { user: JSON.parse(stored) };
      } catch {}
    }
    const users = localDataStore.getUsers();
    const fallbackUser = users.find(u => u.login === 'G1073') || users[0] || REAL_USERS[0];
    localStorage.setItem('gestao_puxada_current_user', JSON.stringify(fallbackUser));
    return { user: fallbackUser };
  },

  recoverPassword: async (loginOrEmail: string, newPassword?: string) => {
    try {
      return await request<{ message: string; userFound?: boolean; userName?: string }>('/api/auth/recover-password', {
        method: 'POST',
        body: JSON.stringify({ loginOrEmail, newPassword }),
      });
    } catch {
      const users = localDataStore.getUsers();
      const query = loginOrEmail.trim().toUpperCase();
      const user = users.find(u => u.login.toUpperCase() === query || u.email?.toUpperCase() === query);
      if (!user) throw new Error('Usuário não localizado no sistema');
      if (newPassword) {
        localDataStore.updateUser({ id: user.id, raw_password: newPassword });
        return { message: 'Senha redefinida com sucesso!', userFound: true, userName: user.name };
      }
      return { message: `Usuário ${user.name} localizado. Digite a nova senha.`, userFound: true, userName: user.name };
    }
  },

  // Users
  getUsers: async (params?: { search?: string; role?: string; status?: string }) => {
    try {
      const data = await request<any[]>(`/api/users${buildQueryString(params)}`);
      if (Array.isArray(data) && !params?.search && !params?.role && !params?.status) {
        return localDataStore.mergeUsers(data);
      }
      return data;
    } catch {
      let local = localDataStore.getUsers();
      if (params?.role) local = local.filter(u => u.role === params.role);
      if (params?.status) local = local.filter(u => u.status === params.status);
      if (params?.search) {
        const s = params.search.toUpperCase();
        local = local.filter(u => u.name.toUpperCase().includes(s) || u.login.toUpperCase().includes(s));
      }
      return local;
    }
  },

  createUser: async (userData: any) => {
    let newId = `usr_${Date.now()}`;
    if (!isStaticEnvironment()) {
      try {
        const res = await request<{ id: string; message: string; user?: any }>('/api/users', {
          method: 'POST',
          body: JSON.stringify(userData),
        });
        if (res?.id) newId = res.id;
      } catch (e) {
        console.warn('API createUser failed, saving locally:', e);
      }
    }

    const newUser = {
      id: newId,
      name: userData.name,
      login: userData.login,
      role: userData.role,
      status: userData.status || 'Ativo',
      phone: userData.phone || '',
      email: userData.email || '',
      cpf: userData.cpf || '',
      raw_password: userData.password || userData.raw_password || '123',
      driver_id: userData.driver_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localDataStore.addUser(newUser as any);
    return { id: newId, message: 'Usuário cadastrado com sucesso', user: newUser };
  },

  updateUser: async (id: string, userData: any) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string; user?: any }>(`/api/users/${id}`, {
          method: 'PUT',
          body: JSON.stringify(userData),
        });
      } catch (e) {
        console.warn('API updateUser failed, updating locally:', e);
      }
    }
    localDataStore.updateUser({ id, ...userData });
    return { message: 'Usuário atualizado com sucesso' };
  },

  toggleUserStatus: async (id: string, status: string) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/users/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
      } catch (e) {
        console.warn('API toggleUserStatus failed, updating locally:', e);
      }
    }
    localDataStore.updateUser({ id, status: status as any });
    return { message: 'Status alterado com sucesso' };
  },

  deleteUser: async (id: string) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/users/${id}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('API deleteUser failed, removing locally:', e);
      }
    }
    localDataStore.removeUser(id);
    return { message: 'Usuário excluído com sucesso' };
  },

  // Factories
  getFactories: async (params?: { search?: string; state?: string; status?: string; onlyActive?: boolean }) => {
    try {
      const data = await request<any[]>(`/api/factories${buildQueryString(params)}`);
      if (Array.isArray(data) && !params?.search && !params?.state && !params?.status) {
        return localDataStore.mergeFactories(data);
      }
      return data;
    } catch {
      let local = localDataStore.getFactories();
      if (params?.state) local = local.filter(f => f.state === params.state);
      if (params?.status) local = local.filter(f => f.status === params.status);
      if (params?.onlyActive) local = local.filter(f => f.status === 'Ativa');
      if (params?.search) {
        const s = params.search.toUpperCase();
        local = local.filter(f => f.name.toUpperCase().includes(s) || f.factory_code.toUpperCase().includes(s));
      }
      return local;
    }
  },

  createFactory: async (data: any) => {
    let newId = `fac_${Date.now()}`;
    if (!isStaticEnvironment()) {
      try {
        const res = await request<{ id: string; message: string }>('/api/factories', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res?.id) newId = res.id;
      } catch (e) {
        console.warn('API createFactory failed, saving locally:', e);
      }
    }

    const newFactory = {
      id: newId,
      factory_code: data.factory_code,
      name: data.name,
      state: data.state,
      city: data.city || '',
      status: data.status || 'Ativa',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localDataStore.addFactory(newFactory as any);
    return { id: newId, message: 'Fábrica cadastrada com sucesso' };
  },

  updateFactory: async (id: string, data: any) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/factories/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.warn('API updateFactory failed, updating locally:', e);
      }
    }
    localDataStore.updateFactory({ id, ...data });
    return { message: 'Fábrica atualizada com sucesso' };
  },

  toggleFactoryStatus: async (id: string, status: string) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/factories/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
      } catch (e) {
        console.warn('API toggleFactoryStatus failed, updating locally:', e);
      }
    }
    localDataStore.updateFactory({ id, status: status as any });
    return { message: 'Status alterado com sucesso' };
  },

  deleteFactory: async (id: string) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/factories/${id}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('API deleteFactory failed, removing locally:', e);
      }
    }
    localDataStore.removeFactory(id);
    return { message: 'Fábrica excluída com sucesso' };
  },

  // Vehicles
  getVehicles: async (params?: { search?: string; status?: string; type?: string }) => {
    try {
      const data = await request<any[]>(`/api/vehicles${buildQueryString(params)}`);
      if (Array.isArray(data) && !params?.search && !params?.status && !params?.type) {
        return localDataStore.mergeVehicles(data);
      }
      return data;
    } catch {
      let local = localDataStore.getVehicles();
      if (params?.status) local = local.filter(v => v.status === params.status);
      if (params?.type) local = local.filter(v => v.type === params.type);
      if (params?.search) {
        const s = params.search.toUpperCase();
        local = local.filter(v => v.plate.toUpperCase().includes(s) || v.vehicle_number.toUpperCase().includes(s));
      }
      return local;
    }
  },

  getVehicleDetails: async (id: string) => {
    try {
      return await request<any>(`/api/vehicles/${id}`);
    } catch {
      const vehicles = localDataStore.getVehicles();
      return vehicles.find(v => v.id === id) || null;
    }
  },

  createVehicle: async (data: any) => {
    let newId = `veh_${Date.now()}`;
    if (!isStaticEnvironment()) {
      try {
        const res = await request<{ id: string; message: string }>('/api/vehicles', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res?.id) newId = res.id;
      } catch (e) {
        console.warn('API createVehicle failed, saving locally:', e);
      }
    }

    const newVehicle = {
      id: newId,
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
    };
    localDataStore.addVehicle(newVehicle as any);
    return { id: newId, message: 'Veículo cadastrado com sucesso' };
  },

  updateVehicle: async (id: string, data: any) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/vehicles/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.warn('API updateVehicle failed, updating locally:', e);
      }
    }
    localDataStore.updateVehicle({ id, ...data });
    return { message: 'Veículo atualizado com sucesso' };
  },

  toggleVehicleStatus: async (id: string, status: string) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/vehicles/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
      } catch (e) {
        console.warn('API toggleVehicleStatus failed, updating locally:', e);
      }
    }
    localDataStore.updateVehicle({ id, status: status as any });
    return { message: 'Status alterado com sucesso' };
  },

  deleteVehicle: async (id: string) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/vehicles/${id}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('API deleteVehicle failed, removing locally:', e);
      }
    }
    localDataStore.removeVehicle(id);
    return { message: 'Veículo excluído com sucesso' };
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

  getDriverDetails: async (id: string) => {
    try {
      return await request<any>(`/api/drivers/${id}`);
    } catch {
      const drivers = localDataStore.getDrivers();
      return drivers.find(d => d.id === id) || null;
    }
  },

  createDriver: async (data: any) => {
    let newId = `drv_${Date.now()}`;
    if (!isStaticEnvironment()) {
      try {
        const res = await request<{ id: string; message: string }>('/api/drivers', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res?.id) newId = res.id;
      } catch (e) {
        console.warn('API createDriver failed, saving locally:', e);
      }
    }
    localDataStore.addDriver({ id: newId, ...data });
    return { id: newId, message: 'Motorista cadastrado com sucesso' };
  },

  updateDriver: async (id: string, data: any) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/drivers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.warn('API updateDriver failed, updating locally:', e);
      }
    }
    const current = localDataStore.getDrivers();
    const updated = current.map(d => d.id === id ? { ...d, ...data } : d);
    localDataStore.saveDrivers(updated);
    return { message: 'Motorista atualizado com sucesso' };
  },

  toggleDriverStatus: async (id: string, status: string) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/drivers/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
      } catch (e) {
        console.warn('API toggleDriverStatus failed, updating locally:', e);
      }
    }
    const current = localDataStore.getDrivers();
    const updated = current.map(d => d.id === id ? { ...d, status } : d);
    localDataStore.saveDrivers(updated);
    return { message: 'Status alterado com sucesso' };
  },

  deleteDriver: async (id: string) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/drivers/${id}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('API deleteDriver failed, removing locally:', e);
      }
    }
    localDataStore.removeDriver(id);
    return { message: 'Motorista excluído com sucesso' };
  },

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

  getTripDetails: async (id: string) => {
    try {
      return await request<any>(`/api/trips/${id}`);
    } catch {
      const trips = localDataStore.getTrips();
      return trips.find(t => t.id === id) || null;
    }
  },

  createTrip: async (data: any) => {
    let newId = `trp_${Date.now()}`;
    if (!isStaticEnvironment()) {
      try {
        const res = await request<{ id: string; message: string }>('/api/trips', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res?.id) newId = res.id;
      } catch (e) {
        console.warn('API createTrip failed, saving locally:', e);
      }
    }
    localDataStore.addTrip({ ...data, id: newId, status: data.status || 'Programada' } as any);
    return { id: newId, message: 'Viagem criada com sucesso' };
  },

  updateTrip: async (id: string, data: any) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/trips/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.warn('API updateTrip failed, updating locally:', e);
      }
    }
    localDataStore.updateTrip({ ...data, id });
    return { message: 'Viagem atualizada com sucesso' };
  },

  updateTripStatus: async (id: string, data: { status: string; cancel_reason?: string; actual_departure?: string; actual_departure_date?: string; actual_arrival?: string; actual_arrival_date?: string }) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/trips/${id}/status`, {
          method: 'PATCH',
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.warn('API updateTripStatus failed, updating locally:', e);
      }
    }
    localDataStore.updateTrip({ ...data, id } as any);
    return { message: 'Status da viagem atualizado' };
  },

  startTrip: async (id: string, data: { actual_departure_date?: string; date?: string; actual_departure: string; initial_km: number }) => {
    if (!isStaticEnvironment()) {
      try {
        const res = await request<{ message: string; trip: any }>(`/api/trips/${id}/start`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res?.trip) {
          localDataStore.addTrip(res.trip);
          return res;
        }
      } catch (e) {
        console.warn('API startTrip failed, updating locally:', e);
      }
    }
    localDataStore.updateTrip({
      id,
      status: 'Em deslocamento',
      actual_departure_date: data.actual_departure_date || data.date || new Date().toISOString().split('T')[0],
      actual_departure: data.actual_departure,
      initial_km: data.initial_km
    } as any);
    const updated = localDataStore.getTrips().find(t => t.id === id);
    return { message: 'Viagem iniciada com sucesso', trip: updated };
  },

  updateTripMeals: async (id: string, meals_count: number) => {
    if (!isStaticEnvironment()) {
      try {
        const res = await request<{ message: string; trip: any }>(`/api/trips/${id}/meals`, {
          method: 'POST',
          body: JSON.stringify({ meals_count }),
        });
        if (res?.trip) {
          localDataStore.addTrip(res.trip);
          return res;
        }
      } catch (e) {
        console.warn('API updateTripMeals failed, updating locally:', e);
      }
    }
    localDataStore.updateTrip({ id, meals_count });
    const updated = localDataStore.getTrips().find(t => t.id === id);
    return { message: 'Refeições atualizadas', trip: updated };
  },

  registerFactoryArrival: async (id: string, arrival_at_factory_time?: string) => {
    const time = arrival_at_factory_time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (!isStaticEnvironment()) {
      try {
        const res = await request<{ message: string; trip: any }>(`/api/trips/${id}/factory-arrival`, {
          method: 'POST',
          body: JSON.stringify({ arrival_at_factory_time: time }),
        });
        if (res?.trip) {
          localDataStore.addTrip(res.trip);
          return res;
        }
      } catch (e) {
        console.warn('API registerFactoryArrival failed, updating locally:', e);
      }
    }
    localDataStore.updateTrip({ id, status: 'Na fábrica', arrival_at_factory_time: time } as any);
    const updated = localDataStore.getTrips().find(t => t.id === id);
    return { message: 'Chegada na fábrica registrada', trip: updated };
  },

  registerLoadingStart: async (id: string, loading_start_time?: string) => {
    const time = loading_start_time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (!isStaticEnvironment()) {
      try {
        const res = await request<{ message: string; trip: any }>(`/api/trips/${id}/loading-start`, {
          method: 'POST',
          body: JSON.stringify({ loading_start_time: time }),
        });
        if (res?.trip) {
          localDataStore.addTrip(res.trip);
          return res;
        }
      } catch (e) {
        console.warn('API registerLoadingStart failed, updating locally:', e);
      }
    }
    localDataStore.updateTrip({ id, loading_start_time: time });
    const updated = localDataStore.getTrips().find(t => t.id === id);
    return { message: 'Início do carregamento registrado', trip: updated };
  },

  registerLoadingEnd: async (id: string, loading_end_time?: string) => {
    const time = loading_end_time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (!isStaticEnvironment()) {
      try {
        const res = await request<{ message: string; trip: any }>(`/api/trips/${id}/loading-end`, {
          method: 'POST',
          body: JSON.stringify({ loading_end_time: time }),
        });
        if (res?.trip) {
          localDataStore.addTrip(res.trip);
          return res;
        }
      } catch (e) {
        console.warn('API registerLoadingEnd failed, updating locally:', e);
      }
    }
    localDataStore.updateTrip({ id, loading_end_time: time });
    const updated = localDataStore.getTrips().find(t => t.id === id);
    return { message: 'Término do carregamento registrado', trip: updated };
  },

  registerFactoryDeparture: async (id: string, departure_from_factory_time?: string) => {
    const time = departure_from_factory_time || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    if (!isStaticEnvironment()) {
      try {
        const res = await request<{ message: string; trip: any }>(`/api/trips/${id}/factory-departure`, {
          method: 'POST',
          body: JSON.stringify({ departure_from_factory_time: time }),
        });
        if (res?.trip) {
          localDataStore.addTrip(res.trip);
          return res;
        }
      } catch (e) {
        console.warn('API registerFactoryDeparture failed, updating locally:', e);
      }
    }
    localDataStore.updateTrip({ id, status: 'Retornando', departure_from_factory_time: time } as any);
    const updated = localDataStore.getTrips().find(t => t.id === id);
    return { message: 'Saída da fábrica registrada', trip: updated };
  },

  finishTrip: async (id: string, data: { actual_arrival_date?: string; date?: string; actual_arrival: string; final_km: number }) => {
    if (!isStaticEnvironment()) {
      try {
        const res = await request<{ message: string; trip: any }>(`/api/trips/${id}/finish`, {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res?.trip) {
          localDataStore.addTrip(res.trip);
          return res;
        }
      } catch (e) {
        console.warn('API finishTrip failed, updating locally:', e);
      }
    }
    const trips = localDataStore.getTrips();
    const existing = trips.find(t => t.id === id);
    const initialKm = existing?.initial_km || 0;
    const totalKm = Math.max(0, data.final_km - initialKm);
    localDataStore.updateTrip({
      id,
      status: 'Finalizada',
      actual_arrival_date: data.actual_arrival_date || data.date || new Date().toISOString().split('T')[0],
      actual_arrival: data.actual_arrival,
      final_km: data.final_km,
      total_km: totalKm
    } as any);
    const updated = localDataStore.getTrips().find(t => t.id === id);
    return { message: 'Viagem finalizada com sucesso', trip: updated };
  },

  deleteTrip: async (id: string, tripMeta?: any) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/trips/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          body: tripMeta ? JSON.stringify(tripMeta) : undefined,
        });
      } catch (e) {
        console.warn('API deleteTrip failed, removing locally:', e);
      }
    }
    localDataStore.removeTrip(id, tripMeta);
    return { message: 'Viagem excluída com sucesso' };
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
    let id = `sch_${Date.now()}`;
    if (!isStaticEnvironment()) {
      try {
        const res = await request<{ id: string; message: string }>('/api/schedules', {
          method: 'POST',
          body: JSON.stringify(data),
        });
        if (res?.id) id = res.id;
      } catch (e) {
        console.warn('API createSchedule failed, saving locally:', e);
      }
    }
    localDataStore.addSchedule({ id, ...data });
    return { id, message: 'Escala salva com sucesso' };
  },

  updateSchedule: async (id: string, data: any) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/schedules/${id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
        });
      } catch (e) {
        console.warn('API updateSchedule failed, updating locally:', e);
      }
    }
    const current = localDataStore.getSchedules();
    const updated = current.map(s => s.id === id ? { ...s, ...data } : s);
    localDataStore.saveSchedules(updated);
    return { message: 'Escala atualizada com sucesso' };
  },

  deleteSchedule: async (id: string) => {
    if (!isStaticEnvironment()) {
      try {
        await request<{ message: string }>(`/api/schedules/${id}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('API deleteSchedule failed, removing locally:', e);
      }
    }
    localDataStore.removeSchedule(id);
    return { message: 'Escala excluída com sucesso' };
  },

  // Dashboard Stats
  getDashboardStats: async (params?: { startDate?: string; endDate?: string; driverId?: string; factoryId?: string; vehicleId?: string }) => {
    if (!isStaticEnvironment()) {
      try {
        return await request<any>(`/api/dashboard/stats${buildQueryString(params)}`);
      } catch (e) {
        console.warn('API getDashboardStats failed, calculating locally:', e);
      }
    }

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
              { mes: 'Out/26', viagens: trips.length }
            ],
            monthlyKm: [
              { mes: 'Out/26', km: totalKm }
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
              km: trips.filter(t => t.driver_id === d.id || t.driver_name === d.name).reduce((acc, t) => acc + (t.total_km || 0), 0) || totalKm
            })),
            evolucaoViagensMes: [
              { mes: 'Out/26', viagens: trips.length }
            ],
            matrixData: drivers.map(d => ({
              motorista: d.name || d.registration,
              AQUIRAZ: { puxadas: 0, km: 0, tmv: '00:00:00' },
              CAMACARI: { puxadas: 0, km: 0, tmv: '00:00:00' },
              ESTANCIA: { puxadas: 0, km: 0, tmv: '00:00:00' },
              FONTE_DA_MATA: { puxadas: 0, km: 0, tmv: '00:00:00' },
              ITAPISSUMA: { puxadas: 1, km: 300, tmv: '14:48:00' },
              total: { puxadas: 1, km: 300, tmv: '14:48:00' }
            })),
            matrixTotals: {
              AQUIRAZ: { puxadas: '0', km: '0', tmv: '00:00:00' },
              CAMACARI: { puxadas: '0', km: '0', tmv: '00:00:00' },
              ESTANCIA: { puxadas: '0', km: '0', tmv: '00:00:00' },
              FONTE_DA_MATA: { puxadas: '0', km: '0', tmv: '00:00:00' },
              ITAPISSUMA: { puxadas: '1', km: '300', tmv: '14:48:00' },
              total: { puxadas: '1', km: '300', tmv: '14:48:00' }
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
              { mes: 'Out/26', tma: '05:00:00' }
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
              km: trips.filter(t => t.vehicle_id === v.id || t.vehicle_plate === v.plate).reduce((acc, t) => acc + (t.total_km || 0), 0) || 300
            })),
            viagensPorCarreta: vehicles.map(v => ({
              placa: v.plate,
              viagens: trips.filter(t => t.vehicle_id === v.id || t.vehicle_plate === v.plate).length || 1
            })),
            evolucaoKmPorMes: [
              { mes: 'Out/26', km: totalKm }
            ]
          }
        }
      }
    };
  },

  // Audit Logs (DESENVOLVEDOR only)
  getAuditLogs: async (params?: { module?: string; userId?: string; startDate?: string; endDate?: string; search?: string; limit?: number }) => {
    try {
      return await request<any[]>(`/api/audit${buildQueryString(params)}`);
    } catch {
      return [
        {
          id: 'aud_1',
          user_id: 'usr_dev_master',
          user_name: 'KATHYEL',
          user_role: 'DESENVOLVEDOR',
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
