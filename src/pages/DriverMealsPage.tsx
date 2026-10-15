import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.ts';
import { Trip, TRIP_STATUS_CONFIG } from '../types/index.ts';
import { 
  Utensils, Clock, Building2, Truck, 
  CheckCircle2, Search, Eye, MapPin
} from 'lucide-react';
import { UnifiedDateFilter, DateFilterValue, matchesDateFilter } from '../components/common/UnifiedDateFilter.tsx';

interface DriverMealsPageProps {
  onOpenTripDetails: (trip: Trip) => void;
}

export const DriverMealsPage: React.FC<DriverMealsPageProps> = ({ onOpenTripDetails }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [factoryFilter, setFactoryFilter] = useState('');
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
      console.error('Erro ao carregar dados de refeições:', err);
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

  // Factories list
  const availableFactories = useMemo(() => {
    const set = new Set<string>();
    trips.forEach(t => {
      if (t.factory_name) set.add(t.factory_name);
    });
    return Array.from(set).sort();
  }, [trips]);

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      // Date Filter (Single day or Range)
      if (!matchesDateFilter(t.date, dateFilter)) return false;

      // Factory filter
      if (factoryFilter && t.factory_name !== factoryFilter) return false;

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesFactory = t.factory_name && t.factory_name.toLowerCase().includes(q);
        const matchesVehicle = t.vehicle_plate && t.vehicle_plate.toLowerCase().includes(q);
        const matchesOrder = t.order_number && t.order_number.toLowerCase().includes(q);
        const matchesDate = t.date && t.date.includes(q);
        if (!matchesFactory && !matchesVehicle && !matchesOrder && !matchesDate) {
          return false;
        }
      }

      return true;
    });
  }, [trips, dateFilter, factoryFilter, search]);

  // Total meals in current filtered selection
  const totalMeals = useMemo(() => {
    let count = 0;
    filteredTrips.forEach(t => {
      count += (t.meals_count || 0);
    });
    return count;
  }, [filteredTrips]);

  return (
    <div className="space-y-4 sm:space-y-5 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner Objetivo com Montante Acumulado */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 p-4 sm:p-6 text-white shadow-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight flex items-center gap-2">
            <Utensils className="h-5 w-5 sm:h-6 sm:w-6 text-amber-200 shrink-0" />
            <span>Acompanhamento de Refeições</span>
          </h1>
        </div>

        {/* Montante Acumulado */}
        <div className="rounded-xl sm:rounded-2xl bg-white/15 px-4 py-2.5 sm:py-3 border border-white/20 backdrop-blur-md shrink-0 sm:text-right flex sm:block items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-100 block">Total Acumulado</span>
          <div className="flex items-baseline gap-1.5 sm:justify-end mt-0.5">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono">{totalMeals}</span>
            <span className="text-xs font-semibold text-amber-200">refeição(ões)</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros Padronizada */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 sm:p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
        {/* Seletor de Calendário Unificado (Dia Específico / Intervalo) */}
        <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <UnifiedDateFilter
            value={dateFilter}
            onChange={setDateFilter}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Busca por texto */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por fábrica, placa do veículo ou pedido..."
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 sm:py-2 pl-8 pr-3 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white min-h-[40px] sm:min-h-0"
            />
            <Search className="pointer-events-none absolute left-2.5 top-3 sm:top-2.5 h-3.5 w-3.5 text-zinc-400" />
          </div>

          {/* Filtro de Fábrica */}
          <div>
            <select
              value={factoryFilter}
              onChange={(e) => setFactoryFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 sm:py-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-medium min-h-[40px] sm:min-h-0"
            >
              <option value="">Todas as fábricas de destino</option>
              {availableFactories.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista Resumida de Cards de Refeições Agrupados por Viagem */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Utensils className="h-3.5 w-3.5 text-amber-600" />
            <span>Viagens Registradas ({filteredTrips.length})</span>
          </h3>
          <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
            Total no filtro: {totalMeals} refeição(ões)
          </span>
        </div>

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-600 border-t-transparent" />
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-xs text-zinc-400 dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50">
            Nenhuma viagem ou refeição encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTrips.map((trip) => {
              const count = trip.meals_count || 0;
              const conf = TRIP_STATUS_CONFIG[trip.status] || TRIP_STATUS_CONFIG['Programada'];

              return (
                <div
                  key={trip.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-3.5 sm:p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between hover:border-amber-300 transition"
                >
                  <div className="space-y-3">
                    {/* Top row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] sm:text-[10px] font-bold ${conf.badge}`}>
                          {trip.status}
                        </span>
                        {trip.order_number && (
                          <span className="font-mono text-[11px] text-zinc-500 font-semibold">
                            Ped: {trip.order_number}
                          </span>
                        )}
                      </div>
                      <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {trip.date.split('-').reverse().join('/')}
                      </span>
                    </div>

                    {/* Factory Destination */}
                    <div>
                      <h4 className="font-black text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span className="truncate">{trip.factory_name}</span>
                      </h4>
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                        <span className="truncate">{trip.factory_city} - {trip.factory_state}</span>
                      </p>
                    </div>

                    {/* Vehicle & Meals Counter */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div className="rounded-xl bg-zinc-50 p-2 text-center dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                        <span className="text-[9px] uppercase font-semibold text-zinc-400 block">Veículo</span>
                        <span className="font-mono font-bold text-xs text-zinc-800 dark:text-zinc-200">{trip.vehicle_plate}</span>
                      </div>

                      <div className={`rounded-xl p-2 text-center border ${
                        count > 0 
                          ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50 text-amber-800 dark:text-amber-200' 
                          : 'bg-zinc-50 border-zinc-100 dark:bg-zinc-800/50 dark:border-zinc-800 text-zinc-400'
                      }`}>
                        <span className="text-[9px] uppercase font-semibold block">Refeições</span>
                        <span className="font-black text-xs flex items-center justify-center gap-1">
                          <Utensils className="h-3 w-3" />
                          {count} {count === 1 ? 'refeição' : 'refeições'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action */}
                  <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-[10px] sm:text-[11px] text-zinc-400 truncate pr-2">
                      {trip.status === 'Finalizada' ? 'Viagem concluída' : 'Em andamento / agendada'}
                    </span>
                    <button
                      onClick={() => onOpenTripDetails(trip)}
                      className="flex items-center gap-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 px-3 py-2 sm:py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition shrink-0 min-h-[36px] sm:min-h-0"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span>Ver Detalhes</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
