import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.ts';
import { Trip, TRIP_STATUS_CONFIG } from '../types/index.ts';
import { formatAppointmentWindow } from '../utils/formatters.ts';
import { 
  TrendingUp, Gauge, Clock, Navigation, Calendar, 
  Building2, Truck, CheckCircle2, Filter,
  Award, Zap, ArrowUpRight, BarChart3, ChevronRight, ChevronDown, ChevronUp, Eye,
  Utensils, X, RotateCcw, PackageCheck, Timer
} from 'lucide-react';
import { UnifiedDateFilter, DateFilterValue, matchesDateFilter } from '../components/common/UnifiedDateFilter.tsx';

interface DriverPerformancePageProps {
  onOpenTripDetails: (trip: Trip) => void;
}

export const DriverPerformancePage: React.FC<DriverPerformancePageProps> = ({ onOpenTripDetails }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilterValue>({
    mode: 'all',
    singleDate: '',
    startDate: '',
    endDate: '',
  });
  const [factoryFilter, setFactoryFilter] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');

  // Interactive factory selection in breakdown
  const [selectedFactoryName, setSelectedFactoryName] = useState<string | null>(null);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const data = await api.getTrips();
      setTrips(data || []);
    } catch (err) {
      console.error('Erro ao carregar dados de desempenho do motorista:', err);
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

  // Factories and vehicles for filters
  const availableFactories = useMemo(() => {
    const set = new Set<string>();
    trips.forEach(t => {
      if (t.factory_name) set.add(t.factory_name);
    });
    return Array.from(set).sort();
  }, [trips]);

  const availableVehicles = useMemo(() => {
    const set = new Set<string>();
    trips.forEach(t => {
      if (t.vehicle_plate) set.add(t.vehicle_plate);
    });
    return Array.from(set).sort();
  }, [trips]);

  // Filtered trips by main filters
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      // Date filter (Single day or Range)
      if (!matchesDateFilter(t.date, dateFilter)) return false;

      // Factory filter from top select
      if (factoryFilter && t.factory_name !== factoryFilter) return false;

      // Vehicle filter
      if (vehicleFilter && t.vehicle_plate !== vehicleFilter) return false;

      return true;
    });
  }, [trips, dateFilter, factoryFilter, vehicleFilter]);

  // Trips used for calculating metrics (either all filtered trips or scoped to selectedFactoryName)
  const effectiveMetricsTrips = useMemo(() => {
    if (!selectedFactoryName) return filteredTrips;
    return filteredTrips.filter(t => (t.factory_name || 'Outras') === selectedFactoryName);
  }, [filteredTrips, selectedFactoryName]);

  // Finished trips in selected scope
  const completedTrips = useMemo(() => {
    return effectiveMetricsTrips.filter(t => t.status === 'Finalizada');
  }, [effectiveMetricsTrips]);

  // Performance Metrics Calculations based on effective scope
  const metrics = useMemo(() => {
    const totalFinished = completedTrips.length;
    const totalTripsCount = effectiveMetricsTrips.length;

    // Total KM Rodado
    let totalKm = 0;
    completedTrips.forEach(t => {
      if (t.total_km !== undefined && t.total_km !== null) {
        totalKm += Number(t.total_km) || 0;
      } else if (t.final_km && t.initial_km && t.final_km >= t.initial_km) {
        totalKm += (t.final_km - t.initial_km);
      }
    });

    // Average KM per trip
    const avgKm = totalFinished > 0 ? Math.round(totalKm / totalFinished) : 0;

    // TMV - Tempo Médio de Viagem (in minutes then formatted)
    let totalMinutes = 0;
    let timedTripsCount = 0;

    completedTrips.forEach(t => {
      if (t.total_time) {
        const hMatch = t.total_time.match(/(\d+)\s*h/);
        const mMatch = t.total_time.match(/(\d+)\s*m/);
        if (hMatch || mMatch) {
          const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
          const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
          totalMinutes += (hours * 60) + mins;
          timedTripsCount++;
        } else if (t.total_time.includes(':')) {
          const [hh, mm] = t.total_time.split(':').map(n => parseInt(n, 10) || 0);
          totalMinutes += (hh * 60) + mm;
          timedTripsCount++;
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
          const [dh, dm] = t.actual_departure.split(':').map(n => parseInt(n, 10) || 0);
          const [ah, am] = t.actual_arrival.split(':').map(n => parseInt(n, 10) || 0);
          let diff = (ah * 60 + am) - (dh * 60 + dm);
          if (diff < 0) diff += 24 * 60;
          diffMinutes = diff;
        }
        totalMinutes += diffMinutes;
        timedTripsCount++;
      }
    });

    const avgMinutes = timedTripsCount > 0 ? Math.round(totalMinutes / timedTripsCount) : 0;
    const avgHoursFormatted = avgMinutes > 0 
      ? `${Math.floor(avgMinutes / 60)}h ${String(avgMinutes % 60).padStart(2, '0')}m`
      : '—';

    // TMA - Tempo Médio na Fábrica / Atendimento (tempo da chegada na fábrica até a saída)
    let totalTmaMinutes = 0;
    let tmaCount = 0;

    // TME - Tempo Médio de Fila (tempo da chegada na fábrica até o início do carregamento)
    let totalTmeMinutes = 0;
    let tmeCount = 0;

    // TMC - Tempo Médio de Carregamento (tempo gasto do início ao fim do carregamento)
    let totalTmcMinutes = 0;
    let tmcCount = 0;

    effectiveMetricsTrips.forEach(t => {
      // TMC: intervalo entre loading_start_time e loading_end_time
      if (t.loading_start_time && t.loading_end_time) {
        const [sh, sm] = t.loading_start_time.split(':').map(n => parseInt(n, 10) || 0);
        const [eh, em] = t.loading_end_time.split(':').map(n => parseInt(n, 10) || 0);
        let diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff < 0) diff += 24 * 60;
        totalTmcMinutes += diff;
        tmcCount++;
      }

      // TME: intervalo da chegada na fábrica (arrival_at_factory_time) até o início do carregamento (loading_start_time)
      if (t.arrival_at_factory_time && t.loading_start_time) {
        const [ah, am] = t.arrival_at_factory_time.split(':').map(n => parseInt(n, 10) || 0);
        const [sh, sm] = t.loading_start_time.split(':').map(n => parseInt(n, 10) || 0);
        let diff = (sh * 60 + sm) - (ah * 60 + am);
        if (diff < 0) diff += 24 * 60;
        totalTmeMinutes += diff;
        tmeCount++;
      }

      // TMA: Saída fábrica - chegada fábrica (arrival_at_factory_time até departure_from_factory_time ou loading_end_time)
      const factoryExit = t.departure_from_factory_time || t.loading_end_time;
      if (t.arrival_at_factory_time && factoryExit) {
        const [ah, am] = t.arrival_at_factory_time.split(':').map(n => parseInt(n, 10) || 0);
        const [xh, xm] = factoryExit.split(':').map(n => parseInt(n, 10) || 0);
        let diff = (xh * 60 + xm) - (ah * 60 + am);
        if (diff < 0) diff += 24 * 60;
        totalTmaMinutes += diff;
        tmaCount++;
      }
    });

    const formatMinutesDuration = (mins: number) => {
      if (mins <= 0) return '0min';
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      if (h > 0) {
        return `${h}h ${String(m).padStart(2, '0')}m`;
      }
      return `${m}min`;
    };

    const avgTmaMinutes = tmaCount > 0 ? Math.round(totalTmaMinutes / tmaCount) : 0;
    const tmaFormatted = tmaCount > 0 ? formatMinutesDuration(avgTmaMinutes) : '—';

    const avgTmeMinutes = tmeCount > 0 ? Math.round(totalTmeMinutes / tmeCount) : 0;
    const tmeFormatted = tmeCount > 0 ? formatMinutesDuration(avgTmeMinutes) : '—';

    const avgTmcMinutes = tmcCount > 0 ? Math.round(totalTmcMinutes / tmcCount) : 0;
    const tmcFormatted = tmcCount > 0 ? formatMinutesDuration(avgTmcMinutes) : '—';

    return {
      totalFinished,
      totalTripsCount,
      totalKm,
      avgKm,
      tmv: avgHoursFormatted,
      avgMinutes,
      tma: tmaFormatted,
      tme: tmeFormatted,
      tmc: tmcFormatted,
    };
  }, [completedTrips, effectiveMetricsTrips]);

  // Breakdown by Factory
  const factoryBreakdown = useMemo(() => {
    const map: Record<string, { count: number; km: number; finished: number }> = {};
    filteredTrips.forEach(t => {
      const name = t.factory_name || 'Outras';
      if (!map[name]) map[name] = { count: 0, km: 0, finished: 0 };
      map[name].count++;
      if (t.status === 'Finalizada') {
        map[name].finished++;
        const km = t.total_km ? Number(t.total_km) : (t.final_km && t.initial_km ? t.final_km - t.initial_km : 0);
        map[name].km += Math.max(0, km);
      }
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count);
  }, [filteredTrips]);

  const handleToggleFactory = (name: string) => {
    if (selectedFactoryName === name) {
      setSelectedFactoryName(null);
    } else {
      setSelectedFactoryName(name);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner Simplificado */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-4 sm:p-6 text-white shadow-lg flex items-center gap-3">
        <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 text-white shrink-0" />
        <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight leading-tight">
          Desempenho Operacional do Motorista
        </h1>
      </div>

      {/* Filter and Period Selection Bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 sm:p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-white">
          <Filter className="h-4 w-4 text-blue-600" />
          <span>Filtros Dinâmicos de Análise</span>
        </div>

        {/* Unified Calendar Filter */}
        <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <UnifiedDateFilter
            value={dateFilter}
            onChange={setDateFilter}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
          {/* Fábrica */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Fábrica de Destino
            </label>
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

          {/* Veículo */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
              Veículo / Placa
            </label>
            <select
              value={vehicleFilter}
              onChange={(e) => setVehicleFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 sm:py-2 text-xs font-mono text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-medium min-h-[40px] sm:min-h-0"
            >
              <option value="">Todos os veículos</option>
              {availableVehicles.map(v => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Alerta de Filtro Ativo por Fábrica */}
      {selectedFactoryName && (
        <div className="flex items-center justify-between rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 p-3 text-xs text-blue-900 dark:text-blue-100 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600 shrink-0" />
            <span>
              Exibindo métricas e viagens filtradas para: <strong>{selectedFactoryName}</strong>
            </span>
          </div>
          <button
            onClick={() => setSelectedFactoryName(null)}
            className="flex items-center gap-1 font-bold text-xs text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100 underline decoration-blue-400 cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Ver Todas as Fábricas</span>
          </button>
        </div>
      )}

      {/* KPI Cards Grid - Sequência Obrigatória: 1º TMV, 2º TMA, 3º TME, 4º TMC, 5º KM Rodado, 6º Concluídas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
        {/* 1º TMV (Tempo Médio de Viagem / Duração Média da Rota) */}
        <div className="rounded-xl sm:rounded-2xl border border-zinc-200 bg-white p-3.5 sm:p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">1º TMV</span>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 shrink-0">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-zinc-900 dark:text-white font-mono truncate">
            {metrics.tmv}
          </p>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 sm:mt-1 block truncate">
            {selectedFactoryName ? `Média ${selectedFactoryName}` : 'Duração da Rota'}
          </span>
        </div>

        {/* 2º TMA (Tempo Médio na Fábrica / Chegada na Fábrica até a Saída) */}
        <div className="rounded-xl sm:rounded-2xl border border-zinc-200 bg-white p-3.5 sm:p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">2º TMA</span>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 shrink-0">
              <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-zinc-900 dark:text-white font-mono truncate">
            {metrics.tma}
          </p>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 sm:mt-1 block truncate">
            Chegada até Saída
          </span>
        </div>

        {/* 3º TME (Tempo Médio de Fila / Chegada na Fábrica até o Início do Carregamento) */}
        <div className="rounded-xl sm:rounded-2xl border border-zinc-200 bg-white p-3.5 sm:p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">3º TME</span>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 shrink-0">
              <Timer className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-zinc-900 dark:text-white font-mono truncate">
            {metrics.tme}
          </p>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 sm:mt-1 block truncate">
            Fila / Espera Carga
          </span>
        </div>

        {/* 4º TMC (Tempo Médio de Carregamento / Início ao Fim do Carregamento) */}
        <div className="rounded-xl sm:rounded-2xl border border-zinc-200 bg-white p-3.5 sm:p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">4º TMC</span>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 shrink-0">
              <PackageCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-zinc-900 dark:text-white font-mono truncate">
            {metrics.tmc}
          </p>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 sm:mt-1 block truncate">
            Início ao Fim Carga
          </span>
        </div>

        {/* 5º KM RODADO (Total / Média km por viagem) */}
        <div className="rounded-xl sm:rounded-2xl border border-zinc-200 bg-white p-3.5 sm:p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">5º KM Rodado</span>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 shrink-0">
              <Gauge className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-zinc-900 dark:text-white font-mono truncate">
            {metrics.totalKm.toLocaleString('pt-BR')} <span className="text-xs font-bold text-zinc-400">km</span>
          </p>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 sm:mt-1 block truncate">
            Média {metrics.avgKm} km/vg
          </span>
        </div>

        {/* 6º VIAGENS CONCLUÍDAS (Total de Viagens no período) */}
        <div className="rounded-xl sm:rounded-2xl border border-zinc-200 bg-white p-3.5 sm:p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">6º Concluídas</span>
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg sm:rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 shrink-0">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          </div>
          <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-black text-zinc-900 dark:text-white font-mono truncate">
            {metrics.totalFinished} <span className="text-xs font-normal text-zinc-400">/ {metrics.totalTripsCount}</span>
          </p>
          <span className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 sm:mt-1 block truncate">
            {selectedFactoryName ? `Destino ${selectedFactoryName}` : 'No período'}
          </span>
        </div>
      </div>

      {/* Detalhamento por Fábrica de Destino */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-white">
              Detalhamento por Fábrica de Destino
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {selectedFactoryName && (
              <button
                onClick={() => setSelectedFactoryName(null)}
                className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 flex items-center gap-1 cursor-pointer"
              >
                <X className="h-3 w-3" />
                <span>Limpar seleção</span>
              </button>
            )}
            <span className="text-[11px] font-semibold text-zinc-400">
              {factoryBreakdown.length} fábricas
            </span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-500">
          Clique em uma fábrica para filtrar e atualizar os cards de métricas e visualizar os detalhes das viagens correspondentes:
        </p>

        {factoryBreakdown.length === 0 ? (
          <p className="text-xs text-zinc-400 py-4 text-center">
            Nenhuma viagem encontrada para o período selecionado.
          </p>
        ) : (
          <div className="space-y-2.5">
            {factoryBreakdown.map((item) => {
              const isSelected = selectedFactoryName === item.name;
              const tripsForThisFactory = filteredTrips.filter(
                t => (t.factory_name || 'Outras') === item.name
              );

              return (
                <div 
                  key={item.name}
                  className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50/40 dark:border-blue-700 dark:bg-blue-950/20 shadow-xs ring-1 ring-blue-500/20' 
                      : 'border-zinc-100 bg-zinc-50/70 hover:border-zinc-200 hover:bg-zinc-100/70 dark:border-zinc-800 dark:bg-zinc-800/40 dark:hover:border-zinc-700'
                  }`}
                >
                  {/* Clickable Header */}
                  <div
                    onClick={() => handleToggleFactory(item.name)}
                    className="flex items-center justify-between p-3 cursor-pointer select-none"
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-xs text-zinc-900 dark:text-white truncate">
                          {item.name}
                        </h4>
                        {isSelected && (
                          <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                            Filtro Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5">
                        {item.finished} finalizada(s) • {item.km.toLocaleString('pt-BR')} km total
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                          {item.count}
                        </span>
                        <span className="text-[10px] text-zinc-400 block">
                          viagem{item.count !== 1 ? 'ns' : ''}
                        </span>
                      </div>
                      <div className="text-zinc-400">
                        {isSelected ? (
                          <ChevronUp className="h-4 w-4 text-blue-600" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Section: Detalhes das viagens correspondentes a essa fábrica */}
                  {isSelected && (
                    <div className="border-t border-blue-200/60 dark:border-blue-900/50 p-3 bg-white/70 dark:bg-zinc-900/60 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Navigation className="h-3.5 w-3.5 text-blue-600" />
                          <span>Viagens correspondentes ({tripsForThisFactory.length})</span>
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          Clique para ver detalhes completos
                        </span>
                      </div>

                      {tripsForThisFactory.length === 0 ? (
                        <p className="text-xs text-zinc-400 py-3 text-center">Nenhuma viagem encontrada.</p>
                      ) : (
                        <div className="space-y-2">
                          {tripsForThisFactory.map((t) => {
                            const conf = TRIP_STATUS_CONFIG[t.status] || TRIP_STATUS_CONFIG['Programada'];
                            const timeStr = formatAppointmentWindow(t.appointment_window, t.planned_departure);

                            // Calculate trip duration
                            let durStr = t.total_time;
                            if (!durStr && t.actual_departure && t.actual_arrival) {
                              if (t.actual_departure_date && t.actual_arrival_date) {
                                const depParts = t.actual_departure.match(/(\d{1,2}):(\d{2})/);
                                const arrParts = t.actual_arrival.match(/(\d{1,2}):(\d{2})/);
                                if (depParts && arrParts) {
                                  const d1 = new Date(`${t.actual_departure_date}T${depParts[1].padStart(2, '0')}:${depParts[2]}:00`);
                                  const d2 = new Date(`${t.actual_arrival_date}T${arrParts[1].padStart(2, '0')}:${arrParts[2]}:00`);
                                  if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
                                    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60));
                                    if (diff >= 0) {
                                      durStr = `${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, '0')}m`;
                                    }
                                  }
                                }
                              }
                              if (!durStr) {
                                const [dh, dm] = t.actual_departure.split(':').map(n => parseInt(n, 10) || 0);
                                const [ah, am] = t.actual_arrival.split(':').map(n => parseInt(n, 10) || 0);
                                let diff = (ah * 60 + am) - (dh * 60 + dm);
                                if (diff < 0) diff += 24 * 60;
                                durStr = `${Math.floor(diff / 60)}h ${String(diff % 60).padStart(2, '0')}m`;
                              }
                            }

                            return (
                              <div
                                key={t.id}
                                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-2.5 rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-800/60 gap-2 hover:border-blue-300 dark:hover:border-blue-700 transition"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-xs text-zinc-900 dark:text-white">
                                      {t.date.split('-').reverse().join('/')}
                                    </span>
                                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.2 text-[9px] font-bold ${conf.badge}`}>
                                      <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
                                      {conf.label}
                                    </span>
                                    {t.order_number && (
                                      <span className="font-mono text-[10px] font-semibold text-zinc-500">
                                        Ped: {t.order_number}
                                      </span>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 flex-wrap">
                                    <span>Veículo: <strong className="font-mono text-zinc-700 dark:text-zinc-300">{t.vehicle_plate}</strong></span>
                                    <span>•</span>
                                    <span>Horário: <strong>{timeStr}</strong></span>
                                    {durStr && (
                                      <>
                                        <span>•</span>
                                        <span className="text-blue-600 dark:text-blue-400">Duração: <strong>{durStr}</strong></span>
                                      </>
                                    )}
                                    {t.total_km && (
                                      <>
                                        <span>•</span>
                                        <span>KM: <strong>{t.total_km} km</strong></span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                <div className="self-end sm:self-center shrink-0">
                                  <button
                                    onClick={() => onOpenTripDetails(t)}
                                    className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/80 transition"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    <span>Ver Viagem</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
