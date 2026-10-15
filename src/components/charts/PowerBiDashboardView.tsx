import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Truck,
  Route,
  Clock,
  Users,
  FilterX,
  ChevronDown,
  RefreshCw,
  Maximize2,
  X,
  Building2,
  Table as TableIcon
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList
} from 'recharts';
import { api } from '../../services/api.ts';

// Power BI factory colors exactly matching the reference images
const FACTORY_COLORS: Record<string, string> = {
  'ITAPISSUMA': '#F5C400',   // Amarelo
  'ESTANCIA': '#2563EB',     // Azul
  'FONTE DA MATA': '#EF4444',// Vermelho
  'AQUIRAZ': '#F97316',      // Laranja
  'CAMAÇARI': '#06B6D4'      // Ciano
};

// Colors for vehicles
const VEHICLE_COLORS: Record<string, string> = {
  'RLT5J54': '#38BDF8', // Azul Celeste
  'RLU3F59': '#F97316', // Laranja
  'RLT5J44': '#FBBF24', // Amarelo
  'QFT5753': '#10B981'  // Verde
};

interface Driver {
  id: string;
  name: string;
  registration?: string;
}

interface Factory {
  id: string;
  name: string;
  state?: string;
  factory_code?: string;
}

interface Vehicle {
  id: string;
  plate: string;
  model?: string;
  brand?: string;
}

const EmptyChartState: React.FC<{ message: string; icon?: React.ReactNode }> = ({ message, icon }) => (
  <div className="w-full h-64 sm:h-72 flex flex-col items-center justify-center text-slate-300 gap-2.5 border border-dashed border-blue-800/50 rounded-lg bg-blue-950/40">
    {icon || <Route className="w-8 h-8 text-blue-400" />}
    <p className="text-xs font-bold text-slate-200">{message}</p>
  </div>
);

