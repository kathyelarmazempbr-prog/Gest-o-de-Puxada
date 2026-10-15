import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { Trip, TRIP_STATUS_CONFIG } from '../types/index.ts';
import { formatAppointmentWindow } from '../utils/formatters.ts';
import { 
  Navigation, Calendar, Clock, MapPin, Truck, CheckCircle2, 
  ArrowRight, Eye, Building2, TrendingUp, Activity, Utensils
} from 'lucide-react';

interface DriverDashboardProps {
  onOpenTripDetails: (trip: Trip) => void;
  onNavigateToTrips?: () => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ 
  onOpenTripDetails,
  onNavigateToTrips 
}) => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const allTrips = await api.getTrips();
      setTrips(allTrips || []);
    } catch (err) {
      console.error('Erro ao carregar dados do dashboard do motorista:', err);
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

  // In-progress trip
  const inProgressTrip = useMemo(() => {
    return trips.find(t => ['Em deslocamento', 'Na fábrica', 'Retornando'].includes(t.status)) || null;
  }, [trips]);

  // Next scheduled trip
  const nextScheduledTrip = useMemo(() => {
    return trips
      .filter(t => t.status === 'Programada')
      .sort((a, b) => (a.date + (a.planned_departure || '')).localeCompare(b.date + (b.planned_departure || '')))[0] || null;
  }, [trips]);

  // Immediate active or next trip
  const immediateTrip = inProgressTrip || nextScheduledTrip;

  // Scheduled / Programmed trips list
  const programmedTrips = useMemo(() => {
    return trips
      .filter(t => t.status === 'Programada')
      .sort((a, b) => (a.date + (a.planned_departure || '')).localeCompare(b.date + (b.planned_departure || '')));
  }, [trips]);

  // Overall counts for driver
  const totalCompleted = useMemo(() => trips.filter(t => t.status === 'Finalizada').length, [trips]);
  const totalProgrammed = programmedTrips.length;
  const totalTrips = trips.length;

  if (loading && trips.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* Banner Superior Simplificado e Responsivo */}
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-4 sm:p-6 text-white shadow-lg relative overflow-hidden">
        {/* Background decorative subtle circles */}
        <div className="absolute -right-12 -bottom-12 h-44 w-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute right-32 -top-12 h-36 w-36 rounded-full bg-blue-400/20 blur-xl pointer-events-none" />

        <div className="relative z-10">
          <span className="inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider backdrop-blur-md border border-white/25">
            Painel do Motorista
          </span>
          <h1 className="mt-1.5 sm:mt-2 text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight">
            Olá {user?.name || 'Motorista'}
          </h1>
          <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-blue-100/90 font-medium">
            Consulte suas viagens e programações
          </p>
        </div>
      </div>

      {/* Resumo de Status Operacional Essencial */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {/* Viagem Atual / Em Andamento */}
        <div className="rounded-xl sm:rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">Status</span>
            <Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-500 shrink-0" />
          </div>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base font-black text-zinc-900 dark:text-white truncate">
            {inProgressTrip ? inProgressTrip.status : 'Disponível'}
          </p>
          <span className="text-[10px] text-zinc-400 truncate block mt-0.5">
            {inProgressTrip ? inProgressTrip.factory_name : 'Sem viagem em rota'}
          </span>
        </div>

        {/* Programadas */}
        <div className="rounded-xl sm:rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">Programadas</span>
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 shrink-0" />
          </div>
          <p className="mt-1 sm:mt-2 text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {totalProgrammed}
          </p>
          <span className="text-[10px] text-zinc-400 truncate block mt-0.5">Aguardando início</span>
        </div>

        {/* Concluídas */}
        <div className="rounded-xl sm:rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">Concluídas</span>
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-500 shrink-0" />
          </div>
          <p className="mt-1 sm:mt-2 text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {totalCompleted}
          </p>
          <span className="text-[10px] text-zinc-400 truncate block mt-0.5">Finalizadas</span>
        </div>

        {/* Total de Viagens */}
        <div className="rounded-xl sm:rounded-2xl border border-zinc-200 bg-white p-3 sm:p-4 shadow-xs dark:border-zinc-800 dark:bg-zinc-900 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider truncate">Total</span>
            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-500 shrink-0" />
          </div>
          <p className="mt-1 sm:mt-2 text-lg sm:text-xl font-black text-zinc-900 dark:text-white font-mono">
            {totalTrips}
          </p>
          <span className="text-[10px] text-zinc-400 truncate block mt-0.5">No histórico</span>
        </div>
      </div>

      {/* Card da Viagem Imediata (Em Andamento ou Próxima Programada) */}
      <div className="space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between px-0.5">
          <h2 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-600" />
            <span>{inProgressTrip ? 'Viagem Atual em Andamento' : 'Próxima Viagem Programada'}</span>
          </h2>
          {immediateTrip && (
            <span className="text-[11px] sm:text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {inProgressTrip ? 'Em Execução' : 'Próxima da Escala'}
            </span>
          )}
        </div>

        {immediateTrip ? (
          (() => {
            const conf = TRIP_STATUS_CONFIG[immediateTrip.status] || TRIP_STATUS_CONFIG['Programada'];
            const timeStr = formatAppointmentWindow(immediateTrip.appointment_window, immediateTrip.planned_departure);

            return (
              <div className="overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-blue-200/80 bg-white shadow-sm dark:border-blue-900/50 dark:bg-zinc-900">
                <div className="bg-gradient-to-r from-blue-50 via-white to-blue-50/40 px-4 py-3 sm:px-5 sm:py-3.5 border-b border-blue-100 dark:from-zinc-900 dark:to-zinc-900 dark:border-blue-900/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${conf.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
                      {conf.label}
                    </span>
                    {immediateTrip.order_number && (
                      <span className="font-mono text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                        Pedido: {immediateTrip.order_number}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                    <span>{timeStr}</span>
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-3.5 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 uppercase">
                        <Building2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span>Fábrica de Destino</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-white mt-0.5">
                        {immediateTrip.factory_name}
                      </h3>
                      <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
                        {immediateTrip.factory_city} - {immediateTrip.factory_state}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex-1 sm:flex-none rounded-xl bg-zinc-50 px-3 py-2 border border-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 text-center min-w-[70px]">
                        <span className="text-[9px] uppercase font-semibold text-zinc-400 block">Veículo</span>
                        <span className="font-mono font-bold text-xs text-zinc-800 dark:text-zinc-200">{immediateTrip.vehicle_plate}</span>
                      </div>
                      <div className="flex-1 sm:flex-none rounded-xl bg-zinc-50 px-3 py-2 border border-zinc-100 dark:bg-zinc-800 dark:border-zinc-700 text-center min-w-[70px]">
                        <span className="text-[9px] uppercase font-semibold text-zinc-400 block">Data</span>
                        <span className="font-bold text-xs text-zinc-800 dark:text-zinc-200">{immediateTrip.date.split('-').reverse().join('/')}</span>
                      </div>
                      {immediateTrip.meals_count !== undefined && immediateTrip.meals_count > 0 && (
                        <div className="flex-1 sm:flex-none rounded-xl bg-amber-50 px-3 py-2 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50 text-center min-w-[70px]">
                          <span className="text-[9px] uppercase font-semibold text-amber-700 dark:text-amber-300 block">Refeições</span>
                          <span className="font-bold text-xs text-amber-800 dark:text-amber-200 flex items-center justify-center gap-1">
                            <Utensils className="h-3 w-3" />
                            {immediateTrip.meals_count}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                    <span className="text-xs text-zinc-500">
                      {immediateTrip.status === 'Programada' 
                        ? 'Clique para abrir o controle e iniciar a viagem.'
                        : 'Viagem em andamento. Registre refeições ou finalize.'}
                    </span>

                    <button
                      onClick={() => onOpenTripDetails(immediateTrip)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 sm:py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition min-h-[44px]"
                    >
                      <Eye className="h-4 w-4" />
                      <span>Acessar Detalhes & Controle</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="rounded-2xl sm:rounded-3xl border border-dashed border-zinc-300 p-6 sm:p-8 text-center dark:border-zinc-700 bg-white/50 dark:bg-zinc-900/50">
            <Calendar className="mx-auto h-8 w-8 text-zinc-400" />
            <p className="mt-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Nenhuma viagem agendada no momento
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Aguarde a liberação de novas viagens na escala pelo setor operacional.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
