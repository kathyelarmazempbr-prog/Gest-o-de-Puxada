import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.ts';
import { Trip, TRIP_STATUS_CONFIG } from '../types/index.ts';
import { formatAppointmentWindow } from '../utils/formatters.ts';
import { 
  Navigation, Clock, MapPin, Truck, CheckCircle2, 
  Eye, Search, Building2, Utensils
} from 'lucide-react';
import { UnifiedDateFilter, DateFilterValue, matchesDateFilter } from '../components/common/UnifiedDateFilter.tsx';

interface DriverTripsPageProps {
  onOpenTripDetails: (trip: Trip) => void;
}

export const DriverTripsPage: React.FC<DriverTripsPageProps> = ({ onOpenTripDetails }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'programmed' | 'in_progress' | 'completed'>('all');
  
  // Unified Date Filter State (All, Single Day, Date Range)
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    mode: 'all',
    singleDate: '',
    startDate: '',
    endDate: '',
  });

  const loadTrips = async () => {
    setLoading(true);
    try {
      const data = await api.getTrips();
      setTrips(data || []);
    } catch (err) {
      console.error('Erro ao carregar viagens do motorista:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();

    const handleUpdate = () => loadTrips();
    window.addEventListener('puxada:trip-updated', handleUpdate);
    return () => window.removeEventListener('puxada:trip-updated', handleUpdate);
  }, []);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter(trip => {
      // 1. Status filter
      if (statusFilter === 'programmed' && trip.status !== 'Programada') return false;
      if (statusFilter === 'in_progress' && !['Em deslocamento', 'Na fábrica', 'Retornando'].includes(trip.status)) return false;
      if (statusFilter === 'completed' && trip.status !== 'Finalizada') return false;

      // 2. Unified Calendar / Date Filter (Single day or Range)
      if (!matchesDateFilter(trip.date, dateFilter)) return false;

      // 3. Text search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesFactory = trip.factory_name && trip.factory_name.toLowerCase().includes(q);
        const matchesCity = trip.factory_city && trip.factory_city.toLowerCase().includes(q);
        const matchesState = trip.factory_state && trip.factory_state.toLowerCase().includes(q);
        const matchesVehicle = trip.vehicle_plate && trip.vehicle_plate.toLowerCase().includes(q);
        const matchesOrder = trip.order_number && trip.order_number.toLowerCase().includes(q);
        const matchesDate = trip.date && trip.date.includes(q);
        if (!matchesFactory && !matchesCity && !matchesState && !matchesVehicle && !matchesOrder && !matchesDate) {
          return false;
        }
      }

      return true;
    });
  }, [trips, statusFilter, dateFilter, search]);

  // Counts based on date filter
  const counts = useMemo(() => {
    const dateFiltered = trips.filter(trip => matchesDateFilter(trip.date, dateFilter));

    return {
      all: dateFiltered.length,
      programmed: dateFiltered.filter(t => t.status === 'Programada').length,
      in_progress: dateFiltered.filter(t => ['Em deslocamento', 'Na fábrica', 'Retornando'].includes(t.status)).length,
      completed: dateFiltered.filter(t => t.status === 'Finalizada').length,
    };
  }, [trips, dateFilter]);

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto">
      {/* Header Simplificado */}
      <div>
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <Navigation className="h-5 w-5 text-blue-600" />
          <span>Minhas Viagens</span>
        </h1>
        <p className="text-xs text-zinc-500 mt-0.5">
          Lista completa e detalhada de todas as viagens na sua programação
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 sm:p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
        {/* Seletor de Calendário Unificado (Dia Específico / Intervalo) */}
        <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <UnifiedDateFilter
            value={dateFilter}
            onChange={setDateFilter}
          />
        </div>

        {/* Status Tabs (horizontal scrollable with touch) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl px-3 py-2 sm:py-1.5 text-xs font-bold transition whitespace-nowrap min-h-[36px] sm:min-h-0 ${
              statusFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Todas ({counts.all})
          </button>
          <button
            onClick={() => setStatusFilter('in_progress')}
            className={`rounded-xl px-3 py-2 sm:py-1.5 text-xs font-bold transition whitespace-nowrap min-h-[36px] sm:min-h-0 ${
              statusFilter === 'in_progress'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Em Andamento ({counts.in_progress})
          </button>
          <button
            onClick={() => setStatusFilter('programmed')}
            className={`rounded-xl px-3 py-2 sm:py-1.5 text-xs font-bold transition whitespace-nowrap min-h-[36px] sm:min-h-0 ${
              statusFilter === 'programmed'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Programadas ({counts.programmed})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`rounded-xl px-3 py-2 sm:py-1.5 text-xs font-bold transition whitespace-nowrap min-h-[36px] sm:min-h-0 ${
              statusFilter === 'completed'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            Concluídas ({counts.completed})
          </button>
        </div>

        {/* Search */}
        <div className="relative pt-0.5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por fábrica, cidade, placa ou pedido..."
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 sm:py-2 pl-9 pr-3 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white min-h-[40px] sm:min-h-0"
          />
          <Search className="pointer-events-none absolute left-3 top-3.5 sm:top-3 h-4 w-4 text-zinc-400" />
        </div>
      </div>

      {/* Lista de Viagens */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : filteredTrips.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 p-8 sm:p-10 text-center dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50">
          <Navigation className="mx-auto h-8 w-8 text-zinc-400" />
          <p className="mt-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            Nenhuma viagem encontrada
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            Ajuste os filtros de calendário, status ou o termo de busca.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {filteredTrips.map((trip) => {
            const conf = TRIP_STATUS_CONFIG[trip.status] || TRIP_STATUS_CONFIG['Programada'];
            const timeStr = formatAppointmentWindow(trip.appointment_window, trip.planned_departure);

            // Compute trip duration (tempo de viagem)
            let durationStr: string | null = null;
            if (trip.total_time) {
              if (trip.total_time.includes('h') || trip.total_time.includes('m')) {
                durationStr = trip.total_time;
              } else if (trip.total_time.includes(':')) {
                const [h, m] = trip.total_time.split(':').map((n: string) => parseInt(n, 10) || 0);
                durationStr = `${h}h ${String(m).padStart(2, '0')}m`;
              } else {
                durationStr = `${trip.total_time} min`;
              }
            } else if (trip.actual_departure && trip.actual_arrival) {
              if (trip.actual_departure_date && trip.actual_arrival_date) {
                const depParts = trip.actual_departure.match(/(\d{1,2}):(\d{2})/);
                const arrParts = trip.actual_arrival.match(/(\d{1,2}):(\d{2})/);
                if (depParts && arrParts) {
                  const d1 = new Date(`${trip.actual_departure_date}T${depParts[1].padStart(2, '0')}:${depParts[2]}:00`);
                  const d2 = new Date(`${trip.actual_arrival_date}T${arrParts[1].padStart(2, '0')}:${arrParts[2]}:00`);
                  if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60));
                    if (diff >= 0) {
                      const h = Math.floor(diff / 60);
                      const m = diff % 60;
                      durationStr = `${h}h ${String(m).padStart(2, '0')}m`;
                    }
                  }
                }
              }
              if (!durationStr) {
                const [dh, dm] = trip.actual_departure.split(':').map((n: string) => parseInt(n, 10) || 0);
                const [ah, am] = trip.actual_arrival.split(':').map((n: string) => parseInt(n, 10) || 0);
                let diff = (ah * 60 + am) - (dh * 60 + dm);
                if (diff < 0) diff += 24 * 60;
                const h = Math.floor(diff / 60);
                const m = diff % 60;
                durationStr = `${h}h ${String(m).padStart(2, '0')}m`;
              }
            } else if (trip.status === 'Em deslocamento' || trip.status === 'Na fábrica' || trip.status === 'Retornando') {
              durationStr = 'Em rota';
            }

            return (
              <div
                key={trip.id}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xs transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar inside Card */}
                  <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/70 px-3.5 py-2.5 sm:px-4 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] sm:text-[11px] font-bold ${conf.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
                        {conf.label}
                      </span>
                      {trip.order_number && (
                        <span className="font-mono text-[11px] font-semibold text-zinc-500">
                          Ped: {trip.order_number}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {trip.date.split('-').reverse().join('/')}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 sm:p-4 space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-semibold uppercase">
                        <Building2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span>Destino</span>
                      </div>
                      <h3 className="font-bold text-base text-zinc-900 dark:text-white mt-0.5">
                        {trip.factory_name}
                      </h3>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                        {trip.factory_city} - {trip.factory_state}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                        <span className="text-[9px] uppercase font-semibold text-zinc-400 block">Horário / Janela</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200 truncate block">{timeStr}</span>
                      </div>
                      <div className="rounded-xl bg-zinc-50 p-2.5 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                        <span className="text-[9px] uppercase font-semibold text-zinc-400 block">Veículo</span>
                        <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{trip.vehicle_plate}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Operacional com Tempo de Viagem, KM, Refeições e Botão */}
                <div className="border-t border-zinc-100 p-3 bg-zinc-50/70 dark:border-zinc-800 dark:bg-zinc-800/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                  <div className="flex items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400 flex-wrap">
                    <span className="inline-flex items-center gap-1 font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-900/40">
                      <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Tempo de Viagem: <strong className="font-mono">{durationStr || '—'}</strong></span>
                    </span>

                    {trip.total_km ? (
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        KM: <strong className="font-mono">{trip.total_km} km</strong>
                      </span>
                    ) : (trip.final_km && trip.initial_km && trip.final_km >= trip.initial_km) ? (
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        KM: <strong className="font-mono">{trip.final_km - trip.initial_km} km</strong>
                      </span>
                    ) : null}

                    {trip.meals_count ? (
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-semibold">
                        <Utensils className="h-3 w-3" />
                        <span>{trip.meals_count} ref.</span>
                      </span>
                    ) : null}
                  </div>

                  <button
                    onClick={() => onOpenTripDetails(trip)}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 sm:py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-[0.98] transition min-h-[36px] sm:min-h-0 shrink-0"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Detalhes & Controle</span>
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    );
  };
