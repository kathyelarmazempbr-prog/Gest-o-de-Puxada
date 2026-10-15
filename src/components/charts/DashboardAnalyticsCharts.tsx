import React, { useState } from 'react';
import { 
  BarChart3, TrendingUp, Gauge, Factory, 
  Route, Layers, ArrowUpRight, Clock, Truck,
  CheckCircle2, Compass, Calendar
} from 'lucide-react';

interface ChartProps {
  cards: {
    totalTrips?: number;
    scheduledTrips?: number;
    inProgressTrips?: number;
    inTripTrips?: number;
    atFactoryTrips?: number;
    finishedTrips?: number;
    canceledTrips?: number;
    totalKm?: number;
    totalKmFormatted?: string;
    tmv?: string;
    tma?: string;
    tme?: string;
    tmc?: string;
    avgTmvMinutes?: number;
    avgTmaMinutes?: number;
    avgTmeMinutes?: number;
    avgTmcMinutes?: number;
  };
  charts: {
    tripsByStatus?: Array<{ status: string; count: number }>;
    tripsByFactory?: Array<{ id: string; name: string; state: string; count: number; factory_code?: string }>;
    tripsByDriver?: Array<{ id: string; name: string; registration?: string; count: number; finished_count?: number }>;
    tripsByDate?: Array<{ date: string; count: number; finished_count: number; total_km: number }>;
    indicatorsComparison?: Array<{ key: string; label: string; minutes: number; formatted: string; color: string }>;
    factoryIndicatorsComparison?: Array<{
      id: string;
      name: string;
      state: string;
      factory_code?: string;
      count: number;
      total_km: number;
      tmvMinutes: number;
      tmvFormatted: string;
      tmaMinutes: number;
      tmaFormatted: string;
      tmeMinutes: number;
      tmeFormatted: string;
      tmcMinutes: number;
      tmcFormatted: string;
    }>;
  };
}

