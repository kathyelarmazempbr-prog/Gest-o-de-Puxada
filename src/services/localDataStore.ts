import { User, Vehicle, Factory, Trip } from '../types/index.ts';
import { firebaseSync } from './firebaseSync.ts';

const USERS_STORAGE_KEY = 'gestao_puxada_users_store_v5';
const VEHICLES_STORAGE_KEY = 'gestao_puxada_vehicles_store_v5';
const FACTORIES_STORAGE_KEY = 'gestao_puxada_factories_store_v5';
const TRIPS_STORAGE_KEY = 'gestao_puxada_trips_store_v5';
const DRIVERS_STORAGE_KEY = 'gestao_puxada_drivers_store_v5';
const SCHEDULES_STORAGE_KEY = 'gestao_puxada_schedules_store_v5';

// Real operational data from gestao_puxada_backup.json
export const REAL_USERS: User[] = [
  {
    id: 'usr_dev_master',
    name: 'KATHYEL',
    cpf: '000.000.000-00',
    phone: '',
    email: 'kathyelarmazempbr@gmail.com',
    login: 'G1073',
    role: 'DESENVOLVEDOR',
    status: 'Ativo',
    raw_password: '0000',
    created_at: '2026-09-29T10:00:00.000Z',
    updated_at: '2026-10-01T17:16:28.349Z'
  },
  {
    id: 'usr_1791467937331_lshu',
    name: 'MANOEL MESSIAS',
    cpf: '',
    phone: '',
    email: 'g1044@puxada.log.br',
    login: 'G1044',
    role: 'MOTORISTA',
    status: 'Ativo',
    raw_password: '0001',
    driver_id: 'drv_1791467937343_is58',
    created_at: '2026-10-08T13:58:57.331Z',
    updated_at: '2026-10-08T13:58:57.331Z'
  }
];

export const REAL_VEHICLES: Vehicle[] = [
  {
    id: 'veh_1791467955584_p6x1',
    plate: 'RLU-3F59',
    vehicle_number: 'RLU3F59',
    brand: 'Scania',
    model: 'OFH-7150',
    year: 2026,
    type: 'Semirreboque',
    capacity: '',
    status: 'Disponível',
    created_at: '2026-10-08T13:59:15.584Z',
    updated_at: '2026-10-13T19:54:22.304Z'
  },
  {
    id: 'veh_1791467966199_ohg0',
    plate: 'RLT-5J54',
    vehicle_number: 'RLT5J54',
    brand: 'Volvo',
    model: 'NPT-1753',
    year: 2026,
    type: 'Semirreboque',
    capacity: '',
    status: 'Disponível',
    created_at: '2026-10-08T13:59:26.199Z',
    updated_at: '2026-10-13T19:21:41.655Z'
  },
  {
    id: 'veh_1791467976230_s735',
    plate: 'RLT-5J44',
    vehicle_number: 'RLT5J44',
    brand: 'Volvo',
    model: 'MOM-7962',
    year: 2026,
    type: 'Semirreboque',
    capacity: '',
    status: 'Disponível',
    created_at: '2026-10-08T13:59:36.230Z',
    updated_at: '2026-10-14T13:48:48.212Z'
  }
];

export const REAL_FACTORIES: Factory[] = [
  {
    id: 'fac_1791468036762_xvga',
    factory_code: '950',
    name: 'ITAPISSUMA',
    state: 'PE',
    city: 'Itapissuma',
    status: 'Ativa',
    created_at: '2026-10-08T14:00:36.762Z',
    updated_at: '2026-10-08T14:00:36.762Z'
  },
  {
    id: 'fac_1791468057926_8bfx',
    factory_code: '3006',
    name: 'AGUAS CLARAS',
    state: 'SE',
    city: 'Estância',
    status: 'Ativa',
    created_at: '2026-10-08T14:00:57.926Z',
    updated_at: '2026-10-08T14:00:57.926Z'
  },
  {
    id: 'fac_1791981512242_ta32',
    factory_code: '426',
    name: 'FONTE DA MATA',
    state: 'PB',
    city: 'Fonte da Mata',
    status: 'Ativa',
    created_at: '2026-10-14T12:38:32.242Z',
    updated_at: '2026-10-14T13:42:05.554Z'
  },
  {
    id: 'fac_1791981512278_hdhs',
    factory_code: '436',
    name: 'AQUIRAZ',
    state: 'CE',
    city: 'Aquiraz',
    status: 'Ativa',
    created_at: '2026-10-14T12:38:32.278Z',
    updated_at: '2026-10-14T13:42:14.356Z'
  },
  {
    id: 'fac_1791981512313_m78d',
    factory_code: '201',
    name: 'CAMAÇARI',
    state: 'BA',
    city: 'Camaçari',
    status: 'Ativa',
    created_at: '2026-10-14T12:38:32.313Z',
    updated_at: '2026-10-14T13:42:20.859Z'
  }
];

