import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, PieChart as PieChartIcon, TrendingUp, Filter, RefreshCw,
  Maximize2, X, Table as TableIcon, Calendar, Factory, User, Route,
  Clock, Gauge, ArrowUpRight, CheckCircle2, ChevronDown, Layers
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Cell, PieChart, Pie
} from 'recharts';
import { api } from '../../services/api.ts';

// Power BI modern corporate palette
const POWER_BI_COLORS = [
  '#0078D4', // Azure / Classic Blue
  '#00B7C3', // Cyan / Teal
  '#E66C37', // Amber / Orange
  '#107C41', // Forest Green
  '#8764B8', // Violet / Purple
  '#D13438', // Soft Crimson
  '#004E8C', // Navy Blue
  '#FFB900', // Gold / Yellow
  '#498205', // Lime / Olive
  '#00AD56'  // Jade
];

const TIME_INDICATOR_COLORS = {
  tmv: '#0078D4', // Azul Power BI
  tma: '#00B7C3', // Ciano / Turquesa
  tme: '#E66C37', // Laranja / Âmbar
  tmc: '#107C41', // Verde
};

interface PowerBiDashboardProps {
  onOpenTripDetails?: (trip: any) => void;
}

export const PowerBiDashboard: React.FC<PowerBiDashboardProps> = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Filter state (Power BI Slicers)
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | '7days' | '30days' | 'month'>('all');
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>('all');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('all');

  // Interactive Visual Slicers
  const [timeUnit, setTimeUnit] = useState<'hours' | 'minutes'>('hours');
  const [pieChartType, setPieChartType] = useState<'pie' | 'donut'>('donut');
  const [driverTripsStackBy, setDriverTripsStackBy] = useState<'factory' | 'status'>('factory');
  const [driverKmStackBy, setDriverKmStackBy] = useState<'factory' | 'status'>('factory');

  // Table view toggles per visual (Power BI "Show as table")
  const [showTableVisual1, setShowTableVisual1] = useState<boolean>(false);
  const [showTableVisual2, setShowTableVisual2] = useState<boolean>(false);
  const [showTableVisual3, setShowTableVisual3] = useState<boolean>(false);
  const [showTableVisual4, setShowTableVisual4] = useState<boolean>(false);

  // Focus mode modal state (Power BI Focus Mode)
  const [focusedVisual, setFocusedVisual] = useState<number | null>(null);

  // Dashboard raw data
  const [dashboardData, setDashboardData] = useState<{
    cards: any;
    charts: any;
  }>({
    cards: {},
    charts: {}
  });

  // Filter dropdown lists
  const [factoriesList, setFactoriesList] = useState<any[]>([]);
  const [driversList, setDriversList] = useState<any[]>([]);

  // Calculate start/end dates based on period filter
  const dateRange = useMemo(() => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (periodFilter === 'today') {
      const todayStr = formatDate(today);
      return { startDate: todayStr, endDate: todayStr };
    }
    if (periodFilter === '7days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 7);
      return { startDate: formatDate(past), endDate: formatDate(today) };
    }
    if (periodFilter === '30days') {
      const past = new Date(today);
      past.setDate(past.getDate() - 30);
      return { startDate: formatDate(past), endDate: formatDate(today) };
    }
    if (periodFilter === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: formatDate(startOfMonth), endDate: formatDate(today) };
    }
    return { startDate: undefined, endDate: undefined };
  }, [periodFilter]);

  // Load filter options on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const [facs, drvs] = await Promise.all([
          api.getFactories().catch(() => []),
          api.getDrivers().catch(() => [])
        ]);
        setFactoriesList(Array.isArray(facs) ? facs : []);
        setDriversList(Array.isArray(drvs) ? drvs : []);
      } catch (e) {
        console.error('Error loading filter options:', e);
      }
    }
    loadOptions();
  }, []);

  // Fetch dashboard stats
  const fetchDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params: any = {};
      if (dateRange.startDate) params.startDate = dateRange.startDate;
      if (dateRange.endDate) params.endDate = dateRange.endDate;
      if (selectedFactoryId !== 'all') params.factoryId = selectedFactoryId;
      if (selectedDriverId !== 'all') params.driverId = selectedDriverId;

      const res = await api.getDashboardStats(params);
      if (res) {
        setDashboardData({
          cards: res.cards || {},
          charts: res.charts || {}
        });
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [dateRange, selectedFactoryId, selectedDriverId]);

  // =========================================================================
  // DATA PREPARATION FOR VISUALS
  // =========================================================================

  // 1. DATA FOR VISUAL 1: Stacked Columns TMV, TMA, TME, TMC by Factory
  const visual1Data = useMemo(() => {
    const list = dashboardData.charts?.factoryIndicatorsComparison || [];
    return list.map((item: any) => {
      const isMinutes = timeUnit === 'minutes';
      const tmvVal = isMinutes ? item.tmvMinutes : Number((item.tmvMinutes / 60).toFixed(2));
      const tmaVal = isMinutes ? item.tmaMinutes : Number((item.tmaMinutes / 60).toFixed(2));
      const tmeVal = isMinutes ? item.tmeMinutes : Number((item.tmeMinutes / 60).toFixed(2));
      const tmcVal = isMinutes ? item.tmcMinutes : Number((item.tmcMinutes / 60).toFixed(2));
      const totalMinutes = item.tmvMinutes + item.tmaMinutes + item.tmeMinutes + item.tmcMinutes;
      const totalHours = Math.floor(totalMinutes / 60);
      const totalRemMins = totalMinutes % 60;
      const totalFormatted = totalHours > 0 
        ? `${totalHours}h ${String(totalRemMins).padStart(2, '0')}m`
        : `${totalRemMins}min`;

      return {
        id: item.id,
        name: item.name + (item.state ? ` (${item.state})` : ''),
        rawName: item.name,
        state: item.state,
        code: item.factory_code || '',
        count: item.count || 0,
        tmv: tmvVal,
        tma: tmaVal,
        tme: tmeVal,
        tmc: tmcVal,
        totalTime: isMinutes ? totalMinutes : Number((totalMinutes / 60).toFixed(2)),
        totalFormatted,
        rawTmvMinutes: item.tmvMinutes,
        rawTmaMinutes: item.tmaMinutes,
        rawTmeMinutes: item.tmeMinutes,
        rawTmcMinutes: item.tmcMinutes,
        tmvFormatted: item.tmvFormatted,
        tmaFormatted: item.tmaFormatted,
        tmeFormatted: item.tmeFormatted,
        tmcFormatted: item.tmcFormatted,
      };
    });
  }, [dashboardData.charts?.factoryIndicatorsComparison, timeUnit]);

  // 2. DATA FOR VISUAL 2: Pie / Donut Chart - Trips by Factory (% and Count)
  const visual2Data = useMemo(() => {
    const list = dashboardData.charts?.tripsByFactory || [];
    const totalCount = list.reduce((sum: number, item: any) => sum + (Number(item.count) || 0), 0);

    return list.map((item: any, idx: number) => {
      const count = Number(item.count) || 0;
      const percent = totalCount > 0 ? ((count / totalCount) * 100) : 0;
      return {
        id: item.id,
        name: item.name + (item.state ? ` (${item.state})` : ''),
        rawName: item.name,
        code: item.factory_code || '',
        value: count,
        count: count,
        percent: Number(percent.toFixed(1)),
        percentFormatted: `${percent.toFixed(1)}%`,
        color: POWER_BI_COLORS[idx % POWER_BI_COLORS.length]
      };
    });
  }, [dashboardData.charts?.tripsByFactory]);

  const totalTripsInPie = useMemo(() => {
    return visual2Data.reduce((sum: number, item: any) => sum + item.value, 0);
  }, [visual2Data]);

  // 3. ALL FACTORIES AND STATUSES FOR STACKED SERIES KEYS
  const factoryNamesList = useMemo(() => {
    const set = new Set<string>();
    (dashboardData.charts?.tripsByFactory || []).forEach((f: any) => {
      if (f.name) set.add(f.name);
    });
    // Also from driver analytics
    (dashboardData.charts?.driverTripsAnalytics || []).forEach((d: any) => {
      if (d.byFactoryTrips) {
        Object.keys(d.byFactoryTrips).forEach(k => set.add(k));
      }
    });
    return Array.from(set);
  }, [dashboardData.charts]);

  const statusList = ['Finalizada', 'Em deslocamento', 'Na fábrica', 'Programada', 'Cancelada'];

  // Status color mapping for Power BI
  const STATUS_COLORS: Record<string, string> = {
    'Finalizada': '#107C41',        // Green
    'Em deslocamento': '#0078D4',    // Blue
    'Na fábrica': '#00B7C3',         // Cyan
    'Programada': '#FFB900',         // Amber
    'Cancelada': '#D13438',          // Crimson
    'Outro': '#8764B8'
  };

  // 4. DATA FOR VISUAL 3: Stacked Columns - Trips by Driver
  const visual3Data = useMemo(() => {
    const list = dashboardData.charts?.driverTripsAnalytics || [];
    return list.map((driver: any) => {
      const entry: any = {
        id: driver.id,
        name: driver.name,
        registration: driver.registration || '',
        displayName: driver.name + (driver.registration ? ` (${driver.registration})` : ''),
        totalTrips: driver.totalTrips || 0,
        totalKm: driver.totalKm || 0,
      };

      if (driverTripsStackBy === 'factory') {
        factoryNamesList.forEach(fac => {
          entry[fac] = (driver.byFactoryTrips && driver.byFactoryTrips[fac]) || 0;
        });
      } else {
        statusList.forEach(st => {
          entry[st] = (driver.byStatusTrips && driver.byStatusTrips[st]) || 0;
        });
      }

      return entry;
    });
  }, [dashboardData.charts?.driverTripsAnalytics, driverTripsStackBy, factoryNamesList]);

  // 5. DATA FOR VISUAL 4: Stacked Columns - KM Driven by Driver
  const visual4Data = useMemo(() => {
    const list = dashboardData.charts?.driverTripsAnalytics || [];
    return list.map((driver: any) => {
      const entry: any = {
        id: driver.id,
        name: driver.name,
        registration: driver.registration || '',
        displayName: driver.name + (driver.registration ? ` (${driver.registration})` : ''),
        totalTrips: driver.totalTrips || 0,
        totalKm: Math.round(driver.totalKm || 0),
        totalKmFormatted: `${Math.round(driver.totalKm || 0).toLocaleString('pt-BR')} km`
      };

      if (driverKmStackBy === 'factory') {
        factoryNamesList.forEach(fac => {
          entry[fac] = Math.round((driver.byFactoryKm && driver.byFactoryKm[fac]) || 0);
        });
      } else {
        statusList.forEach(st => {
          entry[st] = Math.round((driver.byStatusKm && driver.byStatusKm[st]) || 0);
        });
      }

      return entry;
    });
  }, [dashboardData.charts?.driverTripsAnalytics, driverKmStackBy, factoryNamesList]);

  // =========================================================================
  // CUSTOM POWER BI TOOLTIPS
  // =========================================================================

  const CustomPowerBiTooltipVisual1 = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      const isMinutes = timeUnit === 'minutes';
      return (
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/95 p-3.5 text-xs text-white shadow-2xl backdrop-blur-md min-w-[220px]">
          <div className="border-b border-zinc-700/80 pb-2 mb-2">
            <span className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              <Factory className="h-3.5 w-3.5 text-blue-400" />
              {label}
            </span>
            {data?.code && (
              <span className="text-[10px] text-zinc-400 block font-mono">Cód: {data.code}</span>
            )}
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: TIME_INDICATOR_COLORS.tmv }} />
                TMV (Viagem):
              </span>
              <span className="font-bold font-mono text-zinc-100">
                {data?.tmvFormatted || (isMinutes ? `${data?.tmv}m` : `${data?.tmv}h`)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: TIME_INDICATOR_COLORS.tma }} />
                TMA (Fábrica):
              </span>
              <span className="font-bold font-mono text-zinc-100">
                {data?.tmaFormatted || (isMinutes ? `${data?.tma}m` : `${data?.tma}h`)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: TIME_INDICATOR_COLORS.tme }} />
                TME (Espera):
              </span>
              <span className="font-bold font-mono text-zinc-100">
                {data?.tmeFormatted || (isMinutes ? `${data?.tme}m` : `${data?.tme}h`)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-zinc-300">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: TIME_INDICATOR_COLORS.tmc }} />
                TMC (Carreg.):
              </span>
              <span className="font-bold font-mono text-zinc-100">
                {data?.tmcFormatted || (isMinutes ? `${data?.tmc}m` : `${data?.tmc}h`)}
              </span>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-zinc-700/80 flex items-center justify-between font-bold text-zinc-200">
            <span>Tempo Total Acumulado:</span>
            <span className="text-blue-400 font-mono text-xs">{data?.totalFormatted}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPowerBiTooltipVisual2 = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/95 p-3.5 text-xs text-white shadow-2xl backdrop-blur-md min-w-[200px]">
          <div className="border-b border-zinc-700/80 pb-2 mb-2 flex items-center gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: data?.color }} />
            <span className="font-bold text-sm tracking-tight text-white">{data?.name}</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-300">Quantidade de Viagens:</span>
              <span className="font-bold font-mono text-zinc-100">{data?.count} {data?.count === 1 ? 'viagem' : 'viagens'}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-zinc-300">Participação (%):</span>
              <span className="font-black font-mono text-amber-400">{data?.percentFormatted}</span>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-zinc-700/80 flex items-center justify-between text-[11px] text-zinc-400">
            <span>Total da Amostra:</span>
            <span className="font-mono text-zinc-200">{totalTripsInPie} viagens</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPowerBiTooltipVisual3 = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, p: any) => sum + (Number(p.value) || 0), 0);
      return (
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/95 p-3.5 text-xs text-white shadow-2xl backdrop-blur-md min-w-[220px]">
          <div className="border-b border-zinc-700/80 pb-2 mb-2 flex items-center gap-1.5 font-bold text-sm text-white">
            <User className="h-3.5 w-3.5 text-blue-400" />
            <span>{label}</span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {payload.map((item: any, i: number) => {
              if (item.value === 0) return null;
              return (
                <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-zinc-300 truncate max-w-[140px]">
                    <span className="h-2 w-2 rounded-xs shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}:</span>
                  </span>
                  <span className="font-bold font-mono text-zinc-100">{item.value}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 pt-2 border-t border-zinc-700/80 flex items-center justify-between font-bold text-zinc-200">
            <span>Total de Viagens:</span>
            <span className="text-blue-400 font-mono text-xs">{total}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPowerBiTooltipVisual4 = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, p: any) => sum + (Number(p.value) || 0), 0);
      return (
        <div className="rounded-xl border border-zinc-700/80 bg-zinc-900/95 p-3.5 text-xs text-white shadow-2xl backdrop-blur-md min-w-[220px]">
          <div className="border-b border-zinc-700/80 pb-2 mb-2 flex items-center gap-1.5 font-bold text-sm text-white">
            <Route className="h-3.5 w-3.5 text-green-400" />
            <span>{label}</span>
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            {payload.map((item: any, i: number) => {
              if (item.value === 0) return null;
              return (
                <div key={i} className="flex items-center justify-between gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5 text-zinc-300 truncate max-w-[140px]">
                    <span className="h-2 w-2 rounded-xs shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate">{item.name}:</span>
                  </span>
                  <span className="font-bold font-mono text-zinc-100">{Number(item.value).toLocaleString('pt-BR')} km</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2.5 pt-2 border-t border-zinc-700/80 flex items-center justify-between font-bold text-zinc-200">
            <span>KM Total Percorrido:</span>
            <span className="text-green-400 font-mono text-xs">{total.toLocaleString('pt-BR')} km</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* =================================================================== */}
      {/* POWER BI TOP BAR & SLICERS (BARRA DE FILTROS)                       */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Power BI Analytics
                </span>
                <span className="text-xs text-zinc-400">
                  Atualizado às {lastUpdated.toLocaleTimeString('pt-BR')}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-zinc-900 dark:text-white">
                Painel Analítico de Puxada
              </h2>
            </div>
          </div>

          {/* Slicers Row */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Period Filter */}
            <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl p-1 text-xs font-semibold">
              <Calendar className="h-3.5 w-3.5 ml-2 text-zinc-400" />
              <button
                onClick={() => setPeriodFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  periodFilter === 'all'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setPeriodFilter('today')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  periodFilter === 'today'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                Hoje
              </button>
              <button
                onClick={() => setPeriodFilter('7days')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  periodFilter === '7days'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                7 Dias
              </button>
              <button
                onClick={() => setPeriodFilter('30days')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  periodFilter === '30days'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs font-bold'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                30 Dias
              </button>
            </div>

            {/* Factory Slicer */}
            <div className="relative">
              <select
                value={selectedFactoryId}
                onChange={e => setSelectedFactoryId(e.target.value)}
                className="appearance-none bg-zinc-100 dark:bg-zinc-800/80 border border-transparent dark:border-zinc-700/60 rounded-xl px-3 py-1.5 pr-8 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todas as Fábricas</option>
                {factoriesList.map(f => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.state ? `(${f.state})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Driver Slicer */}
            <div className="relative">
              <select
                value={selectedDriverId}
                onChange={e => setSelectedDriverId(e.target.value)}
                className="appearance-none bg-zinc-100 dark:bg-zinc-800/80 border border-transparent dark:border-zinc-700/60 rounded-xl px-3 py-1.5 pr-8 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os Motoristas</option>
                {driversList.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} {d.registration ? `(${d.registration})` : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              title="Atualizar dados do dashboard"
              className="flex items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-zinc-50 dark:bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-750 transition active:scale-95"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-blue-500' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* POWER BI KPI METRICS ROW                                            */}
      {/* =================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Trips */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block truncate">
            Total Viagens
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
              {dashboardData.cards?.totalTrips ?? 0}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              {dashboardData.cards?.finishedTrips ?? 0} fin.
            </span>
          </div>
        </div>

        {/* Total KM */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block truncate">
            KM Rodado
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
              {dashboardData.cards?.totalKmFormatted ?? '0 km'}
            </span>
          </div>
        </div>

        {/* TMV */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: TIME_INDICATOR_COLORS.tmv }} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              TMV Médio
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-blue-600 dark:text-blue-400">
              {dashboardData.cards?.tmv ?? '--'}
            </span>
          </div>
        </div>

        {/* TMA */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: TIME_INDICATOR_COLORS.tma }} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              TMA Médio
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-cyan-600 dark:text-cyan-400">
              {dashboardData.cards?.tma ?? '--'}
            </span>
          </div>
        </div>

        {/* TME */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: TIME_INDICATOR_COLORS.tme }} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              TME Médio
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">
              {dashboardData.cards?.tme ?? '--'}
            </span>
          </div>
        </div>

        {/* TMC */}
        <div className="rounded-xl border border-zinc-200/90 bg-white p-3.5 shadow-2xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-xs" style={{ backgroundColor: TIME_INDICATOR_COLORS.tmc }} />
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              TMC Médio
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {dashboardData.cards?.tmc ?? '--'}
            </span>
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* 4 POWER BI VISUALS GRID (2x2 GRID)                                  */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ================================================================= */}
        {/* VISUAL 1: COLUNAS EMPILHADAS - TMV, TMA, TME e TMC POR FÁBRICA    */}
        {/* ================================================================= */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                  <BarChart3 className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight text-zinc-900 dark:text-white">
                    Comparativo por Fábrica: TMV, TMA, TME e TMC
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Colunas empilhadas dos tempos médios operacionais por fábrica
                  </p>
                </div>
              </div>

              {/* Visual Controls */}
              <div className="flex items-center gap-1.5">
                {/* Unit Slicer */}
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    onClick={() => setTimeUnit('hours')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      timeUnit === 'hours'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    Horas (h)
                  </button>
                  <button
                    onClick={() => setTimeUnit('minutes')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      timeUnit === 'minutes'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    Min (m)
                  </button>
                </div>

                {/* Show Table Toggle */}
                <button
                  onClick={() => setShowTableVisual1(!showTableVisual1)}
                  title="Exibir como tabela"
                  className={`p-1.5 rounded-lg border transition ${
                    showTableVisual1
                      ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-white'
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                </button>

                {/* Focus Mode */}
                <button
                  onClick={() => setFocusedVisual(1)}
                  title="Modo de foco"
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Custom Power BI Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3.5 py-3 text-xs font-semibold border-b border-zinc-100 dark:border-zinc-800/80 mb-3">
              <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <span className="h-2.5 w-2.5 rounded-xs" style={{ backgroundColor: TIME_INDICATOR_COLORS.tmv }} />
                TMV (Viagem)
              </span>
              <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <span className="h-2.5 w-2.5 rounded-xs" style={{ backgroundColor: TIME_INDICATOR_COLORS.tma }} />
                TMA (Fábrica)
              </span>
              <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <span className="h-2.5 w-2.5 rounded-xs" style={{ backgroundColor: TIME_INDICATOR_COLORS.tme }} />
                TME (Fila)
              </span>
              <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                <span className="h-2.5 w-2.5 rounded-xs" style={{ backgroundColor: TIME_INDICATOR_COLORS.tmc }} />
                TMC (Carreg.)
              </span>
            </div>

            {/* Visual Content: Chart or Table */}
            {showTableVisual1 ? (
              <div className="overflow-x-auto h-[320px] text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-500 dark:text-zinc-400">
                      <th className="py-2 px-2">Fábrica</th>
                      <th className="py-2 px-2 text-right">TMV</th>
                      <th className="py-2 px-2 text-right">TMA</th>
                      <th className="py-2 px-2 text-right">TME</th>
                      <th className="py-2 px-2 text-right">TMC</th>
                      <th className="py-2 px-2 text-right font-black text-blue-600 dark:text-blue-400">Total Operacional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
                    {visual1Data.map((row: any) => (
                      <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="py-2 px-2 font-sans font-semibold text-zinc-800 dark:text-zinc-200">{row.name}</td>
                        <td className="py-2 px-2 text-right">{row.tmvFormatted}</td>
                        <td className="py-2 px-2 text-right">{row.tmaFormatted}</td>
                        <td className="py-2 px-2 text-right">{row.tmeFormatted}</td>
                        <td className="py-2 px-2 text-right">{row.tmcFormatted}</td>
                        <td className="py-2 px-2 text-right font-bold text-blue-600 dark:text-blue-400">{row.totalFormatted}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : visual1Data.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-xs text-zinc-400">
                Nenhum dado de fábrica disponível no filtro selecionado.
              </div>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visual1Data} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888825" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#888888', fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: '#88888840' }}
                    />
                    <YAxis
                      tick={{ fill: '#888888', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#88888840' }}
                      unit={timeUnit === 'hours' ? 'h' : 'm'}
                    />
                    <Tooltip content={<CustomPowerBiTooltipVisual1 />} />
                    <Bar dataKey="tmv" name="TMV" stackId="time" fill={TIME_INDICATOR_COLORS.tmv} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="tma" name="TMA" stackId="time" fill={TIME_INDICATOR_COLORS.tma} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="tme" name="TME" stackId="time" fill={TIME_INDICATOR_COLORS.tme} radius={[0, 0, 0, 0]} />
                    <Bar dataKey="tmc" name="TMC" stackId="time" fill={TIME_INDICATOR_COLORS.tmc} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
            <span>Valores calculados em tempo real a partir das viagens registradas</span>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{visual1Data.length} Fábricas no comparativo</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* VISUAL 2: GRÁFICO DE PIZZA - PORCENTAGEM E QUANTIDADE POR FÁBRICA */}
        {/* ================================================================= */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-cyan-600/10 dark:bg-cyan-500/20 flex items-center justify-center shrink-0">
                  <PieChartIcon className="h-4.5 w-4.5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight text-zinc-900 dark:text-white">
                    Viagens por Fábrica (% e Quantidade)
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Distribuição percentual e contagem absoluta de viagens por unidade fabril
                  </p>
                </div>
              </div>

              {/* Visual Controls */}
              <div className="flex items-center gap-1.5">
                {/* Donut/Pie Toggle */}
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    onClick={() => setPieChartType('donut')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      pieChartType === 'donut'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    Rosca
                  </button>
                  <button
                    onClick={() => setPieChartType('pie')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      pieChartType === 'pie'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    Pizza
                  </button>
                </div>

                <button
                  onClick={() => setShowTableVisual2(!showTableVisual2)}
                  title="Exibir como tabela"
                  className={`p-1.5 rounded-lg border transition ${
                    showTableVisual2
                      ? 'bg-cyan-50 border-cyan-200 text-cyan-600 dark:bg-cyan-950 dark:border-cyan-800 dark:text-cyan-300'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-white'
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => setFocusedVisual(2)}
                  title="Modo de foco"
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Visual Content */}
            {showTableVisual2 ? (
              <div className="overflow-x-auto h-[350px] text-xs pt-3">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-500 dark:text-zinc-400">
                      <th className="py-2 px-2">Fábrica</th>
                      <th className="py-2 px-2 text-right">Qtd Viagens</th>
                      <th className="py-2 px-2 text-right">Porcentagem (%)</th>
                      <th className="py-2 px-2">Participação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {visual2Data.map((row: any) => (
                      <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="py-2 px-2 font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                          {row.name}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold">{row.count}</td>
                        <td className="py-2 px-2 text-right font-mono font-black text-cyan-600 dark:text-cyan-400">
                          {row.percentFormatted}
                        </td>
                        <td className="py-2 px-2 w-32">
                          <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${row.percent}%`, backgroundColor: row.color }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : visual2Data.length === 0 || totalTripsInPie === 0 ? (
              <div className="h-[350px] flex items-center justify-center text-xs text-zinc-400">
                Nenhuma viagem registrada por fábrica no período.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4 h-[350px] pt-2">
                {/* Chart Half */}
                <div className="h-[240px] sm:h-full w-full sm:w-1/2 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<CustomPowerBiTooltipVisual2 />} />
                      <Pie
                        data={visual2Data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={pieChartType === 'donut' ? 60 : 0}
                        outerRadius={95}
                        paddingAngle={pieChartType === 'donut' ? 3 : 1}
                        stroke="#ffffff"
                        strokeWidth={2}
                      >
                        {visual2Data.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Metric for Donut */}
                  {pieChartType === 'donut' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white">
                        {totalTripsInPie}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                        {totalTripsInPie === 1 ? 'Viagem' : 'Viagens'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Power BI Detailed List / Legend Side Panel */}
                <div className="w-full sm:w-1/2 overflow-y-auto max-h-[280px] space-y-2 pr-1">
                  {visual2Data.map((item: any) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-2.5 dark:border-zinc-800/80 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-200 truncate">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="truncate">{item.name}</span>
                        </span>
                        <span className="font-black font-mono text-cyan-600 dark:text-cyan-400 shrink-0 ml-2">
                          {item.percentFormatted}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                        <span>{item.count} {item.count === 1 ? 'viagem' : 'viagens'}</span>
                        <div className="w-24 h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
            <span>Rótulos de dados e percentual calculados sobre o total</span>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Total: {totalTripsInPie} viagens</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* VISUAL 3: COLUNAS EMPILHADAS - QUANTIDADE DE VIAGENS POR MOTORISTA*/}
        {/* ================================================================= */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-amber-600/10 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                  <User className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight text-zinc-900 dark:text-white">
                    Quantidade de Viagens por Motorista
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Colunas empilhadas comparando o volume de viagens de cada condutor
                  </p>
                </div>
              </div>

              {/* Visual Controls */}
              <div className="flex items-center gap-1.5">
                {/* Stacking Slicer */}
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    onClick={() => setDriverTripsStackBy('factory')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      driverTripsStackBy === 'factory'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    Por Fábrica
                  </button>
                  <button
                    onClick={() => setDriverTripsStackBy('status')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      driverTripsStackBy === 'status'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    Por Status
                  </button>
                </div>

                <button
                  onClick={() => setShowTableVisual3(!showTableVisual3)}
                  title="Exibir como tabela"
                  className={`p-1.5 rounded-lg border transition ${
                    showTableVisual3
                      ? 'bg-amber-50 border-amber-200 text-amber-600 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-300'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-white'
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => setFocusedVisual(3)}
                  title="Modo de foco"
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3 py-2.5 text-xs font-semibold border-b border-zinc-100 dark:border-zinc-800/80 mb-3 max-h-16 overflow-y-auto">
              {driverTripsStackBy === 'factory' ? (
                factoryNamesList.map((fac, idx) => (
                  <span key={fac} className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <span
                      className="h-2.5 w-2.5 rounded-xs"
                      style={{ backgroundColor: POWER_BI_COLORS[idx % POWER_BI_COLORS.length] }}
                    />
                    {fac}
                  </span>
                ))
              ) : (
                statusList.map(st => (
                  <span key={st} className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <span
                      className="h-2.5 w-2.5 rounded-xs"
                      style={{ backgroundColor: STATUS_COLORS[st] || '#888888' }}
                    />
                    {st}
                  </span>
                ))
              )}
            </div>

            {/* Visual Content */}
            {showTableVisual3 ? (
              <div className="overflow-x-auto h-[320px] text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-500 dark:text-zinc-400">
                      <th className="py-2 px-2">Motorista</th>
                      <th className="py-2 px-2 text-right font-black text-amber-600 dark:text-amber-400">Total Viagens</th>
                      {driverTripsStackBy === 'factory'
                        ? factoryNamesList.map(f => (
                            <th key={f} className="py-2 px-2 text-right">{f}</th>
                          ))
                        : statusList.map(s => (
                            <th key={s} className="py-2 px-2 text-right">{s}</th>
                          ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
                    {visual3Data.map((row: any) => (
                      <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="py-2 px-2 font-sans font-semibold text-zinc-800 dark:text-zinc-200">
                          {row.displayName}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-amber-600 dark:text-amber-400">
                          {row.totalTrips}
                        </td>
                        {driverTripsStackBy === 'factory'
                          ? factoryNamesList.map(f => (
                              <td key={f} className="py-2 px-2 text-right">{row[f] || 0}</td>
                            ))
                          : statusList.map(s => (
                              <td key={s} className="py-2 px-2 text-right">{row[s] || 0}</td>
                            ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : visual3Data.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-xs text-zinc-400">
                Nenhum motorista com viagens no período.
              </div>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visual3Data} margin={{ top: 20, right: 20, left: 0, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888825" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#888888', fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: '#88888840' }}
                    />
                    <YAxis
                      tick={{ fill: '#888888', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#88888840' }}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomPowerBiTooltipVisual3 />} />
                    {driverTripsStackBy === 'factory'
                      ? factoryNamesList.map((fac, idx) => (
                          <Bar
                            key={fac}
                            dataKey={fac}
                            name={fac}
                            stackId="trips"
                            fill={POWER_BI_COLORS[idx % POWER_BI_COLORS.length]}
                            radius={idx === factoryNamesList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                          />
                        ))
                      : statusList.map((st, idx) => (
                          <Bar
                            key={st}
                            dataKey={st}
                            name={st}
                            stackId="trips"
                            fill={STATUS_COLORS[st] || '#888888'}
                            radius={idx === statusList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                          />
                        ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
            <span>Classificado pelo volume total de viagens</span>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">{visual3Data.length} motoristas listados</span>
          </div>
        </div>

        {/* ================================================================= */}
        {/* VISUAL 4: COLUNAS EMPILHADAS - KM RODADO POR MOTORISTA           */}
        {/* ================================================================= */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 flex items-center justify-center shrink-0">
                  <Route className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight text-zinc-900 dark:text-white">
                    KM Rodado por Motorista
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Colunas empilhadas comparando a quilometragem percorrida por cada motorista
                  </p>
                </div>
              </div>

              {/* Visual Controls */}
              <div className="flex items-center gap-1.5">
                {/* Stacking Slicer */}
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    onClick={() => setDriverKmStackBy('factory')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      driverKmStackBy === 'factory'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    Por Fábrica
                  </button>
                  <button
                    onClick={() => setDriverKmStackBy('status')}
                    className={`px-2 py-0.5 rounded-md transition ${
                      driverKmStackBy === 'status'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    Por Status
                  </button>
                </div>

                <button
                  onClick={() => setShowTableVisual4(!showTableVisual4)}
                  title="Exibir como tabela"
                  className={`p-1.5 rounded-lg border transition ${
                    showTableVisual4
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-white'
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => setFocusedVisual(4)}
                  title="Modo de foco"
                  className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Custom Legend */}
            <div className="flex flex-wrap items-center justify-center gap-3 py-2.5 text-xs font-semibold border-b border-zinc-100 dark:border-zinc-800/80 mb-3 max-h-16 overflow-y-auto">
              {driverKmStackBy === 'factory' ? (
                factoryNamesList.map((fac, idx) => (
                  <span key={fac} className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <span
                      className="h-2.5 w-2.5 rounded-xs"
                      style={{ backgroundColor: POWER_BI_COLORS[idx % POWER_BI_COLORS.length] }}
                    />
                    {fac}
                  </span>
                ))
              ) : (
                statusList.map(st => (
                  <span key={st} className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                    <span
                      className="h-2.5 w-2.5 rounded-xs"
                      style={{ backgroundColor: STATUS_COLORS[st] || '#888888' }}
                    />
                    {st}
                  </span>
                ))
              )}
            </div>

            {/* Visual Content */}
            {showTableVisual4 ? (
              <div className="overflow-x-auto h-[320px] text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-500 dark:text-zinc-400">
                      <th className="py-2 px-2">Motorista</th>
                      <th className="py-2 px-2 text-right font-black text-emerald-600 dark:text-emerald-400">Total KM</th>
                      {driverKmStackBy === 'factory'
                        ? factoryNamesList.map(f => (
                            <th key={f} className="py-2 px-2 text-right">{f}</th>
                          ))
                        : statusList.map(s => (
                            <th key={s} className="py-2 px-2 text-right">{s}</th>
                          ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono">
                    {visual4Data.map((row: any) => (
                      <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="py-2 px-2 font-sans font-semibold text-zinc-800 dark:text-zinc-200">
                          {row.displayName}
                        </td>
                        <td className="py-2 px-2 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {row.totalKmFormatted}
                        </td>
                        {driverKmStackBy === 'factory'
                          ? factoryNamesList.map(f => (
                              <td key={f} className="py-2 px-2 text-right">{Number(row[f] || 0).toLocaleString('pt-BR')} km</td>
                            ))
                          : statusList.map(s => (
                              <td key={s} className="py-2 px-2 text-right">{Number(row[s] || 0).toLocaleString('pt-BR')} km</td>
                            ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : visual4Data.length === 0 ? (
              <div className="h-[320px] flex items-center justify-center text-xs text-zinc-400">
                Nenhuma quilometragem registrada no período.
              </div>
            ) : (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visual4Data} margin={{ top: 20, right: 20, left: 10, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888825" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: '#888888', fontSize: 11, fontWeight: 600 }}
                      tickLine={false}
                      axisLine={{ stroke: '#88888840' }}
                    />
                    <YAxis
                      tick={{ fill: '#888888', fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: '#88888840' }}
                      unit=" km"
                    />
                    <Tooltip content={<CustomPowerBiTooltipVisual4 />} />
                    {driverKmStackBy === 'factory'
                      ? factoryNamesList.map((fac, idx) => (
                          <Bar
                            key={fac}
                            dataKey={fac}
                            name={fac}
                            stackId="km"
                            fill={POWER_BI_COLORS[idx % POWER_BI_COLORS.length]}
                            radius={idx === factoryNamesList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                          />
                        ))
                      : statusList.map((st, idx) => (
                          <Bar
                            key={st}
                            dataKey={st}
                            name={st}
                            stackId="km"
                            fill={STATUS_COLORS[st] || '#888888'}
                            radius={idx === statusList.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                          />
                        ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
            <span>Soma dos KMs rodados acumulados por motorista</span>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              Total Geral: {dashboardData.cards?.totalKmFormatted ?? '0 km'}
            </span>
          </div>
        </div>

      </div>

      {/* =================================================================== */}
      {/* POWER BI FOCUS MODE MODAL (EXPANDED FULLSCREEN VISUAL)              */}
      {/* =================================================================== */}
      {focusedVisual !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 sm:p-6 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  Modo de Foco Power BI
                </span>
                <h3 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">
                  {focusedVisual === 1 && 'Comparativo de TMV, TMA, TME e TMC por Fábrica (Colunas Empilhadas)'}
                  {focusedVisual === 2 && 'Viagens por Fábrica (% e Quantidade)'}
                  {focusedVisual === 3 && 'Quantidade de Viagens por Motorista (Colunas Empilhadas)'}
                  {focusedVisual === 4 && 'KM Rodado por Motorista (Colunas Empilhadas)'}
                </h3>
              </div>
              <button
                onClick={() => setFocusedVisual(null)}
                className="p-2 rounded-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-6 flex-1">
              <div className="h-[460px] w-full">
                {focusedVisual === 1 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={visual1Data} margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888825" />
                      <XAxis dataKey="name" tick={{ fill: '#888888', fontSize: 12, fontWeight: 700 }} />
                      <YAxis tick={{ fill: '#888888', fontSize: 12 }} unit={timeUnit === 'hours' ? 'h' : 'm'} />
                      <Tooltip content={<CustomPowerBiTooltipVisual1 />} />
                      <Legend />
                      <Bar dataKey="tmv" name="TMV" stackId="time" fill={TIME_INDICATOR_COLORS.tmv} />
                      <Bar dataKey="tma" name="TMA" stackId="time" fill={TIME_INDICATOR_COLORS.tma} />
                      <Bar dataKey="tme" name="TME" stackId="time" fill={TIME_INDICATOR_COLORS.tme} />
                      <Bar dataKey="tmc" name="TMC" stackId="time" fill={TIME_INDICATOR_COLORS.tmc} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {focusedVisual === 2 && (
                  <div className="flex flex-col md:flex-row items-center h-full gap-6">
                    <div className="h-full w-full md:w-1/2 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Tooltip content={<CustomPowerBiTooltipVisual2 />} />
                          <Pie
                            data={visual2Data}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={pieChartType === 'donut' ? 80 : 0}
                            outerRadius={150}
                            paddingAngle={3}
                            stroke="#ffffff"
                            strokeWidth={2}
                          >
                            {visual2Data.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      {pieChartType === 'donut' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="text-3xl font-black text-zinc-900 dark:text-white">
                            {totalTripsInPie}
                          </span>
                          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                            Total de Viagens
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="w-full md:w-1/2 space-y-3 overflow-y-auto max-h-[440px] pr-2">
                      <h4 className="text-sm font-black uppercase tracking-wider text-zinc-500">Detalhamento por Fábrica</h4>
                      {visual2Data.map((item: any) => (
                        <div key={item.id} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white">
                              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                              {item.name}
                            </span>
                            <span className="text-base font-black font-mono text-cyan-600 dark:text-cyan-400">
                              {item.percentFormatted}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between text-xs text-zinc-500">
                            <span>{item.count} viagens registradas</span>
                            <span>Código: {item.code || '--'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {focusedVisual === 3 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={visual3Data} margin={{ top: 20, right: 30, left: 10, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888825" />
                      <XAxis dataKey="displayName" tick={{ fill: '#888888', fontSize: 12, fontWeight: 700 }} />
                      <YAxis tick={{ fill: '#888888', fontSize: 12 }} allowDecimals={false} />
                      <Tooltip content={<CustomPowerBiTooltipVisual3 />} />
                      <Legend />
                      {driverTripsStackBy === 'factory'
                        ? factoryNamesList.map((fac, idx) => (
                            <Bar
                              key={fac}
                              dataKey={fac}
                              name={fac}
                              stackId="trips"
                              fill={POWER_BI_COLORS[idx % POWER_BI_COLORS.length]}
                            />
                          ))
                        : statusList.map(st => (
                            <Bar
                              key={st}
                              dataKey={st}
                              name={st}
                              stackId="trips"
                              fill={STATUS_COLORS[st] || '#888888'}
                            />
                          ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}

                {focusedVisual === 4 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={visual4Data} margin={{ top: 20, right: 30, left: 15, bottom: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888825" />
                      <XAxis dataKey="displayName" tick={{ fill: '#888888', fontSize: 12, fontWeight: 700 }} />
                      <YAxis tick={{ fill: '#888888', fontSize: 12 }} unit=" km" />
                      <Tooltip content={<CustomPowerBiTooltipVisual4 />} />
                      <Legend />
                      {driverKmStackBy === 'factory'
                        ? factoryNamesList.map((fac, idx) => (
                            <Bar
                              key={fac}
                              dataKey={fac}
                              name={fac}
                              stackId="km"
                              fill={POWER_BI_COLORS[idx % POWER_BI_COLORS.length]}
                            />
                          ))
                        : statusList.map(st => (
                            <Bar
                              key={st}
                              dataKey={st}
                              name={st}
                              stackId="km"
                              fill={STATUS_COLORS[st] || '#888888'}
                            />
                          ))}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setFocusedVisual(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold text-xs hover:opacity-90 transition"
              >
                Fechar Modo de Foco
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
