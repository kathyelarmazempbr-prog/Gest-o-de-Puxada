import { User, Vehicle, Factory, Trip } from '../types/index.ts';

const USERS_STORAGE_KEY = 'gestao_puxada_users_store_v3';
const VEHICLES_STORAGE_KEY = 'gestao_puxada_vehicles_store_v3';
const FACTORIES_STORAGE_KEY = 'gestao_puxada_factories_store_v3';
const TRIPS_STORAGE_KEY = 'gestao_puxada_trips_store_v3';

const MOCK_IDS = new Set([
  'fac_1', 'fac_2', 'fac_3',
  'veh_1', 'veh_2', 'veh_3',
  'usr_adm_1', 'usr_adm_2', 'usr_adm_master', 'usr_mot_1', 'usr_mot_2', 'usr_mot_3',
  'drv_1', 'drv_2', 'drv_3',
  'trp_1', 'trp_2', 'trp_3', 'trp_4', 'trp_5',
]);

function isNotMock(item: any): boolean {
  if (!item || !item.id) return false;
  return !MOCK_IDS.has(item.id);
}

function safeGetItem<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    if (!item) return fallback;
    const parsed = JSON.parse(item);
    if (Array.isArray(parsed)) {
      return parsed.filter(isNotMock) as unknown as T;
    }
    return fallback;
  } catch (err) {
    console.warn(`[LocalDataStore] Error reading key ${key}:`, err);
    return fallback;
  }
}

function safeSetItem<T>(key: string, value: T): void {
  try {
    const filtered = Array.isArray(value) ? value.filter(isNotMock) : value;
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (err) {
    console.warn(`[LocalDataStore] Error saving key ${key}:`, err);
  }
}

export const localDataStore = {
  // --- USERS ---
  getUsers(): User[] {
    return safeGetItem<User[]>(USERS_STORAGE_KEY, []);
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
    return updated;
  },

  updateUser(user: Partial<User> & { id: string }): User[] {
    const current = this.getUsers();
    const updated = current.map(u => u.id === user.id ? { ...u, ...user } : u);
    this.saveUsers(updated);
    return updated;
  },

  removeUser(id: string): User[] {
    const current = this.getUsers();
    const updated = current.filter(u => u.id !== id);
    this.saveUsers(updated);
    return updated;
  },

  mergeUsers(apiUsers: User[]): User[] {
    if (!Array.isArray(apiUsers)) return this.getUsers();
    const local = this.getUsers();
    
    // Create map from API items
    const mergedMap = new Map<string, User>();
    apiUsers.forEach(u => mergedMap.set(u.id, u));

    // Preserve any local user that was created locally but might not be returned yet
    local.forEach(u => {
      if (!mergedMap.has(u.id)) {
        // Also check if login matches
        const matchesLogin = apiUsers.some(apiU => apiU.login && u.login && apiU.login.toUpperCase() === u.login.toUpperCase());
        if (!matchesLogin) {
          mergedMap.set(u.id, u);
        }
      }
    });

    const result = Array.from(mergedMap.values());
    this.saveUsers(result);
    return result;
  },

  // --- VEHICLES ---
  getVehicles(): Vehicle[] {
    return safeGetItem<Vehicle[]>(VEHICLES_STORAGE_KEY, []);
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
    return updated;
  },

  updateVehicle(vehicle: Partial<Vehicle> & { id: string }): Vehicle[] {
    const current = this.getVehicles();
    const updated = current.map(v => v.id === vehicle.id ? { ...v, ...vehicle } : v);
    this.saveVehicles(updated);
    return updated;
  },

  removeVehicle(id: string): Vehicle[] {
    const current = this.getVehicles();
    const updated = current.filter(v => v.id !== id);
    this.saveVehicles(updated);
    return updated;
  },

  mergeVehicles(apiVehicles: Vehicle[]): Vehicle[] {
    if (!Array.isArray(apiVehicles)) return this.getVehicles();
    const local = this.getVehicles();
    
    const mergedMap = new Map<string, Vehicle>();
    apiVehicles.forEach(v => mergedMap.set(v.id, v));

    local.forEach(v => {
      if (!mergedMap.has(v.id)) {
        const matchesPlate = apiVehicles.some(apiV => apiV.plate && v.plate && apiV.plate.toUpperCase() === v.plate.toUpperCase());
        if (!matchesPlate) {
          mergedMap.set(v.id, v);
        }
      }
    });

    const result = Array.from(mergedMap.values());
    this.saveVehicles(result);
    return result;
  },

  // --- FACTORIES ---
  getFactories(): Factory[] {
    return safeGetItem<Factory[]>(FACTORIES_STORAGE_KEY, []);
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
    return updated;
  },

  updateFactory(factory: Partial<Factory> & { id: string }): Factory[] {
    const current = this.getFactories();
    const updated = current.map(f => f.id === factory.id ? { ...f, ...factory } : f);
    this.saveFactories(updated);
    return updated;
  },

  removeFactory(id: string): Factory[] {
    const current = this.getFactories();
    const updated = current.filter(f => f.id !== id);
    this.saveFactories(updated);
    return updated;
  },

  mergeFactories(apiFactories: Factory[]): Factory[] {
    if (!Array.isArray(apiFactories)) return this.getFactories();
    const local = this.getFactories();
    
    const mergedMap = new Map<string, Factory>();
    apiFactories.forEach(f => mergedMap.set(f.id, f));

    local.forEach(f => {
      if (!mergedMap.has(f.id)) {
        const matchesCode = apiFactories.some(apiF => apiF.factory_code && f.factory_code && apiF.factory_code.toUpperCase() === f.factory_code.toUpperCase());
        if (!matchesCode) {
          mergedMap.set(f.id, f);
        }
      }
    });

    const result = Array.from(mergedMap.values());
    this.saveFactories(result);
    return result;
  },

  // --- TRIPS ---
  getTrips(): Trip[] {
    return safeGetItem<Trip[]>(TRIPS_STORAGE_KEY, []);
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
    return updated;
  },

  updateTrip(trip: Partial<Trip> & { id: string }): Trip[] {
    const current = this.getTrips();
    const updated = current.map(t => t.id === trip.id ? { ...t, ...trip } : t);
    this.saveTrips(updated);
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
    return updated;
  },

  mergeTrips(apiTrips: Trip[]): Trip[] {
    if (!Array.isArray(apiTrips)) return this.getTrips();
    // Authoritative sync: save server trips to local store so deletions are strictly respected
    this.saveTrips(apiTrips);
    return apiTrips;
  },
};