export const PowerBiDashboardView: React.FC = () => {
  // 4 Individual Tabs exactly requested by the user:
  // 1: Visão Geral | 2: Visão Motorista | 3: Visão Fábrica | 4: Visão Carreta
  const [activeTab, setActiveTab] = useState<'overview' | 'drivers' | 'factory' | 'vehicles'>('overview');

  // Slicers / Filters state
  const todayStr = new Date().toISOString().split('T')[0];
  const yearStartStr = `2026-01-01`;
  const [startDate, setStartDate] = useState<string>(yearStartStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  // Dropdown options
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Loading & refresh state
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Focus modal for any chart
  const [focusedChartData, setFocusedChartData] = useState<{ title: string; content: React.ReactNode } | null>(null);
  const [expandedChart, setExpandedChart] = useState<{
    title: string;
    type: string;
    subtitle?: string;
  } | null>(null);

  // Update default dates when switching tabs to match reference images
  const handleTabChange = (tab: 'overview' | 'drivers' | 'factory' | 'vehicles') => {
    setActiveTab(tab);
  };

  // =========================================================================
  // TAB 1: VISÃO GERAL (IMAGE 1)
  // =========================================================================
  const initialOverviewCards = {
    qtdeViagens: 0,
    kmRodado: 0,
    kmRodadoFormatted: '0',
    tmaMedio: '00:00:00',
    qtdeMotoristas: 0,
    qtdeVeiculos: 0
  };

  const initialMonthlyEvolution: any[] = [];

  const initialMonthlyKm: any[] = [];

  const initialFactoryTrips: any[] = [];

  const initialFactoryTma: any[] = [];

  // =========================================================================
  // TAB 2: VISÃO MOTORISTA (IMAGE 2)
  // =========================================================================
  const initialDriverCards = {
    qtdeViagens: 0,
    kmRodado: 0,
    kmRodadoFormatted: '0',
    tmeMedio: '00:00:00',
    tmvMedio: '00:00:00'
  };

  const initialViagensPorMotorista: any[] = [];

  const initialKmPorMotorista: any[] = [];

  const initialEvolucaoViagensMes: any[] = [];

  const initialMatrixData: any[] = [];

  const initialMatrixTotals: any = {
    AQUIRAZ: { puxadas: '0', km: '0', tmv: '00:00:00' },
    CAMACARI: { puxadas: '0', km: '0', tmv: '00:00:00' },
    ESTANCIA: { puxadas: '0', km: '0', tmv: '00:00:00' },
    FONTE_DA_MATA: { puxadas: '0', km: '0', tmv: '00:00:00' },
    ITAPISSUMA: { puxadas: '0', km: '0', tmv: '00:00:00' },
    total: { puxadas: '0', km: '0', tmv: '00:00:00' }
  };

  // =========================================================================
  // TAB 3: VISÃO FÁBRICA (IMAGE 3)
  // =========================================================================
  const initialFactoryCards = {
    qtdeViagens: 0,
    tmaMedio: '00:00:00',
    tmeMedio: '00:00:00',
    tmcMedio: '00:00:00',
    tmvMedio: '00:00:00'
  };

  const initialEvolucaoTmaPorMes: any[] = [];

  // =========================================================================
  // TAB 4: VISÃO CARRETA (IMAGE 4)
  // =========================================================================
  const initialVehicleCards = {
    kmRodado: 0,
    kmRodadoFormatted: '0',
    qtdeViagens: 0,
    tmvMedio: '00:00:00',
    tmaRevenda: '00:00:00'
  };

  const initialKmPorCarreta: any[] = [];

  const initialViagensPorCarreta: any[] = [];

  const initialEvolucaoKmPorMes: any[] = [];

  // State instances
  const [overviewCards, setOverviewCards] = useState(initialOverviewCards);
  const [monthlyEvolution, setMonthlyEvolution] = useState(initialMonthlyEvolution);
  const [monthlyKm, setMonthlyKm] = useState(initialMonthlyKm);
  const [factoryTrips, setFactoryTrips] = useState(initialFactoryTrips);
  const [factoryTma, setFactoryTma] = useState(initialFactoryTma);

  const [driverCards, setDriverCards] = useState(initialDriverCards);
  const [viagensPorMotorista, setViagensPorMotorista] = useState(initialViagensPorMotorista);
  const [kmPorMotorista, setKmPorMotorista] = useState(initialKmPorMotorista);
  const [evolucaoViagensMes, setEvolucaoViagensMes] = useState(initialEvolucaoViagensMes);
  const [matrixData, setMatrixData] = useState(initialMatrixData);
  const [matrixTotals, setMatrixTotals] = useState(initialMatrixTotals);

  const [factoryCards, setFactoryCards] = useState(initialFactoryCards);
  const [evolucaoTmaPorMes, setEvolucaoTmaPorMes] = useState(initialEvolucaoTmaPorMes);

  const [vehicleCards, setVehicleCards] = useState(initialVehicleCards);
  const [kmPorCarreta, setKmPorCarreta] = useState(initialKmPorCarreta);
  const [viagensPorCarreta, setViagensPorCarreta] = useState(initialViagensPorCarreta);
  const [evolucaoKmPorMes, setEvolucaoKmPorMes] = useState(initialEvolucaoKmPorMes);

  // Fetch dropdown options
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [driversData, factoriesData, vehiclesData] = await Promise.all([
          api.getDrivers().catch(() => []),
          api.getFactories().catch(() => []),
          api.getVehicles().catch(() => [])
        ]);

        if (Array.isArray(driversData)) setDrivers(driversData);
        if (Array.isArray(factoriesData)) setFactories(factoriesData);
        if (Array.isArray(vehiclesData)) setVehicles(vehiclesData);
      } catch (err) {
        console.error('Error fetching dropdown filters:', err);
      }
    };
    fetchDropdowns();
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (selectedDriverId) params.driverId = selectedDriverId;
      if (selectedFactoryId) params.factoryId = selectedFactoryId;
      if (selectedVehicleId) params.vehicleId = selectedVehicleId;

      const res = await api.getDashboardStats(params);

      if (res && res.charts && res.charts.powerBi) {
        const pbi = res.charts.powerBi;

        // Overview
        if (pbi.cards) setOverviewCards(pbi.cards);
        if (pbi.monthlyEvolution) setMonthlyEvolution(pbi.monthlyEvolution);
        if (pbi.monthlyKm) setMonthlyKm(pbi.monthlyKm);
        if (pbi.factoryTrips) setFactoryTrips(pbi.factoryTrips);
        if (pbi.factoryTma) setFactoryTma(pbi.factoryTma);

        // Drivers View (Image 2)
        if (pbi.driverView) {
          if (pbi.driverView.cards) setDriverCards(pbi.driverView.cards);
          if (pbi.driverView.viagensPorMotorista) setViagensPorMotorista(pbi.driverView.viagensPorMotorista);
          if (pbi.driverView.kmRodadoPorMotorista) setKmPorMotorista(pbi.driverView.kmRodadoPorMotorista);
          if (pbi.driverView.evolucaoViagensPorMes) setEvolucaoViagensMes(pbi.driverView.evolucaoViagensPorMes);
          if (pbi.driverView.matrixData) setMatrixData(pbi.driverView.matrixData);
          if (pbi.driverView.matrixTotals) setMatrixTotals(pbi.driverView.matrixTotals);
        }

        // Factory View (Image 3)
        if (pbi.factoryView) {
          if (pbi.factoryView.cards) setFactoryCards(pbi.factoryView.cards);
          if (pbi.factoryView.evolucaoTmaPorMes) setEvolucaoTmaPorMes(pbi.factoryView.evolucaoTmaPorMes);
        }

        // Vehicle View (Image 4)
        if (pbi.vehicleView) {
          if (pbi.vehicleView.cards) setVehicleCards(pbi.vehicleView.cards);
          if (pbi.vehicleView.kmPorCarreta) setKmPorCarreta(pbi.vehicleView.kmPorCarreta);
          if (pbi.vehicleView.viagensPorCarreta) setViagensPorCarreta(pbi.vehicleView.viagensPorCarreta);
          if (pbi.vehicleView.evolucaoKmPorMes) setEvolucaoKmPorMes(pbi.vehicleView.evolucaoKmPorMes);
        }
      }
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [startDate, endDate, selectedDriverId, selectedFactoryId, selectedVehicleId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Reset filters
  const handleResetFilters = () => {
    setStartDate(yearStartStr);
    setEndDate(todayStr);
    setSelectedDriverId('');
    setSelectedFactoryId('');
    setSelectedVehicleId('');
  };

  // Helper for non-decimal duration formatting
  const formatDurationFromHours = (numHours: number) => {
    if (!numHours || numHours <= 0) return '0min';
    const totalMins = Math.round(numHours * 60);
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    return h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}min`;
  };

  // Tooltip renderers (Strictly non-decimal for all hour/time information)
  const renderSimpleTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0B1530] text-white p-2.5 rounded shadow-xl border border-blue-800/80 text-xs font-sans">
          <p className="font-bold text-blue-200">{label}</p>
          {payload.map((entry: any, index: number) => {
            let valDisplay = entry.payload?.formatted;
            if (!valDisplay) {
              if (typeof entry.value === 'number') {
                const n = (entry.name || '').toLowerCase();
                if (n.includes('tma') || n.includes('tmv') || n.includes('tme') || n.includes('tmc') || n.includes('tempo') || n.includes('hora')) {
                  valDisplay = formatDurationFromHours(entry.value);
                } else {
                  valDisplay = entry.value.toLocaleString('pt-BR');
                }
              } else {
                valDisplay = entry.value;
              }
            }
            return (
              <p key={`tt-${index}`} className="mt-1">
                <span className="text-slate-300">{entry.name || 'Valor'}: </span>
                <span className="font-bold text-white">
                  {valDisplay}
                </span>
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const renderMultiTmaTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#0B1530] text-white p-3 rounded-lg shadow-2xl border border-blue-800/80 text-xs font-sans">
          <p className="font-bold text-blue-200 capitalize mb-1.5 border-b border-blue-900/60 pb-1">
            Mês: {label}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any) => {
              const facName = entry.dataKey === 'FONTE_DA_MATA' ? 'FONTE DA MATA' : (entry.dataKey === 'CAMACARI' ? 'CAMAÇARI' : entry.dataKey);
              const fmtVal = data[`${entry.dataKey}_fmt`] || formatDurationFromHours(entry.value);
              return (
                <div key={entry.dataKey} className="flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-slate-300">{facName}:</span>
                  </div>
                  <span className="font-bold text-white">{fmtVal}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const renderVehicleKmTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#0B1530] text-white p-3 rounded-lg shadow-2xl border border-blue-800/80 text-xs font-sans">
          <p className="font-bold text-blue-200 capitalize mb-1.5 border-b border-blue-900/60 pb-1">
            Mês: {label}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any) => (
              <div key={entry.dataKey} className="flex items-center justify-between gap-3 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-300">{entry.dataKey}:</span>
                </div>
                <span className="font-bold text-white ">
                  {typeof entry.value === 'number' ? `${entry.value.toLocaleString('pt-BR')} km` : entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* =========================================================================
          POWER BI TOP NAVIGATION TABS (EXATAMENTE AS 4 VISUALIZAÇÕES INDIVIDUAIS)
      ========================================================================== */}
      <div className="bg-[#0B1530] border border-blue-900/60 rounded-lg p-1.5 flex flex-wrap items-center justify-between gap-2 shadow-md">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleTabChange('overview')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                : 'text-slate-200 hover:text-white bg-blue-950/60 border border-blue-900/60 hover:bg-blue-900/60'
            }`}
          >
            <span>1. VISÃO GERAL</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('drivers')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'drivers'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                : 'text-slate-300 hover:text-white hover:bg-blue-950/60'
            }`}
          >
            <span>2. VISÃO MOTORISTA</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('factory')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'factory'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                : 'text-slate-300 hover:text-white hover:bg-blue-950/60'
            }`}
          >
            <span>3. VISÃO FÁBRICA</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('vehicles')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'vehicles'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                : 'text-slate-300 hover:text-white hover:bg-blue-950/60'
            }`}
          >
            <span>4. VISÃO CARRETA</span>
          </button>
        </div>

        <div className="flex items-center gap-2 pr-2 text-slate-300 text-xs">
          <button
            type="button"
            onClick={fetchDashboardData}
            title="Atualizar dados"
            className="p-1.5 rounded hover:bg-blue-950/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* =========================================================================
          POWER BI SLICERS BAR (DATA, MOTORISTAS, FÁBRICAS, CARRETAS)
      ========================================================================== */}
      <div className="bg-[#0B1530] border border-blue-900/60 rounded-lg p-3.5 shadow-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-10 gap-3 items-end">
        {/* DATA FILTER */}
        <div className="lg:col-span-2 space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
            DATA
          </label>
          <div className="flex items-center gap-1 bg-[#0D1B3E] border border-blue-900/60 rounded px-2 py-1.5 text-xs text-white">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none w-full cursor-pointer text-xs font-medium"
            />
            <span className="text-slate-300 font-bold px-1">=</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-white focus:outline-none w-full cursor-pointer text-xs font-medium text-right"
            />
          </div>
        </div>

        {/* MOTORISTAS FILTER */}
        <div className="lg:col-span-2 space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
            MOTORISTAS
          </label>
          <div className="relative">
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full bg-[#0D1B3E] border border-blue-900/60 rounded px-3 py-1.5 text-xs text-white appearance-none pr-8 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
            >
              <option value="" className="bg-[#0D1B3E] text-white">Todos</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id} className="bg-[#0D1B3E] text-white">
                  {d.name} {d.registration ? `(${d.registration})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-300 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* FÁBRICAS FILTER */}
        <div className="lg:col-span-2 space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
            FÁBRICAS
          </label>
          <div className="relative">
            <select
              value={selectedFactoryId}
              onChange={(e) => setSelectedFactoryId(e.target.value)}
              className="w-full bg-[#0D1B3E] border border-blue-900/60 rounded px-3 py-1.5 text-xs text-white appearance-none pr-8 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
            >
              <option value="" className="bg-[#0D1B3E] text-white">Todos</option>
              {factories.map((f) => (
                <option key={f.id} value={f.id} className="bg-[#0D1B3E] text-white">
                  {f.name} {f.state ? `(${f.state})` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-300 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* CARRETAS FILTER */}
        <div className="lg:col-span-2 space-y-1">
          <label className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
            CARRETAS
          </label>
          <div className="relative">
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full bg-[#0D1B3E] border border-blue-900/60 rounded px-3 py-1.5 text-xs text-white appearance-none pr-8 focus:outline-none focus:border-blue-500 cursor-pointer font-semibold"
            >
              <option value="" className="bg-[#0D1B3E] text-white">Todos</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id} className="bg-[#0D1B3E] text-white">
                  {v.plate} {v.brand ? `- ${v.brand}` : ''}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-300 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* REMOVER FILTROS BUTTON */}
        <div className="lg:col-span-2 flex items-center justify-end gap-2 pb-0.5">
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1.5 text-xs font-bold text-white hover:text-blue-200 transition-colors uppercase tracking-wider bg-transparent border border-blue-900/60 cursor-pointer py-1.5 px-3 rounded hover:bg-blue-950/70"
          >
            <FilterX className="w-3.5 h-3.5 text-blue-400" />
            <span>REMOVER FILTROS</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          1. VISÃO GERAL (EXACT REPLICATION OF IMAGE 1)
      ========================================================================== */}
      {activeTab === 'overview' && (
        <section className="space-y-4 animate-in fade-in duration-200">
          {/* 5 KPI CARDS ROW: White background with crisp blue text and info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  QTDE VIAGENS
                </p>
                <p className="card-value text-2xl sm:text-3xl font-black text-blue-950 mt-1 tracking-tight">
                  {overviewCards.qtdeViagens.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Truck className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>

            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  KM RODADO
                </p>
                <p className="card-value text-2xl sm:text-3xl font-black text-blue-950 mt-1 tracking-tight">
                  {overviewCards.kmRodadoFormatted}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Route className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>

            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  TMA MÉDIO
                </p>
                <p className="card-value text-xl sm:text-2xl font-black text-blue-950 mt-1 tracking-tight">
                  {overviewCards.tmaMedio}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Clock className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>

            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  QTDE MOTORISTAS
                </p>
                <p className="card-value text-2xl sm:text-3xl font-black text-blue-950 mt-1 tracking-tight">
                  {overviewCards.qtdeMotoristas}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Users className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>

            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  QTDE VEÍCULOS
                </p>
                <p className="card-value text-2xl sm:text-3xl font-black text-blue-950 mt-1 tracking-tight">
                  {overviewCards.qtdeVeiculos}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Truck className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* 2x2 CHARTS GRID (EVOLUÇÃO VIAGEM, KM MÊS, VIAGENS FÁBRICA, TMA POR FÁBRICA) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* CHART 1: EVOLUÇÃO DE VIAGEM POR MÊS */}
            <div className="bg-[#0B1530] border border-blue-900/40 rounded-lg p-4 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  EVOLUÇÃO DE VIAGEM POR MÊS
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedChart({ title: 'EVOLUÇÃO DE VIAGEM POR MÊS', type: 'area-monthly-trips', subtitle: 'Histórico mensal de viagens finalizadas' })}
                  title="Expandir para tela cheia"
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 hover:bg-blue-900 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Expandir</span>
                </button>
              </div>
              {monthlyEvolution.length === 0 ? (
                <EmptyChartState message="Nenhum dado registrado para o período" icon={<Route className="w-8 h-8 text-blue-400" />} />
              ) : (
                <div className="w-full h-80 sm:h-88 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyEvolution} margin={{ top: 25, right: 20, left: -10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="areaGradientBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748B" tick={{ fill: '#E2E8F0', fontSize: 11, fontWeight: '500' }} tickLine={false} />
                      <YAxis stroke="#64748B" domain={[0, 'auto']} tickLine={false} tick={{ fill: '#E2E8F0', fontSize: 11, fontWeight: '500' }} />
                      <Tooltip content={renderSimpleTooltip} />
                      <Area
                        type="monotone"
                        dataKey="trips"
                        stroke="#2563EB"
                        strokeWidth={3}
                        fill="url(#areaGradientBlue)"
                        dot={{ r: 4, fill: '#2563EB', stroke: '#93C5FD', strokeWidth: 2 }}
                      >
                        <LabelList dataKey="trips" position="top" fill="#FFFFFF" fontSize={11} fontWeight="bold" />
                      </Area>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* CHART 2: KM RODADO POR MÊS */}
            <div className="bg-[#0B1530] border border-blue-900/40 rounded-lg p-4 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  KM RODADO POR MÊS
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedChart({ title: 'KM RODADO POR MÊS', type: 'bar-monthly-km', subtitle: 'Quilometragem mensal das viagens concluídas' })}
                  title="Expandir para tela cheia"
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 hover:bg-blue-900 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Expandir</span>
                </button>
              </div>
              {monthlyKm.length === 0 ? (
                <EmptyChartState message="Nenhum dado registrado para o período" icon={<Route className="w-8 h-8 text-blue-400" />} />
              ) : (
                <div className="w-full h-80 sm:h-88 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyKm} margin={{ top: 25, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748B" tickLine={false} tick={{ fill: '#E2E8F0', fontSize: 11, fontWeight: '500' }} />
                      <YAxis stroke="#64748B" domain={[0, 'auto']} tickFormatter={(val) => `${val / 1000} mil`} tickLine={false} />
                      <Tooltip content={renderSimpleTooltip} />
                      <Bar dataKey="km" fill="#2563EB" radius={[3, 3, 0, 0]}>
                        <LabelList
                          dataKey="km"
                          position="top"
                          fill="#FFFFFF"
                          fontSize={11}
                          fontWeight="bold"
                          formatter={(val) => typeof val === 'number' ? (val < 0 ? `-${Math.abs(val)}` : `${val}`) : ''}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* CHART 3: VIAGENS POR FÁBRICA (Pizza: Expandable, clickable, responsive sizing) */}
            <div className="bg-[#0B1530] border border-blue-900/40 rounded-lg p-4 shadow-lg flex flex-col justify-between group hover:border-blue-600/60 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                    VIAGENS POR FÁBRICA
                  </h3>
                  <span className="hidden sm:inline-block text-[10px] font-semibold text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/40">
                    Clique para Tela Cheia
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedChart({ title: 'VIAGENS POR FÁBRICA', type: 'pie-factory-trips', subtitle: 'Distribuição e participação de viagens concluídas por planta' })}
                  title="Expandir gráfico em tela cheia"
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 hover:bg-blue-900 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tela Cheia</span>
                </button>
              </div>
              {factoryTrips.length === 0 ? (
                <EmptyChartState message="Nenhuma viagem por fábrica registrada" icon={<Building2 className="w-8 h-8 text-blue-400" />} />
              ) : (
                <div
                  onClick={() => setExpandedChart({ title: 'VIAGENS POR FÁBRICA', type: 'pie-factory-trips', subtitle: 'Distribuição e participação de viagens concluídas por planta' })}
                  className="w-full h-80 sm:h-88 flex flex-col sm:flex-row items-center justify-center cursor-pointer"
                  title="Clique para ver em tela cheia com tabela de dados completa"
                >
                  <div className="w-full sm:w-7/12 h-56 sm:h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={renderSimpleTooltip} />
                        <Pie
                          data={factoryTrips}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={90}
                          paddingAngle={2}
                          label={(entry: any) => (entry?.percentage || 0) >= 8 ? `${(entry.percentage || 0).toFixed(0)}%` : ''}
                          labelLine={false}
                        >
                          {factoryTrips.map((entry, index) => (
                            <Cell key={`ov-pie-${index}`} fill={entry.color} stroke="#0B1530" strokeWidth={2} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-full sm:w-5/12 flex flex-col justify-center space-y-2 pl-2">
                    {factoryTrips.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-blue-950/40 border border-blue-900/40 hover:border-blue-500/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 truncate mr-2">
                          <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: item.color }} />
                          <span className="font-bold text-white truncate text-xs">{item.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-bold text-white">{item.count}</span>
                          <span className="text-[11px] font-semibold text-blue-300 ml-1.5">
                            ({(item.percentage || 0).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CHART 4: TEMPO MÉDIO DE ATENDIMENTO POR FÁBRICA */}
            <div className="bg-[#0B1530] border border-blue-900/40 rounded-lg p-4 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  TEMPO MÉDIO DE ATENDIMENTO POR FÁBRICA
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedChart({ title: 'TEMPO MÉDIO DE ATENDIMENTO POR FÁBRICA', type: 'bar-factory-tma', subtitle: 'TMA por fábrica (Saída da fábrica - Chegada na fábrica)' })}
                  title="Expandir para tela cheia"
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 hover:bg-blue-900 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Expandir</span>
                </button>
              </div>
              {factoryTma.length === 0 ? (
                <EmptyChartState message="Nenhum tempo de atendimento registrado" icon={<Clock className="w-8 h-8 text-blue-400" />} />
              ) : (
                <div className="w-full h-80 sm:h-88 min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={factoryTma}
                      layout="vertical"
                      margin={{ top: 10, right: 65, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#172554" horizontal={false} />
                      <XAxis type="number" stroke="#64748B" tick={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#CBD5E1"
                        tick={{ fill: '#CBD5E1', fontSize: 11, fontWeight: 'bold' }}
                        width={100}
                        tickLine={false}
                      />
                      <Tooltip content={renderSimpleTooltip} />
                      <Bar dataKey="hours" fill="#2563EB" radius={[0, 3, 3, 0]} barSize={22}>
                        <LabelList dataKey="formatted" position="right" fill="#FFFFFF" fontSize={11} fontWeight="bold" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          2. VISÃO MOTORISTA (EXACT REPLICATION OF IMAGE 2)
      ========================================================================== */}
      {activeTab === 'drivers' && (
        <section className="space-y-4 animate-in fade-in duration-200">
          {/* 4 KPI CARDS: White background with crisp blue text and info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  QTDE VIAGENS
                </p>
                <p className="card-value text-2xl sm:text-3xl font-black text-blue-950 mt-1 tracking-tight">
                  {driverCards.qtdeViagens}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Truck className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>

            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  KM RODADO
                </p>
                <p className="card-value text-2xl sm:text-3xl font-black text-blue-950 mt-1 tracking-tight">
                  {driverCards.kmRodadoFormatted}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Route className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>

            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  TME MÉDIO
                </p>
                <p className="card-value text-xl sm:text-2xl font-black text-blue-950 mt-1 tracking-tight">
                  {driverCards.tmeMedio}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Clock className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>

            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  TMV MÉDIO
                </p>
                <p className="card-value text-xl sm:text-2xl font-black text-blue-950 mt-1 tracking-tight">
                  {driverCards.tmvMedio}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Clock className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* MIDDLE ROW (3 COLUNAS: VIAGENS POR MOTORISTA, KM RODADO POR MOTORISTA, EVOLUÇÃO DE VIAGENS) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* VISUAL 1: VIAGENS POR MOTORISTAS (BARRAS HORIZONTAIS) */}
            <div className="bg-[#0B1530] border border-blue-900/40 rounded-lg p-4 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  VIAGENS POR MOTORISTAS
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedChart({ title: 'VIAGENS POR MOTORISTAS', type: 'bar-driver-trips', subtitle: 'Classificação de viagens concluídas por motorista' })}
                  title="Expandir para tela cheia"
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 hover:bg-blue-900 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tela Cheia</span>
                </button>
              </div>

              {viagensPorMotorista.length === 0 ? (
                <EmptyChartState message="Nenhuma viagem por motorista registrada" icon={<Truck className="w-8 h-8 text-blue-400" />} />
              ) : (
                <div
                  onClick={() => setExpandedChart({ title: 'VIAGENS POR MOTORISTAS', type: 'bar-driver-trips', subtitle: 'Classificação de viagens concluídas por motorista' })}
                  className="w-full h-80 sm:h-92 min-h-[320px] cursor-pointer"
                  title="Clique para ver em tela cheia"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={viagensPorMotorista}
                      layout="vertical"
                      margin={{ top: 10, right: 35, left: 15, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#172554" horizontal={false} />
                      <XAxis type="number" stroke="#64748B" tick={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="shortName"
                        stroke="#CBD5E1"
                        tick={{ fill: '#CBD5E1', fontSize: 11, fontWeight: 'bold' }}
                        width={85}
                        tickLine={false}
                      />
                      <Tooltip content={renderSimpleTooltip} />
                      <Bar dataKey="trips" fill="#2563EB" radius={[0, 3, 3, 0]} barSize={24}>
                        <LabelList dataKey="trips" position="right" fill="#FFFFFF" fontSize={11} fontWeight="bold" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* VISUAL 2: KM RODADO POR MOTORISTAS (COLUNAS VERTICAIS COM NEGATIVO) */}
            <div className="bg-[#0B1530] border border-blue-900/40 rounded-lg p-4 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  KM RODADO POR MOTORISTAS
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedChart({ title: 'KM RODADO POR MOTORISTAS', type: 'bar-driver-km', subtitle: 'Quilometragem acumulada realizada por motorista' })}
                  title="Expandir para tela cheia"
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 hover:bg-blue-900 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tela Cheia</span>
                </button>
              </div>

              {kmPorMotorista.length === 0 ? (
                <EmptyChartState message="Nenhum KM por motorista registrado" icon={<Route className="w-8 h-8 text-blue-400" />} />
              ) : (
                <div
                  onClick={() => setExpandedChart({ title: 'KM RODADO POR MOTORISTAS', type: 'bar-driver-km', subtitle: 'Quilometragem acumulada realizada por motorista' })}
                  className="w-full h-80 sm:h-92 min-h-[320px] cursor-pointer"
                  title="Clique para ver em tela cheia"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={kmPorMotorista}
                      margin={{ top: 25, right: 15, left: 5, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#64748B"
                        tick={{ fill: '#CBD5E1', fontSize: 9.5, fontWeight: 'bold' }}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#64748B"
                        domain={[0, 'auto']}
                        tickFormatter={(v) => v === 0 ? '0' : `${v / 1000}k`}
                        tickLine={false}
                        tick={{ fill: '#CBD5E1', fontSize: 10, fontWeight: '500' }}
                      />
                      <Tooltip content={renderSimpleTooltip} />
                      <Bar dataKey="km" fill="#2563EB" barSize={28}>
                        <LabelList
                          dataKey="kmFormatted"
                          position="top"
                          fill="#FFFFFF"
                          fontSize={10}
                          fontWeight="bold"
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* VISUAL 3: EVOLUÇÃO DE VIAGENS POR MÊS */}
            <div className="bg-[#0B1530] border border-blue-900/40 rounded-lg p-4 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  EVOLUÇÃO DE VIAGENS POR MÊS
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedChart({ title: 'EVOLUÇÃO DE VIAGENS POR MÊS', type: 'line-driver-evolution', subtitle: 'Histórico mensal de viagens dos motoristas' })}
                  title="Expandir para tela cheia"
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 hover:bg-blue-900 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tela Cheia</span>
                </button>
              </div>

              {evolucaoViagensMes.length === 0 ? (
                <EmptyChartState message="Nenhuma evolução mensal registrada" icon={<Clock className="w-8 h-8 text-blue-400" />} />
              ) : (
                <div
                  onClick={() => setExpandedChart({ title: 'EVOLUÇÃO DE VIAGENS POR MÊS', type: 'line-driver-evolution', subtitle: 'Histórico mensal de viagens dos motoristas' })}
                  className="w-full h-80 sm:h-92 min-h-[320px] cursor-pointer"
                  title="Clique para ver em tela cheia"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={evolucaoViagensMes}
                      margin={{ top: 25, right: 25, left: -10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                      <XAxis
                        dataKey="month"
                        stroke="#64748B"
                        tick={{ fill: '#CBD5E1', fontSize: 11, fontWeight: 'bold' }}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#64748B"
                        domain={[0, 'auto']}
                        tickLine={false}
                        tick={{ fill: '#CBD5E1', fontSize: 10, fontWeight: '500' }}
                      />
                      <Tooltip content={renderSimpleTooltip} />
                      <Line
                        type="monotone"
                        dataKey="trips"
                        stroke="#2563EB"
                        strokeWidth={3}
                        dot={{ r: 5, fill: '#2563EB', stroke: '#93C5FD', strokeWidth: 2 }}
                      >
                        <LabelList dataKey="trips" position="top" fill="#FFFFFF" fontSize={11} fontWeight="bold" />
                      </Line>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM FULL-WIDTH: MATRIZ POWER BI (FÁBRICAS X MOTORISTAS COM PUXADAS, KM E TMV) */}
          <div className="bg-[#0B1530] border border-blue-900/40 rounded-lg p-4 shadow-lg overflow-x-auto">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-blue-900/60">
              <span className="text-xs font-bold uppercase tracking-wider text-white">
                MATRIZ ANALÍTICA: FÁBRICAS X MOTORISTAS (PUXADAS, KM E TMV)
              </span>
              <button
                type="button"
                onClick={() => setExpandedChart({ title: 'MATRIZ ANALÍTICA: FÁBRICAS X MOTORISTAS', type: 'matrix-driver-factory', subtitle: 'Detalhamento completo de Puxadas, KM Rodado e TMV por fábrica e motorista' })}
                title="Expandir matriz para tela cheia"
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 hover:bg-blue-900 transition cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Expandir Matriz</span>
              </button>
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                {/* Main grouped headers */}
                <tr className="border-b border-blue-900/60 bg-[#071024] text-[10.5px] uppercase tracking-wider text-slate-300">
                  <th className="py-2 px-3 font-bold text-blue-200">FÁBRICA</th>
                  <th colSpan={3} className="py-2 px-2 text-center font-bold border-l border-blue-900/60 text-slate-200">AQUIRAZ</th>
                  <th colSpan={3} className="py-2 px-2 text-center font-bold border-l border-blue-900/60 text-slate-200">CAMAÇARI</th>
                  <th colSpan={3} className="py-2 px-2 text-center font-bold border-l border-blue-900/60 text-slate-200">ESTANCIA</th>
                  <th colSpan={3} className="py-2 px-2 text-center font-bold border-l border-blue-900/60 text-slate-200">FONTE DA MATA</th>
                  <th colSpan={3} className="py-2 px-2 text-center font-bold border-l border-blue-900/60 text-slate-200">ITAPISSUMA</th>
                  <th colSpan={3} className="py-2 px-2 text-center font-bold border-l border-blue-900/60 text-amber-400 bg-blue-950/40">Total</th>
                </tr>
                {/* Subcolumn headers */}
                <tr className="border-b border-blue-900/80 bg-[#071024]/90 text-[10px] uppercase font-bold text-slate-300">
                  <th className="py-2 px-3 text-slate-300">MOTORISTA</th>
                  {/* AQUIRAZ */}
                  <th className="py-1 px-1.5 text-center border-l border-blue-900/40">PUXADAS</th>
                  <th className="py-1 px-1.5 text-center">KM RODADO</th>
                  <th className="py-1 px-1.5 text-center">TMV</th>
                  {/* CAMAÇARI */}
                  <th className="py-1 px-1.5 text-center border-l border-blue-900/40">PUXADAS</th>
                  <th className="py-1 px-1.5 text-center">KM RODADO</th>
                  <th className="py-1 px-1.5 text-center">TMV</th>
                  {/* ESTANCIA */}
                  <th className="py-1 px-1.5 text-center border-l border-blue-900/40">PUXADAS</th>
                  <th className="py-1 px-1.5 text-center">KM RODADO</th>
                  <th className="py-1 px-1.5 text-center">TMV</th>
                  {/* FONTE DA MATA */}
                  <th className="py-1 px-1.5 text-center border-l border-blue-900/40">PUXADAS</th>
                  <th className="py-1 px-1.5 text-center">KM RODADO</th>
                  <th className="py-1 px-1.5 text-center">TMV</th>
                  {/* ITAPISSUMA */}
                  <th className="py-1 px-1.5 text-center border-l border-blue-900/40">PUXADAS</th>
                  <th className="py-1 px-1.5 text-center">KM RODADO</th>
                  <th className="py-1 px-1.5 text-center">TMV</th>
                  {/* TOTAL */}
                  <th className="py-1 px-1.5 text-center border-l border-blue-900/40 text-amber-400 bg-blue-950/40">PUXADAS</th>
                  <th className="py-1 px-1.5 text-center text-amber-400 bg-blue-950/40">KM RODADO</th>
                  <th className="py-1 px-1.5 text-center text-amber-400 bg-blue-950/40">TMV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-950  text-[11px]">
                {matrixData.length === 0 ? (
                  <tr>
                    <td colSpan={19} className="py-8 text-center text-slate-200 font-medium text-xs">
                      Nenhum dado de viagem por motorista registrado para o período
                    </td>
                  </tr>
                ) : matrixData.map((row) => (
                  <tr key={row.driver} className="hover:bg-blue-950/40 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white font-sans">{row.driver}</td>
                    {/* AQUIRAZ */}
                    <td className="py-2 px-1.5 text-center border-l border-blue-950 text-slate-300">{row.AQUIRAZ.puxadas}</td>
                    <td className="py-2 px-1.5 text-center text-slate-300">{row.AQUIRAZ.km}</td>
                    <td className="py-2 px-1.5 text-center text-blue-200">{row.AQUIRAZ.tmv}</td>
                    {/* CAMACARI */}
                    <td className="py-2 px-1.5 text-center border-l border-blue-950 text-slate-300">{row.CAMACARI.puxadas}</td>
                    <td className="py-2 px-1.5 text-center text-slate-300">{row.CAMACARI.km}</td>
                    <td className="py-2 px-1.5 text-center text-blue-200">{row.CAMACARI.tmv}</td>
                    {/* ESTANCIA */}
                    <td className="py-2 px-1.5 text-center border-l border-blue-950 text-slate-300">{row.ESTANCIA.puxadas}</td>
                    <td className="py-2 px-1.5 text-center text-slate-300">{row.ESTANCIA.km}</td>
                    <td className="py-2 px-1.5 text-center text-blue-200">{row.ESTANCIA.tmv}</td>
                    {/* FONTE DA MATA */}
                    <td className="py-2 px-1.5 text-center border-l border-blue-950 text-slate-300">{row.FONTE_DA_MATA.puxadas}</td>
                    <td className="py-2 px-1.5 text-center text-slate-300">{row.FONTE_DA_MATA.km}</td>
                    <td className="py-2 px-1.5 text-center text-blue-200">{row.FONTE_DA_MATA.tmv}</td>
                    {/* ITAPISSUMA */}
                    <td className="py-2 px-1.5 text-center border-l border-blue-950 text-slate-300">{row.ITAPISSUMA.puxadas}</td>
                    <td className="py-2 px-1.5 text-center text-slate-300">{row.ITAPISSUMA.km}</td>
                    <td className="py-2 px-1.5 text-center text-blue-200">{row.ITAPISSUMA.tmv}</td>
                    {/* TOTAL */}
                    <td className="py-2 px-1.5 text-center border-l border-blue-950 font-bold text-white bg-blue-950/30">{row.total.puxadas}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-white bg-blue-950/30">{row.total.km}</td>
                    <td className="py-2 px-1.5 text-center font-bold text-blue-200 bg-blue-950/30">{row.total.tmv}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-blue-800 bg-[#071024]  text-[11px] font-bold text-white">
                  <td className="py-2.5 px-3 font-sans text-blue-200">Total</td>
                  {/* AQUIRAZ */}
                  <td className="py-2 px-1.5 text-center border-l border-blue-900/60">{matrixTotals.AQUIRAZ.puxadas}</td>
                  <td className="py-2 px-1.5 text-center">{matrixTotals.AQUIRAZ.km}</td>
                  <td className="py-2 px-1.5 text-center text-blue-200">{matrixTotals.AQUIRAZ.tmv}</td>
                  {/* CAMACARI */}
                  <td className="py-2 px-1.5 text-center border-l border-blue-900/60">{matrixTotals.CAMACARI.puxadas}</td>
                  <td className="py-2 px-1.5 text-center">{matrixTotals.CAMACARI.km}</td>
                  <td className="py-2 px-1.5 text-center text-blue-200">{matrixTotals.CAMACARI.tmv}</td>
                  {/* ESTANCIA */}
                  <td className="py-2 px-1.5 text-center border-l border-blue-900/60">{matrixTotals.ESTANCIA.puxadas}</td>
                  <td className="py-2 px-1.5 text-center">{matrixTotals.ESTANCIA.km}</td>
                  <td className="py-2 px-1.5 text-center text-blue-200">{matrixTotals.ESTANCIA.tmv}</td>
                  {/* FONTE DA MATA */}
                  <td className="py-2 px-1.5 text-center border-l border-blue-900/60">{matrixTotals.FONTE_DA_MATA.puxadas}</td>
                  <td className="py-2 px-1.5 text-center">{matrixTotals.FONTE_DA_MATA.km}</td>
                  <td className="py-2 px-1.5 text-center text-blue-200">{matrixTotals.FONTE_DA_MATA.tmv}</td>
                  {/* ITAPISSUMA */}
                  <td className="py-2 px-1.5 text-center border-l border-blue-900/60">{matrixTotals.ITAPISSUMA.puxadas}</td>
                  <td className="py-2 px-1.5 text-center">{matrixTotals.ITAPISSUMA.km}</td>
                  <td className="py-2 px-1.5 text-center text-blue-200">{matrixTotals.ITAPISSUMA.tmv}</td>
                  {/* TOTAL GERAL */}
                  <td className="py-2 px-1.5 text-center border-l border-blue-900/60 text-amber-400 bg-blue-950/60">{matrixTotals.total.puxadas}</td>
                  <td className="py-2 px-1.5 text-center text-amber-400 bg-blue-950/60">{matrixTotals.total.km}</td>
                  <td className="py-2 px-1.5 text-center text-amber-300 bg-blue-950/60">{matrixTotals.total.tmv}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* =========================================================================
          3. VISÃO FÁBRICA (EXACT REPLICATION OF IMAGE 3)
      ========================================================================== */}
      {activeTab === 'factory' && (
        <section className="space-y-4 animate-in fade-in duration-200">
          {/* 5 KPI CARDS: QTDE VIAGENS, TMA MÉDIO, TME MÉDIO, TMC MÉDIO, TMV MÉDIO */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  QTDE VIAGENS
                </p>
                <p className="card-value text-2xl sm:text-3xl font-black text-blue-950 mt-1 tracking-tight">
                  {factoryCards.qtdeViagens.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Truck className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>

            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  TMA MÉDIO
                </p>
                <p className="card-value text-xl sm:text-2xl font-black text-blue-950 mt-1 tracking-tight">
                  {factoryCards.tmaMedio}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Clock className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>

            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  TME MÉDIO
                </p>
                <p className="card-value text-xl sm:text-2xl font-black text-blue-950 mt-1 tracking-tight">
                  {factoryCards.tmeMedio}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Clock className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>

            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  TMC MÉDIO
                </p>
                <p className="card-value text-xl sm:text-2xl font-black text-blue-950 mt-1 tracking-tight">
                  {factoryCards.tmcMedio || '00:00:00'}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Clock className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>

            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  TMV MÉDIO
                </p>
                <p className="card-value text-xl sm:text-2xl font-black text-blue-950 mt-1 tracking-tight">
                  {factoryCards.tmvMedio}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Clock className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* MIDDLE ROW (3 COLUNAS: TMA FABRIL, VIAGENS POR FÁBRICA, PARTICIPAÇÃO FABRIL) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* VISUAL 1: TMA FABRIL */}
            <div className="bg-[#0B1530] border border-blue-900/40 rounded-lg p-4 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  TMA FABRIL
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedChart({ title: 'TMA FABRIL', type: 'bar-factory-tma', subtitle: 'Tempo médio de atendimento na fábrica (Saída - Chegada)' })}
                  title="Expandir para tela cheia"
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 hover:bg-blue-900 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tela Cheia</span>
                </button>
              </div>

              <div
                onClick={() => setExpandedChart({ title: 'TMA FABRIL', type: 'bar-factory-tma', subtitle: 'Tempo médio de atendimento na fábrica (Saída - Chegada)' })}
                className="w-full h-80 sm:h-92 min-h-[320px] cursor-pointer"
                title="Clique para ver em tela cheia"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={factoryTma}
                    layout="vertical"
                    margin={{ top: 10, right: 65, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#172554" horizontal={false} />
                    <XAxis type="number" stroke="#64748B" tick={false} axisLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#CBD5E1"
                      tick={{ fill: '#CBD5E1', fontSize: 11, fontWeight: 'bold' }}
                      width={100}
                      tickLine={false}
                    />
                    <Tooltip content={renderSimpleTooltip} />
                    <Bar dataKey="hours" fill="#2563EB" radius={[0, 3, 3, 0]} barSize={22}>
                      <LabelList dataKey="formatted" position="right" fill="#FFFFFF" fontSize={11} fontWeight="bold" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* VISUAL 2: VIAGENS POR FÁBRICA */}
            <div className="bg-[#0B1530] border border-blue-900/40 rounded-lg p-4 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  VIAGENS POR FÁBRICA
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedChart({ title: 'VIAGENS POR FÁBRICA', type: 'bar-factory-trips-vertical', subtitle: 'Quantidade de viagens finalizadas por unidade fabril' })}
                  title="Expandir para tela cheia"
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 hover:bg-blue-900 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tela Cheia</span>
                </button>
              </div>

              {factoryTrips.length === 0 ? (
                <EmptyChartState message="Nenhuma viagem por fábrica registrada" icon={<Building2 className="w-8 h-8 text-blue-400" />} />
              ) : (
                <div
                  onClick={() => setExpandedChart({ title: 'VIAGENS POR FÁBRICA', type: 'bar-factory-trips-vertical', subtitle: 'Quantidade de viagens finalizadas por unidade fabril' })}
                  className="w-full h-80 sm:h-92 min-h-[320px] cursor-pointer"
                  title="Clique para ver em tela cheia"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={factoryTrips}
                      margin={{ top: 25, right: 15, left: -10, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                      <XAxis
                        dataKey="name"
                        stroke="#64748B"
                        tick={{ fill: '#CBD5E1', fontSize: 10, fontWeight: 'bold' }}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#64748B"
                        domain={[0, 'auto']}
                        tickLine={false}
                        tick={{ fill: '#CBD5E1', fontSize: 10, fontWeight: '500' }}
                      />
                      <Tooltip content={renderSimpleTooltip} />
                      <Bar dataKey="count" fill="#2563EB" radius={[3, 3, 0, 0]} barSize={28}>
                        <LabelList dataKey="count" position="top" fill="#FFFFFF" fontSize={11} fontWeight="bold" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* VISUAL 3: PARTICIPAÇÃO FABRIL (Pizza: Expandable, clickable, responsive sizing) */}
            <div className="bg-[#0B1530] border border-blue-900/40 rounded-lg p-4 shadow-lg flex flex-col justify-between group hover:border-blue-600/60 transition-all">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                    PARTICIPAÇÃO FABRIL
                  </h3>
                  <span className="hidden sm:inline-block text-[10px] font-semibold text-blue-300 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/40">
                    Clique para Tela Cheia
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedChart({ title: 'PARTICIPAÇÃO FABRIL', type: 'pie-factory-trips', subtitle: 'Participação relativa de cada fábrica nas viagens finalizadas' })}
                  title="Expandir gráfico em tela cheia"
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 hover:bg-blue-900 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tela Cheia</span>
                </button>
              </div>

              <div
                onClick={() => setExpandedChart({ title: 'PARTICIPAÇÃO FABRIL', type: 'pie-factory-trips', subtitle: 'Participação relativa de cada fábrica nas viagens finalizadas' })}
                className="w-full h-80 sm:h-88 flex flex-col sm:flex-row items-center justify-center cursor-pointer"
                title="Clique para abrir em tela cheia"
              >
                <div className="w-full sm:w-7/12 h-56 sm:h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={renderSimpleTooltip} />
                      <Pie
                        data={factoryTrips}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={2}
                        label={(entry: any) => (entry?.percentage || 0) >= 8 ? `${(entry.percentage || 0).toFixed(0)}%` : ''}
                        labelLine={false}
                      >
                        {factoryTrips.map((entry, index) => (
                          <Cell key={`fab-cell-${index}`} fill={entry.color} stroke="#0B1530" strokeWidth={2} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="w-full sm:w-5/12 flex flex-col justify-center space-y-2 pl-2">
                  {factoryTrips.map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-blue-950/40 border border-blue-900/40 hover:border-blue-500/50 transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate mr-2">
                        <span className="w-3 h-3 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: item.color }} />
                        <span className="font-bold text-white truncate text-xs">{item.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-white">{item.count}</span>
                        <span className="text-[11px] font-semibold text-blue-300 ml-1.5">
                          ({(item.percentage || 0).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM FULL-WIDTH: EVOLUÇÃO TMA POR MÊS */}
          <div className="bg-[#0B1530] border border-blue-900/40 rounded-lg p-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  EVOLUÇÃO TMA POR MÊS
                </h3>
                <p className="text-[10px] text-slate-300">
                  Tempo médio de atendimento mensal por fábrica
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {Object.entries(FACTORY_COLORS).map(([fac, col]) => (
                    <div key={fac} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col }} />
                      <span className="text-slate-300 font-semibold text-[11px]">{fac}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedChart({ title: 'EVOLUÇÃO TMA POR MÊS', type: 'line-factory-tma-evolution', subtitle: 'Histórico mensal de tempo médio de atendimento (TMA) por unidade fabril' })}
                  title="Expandir para tela cheia"
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 hover:bg-blue-900 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tela Cheia</span>
                </button>
              </div>
            </div>

            {evolucaoTmaPorMes.length === 0 ? (
              <EmptyChartState message="Nenhuma evolução mensal de TMA registrada" icon={<Clock className="w-8 h-8 text-blue-400" />} />
            ) : (
              <div className="w-full h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucaoTmaPorMes} margin={{ top: 25, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748B" tick={{ fill: '#CBD5E1', fontSize: 11, fontWeight: 'bold' }} tickLine={false} />
                    <YAxis stroke="#64748B" domain={[0, 'auto']} tickFormatter={(val) => `${val}h`} tickLine={false} tick={{ fill: '#CBD5E1', fontSize: 10, fontWeight: '500' }} />
                    <Tooltip content={renderMultiTmaTooltip} />
                    <Line type="monotone" dataKey="ITAPISSUMA" stroke={FACTORY_COLORS['ITAPISSUMA']} strokeWidth={3} dot={{ r: 4, fill: FACTORY_COLORS['ITAPISSUMA'] }} name="ITAPISSUMA">
                      <LabelList dataKey="ITAPISSUMA_fmt" position="top" fill="#FFFFFF" fontSize={10} fontWeight="bold" />
                    </Line>
                    <Line type="monotone" dataKey="FONTE_DA_MATA" stroke={FACTORY_COLORS['FONTE DA MATA']} strokeWidth={2.5} dot={{ r: 4, fill: FACTORY_COLORS['FONTE DA MATA'] }} name="FONTE DA MATA">
                      <LabelList dataKey="FONTE_DA_MATA_fmt" position="bottom" fill="#FCA5A5" fontSize={9} fontWeight="bold" />
                    </Line>
                    <Line type="monotone" dataKey="ESTANCIA" stroke={FACTORY_COLORS['ESTANCIA']} strokeWidth={2.5} dot={{ r: 3, fill: FACTORY_COLORS['ESTANCIA'] }} name="ESTANCIA" />
                    <Line type="monotone" dataKey="AQUIRAZ" stroke={FACTORY_COLORS['AQUIRAZ']} strokeWidth={2.5} dot={{ r: 3, fill: FACTORY_COLORS['AQUIRAZ'] }} name="AQUIRAZ" />
                    <Line type="monotone" dataKey="CAMACARI" stroke={FACTORY_COLORS['CAMAÇARI']} strokeWidth={2} dot={{ r: 3, fill: FACTORY_COLORS['CAMAÇARI'] }} name="CAMAÇARI" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>
      )}

      {/* =========================================================================
          4. VISÃO CARRETA (EXACT REPLICATION OF IMAGE 4)
      ========================================================================== */}
      {activeTab === 'vehicles' && (
        <section className="space-y-4 animate-in fade-in duration-200">
          {/* 4 KPI CARDS: KM RODADO (122.168), QTDE VIAGENS (378), TMV MÉDIO (30:21:03), TMA REVENDA (02:37:27) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  KM RODADO
                </p>
                <p className="card-value text-2xl sm:text-3xl font-black text-blue-950 mt-1 tracking-tight">
                  {vehicleCards.kmRodadoFormatted}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Route className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>

            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  QTDE VIAGENS
                </p>
                <p className="card-value text-2xl sm:text-3xl font-black text-blue-950 mt-1 tracking-tight">
                  {vehicleCards.qtdeViagens.toLocaleString('pt-BR')}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Truck className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>

            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  TMV MÉDIO
                </p>
                <p className="card-value text-xl sm:text-2xl font-black text-blue-950 mt-1 tracking-tight">
                  {vehicleCards.tmvMedio}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Clock className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>

            <div className="pbi-kpi-card bg-white rounded-xl p-3.5 sm:p-4 shadow-md flex items-center justify-between border-2 border-blue-200/90 transition-all hover:shadow-lg">
              <div>
                <p className="card-label text-[11px] font-bold uppercase text-blue-700 tracking-wider">
                  TMA REVENDA
                </p>
                <p className="card-value text-xl sm:text-2xl font-black text-blue-950 mt-1 tracking-tight">
                  {vehicleCards.tmaRevenda}
                </p>
              </div>
              <div className="text-blue-600 p-2.5 rounded-xl bg-blue-50/90 border border-blue-100 shrink-0">
                <Clock className="w-9 h-9 stroke-[2.2]" />
              </div>
            </div>
          </div>

          {/* MIDDLE ROW (2 COLUNAS: KM RODADO POR CARRETA E VIAGENS POR CARRETA) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* VISUAL 1: KM RODADO POR CARRETA */}
            <div className="bg-[#0B1530] border border-blue-900/40 rounded-lg p-4 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  KM RODADO POR CARRETA
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedChart({ title: 'KM RODADO POR CARRETA', type: 'bar-vehicle-km', subtitle: 'Quilometragem percorrida por placa de carreta' })}
                  title="Expandir para tela cheia"
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 hover:bg-blue-900 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tela Cheia</span>
                </button>
              </div>

              {kmPorCarreta.length === 0 ? (
                <EmptyChartState message="Nenhum KM por carreta registrado" icon={<Route className="w-8 h-8 text-blue-400" />} />
              ) : (
                <div
                  onClick={() => setExpandedChart({ title: 'KM RODADO POR CARRETA', type: 'bar-vehicle-km', subtitle: 'Quilometragem percorrida por placa de carreta' })}
                  className="w-full h-80 sm:h-92 min-h-[320px] cursor-pointer"
                  title="Clique para ver em tela cheia"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={kmPorCarreta} layout="vertical" margin={{ top: 10, right: 65, left: 15, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#172554" horizontal={false} />
                      <XAxis type="number" stroke="#64748B" tick={false} axisLine={false} />
                      <YAxis
                        type="category"
                        dataKey="plate"
                        stroke="#CBD5E1"
                        tick={{ fill: '#CBD5E1', fontSize: 11, fontWeight: 'bold' }}
                        width={80}
                        tickLine={false}
                      />
                      <Tooltip content={renderSimpleTooltip} />
                      <Bar dataKey="km" fill="#2563EB" radius={[0, 3, 3, 0]} barSize={26}>
                        <LabelList dataKey="kmFormatted" position="right" fill="#FFFFFF" fontSize={11} fontWeight="bold" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* VISUAL 2: VIAGENS POR CARRETA */}
            <div className="bg-[#0B1530] border border-blue-900/40 rounded-lg p-4 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  VIAGENS POR CARRETA
                </h3>
                <button
                  type="button"
                  onClick={() => setExpandedChart({ title: 'VIAGENS POR CARRETA', type: 'bar-vehicle-trips', subtitle: 'Total de viagens concluídas por conjunto/carreta' })}
                  title="Expandir para tela cheia"
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 hover:bg-blue-900 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tela Cheia</span>
                </button>
              </div>

              {viagensPorCarreta.length === 0 ? (
                <EmptyChartState message="Nenhuma viagem por carreta registrada" icon={<Truck className="w-8 h-8 text-blue-400" />} />
              ) : (
                <div
                  onClick={() => setExpandedChart({ title: 'VIAGENS POR CARRETA', type: 'bar-vehicle-trips', subtitle: 'Total de viagens concluídas por conjunto/carreta' })}
                  className="w-full h-80 sm:h-92 min-h-[320px] cursor-pointer"
                  title="Clique para ver em tela cheia"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={viagensPorCarreta} margin={{ top: 25, right: 20, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                      <XAxis
                        dataKey="plate"
                        stroke="#64748B"
                        tick={{ fill: '#CBD5E1', fontSize: 11, fontWeight: 'bold' }}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#64748B"
                        tickLine={false}
                        domain={[0, 'auto']}
                        tick={{ fill: '#CBD5E1', fontSize: 10, fontWeight: '500' }}
                      />
                      <Tooltip content={renderSimpleTooltip} />
                      <Bar dataKey="trips" fill="#2563EB" radius={[3, 3, 0, 0]} barSize={36}>
                        <LabelList dataKey="trips" position="top" fill="#FFFFFF" fontSize={11} fontWeight="bold" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM FULL-WIDTH: EVOLUÇÃO DE KM RODADO POR MÊS */}
          <div className="bg-[#0B1530] border border-blue-900/40 rounded-lg p-4 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
              <div>
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                  EVOLUÇÃO DE KM RODADO POR MÊS
                </h3>
                <p className="text-[10px] text-slate-300">
                  Histórico de quilometragem por placa de carreta
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Legend */}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  {Object.entries(VEHICLE_COLORS).map(([plate, col]) => (
                    <div key={plate} className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col }} />
                      <span className="text-slate-300 font-semibold  text-[11px]">{plate}</span>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedChart({ title: 'EVOLUÇÃO DE KM RODADO POR MÊS', type: 'line-vehicle-km-evolution', subtitle: 'Histórico mensal de quilometragem por placa de carreta' })}
                  title="Expandir para tela cheia"
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 hover:text-white px-2.5 py-1 rounded-md bg-blue-950/70 border border-blue-800/60 hover:bg-blue-900 transition cursor-pointer"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tela Cheia</span>
                </button>
              </div>
            </div>

            {evolucaoKmPorMes.length === 0 ? (
              <EmptyChartState message="Nenhum histórico de quilometragem registrado" icon={<Route className="w-8 h-8 text-blue-400" />} />
            ) : (
              <div className="w-full h-72 sm:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolucaoKmPorMes} margin={{ top: 25, right: 30, left: 15, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748B" tick={{ fill: '#CBD5E1', fontSize: 11, fontWeight: 'bold' }} tickLine={false} />
                    <YAxis
                      stroke="#64748B"
                      domain={[0, 'auto']}
                      tickFormatter={(val) => val === 0 ? '0' : `${val / 1000}k`}
                      tickLine={false}
                      tick={{ fill: '#CBD5E1', fontSize: 10, fontWeight: '500' }}
                    />
                    <Tooltip content={renderVehicleKmTooltip} />
                    <Line type="monotone" dataKey="RLT5J54" stroke={VEHICLE_COLORS['RLT5J54']} strokeWidth={3} dot={{ r: 4, fill: VEHICLE_COLORS['RLT5J54'] }} name="RLT5J54">
                      <LabelList
                        dataKey="RLT5J54"
                        position="top"
                        fill="#BAE6FD"
                        fontSize={10}
                        fontWeight="bold"
                        formatter={(val) => typeof val === 'number' ? (val < 0 ? `-${Math.abs(val)}` : `${val}`) : ''}
                      />
                    </Line>
                    <Line type="monotone" dataKey="RLU3F59" stroke={VEHICLE_COLORS['RLU3F59']} strokeWidth={2.5} dot={{ r: 4, fill: VEHICLE_COLORS['RLU3F59'] }} name="RLU3F59">
                      <LabelList
                        dataKey="RLU3F59"
                        position="bottom"
                        fill="#FDBA74"
                        fontSize={9}
                        fontWeight="bold"
                        formatter={(val) => typeof val === 'number' ? (val < 0 ? `-${Math.abs(val)}` : `${val}`) : ''}
                      />
                    </Line>
                    <Line type="monotone" dataKey="RLT5J44" stroke={VEHICLE_COLORS['RLT5J44']} strokeWidth={2.5} dot={{ r: 3, fill: VEHICLE_COLORS['RLT5J44'] }} name="RLT5J44" />
                    <Line type="monotone" dataKey="QFT5753" stroke={VEHICLE_COLORS['QFT5753']} strokeWidth={2} dot={{ r: 3, fill: VEHICLE_COLORS['QFT5753'] }} name="QFT5753" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </section>
      )}
      {/* =========================================================================
          FULLSCREEN / EXPANDED CHART MODAL
      ========================================================================== */}
      {expandedChart && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setExpandedChart(null)}
        >
          <div
            className="relative w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-[#0B1530] border-2 border-blue-600/60 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-blue-900/60 px-5 py-4 bg-[#081028]">
              <div>
                <div className="flex items-center gap-2.5">
                  <Maximize2 className="w-5 h-5 text-blue-400" />
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                    {expandedChart.title}
                  </h2>
                </div>
                {expandedChart.subtitle && (
                  <p className="text-xs text-blue-300 mt-0.5">
                    {expandedChart.subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setExpandedChart(null)}
                className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-blue-900/50 transition cursor-pointer"
                title="Fechar tela cheia"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
              {/* PIE CHART EXPANDED */}
              {(expandedChart.type === 'pie-factory-trips' || expandedChart.type === 'pie-factory-share') && (
                <div className="space-y-6">
                  <div className="w-full h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip content={renderSimpleTooltip} />
                        <Pie
                          data={factoryTrips}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={140}
                          paddingAngle={2}
                          label={(entry: any) => `${entry.name}: ${entry.count} (${(entry.percentage || 0).toFixed(1)}%)`}
                        >
                          {factoryTrips.map((entry, index) => (
                            <Cell key={`modal-pie-${index}`} fill={entry.color} stroke="#0B1530" strokeWidth={3} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Complete data table */}
                  <div className="rounded-xl border border-blue-900/60 overflow-hidden bg-[#071024]">
                    <div className="p-3 bg-[#0B1530] border-b border-blue-900/60 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-white">
                        Detalhamento Completo por Fábrica
                      </span>
                      <span className="text-xs font-semibold text-blue-400">
                        Total de Viagens: {overviewCards.qtdeViagens}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0B1530]/80 text-blue-200 border-b border-blue-900/60 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="py-2.5 px-4">Fábrica</th>
                            <th className="py-2.5 px-4 text-right">Viagens Realizadas</th>
                            <th className="py-2.5 px-4 text-right">Participação</th>
                            <th className="py-2.5 px-4 text-right">TMA Médio</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-950/60">
                          {factoryTrips.map((item) => {
                            const tmaItem = factoryTma.find((t: any) => t.name === item.name);
                            return (
                              <tr key={item.name} className="hover:bg-blue-950/40 transition-colors">
                                <td className="py-2.5 px-4 flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                  <span className="font-bold text-white">{item.name}</span>
                                </td>
                                <td className="py-2.5 px-4 text-right font-bold text-white">
                                  {item.count}
                                </td>
                                <td className="py-2.5 px-4 text-right font-semibold text-blue-300">
                                  {(item.percentage || 0).toFixed(2)}%
                                </td>
                                <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-300">
                                  {tmaItem ? tmaItem.formatted : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* AREA CHART EXPANDED */}
              {expandedChart.type === 'area-monthly-trips' && (
                <div className="space-y-6">
                  <div className="w-full h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={monthlyEvolution} margin={{ top: 25, right: 30, left: 10, bottom: 10 }}>
                        <defs>
                          <linearGradient id="areaGradientModal" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                        <XAxis dataKey="month" stroke="#64748B" tick={{ fill: '#E2E8F0', fontSize: 12, fontWeight: 'bold' }} />
                        <YAxis stroke="#64748B" tick={{ fill: '#E2E8F0', fontSize: 12, fontWeight: 'bold' }} />
                        <Tooltip content={renderSimpleTooltip} />
                        <Area type="monotone" dataKey="trips" stroke="#2563EB" strokeWidth={3} fill="url(#areaGradientModal)" dot={{ r: 5, fill: '#2563EB' }}>
                          <LabelList dataKey="trips" position="top" fill="#FFFFFF" fontSize={12} fontWeight="bold" />
                        </Area>
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* BAR CHART EXPANDED */}
              {expandedChart.type === 'bar-monthly-km' && (
                <div className="space-y-6">
                  <div className="w-full h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyKm} margin={{ top: 25, right: 30, left: 15, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                        <XAxis dataKey="month" stroke="#64748B" tick={{ fill: '#E2E8F0', fontSize: 12, fontWeight: 'bold' }} />
                        <YAxis stroke="#64748B" tickFormatter={(val) => `${val / 1000} mil`} tick={{ fill: '#E2E8F0', fontSize: 12, fontWeight: 'bold' }} />
                        <Tooltip content={renderSimpleTooltip} />
                        <Bar dataKey="km" fill="#2563EB" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="km" position="top" fill="#FFFFFF" fontSize={12} fontWeight="bold" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* TMA FACTORY EXPANDED */}
              {expandedChart.type === 'bar-factory-tma' && (
                <div className="space-y-6">
                  <div className="w-full h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={factoryTma} layout="vertical" margin={{ top: 15, right: 80, left: 20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#172554" horizontal={false} />
                        <XAxis type="number" stroke="#64748B" />
                        <YAxis type="category" dataKey="name" stroke="#CBD5E1" tick={{ fill: '#CBD5E1', fontSize: 12, fontWeight: 'bold' }} width={120} />
                        <Tooltip content={renderSimpleTooltip} />
                        <Bar dataKey="hours" fill="#2563EB" radius={[0, 4, 4, 0]}>
                          <LabelList dataKey="formatted" position="right" fill="#FFFFFF" fontSize={12} fontWeight="bold" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* VIAGENS POR FÁBRICA VERTICAL EXPANDED */}
              {expandedChart.type === 'bar-factory-trips-vertical' && (
                <div className="space-y-6">
                  <div className="w-full h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={factoryTrips} margin={{ top: 25, right: 30, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748B" tick={{ fill: '#E2E8F0', fontSize: 12, fontWeight: 'bold' }} />
                        <YAxis stroke="#64748B" domain={[0, 'auto']} tick={{ fill: '#E2E8F0', fontSize: 12, fontWeight: 'bold' }} />
                        <Tooltip content={renderSimpleTooltip} />
                        <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="count" position="top" fill="#FFFFFF" fontSize={12} fontWeight="bold" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* EVOLUÇÃO TMA POR MÊS EXPANDED */}
              {expandedChart.type === 'line-factory-tma-evolution' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-4 text-xs bg-[#081028] p-3 rounded-xl border border-blue-900/60">
                    <span className="font-bold text-blue-200">Legenda de Fábricas:</span>
                    {Object.entries(FACTORY_COLORS).map(([fac, col]) => (
                      <div key={fac} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: col }} />
                        <span className="text-slate-200 font-semibold">{fac}</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-full h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={evolucaoTmaPorMes} margin={{ top: 25, right: 30, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                        <XAxis dataKey="month" stroke="#64748B" tick={{ fill: '#CBD5E1', fontSize: 12, fontWeight: 'bold' }} />
                        <YAxis stroke="#64748B" domain={[0, 'auto']} tickLine={false} tick={{ fill: '#CBD5E1', fontSize: 11 }} />
                        <Tooltip content={renderMultiTmaTooltip} />
                        <Line type="monotone" dataKey="ITAPISSUMA" stroke={FACTORY_COLORS['ITAPISSUMA']} strokeWidth={3} dot={{ r: 5, fill: FACTORY_COLORS['ITAPISSUMA'] }} name="ITAPISSUMA">
                          <LabelList dataKey="ITAPISSUMA_fmt" position="top" fill="#FFFFFF" fontSize={11} fontWeight="bold" />
                        </Line>
                        <Line type="monotone" dataKey="FONTE_DA_MATA" stroke={FACTORY_COLORS['FONTE DA MATA']} strokeWidth={2.5} dot={{ r: 5, fill: FACTORY_COLORS['FONTE DA MATA'] }} name="FONTE DA MATA">
                          <LabelList dataKey="FONTE_DA_MATA_fmt" position="bottom" fill="#FCA5A5" fontSize={10} fontWeight="bold" />
                        </Line>
                        <Line type="monotone" dataKey="ESTANCIA" stroke={FACTORY_COLORS['ESTANCIA']} strokeWidth={2.5} dot={{ r: 4, fill: FACTORY_COLORS['ESTANCIA'] }} name="ESTANCIA" />
                        <Line type="monotone" dataKey="AQUIRAZ" stroke={FACTORY_COLORS['AQUIRAZ']} strokeWidth={2.5} dot={{ r: 4, fill: FACTORY_COLORS['AQUIRAZ'] }} name="AQUIRAZ" />
                        <Line type="monotone" dataKey="CAMACARI" stroke={FACTORY_COLORS['CAMAÇARI']} strokeWidth={2} dot={{ r: 4, fill: FACTORY_COLORS['CAMAÇARI'] }} name="CAMAÇARI" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* VIAGENS POR MOTORISTA EXPANDED */}
              {expandedChart.type === 'bar-driver-trips' && (
                <div className="space-y-6">
                  <div className="w-full h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={viagensPorMotorista} layout="vertical" margin={{ top: 15, right: 50, left: 20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#172554" horizontal={false} />
                        <XAxis type="number" stroke="#64748B" />
                        <YAxis type="category" dataKey="shortName" stroke="#CBD5E1" tick={{ fill: '#CBD5E1', fontSize: 12, fontWeight: 'bold' }} width={100} />
                        <Tooltip content={renderSimpleTooltip} />
                        <Bar dataKey="trips" fill="#2563EB" radius={[0, 4, 4, 0]}>
                          <LabelList dataKey="trips" position="right" fill="#FFFFFF" fontSize={12} fontWeight="bold" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* KM POR MOTORISTA EXPANDED */}
              {expandedChart.type === 'bar-driver-km' && (
                <div className="space-y-6">
                  <div className="w-full h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={kmPorMotorista} margin={{ top: 25, right: 25, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                        <XAxis dataKey="name" stroke="#64748B" tick={{ fill: '#CBD5E1', fontSize: 11, fontWeight: 'bold' }} />
                        <YAxis stroke="#64748B" domain={[0, 'auto']} tickFormatter={(v) => `${v / 1000}k`} tick={{ fill: '#CBD5E1', fontSize: 11 }} />
                        <Tooltip content={renderSimpleTooltip} />
                        <Bar dataKey="km" fill="#2563EB" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="kmFormatted" position="top" fill="#FFFFFF" fontSize={11} fontWeight="bold" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* EVOLUÇÃO VIAGENS MOTORISTAS EXPANDED */}
              {expandedChart.type === 'line-driver-evolution' && (
                <div className="space-y-6">
                  <div className="w-full h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={evolucaoViagensMes} margin={{ top: 25, right: 30, left: 10, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                        <XAxis dataKey="month" stroke="#64748B" tick={{ fill: '#CBD5E1', fontSize: 12, fontWeight: 'bold' }} />
                        <YAxis stroke="#64748B" domain={[0, 'auto']} tick={{ fill: '#CBD5E1', fontSize: 11 }} />
                        <Tooltip content={renderSimpleTooltip} />
                        <Line type="monotone" dataKey="trips" stroke="#2563EB" strokeWidth={3} dot={{ r: 6, fill: '#2563EB', stroke: '#93C5FD', strokeWidth: 2 }}>
                          <LabelList dataKey="trips" position="top" fill="#FFFFFF" fontSize={12} fontWeight="bold" />
                        </Line>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* MATRIZ ANALÍTICA MOTORISTAS X FÁBRICAS EXPANDED */}
              {expandedChart.type === 'matrix-driver-factory' && (
                <div className="space-y-4">
                  <div className="rounded-xl border border-blue-900/60 overflow-x-auto bg-[#071024]">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-blue-900/60 bg-[#071024] text-[11px] uppercase tracking-wider text-slate-300">
                          <th className="py-2.5 px-3 font-bold text-blue-200">FÁBRICA</th>
                          <th colSpan={3} className="py-2.5 px-2 text-center font-bold border-l border-blue-900/60 text-slate-200">AQUIRAZ</th>
                          <th colSpan={3} className="py-2.5 px-2 text-center font-bold border-l border-blue-900/60 text-slate-200">CAMAÇARI</th>
                          <th colSpan={3} className="py-2.5 px-2 text-center font-bold border-l border-blue-900/60 text-slate-200">ESTANCIA</th>
                          <th colSpan={3} className="py-2.5 px-2 text-center font-bold border-l border-blue-900/60 text-slate-200">FONTE DA MATA</th>
                          <th colSpan={3} className="py-2.5 px-2 text-center font-bold border-l border-blue-900/60 text-slate-200">ITAPISSUMA</th>
                          <th colSpan={3} className="py-2.5 px-2 text-center font-bold border-l border-blue-900/60 text-amber-400 bg-blue-950/40">TOTAL</th>
                        </tr>
                        <tr className="border-b border-blue-900/40 bg-[#0A1633] text-[10px] text-slate-300 font-mono font-bold">
                          <th className="py-1.5 px-3 font-sans text-slate-400">Motorista</th>
                          <th className="py-1.5 px-1.5 text-center border-l border-blue-950">Puxadas</th>
                          <th className="py-1.5 px-1.5 text-center">KM</th>
                          <th className="py-1.5 px-1.5 text-center text-blue-300">TMV</th>
                          <th className="py-1.5 px-1.5 text-center border-l border-blue-950">Puxadas</th>
                          <th className="py-1.5 px-1.5 text-center">KM</th>
                          <th className="py-1.5 px-1.5 text-center text-blue-300">TMV</th>
                          <th className="py-1.5 px-1.5 text-center border-l border-blue-950">Puxadas</th>
                          <th className="py-1.5 px-1.5 text-center">KM</th>
                          <th className="py-1.5 px-1.5 text-center text-blue-300">TMV</th>
                          <th className="py-1.5 px-1.5 text-center border-l border-blue-950">Puxadas</th>
                          <th className="py-1.5 px-1.5 text-center">KM</th>
                          <th className="py-1.5 px-1.5 text-center text-blue-300">TMV</th>
                          <th className="py-1.5 px-1.5 text-center border-l border-blue-950">Puxadas</th>
                          <th className="py-1.5 px-1.5 text-center">KM</th>
                          <th className="py-1.5 px-1.5 text-center text-blue-300">TMV</th>
                          <th className="py-1.5 px-1.5 text-center border-l border-blue-950 text-white bg-blue-950/40">Puxadas</th>
                          <th className="py-1.5 px-1.5 text-center text-white bg-blue-950/40">KM</th>
                          <th className="py-1.5 px-1.5 text-center text-blue-200 bg-blue-950/40">TMV</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-950/60 font-mono text-xs">
                        {matrixData.map((row) => (
                          <tr key={row.driver} className="hover:bg-blue-950/30 transition-colors">
                            <td className="py-2.5 px-3 font-sans font-bold text-white truncate max-w-[180px]">{row.driver}</td>
                            <td className="py-2 px-1.5 text-center border-l border-blue-950 text-slate-300">{row.AQUIRAZ.puxadas}</td>
                            <td className="py-2 px-1.5 text-center text-slate-300">{row.AQUIRAZ.km}</td>
                            <td className="py-2 px-1.5 text-center text-blue-200">{row.AQUIRAZ.tmv}</td>
                            <td className="py-2 px-1.5 text-center border-l border-blue-950 text-slate-300">{row.CAMACARI.puxadas}</td>
                            <td className="py-2 px-1.5 text-center text-slate-300">{row.CAMACARI.km}</td>
                            <td className="py-2 px-1.5 text-center text-blue-200">{row.CAMACARI.tmv}</td>
                            <td className="py-2 px-1.5 text-center border-l border-blue-950 text-slate-300">{row.ESTANCIA.puxadas}</td>
                            <td className="py-2 px-1.5 text-center text-slate-300">{row.ESTANCIA.km}</td>
                            <td className="py-2 px-1.5 text-center text-blue-200">{row.ESTANCIA.tmv}</td>
                            <td className="py-2 px-1.5 text-center border-l border-blue-950 text-slate-300">{row.FONTE_DA_MATA.puxadas}</td>
                            <td className="py-2 px-1.5 text-center text-slate-300">{row.FONTE_DA_MATA.km}</td>
                            <td className="py-2 px-1.5 text-center text-blue-200">{row.FONTE_DA_MATA.tmv}</td>
                            <td className="py-2 px-1.5 text-center border-l border-blue-950 text-slate-300">{row.ITAPISSUMA.puxadas}</td>
                            <td className="py-2 px-1.5 text-center text-slate-300">{row.ITAPISSUMA.km}</td>
                            <td className="py-2 px-1.5 text-center text-blue-200">{row.ITAPISSUMA.tmv}</td>
                            <td className="py-2 px-1.5 text-center border-l border-blue-950 font-bold text-white bg-blue-950/30">{row.total.puxadas}</td>
                            <td className="py-2 px-1.5 text-center font-bold text-white bg-blue-950/30">{row.total.km}</td>
                            <td className="py-2 px-1.5 text-center font-bold text-blue-200 bg-blue-950/30">{row.total.tmv}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-blue-800 bg-[#071024] text-[11px] font-bold text-white">
                          <td className="py-2.5 px-3 font-sans text-blue-200">Total</td>
                          <td className="py-2 px-1.5 text-center border-l border-blue-900/60">{matrixTotals.AQUIRAZ.puxadas}</td>
                          <td className="py-2 px-1.5 text-center">{matrixTotals.AQUIRAZ.km}</td>
                          <td className="py-2 px-1.5 text-center text-blue-200">{matrixTotals.AQUIRAZ.tmv}</td>
                          <td className="py-2 px-1.5 text-center border-l border-blue-900/60">{matrixTotals.CAMACARI.puxadas}</td>
                          <td className="py-2 px-1.5 text-center">{matrixTotals.CAMACARI.km}</td>
                          <td className="py-2 px-1.5 text-center text-blue-200">{matrixTotals.CAMACARI.tmv}</td>
                          <td className="py-2 px-1.5 text-center border-l border-blue-900/60">{matrixTotals.ESTANCIA.puxadas}</td>
                          <td className="py-2 px-1.5 text-center">{matrixTotals.ESTANCIA.km}</td>
                          <td className="py-2 px-1.5 text-center text-blue-200">{matrixTotals.ESTANCIA.tmv}</td>
                          <td className="py-2 px-1.5 text-center border-l border-blue-900/60">{matrixTotals.FONTE_DA_MATA.puxadas}</td>
                          <td className="py-2 px-1.5 text-center">{matrixTotals.FONTE_DA_MATA.km}</td>
                          <td className="py-2 px-1.5 text-center text-blue-200">{matrixTotals.FONTE_DA_MATA.tmv}</td>
                          <td className="py-2 px-1.5 text-center border-l border-blue-900/60">{matrixTotals.ITAPISSUMA.puxadas}</td>
                          <td className="py-2 px-1.5 text-center">{matrixTotals.ITAPISSUMA.km}</td>
                          <td className="py-2 px-1.5 text-center text-blue-200">{matrixTotals.ITAPISSUMA.tmv}</td>
                          <td className="py-2 px-1.5 text-center border-l border-blue-900/60 text-amber-400 bg-blue-950/60">{matrixTotals.total.puxadas}</td>
                          <td className="py-2 px-1.5 text-center text-amber-400 bg-blue-950/60">{matrixTotals.total.km}</td>
                          <td className="py-2 px-1.5 text-center text-amber-300 bg-blue-950/60">{matrixTotals.total.tmv}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* KM POR CARRETA EXPANDED */}
              {expandedChart.type === 'bar-vehicle-km' && (
                <div className="space-y-6">
                  <div className="w-full h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={kmPorCarreta} layout="vertical" margin={{ top: 15, right: 65, left: 20, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#172554" horizontal={false} />
                        <XAxis type="number" stroke="#64748B" />
                        <YAxis type="category" dataKey="plate" stroke="#CBD5E1" tick={{ fill: '#CBD5E1', fontSize: 12, fontWeight: 'bold' }} width={90} />
                        <Tooltip content={renderSimpleTooltip} />
                        <Bar dataKey="km" fill="#2563EB" radius={[0, 4, 4, 0]}>
                          <LabelList dataKey="kmFormatted" position="right" fill="#FFFFFF" fontSize={12} fontWeight="bold" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* VIAGENS POR CARRETA EXPANDED */}
              {expandedChart.type === 'bar-vehicle-trips' && (
                <div className="space-y-6">
                  <div className="w-full h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={viagensPorCarreta} margin={{ top: 25, right: 25, left: 10, bottom: 15 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                        <XAxis dataKey="plate" stroke="#64748B" tick={{ fill: '#CBD5E1', fontSize: 12, fontWeight: 'bold' }} />
                        <YAxis stroke="#64748B" domain={[0, 'auto']} tick={{ fill: '#CBD5E1', fontSize: 11 }} />
                        <Tooltip content={renderSimpleTooltip} />
                        <Bar dataKey="trips" fill="#2563EB" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="trips" position="top" fill="#FFFFFF" fontSize={12} fontWeight="bold" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* EVOLUÇÃO DE KM CARRETA EXPANDED */}
              {expandedChart.type === 'line-vehicle-km-evolution' && (
                <div className="space-y-6">
                  <div className="flex flex-wrap items-center gap-4 text-xs bg-[#081028] p-3 rounded-xl border border-blue-900/60">
                    <span className="font-bold text-blue-200">Legenda de Placas:</span>
                    {Object.entries(VEHICLE_COLORS).map(([plate, col]) => (
                      <div key={plate} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: col }} />
                        <span className="text-slate-200 font-semibold">{plate}</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-full h-80 sm:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={evolucaoKmPorMes} margin={{ top: 25, right: 30, left: 15, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#172554" vertical={false} />
                        <XAxis dataKey="month" stroke="#64748B" tick={{ fill: '#CBD5E1', fontSize: 12, fontWeight: 'bold' }} />
                        <YAxis stroke="#64748B" domain={[0, 'auto']} tickFormatter={(val) => `${val / 1000}k`} tick={{ fill: '#CBD5E1', fontSize: 11 }} />
                        <Tooltip content={renderVehicleKmTooltip} />
                        <Line type="monotone" dataKey="RLT5J54" stroke={VEHICLE_COLORS['RLT5J54']} strokeWidth={3} dot={{ r: 5, fill: VEHICLE_COLORS['RLT5J54'] }} name="RLT5J54">
                          <LabelList dataKey="RLT5J54" position="top" fill="#BAE6FD" fontSize={11} fontWeight="bold" />
                        </Line>
                        <Line type="monotone" dataKey="RLU3F59" stroke={VEHICLE_COLORS['RLU3F59']} strokeWidth={2.5} dot={{ r: 5, fill: VEHICLE_COLORS['RLU3F59'] }} name="RLU3F59">
                          <LabelList dataKey="RLU3F59" position="bottom" fill="#FDBA74" fontSize={10} fontWeight="bold" />
                        </Line>
                        <Line type="monotone" dataKey="RLT5J44" stroke={VEHICLE_COLORS['RLT5J44']} strokeWidth={2.5} dot={{ r: 4, fill: VEHICLE_COLORS['RLT5J44'] }} name="RLT5J44" />
                        <Line type="monotone" dataKey="QFT5753" stroke={VEHICLE_COLORS['QFT5753']} strokeWidth={2} dot={{ r: 4, fill: VEHICLE_COLORS['QFT5753'] }} name="QFT5753" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-blue-900/60 px-5 py-3 bg-[#081028] flex items-center justify-end">
              <button
                type="button"
                onClick={() => setExpandedChart(null)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition cursor-pointer shadow-sm"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
