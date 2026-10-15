import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.ts';
import type { Trip, Driver, Factory as FactoryModel, Vehicle } from '../types/index.ts';
import { 
  TrendingUp, Gauge, Clock, Award, ShieldCheck, 
  ArrowUpRight, Building2, Filter, Truck, Route, Factory as FactoryIcon
} from 'lucide-react';

export const IndicatorsPage: React.FC = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [factories, setFactories] = useState<FactoryModel[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [periodFilter, setPeriodFilter] = useState<'this_month' | 'last_month' | 'all' | 'custom_month'>('this_month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [factoryFilter, setFactoryFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [tList, dList, fList, vList] = await Promise.all([
        api.getTrips(),
        api.getDrivers(),
        api.getFactories(),
        api.getVehicles()
      ]);
      setTrips(tList || []);
      setDrivers(dList || []);
      setFactories(fList || []);
      setVehicles(vList || []);
    } catch (err) {
      console.error('Erro ao carregar indicadores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('puxada:trip-updated', handleUpdate);
    return () => window.removeEventListener('puxada:trip-updated', handleUpdate);
  }, []);

  // Dates helpers
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Filtered trips based on selected period and factory
  const filteredTrips = useMemo(() => {
    return trips.filter(t => {
      // Period filter
      if (periodFilter === 'this_month') {
        if (!t.date || !t.date.startsWith(currentMonthStr)) return false;
      } else if (periodFilter === 'last_month') {
        if (!t.date || !t.date.startsWith(lastMonthStr)) return false;
      } else if (periodFilter === 'custom_month') {
        if (!t.date || !t.date.startsWith(selectedMonth)) return false;
      }

      // Factory filter
      if (factoryFilter && t.factory_name !== factoryFilter && t.factory_id !== factoryFilter) {
        return false;
      }

      return true;
    });
  }, [trips, periodFilter, currentMonthStr, lastMonthStr, selectedMonth, factoryFilter]);

  // Completed trips in filtered subset
  const completedTrips = useMemo(() => {
    return filteredTrips.filter(t => t.status === 'Finalizada');
  }, [filteredTrips]);

  // Dynamic Real Metrics Calculations - ZERADOS SEM DADOS FICTÍCIOS
  const metrics = useMemo(() => {
    const totalTrips = filteredTrips.length;
    const totalFinished = completedTrips.length;
    const totalCanceled = filteredTrips.filter(t => t.status === 'Cancelada').length;
    const totalInProgress = filteredTrips.filter(t => ['Em deslocamento', 'Na fábrica', 'Retornando'].includes(t.status)).length;

    // 1. TMV - Tempo Médio de Viagem (cálculo a partir dos dados reais de deslocamento)
    let totalTripMinutes = 0;
    let timedTripsCount = 0;

    completedTrips.forEach(t => {
      if (t.total_time) {
        const hMatch = t.total_time.match(/(\d+)\s*h/);
        const mMatch = t.total_time.match(/(\d+)\s*m/);
        if (hMatch || mMatch) {
          const hours = hMatch ? parseInt(hMatch[1], 10) : 0;
          const mins = mMatch ? parseInt(mMatch[1], 10) : 0;
          totalTripMinutes += (hours * 60) + mins;
          timedTripsCount++;
        } else if (t.total_time.includes(':')) {
          const [hh, mm] = t.total_time.split(':').map(n => parseInt(n, 10) || 0);
          totalTripMinutes += (hh * 60) + mm;
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
        totalTripMinutes += diffMinutes;
        timedTripsCount++;
      }
    });

    const avgMinutes = timedTripsCount > 0 ? Math.round(totalTripMinutes / timedTripsCount) : 0;
    const tmvFormatted = avgMinutes > 0 
      ? `${Math.floor(avgMinutes / 60)}h ${String(avgMinutes % 60).padStart(2, '0')}m`
      : '0h 00m';

    // 2. TMA - Tempo Médio na Fábrica (tempo da chegada na fábrica até a saída)
    let totalTmaMinutes = 0;
    let tmaCount = 0;

    // 3. TME - Tempo Médio em Fila / Portaria (tempo da chegada na fábrica até o início do carregamento)
    let totalTmeMinutes = 0;
    let tmeCount = 0;

    completedTrips.forEach(t => {
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

      // TME: da chegada na fábrica até o início do carregamento
      if (t.arrival_at_factory_time && t.loading_start_time) {
        const [ah, am] = t.arrival_at_factory_time.split(':').map(n => parseInt(n, 10) || 0);
        const [sh, sm] = t.loading_start_time.split(':').map(n => parseInt(n, 10) || 0);
        let diff = (sh * 60 + sm) - (ah * 60 + am);
        if (diff < 0) diff += 24 * 60;
        totalTmeMinutes += diff;
        tmeCount++;
      }
    });

    const avgTmaMinutes = tmaCount > 0 ? Math.round(totalTmaMinutes / tmaCount) : 0;
    const tmaFormatted = avgTmaMinutes > 0
      ? `${Math.floor(avgTmaMinutes / 60)}h ${String(avgTmaMinutes % 60).padStart(2, '0')}m`
      : '0h 00m';

    const avgTmeMinutes = tmeCount > 0 ? Math.round(totalTmeMinutes / tmeCount) : 0;
    const tmeFormatted = avgTmeMinutes > 0 
      ? (avgTmeMinutes >= 60 
          ? `${Math.floor(avgTmeMinutes / 60)}h ${String(avgTmeMinutes % 60).padStart(2, '0')}m`
          : `${avgTmeMinutes}min`)
      : '0min';

    // 4. TMC - Tempo Médio de Carregamento (início ao fim do carregamento)
    let totalTmcMinutes = 0;
    let tmcCount = 0;

    completedTrips.forEach(t => {
      if (t.loading_start_time && t.loading_end_time) {
        const [sh, sm] = t.loading_start_time.split(':').map(n => parseInt(n, 10) || 0);
        const [eh, em] = t.loading_end_time.split(':').map(n => parseInt(n, 10) || 0);
        let diff = (eh * 60 + em) - (sh * 60 + sm);
        if (diff < 0) diff += 24 * 60;
        totalTmcMinutes += diff;
        tmcCount++;
      }
    });

    const avgTmcMinutes = tmcCount > 0 ? Math.round(totalTmcMinutes / tmcCount) : 0;
    const tmcFormatted = avgTmcMinutes > 0
      ? (avgTmcMinutes >= 60 
          ? `${Math.floor(avgTmcMinutes / 60)}h ${String(avgTmcMinutes % 60).padStart(2, '0')}m`
          : `${avgTmcMinutes}min`)
      : '0min';

    // 5. KM Total Rodado Real
    let totalKm = 0;
    completedTrips.forEach(t => {
      if (t.total_km) {
        totalKm += Number(t.total_km) || 0;
      } else if (t.final_km && t.initial_km && t.final_km >= t.initial_km) {
        totalKm += (t.final_km - t.initial_km);
      }
    });

    // Eficiência Global (Percentual real de sucesso nas viagens)
    const totalFinishedOrCanceled = totalFinished + totalCanceled;
    const efficiencyRate = totalFinishedOrCanceled > 0 
      ? ((totalFinished / totalFinishedOrCanceled) * 100).toFixed(1)
      : '0.0';

    return {
      totalTrips,
      totalFinished,
      totalCanceled,
      totalInProgress,
      totalKm,
      totalKmFormatted: `${Math.round(totalKm).toLocaleString('pt-BR')} km`,
      tmv: tmvFormatted,
      tma: tmaFormatted,
      tme: tmeFormatted,
      tmc: tmcFormatted,
      efficiency: `${efficiencyRate}%`,
    };
  }, [filteredTrips, completedTrips]);

  // Real Driver Rankings computed from Database
  const driverRankings = useMemo(() => {
    return drivers.map(drv => {
      const drvTrips = filteredTrips.filter(t => 
        t.driver_id === drv.id || 
        (drv.user_id && t.driver_id === drv.user_id) ||
        (t.driver_name && t.driver_name.toLowerCase() === drv.name.toLowerCase())
      );

      const finishedCount = drvTrips.filter(t => t.status === 'Finalizada').length;
      const canceledCount = drvTrips.filter(t => t.status === 'Cancelada').length;
      const inProgressCount = drvTrips.filter(t => ['Em deslocamento', 'Na fábrica', 'Retornando'].includes(t.status)).length;
      
      let km = 0;
      let meals = 0;
      drvTrips.forEach(t => {
        if (t.total_km) km += Number(t.total_km);
        else if (t.final_km && t.initial_km) km += Math.max(0, t.final_km - t.initial_km);
        meals += (t.meals_count || 0);
      });

      // Score baseado estritamente em viagens reais (0.0 se não tiver viagens registradas)
      let score = 0;
      if (drvTrips.length > 0) {
        score = Math.max(0, Math.min(100, 100 + (finishedCount * 2) - (canceledCount * 10)));
      }

      return {
        id: drv.id,
        name: drv.name,
        registration: drv.registration,
        status: drv.status,
        defaultVehicle: drv.default_vehicle_plate || '—',
        tripsCount: drvTrips.length,
        finishedCount,
        inProgressCount,
        km,
        meals,
        score: score.toFixed(1),
      };
    }).sort((a, b) => b.finishedCount - a.finishedCount || Number(b.score) - Number(a.score));
  }, [drivers, filteredTrips]);

  // Real Factory Breakdown computed from Database
  const factoryRankings = useMemo(() => {
    return factories.map(fac => {
      const facTrips = filteredTrips.filter(t => t.factory_id === fac.id || t.factory_name === fac.name);
      const finishedCount = facTrips.filter(t => t.status === 'Finalizada').length;
      const inProgressCount = facTrips.filter(t => ['Em deslocamento', 'Na fábrica', 'Retornando'].includes(t.status)).length;
      
      let km = 0;
      facTrips.forEach(t => {
        if (t.total_km) km += Number(t.total_km);
        else if (t.final_km && t.initial_km) km += Math.max(0, t.final_km - t.initial_km);
      });

      return {
        id: fac.id,
        name: fac.name,
        code: fac.factory_code,
        state: fac.state,
        city: fac.city,
        tripsCount: facTrips.length,
        finishedCount,
        inProgressCount,
        km,
      };
    }).sort((a, b) => b.tripsCount - a.tripsCount);
  }, [factories, filteredTrips]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-blue-800 p-4 sm:p-6 text-white shadow-xl">
        <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight leading-tight">
          Monitoramento e Gestão da Puxada
        </h1>
      </div>

      {/* Barra de Filtros de Período e Fábrica */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mr-1 shrink-0 flex items-center gap-1">
              <Filter className="h-3 w-3 text-blue-600" /> Período:
            </span>
            <button
              onClick={() => setPeriodFilter('this_month')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                periodFilter === 'this_month'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              Mês Atual
            </button>
            <button
              onClick={() => setPeriodFilter('last_month')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                periodFilter === 'last_month'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              Mês Anterior
            </button>
            <button
              onClick={() => setPeriodFilter('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition whitespace-nowrap ${
                periodFilter === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
              }`}
            >
              Todo o Histórico
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium text-zinc-500">Mês:</span>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setPeriodFilter('custom_month');
                }}
                className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-medium"
              />
            </div>

            <div>
              <select
                value={factoryFilter}
                onChange={(e) => setFactoryFilter(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              >
                <option value="">Todas as Fábricas</option>
                {factories.map(f => (
                  <option key={f.id} value={f.name}>{f.name} ({f.state})</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Indicadores Consolidados e Métricas Analíticas - Sequência Obrigatória: TMV, TMA, TME, TMC, KM RODADO */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
        {/* Card 1: TMV */}
        <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/70 to-white p-3.5 sm:p-4 shadow-xs dark:border-violet-900/30 dark:from-violet-950/20 dark:to-zinc-900 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300 flex items-center gap-1">
              <Gauge className="h-3.5 w-3.5 text-violet-600 shrink-0" />
              <span className="truncate">TMV</span>
            </span>
            <p className="mt-1 text-xl sm:text-2xl font-black text-zinc-900 dark:text-white font-mono">
              {metrics.tmv || '0h 00m'}
            </p>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block">
              Tempo médio de rota
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-violet-600/10 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
            <Gauge className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
        </div>

        {/* Card 2: TMA */}
        <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/70 to-white p-3.5 sm:p-4 shadow-xs dark:border-blue-900/30 dark:from-blue-950/20 dark:to-zinc-900 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300 flex items-center gap-1">
              <FactoryIcon className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span className="truncate">TMA</span>
            </span>
            <p className="mt-1 text-xl sm:text-2xl font-black text-zinc-900 dark:text-white font-mono">
              {metrics.tma || '0h 00m'}
            </p>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block">
              Tempo na fábrica
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
            <FactoryIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Card 3: TME */}
        <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50/70 to-white p-3.5 sm:p-4 shadow-xs dark:border-amber-900/30 dark:from-amber-950/20 dark:to-zinc-900 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              <span className="truncate">TME</span>
            </span>
            <p className="mt-1 text-xl sm:text-2xl font-black text-zinc-900 dark:text-white font-mono">
              {metrics.tme || '0min'}
            </p>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block">
              Tempo de fila / espera
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-amber-600/10 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        {/* Card 4: TMC */}
        <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-white p-3.5 sm:p-4 shadow-xs dark:border-emerald-900/30 dark:from-emerald-950/20 dark:to-zinc-900 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <Truck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="truncate">TMC</span>
            </span>
            <p className="mt-1 text-xl sm:text-2xl font-black text-zinc-900 dark:text-white font-mono">
              {metrics.tmc || '0min'}
            </p>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block">
              Tempo de carregamento
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
            <Truck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        {/* Card 5: KM RODADO */}
        <div className="col-span-2 sm:col-span-1 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-white p-3.5 sm:p-4 shadow-xs dark:border-indigo-900/30 dark:from-indigo-950/20 dark:to-zinc-900 flex items-center justify-between">
          <div className="min-w-0">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
              <Route className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">KM Rodado</span>
            </span>
            <p className="mt-1 text-xl sm:text-2xl font-black text-zinc-900 dark:text-white font-mono">
              {metrics.totalKmFormatted || `${metrics.totalKm || 0} km`}
            </p>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate block">
              Quilometragem total
            </span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
            <Route className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Rankings Operacionais Reais (Motoristas e Fábricas) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking Real de Motoristas */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Ranking Operacional de Motoristas
                  </h3>
                  <p className="text-[11px] text-zinc-400">Desempenho apurado das viagens e pontualidade na base real</p>
                </div>
              </div>
              <span className="rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold px-2.5 py-0.5 text-xs">
                {driverRankings.length} Ativos
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {driverRankings.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">Nenhum motorista registrado na base.</p>
              ) : (
                driverRankings.slice(0, 5).map((drv, idx) => (
                  <div 
                    key={drv.id}
                    className={`flex items-center justify-between p-3 rounded-2xl border text-xs transition ${
                      idx === 0
                        ? 'border-amber-200 bg-amber-50/40 dark:border-amber-900/40 dark:bg-amber-950/20'
                        : 'border-zinc-100 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-xl font-bold text-xs ${
                        idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-zinc-300 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                      }`}>
                        {idx + 1}º
                      </span>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white">{drv.name}</p>
                        <p className="text-[11px] text-zinc-500 font-mono">
                          Matrícula: {drv.registration} • Veículo: {drv.defaultVehicle}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono block">
                        {drv.finishedCount} finalizadas
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        Score {drv.score} pts
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Eficiência Real por Fábrica */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    Fluxo e Volumetria por Fábrica
                  </h3>
                  <p className="text-[11px] text-zinc-400">Movimentações operacionais registradas por planta fabril</p>
                </div>
              </div>
              <span className="rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 font-bold px-2.5 py-0.5 text-xs">
                {factoryRankings.length} Plantas
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {factoryRankings.length === 0 ? (
                <p className="text-xs text-zinc-400 py-6 text-center">Nenhuma fábrica registrada na base.</p>
              ) : (
                factoryRankings.slice(0, 5).map((fac, idx) => (
                  <div 
                    key={fac.id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-zinc-100 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-800/40 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 font-bold dark:bg-indigo-950/60 dark:text-indigo-300">
                        <Building2 className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white">{fac.name}</p>
                        <p className="text-[11px] text-zinc-500">
                          {fac.city} - {fac.state} • Cód: {fac.code}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 font-mono block">
                        {fac.tripsCount} viagens
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {fac.finishedCount} entregues
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