export const DashboardAnalyticsCharts: React.FC<ChartProps> = ({ cards, charts }) => {
  const [metricUnit, setMetricUnit] = useState<'minutes' | 'hours'>('hours');
  const [selectedFactoryId, setSelectedFactoryId] = useState<string>('all');

  // Factories indicators comparison data
  const factoriesComparison = charts.factoryIndicatorsComparison && charts.factoryIndicatorsComparison.length > 0
    ? charts.factoryIndicatorsComparison
    : (charts.tripsByFactory || []).map(f => ({
        id: f.id,
        name: f.name,
        state: f.state,
        factory_code: f.factory_code,
        count: f.count,
        total_km: 0,
        tmvMinutes: cards.avgTmvMinutes || 0,
        tmvFormatted: cards.tmv || '--',
        tmaMinutes: cards.avgTmaMinutes || 0,
        tmaFormatted: cards.tma || '--',
        tmeMinutes: cards.avgTmeMinutes || 0,
        tmeFormatted: cards.tme || '--',
        tmcMinutes: cards.avgTmcMinutes || 0,
        tmcFormatted: cards.tmc || '--',
      }));

  // Find max minutes across factories for bar scaling
  let maxTimeValue = 60;
  factoriesComparison.forEach(f => {
    if (f.tmvMinutes > maxTimeValue) maxTimeValue = f.tmvMinutes;
    if (f.tmaMinutes > maxTimeValue) maxTimeValue = f.tmaMinutes;
    if (f.tmeMinutes > maxTimeValue) maxTimeValue = f.tmeMinutes;
    if (f.tmcMinutes > maxTimeValue) maxTimeValue = f.tmcMinutes;
  });

  // Daily evolution data
  const dateData = (charts.tripsByDate && charts.tripsByDate.length > 0)
    ? charts.tripsByDate
    : [
        { date: new Date().toISOString().split('T')[0], count: cards.totalTrips || 0, finished_count: cards.finishedTrips || 0, total_km: cards.totalKm || 0 }
      ];

  const maxDailyKm = Math.max(...dateData.map(d => d.total_km || 0), 10);
  const totalKmEvolution = dateData.reduce((acc, curr) => acc + (curr.total_km || 0), 0);

  // Trips by factory
  const tripsByFactoryList = (charts.tripsByFactory && charts.tripsByFactory.length > 0)
    ? charts.tripsByFactory
    : factoriesComparison.map(f => ({ id: f.id, name: f.name, state: f.state, count: f.count, factory_code: f.factory_code }));

  const maxFactoryTrips = Math.max(...tripsByFactoryList.map(f => f.count), 1);
  const totalFactoryTrips = tripsByFactoryList.reduce((acc, curr) => acc + curr.count, 0) || Math.max(cards.totalTrips || 1, 1);

  // Format minutes helper (sempre horas inteiras e minutos, sem decimais)
  const formatTimeLabel = (mins: number, formatted: string) => {
    if (mins <= 0) return formatted || '--';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) {
      return `${h}h ${String(m).padStart(2, '0')}m`;
    }
    return `${m}min`;
  };

  const filteredFactories = selectedFactoryId === 'all'
    ? factoriesComparison
    : factoriesComparison.filter(f => f.id === selectedFactoryId);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* =================================================================== */}
      {/* GRÁFICO 1: COLUNAS COMPARANDO TMV, TMA, TME e TMC DE CADA FÁBRICA   */}
      {/* =================================================================== */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-600/10 dark:bg-violet-500/20 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Comparativo de TMV, TMA, TME e TMC por Fábrica</span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Gráfico analítico de colunas comparando os indicadores operacionais de cada unidade fabril
              </p>
            </div>
          </div>

          {/* Unit Toggle and Factory Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 text-[11px] font-bold">
              <button
                onClick={() => setMetricUnit('hours')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  metricUnit === 'hours'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
                }`}
              >
                Horas (h)
              </button>
              <button
                onClick={() => setMetricUnit('minutes')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  metricUnit === 'minutes'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400'
                }`}
              >
                Minutos (m)
              </button>
            </div>

            {factoriesComparison.length > 1 && (
              <select
                value={selectedFactoryId}
                onChange={(e) => setSelectedFactoryId(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-2.5 py-1.5 text-xs text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-medium focus:outline-none"
              >
                <option value="all">Todas as Fábricas ({factoriesComparison.length})</option>
                {factoriesComparison.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.state})</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Legenda dos Indicadores */}
        <div className="mt-3.5 flex flex-wrap items-center gap-3 sm:gap-6 text-xs font-semibold py-2 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800/60">
          <span className="text-[10px] uppercase font-bold text-zinc-400 dark:text-zinc-500">Indicadores:</span>
          
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-violet-600 dark:bg-violet-500 shadow-2xs" />
            <span className="text-zinc-800 dark:text-zinc-200">TMV</span>
            <span className="text-[10px] text-zinc-400 font-normal hidden sm:inline">(Tempo Médio de Rota)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-blue-600 dark:bg-blue-500 shadow-2xs" />
            <span className="text-zinc-800 dark:text-zinc-200">TMA</span>
            <span className="text-[10px] text-zinc-400 font-normal hidden sm:inline">(Tempo na Fábrica)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-amber-500 dark:bg-amber-400 shadow-2xs" />
            <span className="text-zinc-800 dark:text-zinc-200">TME</span>
            <span className="text-[10px] text-zinc-400 font-normal hidden sm:inline">(Tempo de Espera/Fila)</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm bg-emerald-600 dark:bg-emerald-500 shadow-2xs" />
            <span className="text-zinc-800 dark:text-zinc-200">TMC</span>
            <span className="text-[10px] text-zinc-400 font-normal hidden sm:inline">(Tempo de Carregamento)</span>
          </div>
        </div>

        {/* Visualização de Gráfico de Colunas Agrupadas */}
        {filteredFactories.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            Nenhuma informação encontrada para os filtros selecionados.
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Visualização de Barras Verticais Agrupadas em SVG / CSS Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredFactories.map((factory) => {
                const metrics = [
                  { 
                    key: 'TMV', 
                    label: 'TMV', 
                    title: 'Tempo de Rota',
                    minutes: factory.tmvMinutes, 
                    formatted: factory.tmvFormatted, 
                    colorClass: 'bg-gradient-to-t from-violet-600 to-indigo-500', 
                    badgeBg: 'bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300',
                    borderCol: 'border-violet-300 dark:border-violet-700'
                  },
                  { 
                    key: 'TMA', 
                    label: 'TMA', 
                    title: 'Na Fábrica',
                    minutes: factory.tmaMinutes, 
                    formatted: factory.tmaFormatted, 
                    colorClass: 'bg-gradient-to-t from-blue-600 to-cyan-500', 
                    badgeBg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300',
                    borderCol: 'border-blue-300 dark:border-blue-700'
                  },
                  { 
                    key: 'TME', 
                    label: 'TME', 
                    title: 'Fila / Espera',
                    minutes: factory.tmeMinutes, 
                    formatted: factory.tmeFormatted, 
                    colorClass: 'bg-gradient-to-t from-amber-500 to-orange-400', 
                    badgeBg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
                    borderCol: 'border-amber-300 dark:border-amber-700'
                  },
                  { 
                    key: 'TMC', 
                    label: 'TMC', 
                    title: 'Carregamento',
                    minutes: factory.tmcMinutes, 
                    formatted: factory.tmcFormatted, 
                    colorClass: 'bg-gradient-to-t from-emerald-600 to-teal-400', 
                    badgeBg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
                    borderCol: 'border-emerald-300 dark:border-emerald-700'
                  },
                ];

                return (
                  <div 
                    key={factory.id}
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 p-4 flex flex-col justify-between hover:border-violet-400/50 transition-colors shadow-2xs"
                  >
                    {/* Header da Fábrica */}
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-200/60 dark:border-zinc-800">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <Factory className="h-4 w-4 text-violet-600 shrink-0" />
                          <h3 className="font-black text-sm text-zinc-900 dark:text-white truncate">
                            {factory.name}
                          </h3>
                        </div>
                        <p className="text-[10px] text-zinc-400 font-medium">
                          {factory.state} {factory.factory_code ? `• Cód. ${factory.factory_code}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="rounded-lg bg-zinc-200/80 dark:bg-zinc-700 px-2 py-0.5 text-[11px] font-black text-zinc-800 dark:text-zinc-200 font-mono">
                          {factory.count} vg{factory.count !== 1 ? 's' : ''}
                        </span>
                        {factory.total_km > 0 && (
                          <span className="rounded-lg bg-indigo-100 dark:bg-indigo-950/60 px-2 py-0.5 text-[11px] font-black text-indigo-700 dark:text-indigo-300 font-mono">
                            {factory.total_km} km
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Gráfico de Colunas da Fábrica (Eixo Y de Altura Proporcional) */}
                    <div className="mt-4 pt-2">
                      <div className="h-44 w-full flex items-end justify-between gap-2 px-2 pb-2 border-b border-zinc-200 dark:border-zinc-700">
                        {metrics.map(m => {
                          const heightPct = maxTimeValue > 0 
                            ? Math.max(6, Math.round((m.minutes / maxTimeValue) * 100)) 
                            : 6;

                          return (
                            <div key={m.key} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                              {/* Valor flutuante / Tooltip */}
                              <div className="text-[10px] font-black font-mono text-zinc-700 dark:text-zinc-300 mb-1 truncate">
                                {m.minutes > 0 ? formatTimeLabel(m.minutes, m.formatted) : '--'}
                              </div>

                              {/* Coluna do Gráfico */}
                              <div className="w-full max-w-[42px] flex flex-col justify-end h-full">
                                <div 
                                  className={`w-full rounded-t-lg ${m.colorClass} shadow-md transition-all duration-500 group-hover:brightness-110 flex items-center justify-center`}
                                  style={{ height: `${heightPct}%` }}
                                >
                                  {heightPct > 25 && (
                                    <span className="text-[9px] font-black text-white/90 transform -rotate-90 sm:rotate-0">
                                      {m.key}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Rótulos inferiores das Colunas */}
                      <div className="grid grid-cols-4 gap-2 mt-2 text-center">
                        {metrics.map(m => (
                          <div key={m.key} className="min-w-0">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black font-mono ${m.badgeBg}`}>
                              {m.key}
                            </span>
                            <span className="block text-[9px] text-zinc-400 truncate mt-0.5" title={m.title}>
                              {m.formatted}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* GRID DE DOIS GRÁFICOS: EVOLUÇÃO DE KM E QUANTIDADE DE VIAGENS       */}
      {/* =================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* =================================================================== */}
        {/* GRÁFICO 2: EVOLUÇÃO DE KM                                           */}
        {/* =================================================================== */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                  <Route className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>Evolução de KM Rodado</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Histórico de quilometragem percorrida pela frota no período
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold text-zinc-400 block uppercase">Total no Período</span>
                <span className="text-sm sm:text-base font-black text-indigo-700 dark:text-indigo-300 font-mono">
                  {totalKmEvolution.toLocaleString('pt-BR')} km
                </span>
              </div>
            </div>

            {/* Gráfico de Evolução com Barras e Área */}
            <div className="mt-5">
              <div className="h-48 w-full flex items-end justify-between gap-2.5 px-2 pb-2 border-b border-zinc-200 dark:border-zinc-700">
                {dateData.map((d, idx) => {
                  const km = d.total_km || 0;
                  const heightPct = Math.max(10, Math.round((km / maxDailyKm) * 100));
                  const dateLabel = d.date.includes('-') 
                    ? d.date.split('-').slice(1).reverse().join('/') 
                    : d.date;

                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                      {/* Tooltip / Valor Superior */}
                      <span className="text-[10px] font-black font-mono text-indigo-700 dark:text-indigo-300 mb-1 whitespace-nowrap">
                        {km > 0 ? `${km} km` : '0'}
                      </span>

                      {/* Barra de KM */}
                      <div className="w-full max-w-[48px] flex flex-col justify-end h-full">
                        <div 
                          className="w-full rounded-t-xl bg-gradient-to-t from-indigo-600 via-indigo-500 to-sky-400 shadow-md transition-all duration-500 group-hover:brightness-110 flex items-center justify-center"
                          style={{ height: `${heightPct}%` }}
                        >
                          {heightPct > 35 && (
                            <Route className="h-3 w-3 text-white/80 transform rotate-45" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Rótulos das Datas */}
              <div className="flex justify-between items-center gap-1 mt-2.5 px-2">
                {dateData.map((d, idx) => {
                  const dateFormatted = d.date.includes('-') 
                    ? d.date.split('-').slice(1).reverse().join('/') 
                    : d.date;
                  return (
                    <div key={idx} className="flex-1 text-center truncate">
                      <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 font-mono">
                        {dateFormatted}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Rodapé Informativo */}
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="text-zinc-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-500" />
              <span>Dias mapeados: <strong className="text-zinc-900 dark:text-white">{dateData.length}</strong></span>
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold text-[11px]">
              Média: {dateData.length > 0 ? Math.round(totalKmEvolution / dateData.length) : 0} km/dia
            </span>
          </div>
        </div>

        {/* =================================================================== */}
        {/* GRÁFICO 3: QUANTIDADE DE VIAGENS POR FÁBRICA                        */}
        {/* =================================================================== */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-purple-600/10 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
                  <Factory className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>Quantidade de Viagens por Fábrica</span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Volume absoluto e participação proporcional por destino de puxada
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-semibold text-zinc-400 block uppercase">Total Geral</span>
                <span className="text-sm sm:text-base font-black text-purple-700 dark:text-purple-300 font-mono">
                  {totalFactoryTrips} viagens
                </span>
              </div>
            </div>

            {/* Lista com Gráfico de Barras Proporcionais */}
            <div className="mt-4 space-y-3">
              {tripsByFactoryList.length === 0 ? (
                <p className="text-xs text-zinc-400 py-8 text-center">Nenhuma fábrica encontrada com viagens cadastradas.</p>
              ) : (
                tripsByFactoryList.map((fac) => {
                  const pct = Math.round((fac.count / totalFactoryTrips) * 100);
                  const barWidthPct = Math.max(6, Math.round((fac.count / maxFactoryTrips) * 100));

                  return (
                    <div 
                      key={fac.id || fac.name} 
                      className="p-3 rounded-xl bg-zinc-50/70 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 space-y-2 hover:border-purple-300/50 transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="h-2 w-2 rounded-full bg-purple-600 shrink-0" />
                          <span className="font-bold text-zinc-900 dark:text-white truncate">
                            {fac.name}
                          </span>
                          <span className="text-[10px] font-semibold text-zinc-400 shrink-0">
                            ({fac.state})
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 font-mono">
                            {pct}%
                          </span>
                          <span className="rounded-lg bg-purple-100 dark:bg-purple-950/60 px-2.5 py-0.5 text-xs font-black text-purple-700 dark:text-purple-300 font-mono">
                            {fac.count} vg{fac.count !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progresso com Gradiente */}
                      <div className="w-full h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-500 transition-all duration-500"
                          style={{ width: `${barWidthPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Rodapé Informativo */}
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
            <span className="text-zinc-500 flex items-center gap-1.5">
              <Factory className="h-3.5 w-3.5 text-purple-500" />
              <span>Unidades fabris ativas: <strong className="text-zinc-900 dark:text-white">{tripsByFactoryList.length}</strong></span>
            </span>
            <span className="text-purple-600 dark:text-purple-400 font-bold text-[11px]">
              Maior volume: {tripsByFactoryList[0]?.name || '--'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
