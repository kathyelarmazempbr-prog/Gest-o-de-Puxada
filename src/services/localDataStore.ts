import { User, Vehicle, Factory, Trip } from '../types/index.ts';
import { firebaseSync } from './firebaseSync.ts';

const USERS_STORAGE_KEY = 'gestao_puxada_users_store_v4';
const VEHICLES_STORAGE_KEY = 'gestao_puxada_vehicles_store_v4';
const FACTORIES_STORAGE_KEY = 'gestao_puxada_factories_store_v4';
const TRIPS_STORAGE_KEY = 'gestao_puxada_trips_store_v4';
const DRIVERS_STORAGE_KEY = 'gestao_puxada_drivers_store_v4';
const SCHEDULES_STORAGE_KEY = 'gestao_puxada_schedules_store_v4';

export const DEFAULT_USERS: User[] = [
  { id: 'usr_g1073', name: 'Motorista G1073', login: 'G1073', raw_password: '0000', role: 'MOTORISTA', status: 'Ativo', driver_id: 'drv_g1073', phone: '(11) 98765-4321', email: 'g1073@puxada.log.br', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'usr_mot_1', name: 'João Motorista', login: 'MOT-001', raw_password: '123', role: 'MOTORISTA', status: 'Ativo', driver_id: 'drv_1', phone: '(11) 99888-1111', email: 'mot001@puxada.log.br', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'usr_adm_1', name: 'Carlos Admin', login: 'carlos.admin', raw_password: '123', role: 'ADMINISTRADOR', status: 'Ativo', phone: '(11) 99999-1111', email: 'carlos.admin@puxada.log.br', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'usr_adm_general', name: 'Administrador', login: 'admin', raw_password: '123', role: 'ADMINISTRADOR', status: 'Ativo', phone: '(11) 99999-2222', email: 'admin@puxada.log.br', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'usr_adm_master', name: 'Desenvolvedor Master', login: 'dev', raw_password: '123', role: 'DESENVOLVEDOR', status: 'Ativo', phone: '(11) 99999-0000', email: 'dev@puxada.log.br', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'usr_kathyel', name: 'Kathyel Gestão', login: 'kathyelarmazempbr@gmail.com', raw_password: '0000', role: 'ADMINISTRADOR', status: 'Ativo', phone: '(11) 99999-3333', email: 'kathyelarmazempbr@gmail.com', created_at: '2026-01-01', updated_at: '2026-01-01' },
];

export const DEFAULT_FACTORIES: Factory[] = [
  { id: 'fac_1', factory_code: 'ITAPISSUMA', name: 'Fábrica Itapissuma', state: 'PE', city: 'Itapissuma', status: 'Ativa', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'fac_2', factory_code: 'ESTANCIA', name: 'Fábrica Estância', state: 'SE', city: 'Estância', status: 'Ativa', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'fac_3', factory_code: 'FONTE DA MATA', name: 'Fábrica Fonte da Mata', state: 'BA', city: 'Alagoinhas', status: 'Ativa', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'fac_4', factory_code: 'AQUIRAZ', name: 'Fábrica Aquiraz', state: 'CE', city: 'Aquiraz', status: 'Ativa', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'fac_5', factory_code: 'CAMAÇARI', name: 'Fábrica Camaçari', state: 'BA', city: 'Camaçari', status: 'Ativa', created_at: '2026-01-01', updated_at: '2026-01-01' },
];

export const DEFAULT_VEHICLES: Vehicle[] = [
  { id: 'veh_1', plate: 'RLT5J54', vehicle_number: 'CAR-01', brand: 'Scania', model: 'R450', year: 2023, type: 'Carreta Sider', status: 'Disponível', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'veh_2', plate: 'RLU3F59', vehicle_number: 'CAR-02', brand: 'Volvo', model: 'FH540', year: 2023, type: 'Carreta Baú', status: 'Disponível', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'veh_3', plate: 'RLT5J44', vehicle_number: 'CAR-03', brand: 'Mercedes', model: 'Actros', year: 2022, type: 'Carreta Sider', status: 'Disponível', created_at: '2026-01-01', updated_at: '2026-01-01' },
  { id: 'veh_4', plate: 'QFT5753', vehicle_number: 'CAR-04', brand: 'DAF', model: 'XF105', year: 2022, type: 'Carreta Graneleira', status: 'Disponível', created_at: '2026-01-01', updated_at: '2026-01-01' },
];

