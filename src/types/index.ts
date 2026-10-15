export type Role = 'DESENVOLVEDOR' | 'ADMINISTRADOR' | 'MOTORISTA';

export type UserStatus = 'Ativo' | 'Inativo';
export type DriverStatus = 'Ativo' | 'Inativo' | 'Férias' | 'Afastado';
export type VehicleStatus = 'Disponível' | 'Em viagem' | 'Manutenção' | 'Inativo';
export type FactoryStatus = 'Ativa' | 'Inativa';
export type TripStatus = 'Programada' | 'Em deslocamento' | 'Na fábrica' | 'Retornando' | 'Finalizada' | 'Cancelada';
export type ScheduleStatus = 'Confirmada' | 'Pendente' | 'Cancelada';

export interface User {
  id: string;
  name: string;
  cpf: string;
  phone?: string;
  email: string;
  login: string;
  role: Role;
  status: UserStatus;
  driver_id?: string;
  driverId?: string;
  raw_password?: string;
  password?: string;
  created_at: string;
  updated_at: string;
}

export interface Driver {
  id: string;
  user_id?: string;
  name: string;
  cpf?: string;
  registration: string;
  phone?: string;
  cnh?: string;
  cnh_category?: string;
  cnh_expiration?: string;
  default_vehicle_id?: string;
  status: DriverStatus;
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_login?: string;
  default_vehicle_plate?: string;
  default_vehicle_brand?: string;
  default_vehicle_model?: string;
  total_trips?: number;
  pending_trips?: number;
}

export interface Vehicle {
  id: string;
  plate: string;
  vehicle_number: string;
  brand: string;
  model: string;
  year: number;
  type: string;
  capacity: string;
  status: VehicleStatus;
  created_at: string;
  updated_at: string;
  driver_id?: string;
  driver_name?: string;
  total_trips?: number;
  active_trips?: number;
}

export interface Factory {
  id: string;
  factory_code: string;
  name: string;
  state: string;
  city: string;
  status: FactoryStatus;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  date: string;
  driver_id: string;
  vehicle_id: string;
  factory_id: string;
  planned_departure: string;
  planned_arrival?: string;
  actual_departure_date?: string;
  actual_departure?: string;
  actual_arrival_date?: string;
  actual_arrival?: string;
  status: TripStatus;
  observation?: string;
  cancel_reason?: string;
  suggested_departure?: string;
  appointment_window?: string;
  order_number?: string;
  appointment_image_url?: string;
  products_image_url?: string;
  initial_km?: number;
  final_km?: number;
  total_km?: number;
  total_time?: string;
  meals_count?: number;
  arrival_at_factory_time?: string;
  loading_start_time?: string;
  loading_end_time?: string;
  departure_from_factory_time?: string;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  // Joined details
  driver_name: string;
  driver_cpf?: string;
  driver_registration?: string;
  driver_phone?: string;
  driver_cnh?: string;
  driver_cnh_category?: string;
  vehicle_plate: string;
  vehicle_number?: string;
  vehicle_brand?: string;
  vehicle_model?: string;
  vehicle_type?: string;
  vehicle_capacity?: string;
  factory_code: string;
  factory_name: string;
  factory_state: string;
  factory_city: string;
}

export interface Schedule {
  id: string;
  date: string;
  driver_id: string;
  vehicle_id: string;
  factory_id: string;
  shift_time: string;
  observation?: string;
  status: ScheduleStatus;
  created_by: string;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  // Joined details
  driver_name: string;
  driver_registration?: string;
  vehicle_plate: string;
  factory_code: string;
  factory_name: string;
  factory_city: string;
  factory_state: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  module: string;
  record_id?: string;
  details?: string;
  created_at: string;
}

// Centralized status visual token system
export const TRIP_STATUS_CONFIG: Record<TripStatus, {
  label: string;
  bg: string;
  text: string;
  border: string;
  dot: string;
  badge: string;
  desc: string;
}> = {
  'Programada': {
    label: 'Programada',
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
    badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
    desc: 'Viagem agendada aguardando início do deslocamento'
  },
  'Em deslocamento': {
    label: 'Em Deslocamento',
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    desc: 'Veículo em trânsito com destino à fábrica'
  },
  'Na fábrica': {
    label: 'Na Fábrica',
    bg: 'bg-purple-500/10',
    text: 'text-purple-500',
    border: 'border-purple-500/30',
    dot: 'bg-purple-500',
    badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    desc: 'Veículo posicionado na planta para carga/descarga'
  },
  'Retornando': {
    label: 'Retornando',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-500',
    border: 'border-cyan-500/30',
    dot: 'bg-cyan-500',
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
    desc: 'Retorno da fábrica com a carga ou vasilhames'
  },
  'Finalizada': {
    label: 'Finalizada',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    desc: 'Viagem e entrega concluídas com sucesso'
  },
  'Cancelada': {
    label: 'Cancelada',
    bg: 'bg-rose-500/10',
    text: 'text-rose-500',
    border: 'border-rose-500/30',
    dot: 'bg-rose-500',
    badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    desc: 'Viagem cancelada pela gestão com registro em auditoria'
  }
};

export const VEHICLE_STATUS_CONFIG: Record<VehicleStatus, { label: string; badge: string }> = {
  'Disponível': { label: 'Disponível', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
  'Em viagem': { label: 'Em viagem', badge: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
  'Manutenção': { label: 'Manutenção', badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800' },
  'Inativo': { label: 'Inativo', badge: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700' }
};

export const DRIVER_STATUS_CONFIG: Record<DriverStatus, { label: string; badge: string }> = {
  'Ativo': { label: 'Ativo', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
  'Inativo': { label: 'Inativo', badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800' },
  'Férias': { label: 'Férias', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' },
  'Afastado': { label: 'Afastado', badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800' }
};

export const FACTORY_STATUS_CONFIG: Record<FactoryStatus, { label: string; badge: string }> = {
  'Ativa': { label: 'Ativa', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
  'Inativa': { label: 'Inativa', badge: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700' }
};