export const REAL_DRIVERS = [
  {
    id: 'drv_1791467937343_is58',
    user_id: 'usr_1791467937331_lshu',
    name: 'MANOEL MESSIAS',
    cpf: '',
    registration: 'G1044',
    phone: '',
    cnh: '',
    cnh_category: 'E',
    status: 'Ativo',
    default_vehicle_id: 'veh_1791467976230_s735',
    created_at: '2026-10-08T13:58:57.331Z',
    updated_at: '2026-10-08T13:58:57.331Z'
  }
];

export const REAL_TRIPS: Trip[] = [
  {
    id: 'trp_1791985420941_t288',
    date: '2026-10-14',
    driver_id: 'drv_1791467937343_is58',
    driver_name: 'MANOEL MESSIAS',
    vehicle_id: 'veh_1791467976230_s735',
    vehicle_plate: 'RLT-5J44',
    factory_id: 'fac_1791468036762_xvga',
    factory_name: 'ITAPISSUMA',
    factory_code: '950',
    planned_departure: '20:00',
    actual_departure: '16:22',
    actual_arrival: '07:10',
    status: 'Finalizada',
    appointment_window: '20:00 – 22:00',
    order_number: '123456789',
    initial_km: 200,
    final_km: 500,
    total_km: 300,
    total_time: '14h 48m',
    meals_count: 4,
    actual_departure_date: '2026-10-14',
    actual_arrival_date: '2026-10-15',
    arrival_at_factory_time: '10:49',
    loading_start_time: '10:49',
    loading_end_time: '10:49',
    created_by: 'usr_dev_master',
    created_at: '2026-10-14T13:43:40.941Z',
    updated_at: '2026-10-14T13:48:48.212Z'
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
  // Purge outdated mock keys from older versions to ensure clean operational state
  cleanLegacyMocks(): void {
    try {
      const legacyKeys = [
        'gestao_puxada_users_store_v3',
        'gestao_puxada_users_store_v4',
        'gestao_puxada_vehicles_store_v3',
        'gestao_puxada_vehicles_store_v4',
        'gestao_puxada_factories_store_v3',
        'gestao_puxada_factories_store_v4',
        'gestao_puxada_trips_store_v3',
        'gestao_puxada_trips_store_v4',
      ];
      legacyKeys.forEach(k => localStorage.removeItem(k));
    } catch {}
  },

  // Initialize and sync with Firebase Firestore on app load
  async initFirebaseSync(): Promise<void> {
    this.cleanLegacyMocks();
    try {
      // 1. Users
      const fbUsers = await firebaseSync.getAllItems('users');
      const localUsers = this.getUsers();
      const userMap = new Map<string, User>();
      REAL_USERS.forEach(u => userMap.set(u.id, u));
      localUsers.forEach(u => userMap.set(u.id, u));
      if (Array.isArray(fbUsers) && fbUsers.length > 0) {
        fbUsers.forEach(u => userMap.set(u.id, u));
      }
      const finalUsers = Array.from(userMap.values());
      this.saveUsers(finalUsers);
      firebaseSync.syncBatch('users', finalUsers).catch(() => {});

      // 2. Vehicles
      const fbVehicles = await firebaseSync.getAllItems('vehicles');
      const localVehicles = this.getVehicles();
      const vehMap = new Map<string, Vehicle>();
      REAL_VEHICLES.forEach(v => vehMap.set(v.id, v));
      localVehicles.forEach(v => vehMap.set(v.id, v));
      if (Array.isArray(fbVehicles) && fbVehicles.length > 0) {
        fbVehicles.forEach(v => vehMap.set(v.id, v));
      }
      const finalVehicles = Array.from(vehMap.values());
      this.saveVehicles(finalVehicles);
      firebaseSync.syncBatch('vehicles', finalVehicles).catch(() => {});

      // 3. Factories
      const fbFactories = await firebaseSync.getAllItems('factories');
      const localFactories = this.getFactories();
      const facMap = new Map<string, Factory>();
      REAL_FACTORIES.forEach(f => facMap.set(f.id, f));
      localFactories.forEach(f => facMap.set(f.id, f));
      if (Array.isArray(fbFactories) && fbFactories.length > 0) {
        fbFactories.forEach(f => facMap.set(f.id, f));
      }
      const finalFactories = Array.from(facMap.values());
      this.saveFactories(finalFactories);
      firebaseSync.syncBatch('factories', finalFactories).catch(() => {});

      // 4. Trips
      const fbTrips = await firebaseSync.getAllItems('trips');
      const localTrips = this.getTrips();
      const tripMap = new Map<string, Trip>();
      REAL_TRIPS.forEach(t => tripMap.set(t.id, t));
      localTrips.forEach(t => tripMap.set(t.id, t));
      if (Array.isArray(fbTrips) && fbTrips.length > 0) {
        fbTrips.forEach(t => tripMap.set(t.id, t));
      }
      const finalTrips = Array.from(tripMap.values());
      this.saveTrips(finalTrips);
      firebaseSync.syncBatch('trips', finalTrips).catch(() => {});
    } catch (err) {
      console.warn('[LocalDataStore] Error during Firebase sync init:', err);
    }
  },

  // --- USERS ---
  getUsers(): User[] {
    const users = safeGetItem<User[]>(USERS_STORAGE_KEY, REAL_USERS);
    const map = new Map<string, User>();
    REAL_USERS.forEach(u => map.set(u.id, u));
    users.forEach(u => map.set(u.id, u));
    return Array.from(map.values());
  },

  saveUsers(users: User[]): void {
    safeSetItem(USERS_STORAGE_KEY, users);
  },

  addUser(user: User): User[] {
    const current = this.getUsers();
    const existingIndex = current.findIndex(u => u.id === user.id || (u.login && user.login && u.login.toUpperCase() === user.login.toUpperCase()));
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
    const map = new Map<string, User>();
    local.forEach(u => map.set(u.id, u));
    apiUsers.forEach(u => map.set(u.id, u));
    const result = Array.from(map.values());
    this.saveUsers(result);
    firebaseSync.syncBatch('users', result).catch(() => {});
    return result;
  },

  // --- VEHICLES ---
  getVehicles(): Vehicle[] {
    return safeGetItem<Vehicle[]>(VEHICLES_STORAGE_KEY, REAL_VEHICLES);
  },

  saveVehicles(vehicles: Vehicle[]): void {
    safeSetItem(VEHICLES_STORAGE_KEY, vehicles);
  },

  addVehicle(vehicle: Vehicle): Vehicle[] {
    const current = this.getVehicles();
    const existingIndex = current.findIndex(v => v.id === vehicle.id || (v.plate && vehicle.plate && v.plate.toUpperCase() === vehicle.plate.toUpperCase()));
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
    const map = new Map<string, Vehicle>();
    local.forEach(v => map.set(v.id, v));
    apiVehicles.forEach(v => map.set(v.id, v));
    const result = Array.from(map.values());
    this.saveVehicles(result);
    firebaseSync.syncBatch('vehicles', result).catch(() => {});
    return result;
  },

  // --- FACTORIES ---
  getFactories(): Factory[] {
    return safeGetItem<Factory[]>(FACTORIES_STORAGE_KEY, REAL_FACTORIES);
  },

  saveFactories(factories: Factory[]): void {
    safeSetItem(FACTORIES_STORAGE_KEY, factories);
  },

  addFactory(factory: Factory): Factory[] {
    const current = this.getFactories();
    const existingIndex = current.findIndex(f => f.id === factory.id || (f.factory_code && factory.factory_code && f.factory_code.toUpperCase() === factory.factory_code.toUpperCase()));
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
    const map = new Map<string, Factory>();
    local.forEach(f => map.set(f.id, f));
    apiFactories.forEach(f => map.set(f.id, f));
    const result = Array.from(map.values());
    this.saveFactories(result);
    firebaseSync.syncBatch('factories', result).catch(() => {});
    return result;
  },

  // --- DRIVERS ---
  getDrivers(): any[] {
    const drivers = safeGetItem<any[]>(DRIVERS_STORAGE_KEY, REAL_DRIVERS);
    const users = this.getUsers().filter(u => u.role === 'MOTORISTA');
    const map = new Map<string, any>();
    REAL_DRIVERS.forEach(d => map.set(d.id, d));
    drivers.forEach(d => map.set(d.id, d));
    users.forEach(u => {
      const drvId = u.driver_id || `drv_${u.login?.toLowerCase() || u.id}`;
      if (!map.has(drvId)) {
        map.set(drvId, {
          id: drvId,
          user_id: u.id,
          name: u.name,
          registration: u.login,
          phone: u.phone || '',
          cnh: '',
          cnh_category: 'E',
          status: 'Ativo',
          default_vehicle_id: 'veh_1791467976230_s735'
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

  removeDriver(id: string): any[] {
    const current = this.getDrivers();
    const updated = current.filter(d => d.id !== id);
    this.saveDrivers(updated);
    return updated;
  },

  // --- TRIPS ---
  getTrips(): Trip[] {
    return safeGetItem<Trip[]>(TRIPS_STORAGE_KEY, REAL_TRIPS);
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
  },

  removeSchedule(id: string): any[] {
    const current = this.getSchedules();
    const updated = current.filter(s => s.id !== id);
    this.saveSchedules(updated);
    return updated;
  }
};