export const DEFAULT_DRIVERS = [
  { id: 'drv_g1073', user_id: 'usr_g1073', name: 'Motorista G1073', registration: 'G1073', phone: '(11) 98765-4321', cnh: '01234567890', cnh_category: 'E', status: 'Ativo', default_vehicle_id: 'veh_1' },
  { id: 'drv_1', user_id: 'usr_mot_1', name: 'João da Silva', registration: 'MOT-001', phone: '(11) 99888-1111', cnh: '12345678900', cnh_category: 'E', status: 'Ativo', default_vehicle_id: 'veh_1' },
  { id: 'drv_2', user_id: 'usr_mot_2', name: 'Marcos Santos', registration: 'MOT-002', phone: '(11) 99888-2222', cnh: '23456789011', cnh_category: 'E', status: 'Ativo', default_vehicle_id: 'veh_2' },
  { id: 'drv_3', user_id: 'usr_mot_3', name: 'Roberto Souza', registration: 'MOT-003', phone: '(11) 99888-3333', cnh: '34567890122', cnh_category: 'E', status: 'Ativo', default_vehicle_id: 'veh_3' },
];

export const DEFAULT_TRIPS: Trip[] = [
  {
    id: 'trp_1',
    date: '2026-04-10',
    driver_id: 'drv_g1073',
    driver_name: 'Motorista G1073',
    vehicle_id: 'veh_1',
    vehicle_plate: 'RLT5J54',
    factory_id: 'fac_1',
    factory_name: 'Fábrica Itapissuma',
    factory_code: 'ITAPISSUMA',
    planned_departure: '08:00',
    planned_arrival: '14:00',
    actual_departure: '08:15',
    actual_arrival: '13:50',
    status: 'Finalizada',
    initial_km: 120500,
    final_km: 120850,
    total_km: 350,
    total_time: '05:35',
    meals_count: 1,
    appointment_window: '08:00 – 14:00',
    order_number: 'PED-9001',
    created_at: '2026-04-10T08:00:00Z',
    updated_at: '2026-04-10T14:00:00Z'
  },
  {
    id: 'trp_2',
    date: '2026-04-14',
    driver_id: 'drv_g1073',
    driver_name: 'Motorista G1073',
    vehicle_id: 'veh_1',
    vehicle_plate: 'RLT5J54',
    factory_id: 'fac_2',
    factory_name: 'Fábrica Estância',
    factory_code: 'ESTANCIA',
    planned_departure: '09:00',
    planned_arrival: '16:00',
    status: 'Programada',
    appointment_window: '09:00 – 16:00',
    order_number: 'PED-9002',
    created_at: '2026-04-14T09:00:00Z',
    updated_at: '2026-04-14T09:00:00Z'
  }
];

function safeGetItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as unknown as T;
    }
    return fallback;
  } catch (err) {
    console.warn(`[LocalDataStore] Error reading key ${key}:`, err);
    return fallback;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[LocalDataStore] Error saving key ${key}:`, err);
  }
}

export const localDataStore = {
  // Initialize and sync with Firebase Firestore on app load
  async initFirebaseSync(): Promise<void> {
    try {
      // 1. Users
      const fbUsers = await firebaseSync.getAllItems('users');
      const localUsers = this.getUsers();
      const mergedUsersMap = new Map<string, User>();
      DEFAULT_USERS.forEach(u => mergedUsersMap.set(u.id, u));
      localUsers.forEach(u => mergedUsersMap.set(u.id, u));
      if (Array.isArray(fbUsers)) {
        fbUsers.forEach(u => mergedUsersMap.set(u.id, u));
      }
      const finalUsers = Array.from(mergedUsersMap.values());
      this.saveUsers(finalUsers);
      firebaseSync.syncBatch('users', finalUsers).catch(() => {});

      // 2. Vehicles
      const fbVehicles = await firebaseSync.getAllItems('vehicles');
      const localVehicles = this.getVehicles();
      const mergedVehiclesMap = new Map<string, Vehicle>();
      DEFAULT_VEHICLES.forEach(v => mergedVehiclesMap.set(v.id, v));
      localVehicles.forEach(v => mergedVehiclesMap.set(v.id, v));
      if (Array.isArray(fbVehicles)) {
        fbVehicles.forEach(v => mergedVehiclesMap.set(v.id, v));
      }
      const finalVehicles = Array.from(mergedVehiclesMap.values());
      this.saveVehicles(finalVehicles);
      firebaseSync.syncBatch('vehicles', finalVehicles).catch(() => {});

      // 3. Factories
      const fbFactories = await firebaseSync.getAllItems('factories');
      const localFactories = this.getFactories();
      const mergedFactoriesMap = new Map<string, Factory>();
      DEFAULT_FACTORIES.forEach(f => mergedFactoriesMap.set(f.id, f));
      localFactories.forEach(f => mergedFactoriesMap.set(f.id, f));
      if (Array.isArray(fbFactories)) {
        fbFactories.forEach(f => mergedFactoriesMap.set(f.id, f));
      }
      const finalFactories = Array.from(mergedFactoriesMap.values());
      this.saveFactories(finalFactories);
      firebaseSync.syncBatch('factories', finalFactories).catch(() => {});

      // 4. Trips
      const fbTrips = await firebaseSync.getAllItems('trips');
      const localTrips = this.getTrips();
      const mergedTripsMap = new Map<string, Trip>();
      DEFAULT_TRIPS.forEach(t => mergedTripsMap.set(t.id, t));
      localTrips.forEach(t => mergedTripsMap.set(t.id, t));
      if (Array.isArray(fbTrips)) {
        fbTrips.forEach(t => mergedTripsMap.set(t.id, t));
      }
      const finalTrips = Array.from(mergedTripsMap.values());
      this.saveTrips(finalTrips);
      firebaseSync.syncBatch('trips', finalTrips).catch(() => {});
    } catch (err) {
      console.warn('[LocalDataStore] Error during Firebase sync init:', err);
    }
  },

  // --- USERS ---
  getUsers(): User[] {
    const users = safeGetItem<User[]>(USERS_STORAGE_KEY, DEFAULT_USERS);
    // Ensure all default users exist
    const map = new Map<string, User>();
    DEFAULT_USERS.forEach(u => map.set(u.login?.toUpperCase() || u.id, u));
    users.forEach(u => map.set(u.login?.toUpperCase() || u.id, u));
    return Array.from(map.values());
  },

  saveUsers(users: User[]): void {
    safeSetItem(USERS_STORAGE_KEY, users);
  },

  addUser(user: User): User[] {
    const current = this.getUsers();
    const existingIndex = current.findIndex(u => u.id === user.id || (u.login && u.login.toUpperCase() === user.login.toUpperCase()));
    let updated: User[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = { ...updated[existingIndex], ...user };
    } else {
      updated = [user, ...current];
    }
    this.saveUsers(updated);
    if (user && user.id) {
      firebaseSync.saveItem('users', user.id, updated.find(u => u.id === user.id) || user).catch(() => {});
    }
    return updated;
  },

  updateUser(user: Partial<User> & { id: string }): User[] {
    const current = this.getUsers();
    const updated = current.map(u => u.id === user.id ? { ...u, ...user } : u);
    this.saveUsers(updated);
    const target = updated.find(u => u.id === user.id);
    if (target) {
      firebaseSync.saveItem('users', user.id, target).catch(() => {});
    }
    return updated;
  },

  removeUser(id: string): User[] {
    const current = this.getUsers();
    const updated = current.filter(u => u.id !== id);
    this.saveUsers(updated);
    firebaseSync.deleteItem('users', id).catch(() => {});
    return updated;
  },

  mergeUsers(apiUsers: User[]): User[] {
    if (!Array.isArray(apiUsers)) return this.getUsers();
    const local = this.getUsers();
    
    const mergedMap = new Map<string, User>();
    local.forEach(u => mergedMap.set(u.id, u));
    apiUsers.forEach(u => mergedMap.set(u.id, u));

    const result = Array.from(mergedMap.values());
    this.saveUsers(result);
    firebaseSync.syncBatch('users', result).catch(() => {});
    return result;
  },

  // --- VEHICLES ---
  getVehicles(): Vehicle[] {
    return safeGetItem<Vehicle[]>(VEHICLES_STORAGE_KEY, DEFAULT_VEHICLES);
  },

  saveVehicles(vehicles: Vehicle[]): void {
    safeSetItem(VEHICLES_STORAGE_KEY, vehicles);
  },

  addVehicle(vehicle: Vehicle): Vehicle[] {
    const current = this.getVehicles();
    const existingIndex = current.findIndex(v => v.id === vehicle.id || (v.plate && v.plate.toUpperCase() === vehicle.plate.toUpperCase()));
    let updated: Vehicle[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = { ...updated[existingIndex], ...vehicle };
    } else {
      updated = [vehicle, ...current];
    }
    this.saveVehicles(updated);
    if (vehicle && vehicle.id) {
      firebaseSync.saveItem('vehicles', vehicle.id, updated.find(v => v.id === vehicle.id) || vehicle).catch(() => {});
    }
    return updated;
  },

  updateVehicle(vehicle: Partial<Vehicle> & { id: string }): Vehicle[] {
    const current = this.getVehicles();
    const updated = current.map(v => v.id === vehicle.id ? { ...v, ...vehicle } : v);
    this.saveVehicles(updated);
    const target = updated.find(v => v.id === vehicle.id);
    if (target) {
      firebaseSync.saveItem('vehicles', vehicle.id, target).catch(() => {});
    }
    return updated;
  },

  removeVehicle(id: string): Vehicle[] {
    const current = this.getVehicles();
    const updated = current.filter(v => v.id !== id);
    this.saveVehicles(updated);
    firebaseSync.deleteItem('vehicles', id).catch(() => {});
    return updated;
  },

  mergeVehicles(apiVehicles: Vehicle[]): Vehicle[] {
    if (!Array.isArray(apiVehicles)) return this.getVehicles();
    const local = this.getVehicles();
    
    const mergedMap = new Map<string, Vehicle>();
    local.forEach(v => mergedMap.set(v.id, v));
    apiVehicles.forEach(v => mergedMap.set(v.id, v));

    const result = Array.from(mergedMap.values());
    this.saveVehicles(result);
    firebaseSync.syncBatch('vehicles', result).catch(() => {});
    return result;
  },

  // --- FACTORIES ---
  getFactories(): Factory[] {
    return safeGetItem<Factory[]>(FACTORIES_STORAGE_KEY, DEFAULT_FACTORIES);
  },

  saveFactories(factories: Factory[]): void {
    safeSetItem(FACTORIES_STORAGE_KEY, factories);
  },

  addFactory(factory: Factory): Factory[] {
    const current = this.getFactories();
    const existingIndex = current.findIndex(f => f.id === factory.id || (f.factory_code && f.factory_code.toUpperCase() === factory.factory_code.toUpperCase()));
    let updated: Factory[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = { ...updated[existingIndex], ...factory };
    } else {
      updated = [factory, ...current];
    }
    this.saveFactories(updated);
    if (factory && factory.id) {
      firebaseSync.saveItem('factories', factory.id, updated.find(f => f.id === factory.id) || factory).catch(() => {});
    }
    return updated;
  },

  updateFactory(factory: Partial<Factory> & { id: string }): Factory[] {
    const current = this.getFactories();
    const updated = current.map(f => f.id === factory.id ? { ...f, ...factory } : f);
    this.saveFactories(updated);
    const target = updated.find(f => f.id === factory.id);
    if (target) {
      firebaseSync.saveItem('factories', factory.id, target).catch(() => {});
    }
    return updated;
  },

  removeFactory(id: string): Factory[] {
    const current = this.getFactories();
    const updated = current.filter(f => f.id !== id);
    this.saveFactories(updated);
    firebaseSync.deleteItem('factories', id).catch(() => {});
    return updated;
  },

  mergeFactories(apiFactories: Factory[]): Factory[] {
    if (!Array.isArray(apiFactories)) return this.getFactories();
    const local = this.getFactories();
    
    const mergedMap = new Map<string, Factory>();
    local.forEach(f => mergedMap.set(f.id, f));
    apiFactories.forEach(f => mergedMap.set(f.id, f));

    const result = Array.from(mergedMap.values());
    this.saveFactories(result);
    firebaseSync.syncBatch('factories', result).catch(() => {});
    return result;
  },

  // --- DRIVERS ---
  getDrivers(): any[] {
    const drivers = safeGetItem<any[]>(DRIVERS_STORAGE_KEY, DEFAULT_DRIVERS);
    // Also include any users with role MOTORISTA
    const users = this.getUsers().filter(u => u.role === 'MOTORISTA');
    const map = new Map<string, any>();
    drivers.forEach(d => map.set(d.id, d));
    users.forEach(u => {
      const drvId = u.driver_id || `drv_${u.login?.toLowerCase() || u.id}`;
      if (!map.has(drvId)) {
        map.set(drvId, {
          id: drvId,
          user_id: u.id,
          name: u.name,
          registration: u.login,
          phone: u.phone || '(11) 99999-9999',
          cnh: '12345678900',
          cnh_category: 'E',
          status: 'Ativo',
          default_vehicle_id: 'veh_1'
        });
      }
    });
    return Array.from(map.values());
  },

  saveDrivers(drivers: any[]): void {
    safeSetItem(DRIVERS_STORAGE_KEY, drivers);
  },

  addDriver(driver: any): any[] {
    const current = this.getDrivers();
    const updated = [driver, ...current.filter(d => d.id !== driver.id)];
    this.saveDrivers(updated);
    return updated;
  },

  // --- TRIPS ---
  getTrips(): Trip[] {
    return safeGetItem<Trip[]>(TRIPS_STORAGE_KEY, DEFAULT_TRIPS);
  },

  saveTrips(trips: Trip[]): void {
    safeSetItem(TRIPS_STORAGE_KEY, trips);
  },

  addTrip(trip: Trip): Trip[] {
    const current = this.getTrips();
    const existingIndex = current.findIndex(t => t.id === trip.id);
    let updated: Trip[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = { ...updated[existingIndex], ...trip };
    } else {
      updated = [trip, ...current];
    }
    this.saveTrips(updated);
    if (trip && trip.id) {
      firebaseSync.saveItem('trips', trip.id, updated.find(t => t.id === trip.id) || trip).catch(() => {});
    }
    return updated;
  },

  updateTrip(trip: Partial<Trip> & { id: string }): Trip[] {
    const current = this.getTrips();
    const updated = current.map(t => t.id === trip.id ? { ...t, ...trip } : t);
    this.saveTrips(updated);
    const target = updated.find(t => t.id === trip.id);
    if (target) {
      firebaseSync.saveItem('trips', trip.id, target).catch(() => {});
    }
    return updated;
  },

  removeTrip(id: string, tripMeta?: Partial<Trip>): Trip[] {
    const current = this.getTrips();
    const updated = current.filter(t => {
      if (t.id === id) return false;
      if (tripMeta) {
        const matchDate = !tripMeta.date || t.date === tripMeta.date;
        const matchDriver = !tripMeta.driver_name || t.driver_name === tripMeta.driver_name;
        const matchVehicle = !tripMeta.vehicle_plate || t.vehicle_plate === tripMeta.vehicle_plate;
        const matchDep = !tripMeta.planned_departure || t.planned_departure === tripMeta.planned_departure;
        if (matchDate && matchDriver && matchVehicle && matchDep) {
          return false;
        }
      }
      return true;
    });
    this.saveTrips(updated);
    firebaseSync.deleteItem('trips', id).catch(() => {});
    return updated;
  },

  mergeTrips(apiTrips: Trip[]): Trip[] {
    if (!Array.isArray(apiTrips)) return this.getTrips();
    const local = this.getTrips();
    const map = new Map<string, Trip>();
    local.forEach(t => map.set(t.id, t));
    apiTrips.forEach(t => map.set(t.id, t));
    const result = Array.from(map.values());
    this.saveTrips(result);
    firebaseSync.syncBatch('trips', result).catch(() => {});
    return result;
  },

  // --- SCHEDULES ---
  getSchedules(): any[] {
    return safeGetItem<any[]>(SCHEDULES_STORAGE_KEY, []);
  },

  saveSchedules(schedules: any[]): void {
    safeSetItem(SCHEDULES_STORAGE_KEY, schedules);
  },

  addSchedule(schedule: any): any[] {
    const current = this.getSchedules();
    const updated = [schedule, ...current.filter(s => s.id !== schedule.id)];
    this.saveSchedules(updated);
    return updated;
  }
};
