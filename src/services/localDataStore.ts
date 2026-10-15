import { User, Vehicle, Factory, Trip } from '../types/index.ts';
import { firebaseSync } from './firebaseSync.ts';

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
  // Initialize and sync with Firebase Firestore on app load
  async initFirebaseSync(): Promise<void> {
    try {
      // Fetch users and ensure bidirectional sync
      const fbUsers = await firebaseSync.getAllItems('users');
      const localUsers = this.getUsers();
      if (fbUsers && fbUsers.length > 0) {
        const merged = [...fbUsers, ...localUsers.filter(l => !fbUsers.some(f => f.id === l.id))];
        this.saveUsers(merged);
        await firebaseSync.syncBatch('users', merged);
      } else {
        await firebaseSync.syncBatch('users', localUsers);
      }

      // Fetch vehicles and ensure bidirectional sync
      const fbVehicles = await firebaseSync.getAllItems('vehicles');
      const localVehicles = this.getVehicles();
      if (fbVehicles && fbVehicles.length > 0) {
        const merged = [...fbVehicles, ...localVehicles.filter(l => !fbVehicles.some(f => f.id === l.id))];
        this.saveVehicles(merged);
        await firebaseSync.syncBatch('vehicles', merged);
      } else {
        await firebaseSync.syncBatch('vehicles', localVehicles);
      }

      // Fetch factories and ensure bidirectional sync
      const fbFactories = await firebaseSync.getAllItems('factories');
      const localFactories = this.getFactories();
      if (fbFactories && fbFactories.length > 0) {
        const merged = [...fbFactories, ...localFactories.filter(l => !fbFactories.some(f => f.id === l.id))];
        this.saveFactories(merged);
        await firebaseSync.syncBatch('factories', merged);
      } else {
        await firebaseSync.syncBatch('factories', localFactories);
      }

      // Fetch trips and ensure bidirectional sync
      const fbTrips = await firebaseSync.getAllItems('trips');
      const localTrips = this.getTrips();
      if (fbTrips && fbTrips.length > 0) {
        const merged = [...fbTrips, ...localTrips.filter(l => !fbTrips.some(f => f.id === l.id))];
        this.saveTrips(merged);
        await firebaseSync.syncBatch('trips', merged);
      } else {
        await firebaseSync.syncBatch('trips', localTrips);
      }
    } catch (err) {
      console.warn('[LocalDataStore] Error during Firebase sync init:', err);
    }
  },

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
    if (user && user.id) {
      firebaseSync.saveItem('users', user.id, updated.find(u => u.id === user.id) || user);
    }
    return updated;
  },

  updateUser(user: Partial<User> & { id: string }): User[] {
    const current = this.getUsers();
    const updated = current.map(u => u.id === user.id ? { ...u, ...user } : u);
    this.saveUsers(updated);
    const target = updated.find(u => u.id === user.id);
    if (target) {
      firebaseSync.saveItem('users', user.id, target);
    }
    return updated;
  },

  removeUser(id: string): User[] {
    const current = this.getUsers();
    const updated = current.filter(u => u.id !== id);
    this.saveUsers(updated);
    firebaseSync.deleteItem('users', id);
    return updated;
  },

  mergeUsers(apiUsers: User[]): User[] {
    if (!Array.isArray(apiUsers)) return this.getUsers();
    const local = this.getUsers();
    
    const mergedMap = new Map<string, User>();
    apiUsers.forEach(u => mergedMap.set(u.id, u));

    local.forEach(u => {
      if (!mergedMap.has(u.id)) {
        const matchesLogin = apiUsers.some(apiU => apiU.login && u.login && apiU.login.toUpperCase() === u.login.toUpperCase());
        if (!matchesLogin) {
          mergedMap.set(u.id, u);
        }
      }
    });

    const result = Array.from(mergedMap.values());
    this.saveUsers(result);
    firebaseSync.syncBatch('users', result);
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
    if (vehicle && vehicle.id) {
      firebaseSync.saveItem('vehicles', vehicle.id, updated.find(v => v.id === vehicle.id) || vehicle);
    }
    return updated;
  },

  updateVehicle(vehicle: Partial<Vehicle> & { id: string }): Vehicle[] {
    const current = this.getVehicles();
    const updated = current.map(v => v.id === vehicle.id ? { ...v, ...vehicle } : v);
    this.saveVehicles(updated);
    const target = updated.find(v => v.id === vehicle.id);
    if (target) {
      firebaseSync.saveItem('vehicles', vehicle.id, target);
    }
    return updated;
  },

  removeVehicle(id: string): Vehicle[] {
    const current = this.getVehicles();
    const updated = current.filter(v => v.id !== id);
    this.saveVehicles(updated);
    firebaseSync.deleteItem('vehicles', id);
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
    firebaseSync.syncBatch('vehicles', result);
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
    if (factory && factory.id) {
      firebaseSync.saveItem('factories', factory.id, updated.find(f => f.id === factory.id) || factory);
    }
    return updated;
  },

  updateFactory(factory: Partial<Factory> & { id: string }): Factory[] {
    const current = this.getFactories();
    const updated = current.map(f => f.id === factory.id ? { ...f, ...factory } : f);
    this.saveFactories(updated);
    const target = updated.find(f => f.id === factory.id);
    if (target) {
      firebaseSync.saveItem('factories', factory.id, target);
    }
    return updated;
  },

  removeFactory(id: string): Factory[] {
    const current = this.getFactories();
    const updated = current.filter(f => f.id !== id);
    this.saveFactories(updated);
    firebaseSync.deleteItem('factories', id);
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
    firebaseSync.syncBatch('factories', result);
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
    if (trip && trip.id) {
      firebaseSync.saveItem('trips', trip.id, updated.find(t => t.id === trip.id) || trip);
    }
    return updated;
  },

  updateTrip(trip: Partial<Trip> & { id: string }): Trip[] {
    const current = this.getTrips();
    const updated = current.map(t => t.id === trip.id ? { ...t, ...trip } : t);
    this.saveTrips(updated);
    const target = updated.find(t => t.id === trip.id);
    if (target) {
      firebaseSync.saveItem('trips', trip.id, target);
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
    firebaseSync.deleteItem('trips', id);
    return updated;
  },

  mergeTrips(apiTrips: Trip[]): Trip[] {
    if (!Array.isArray(apiTrips)) return this.getTrips();
    this.saveTrips(apiTrips);
    firebaseSync.syncBatch('trips', apiTrips);
    return apiTrips;
  },
};
