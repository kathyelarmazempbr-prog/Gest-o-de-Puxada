import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.ts';
import { Driver, Trip, TRIP_STATUS_CONFIG } from '../types/index.ts';
import { formatAppointmentWindow } from '../utils/formatters.ts';
import { 
  CalendarClock, Plus, Search, Filter, 
  Clock, MapPin, Truck, Trash2, CheckCircle2, UserCheck,
  AlertCircle, RefreshCw, Eye, ArrowRight, Hash, Image as ImageIcon,
  Building2, Phone, Sparkles, LayoutGrid, Table as TableIcon,
  Edit2, AlertTriangle
} from 'lucide-react';
import { EditTripModal } from '../components/modals/EditTripModal.tsx';

interface SchedulesPageProps {
  onOpenNewScheduleModal?: () => void;
  onOpenNewTripModal?: () => void;
  onOpenTripDetails?: (trip: Trip) => void;
  canManage?: boolean;
}

export const SchedulesPage: React.FC<SchedulesPageProps> = ({ 
  onOpenNewTripModal,
  onOpenTripDetails,
  canManage = true 
}) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing & Deleting Trips
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [deleteTripError, setDeleteTripError] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [driversList, tripsList] = await Promise.all([
        api.getDrivers().catch(() => []),
        api.getTrips().catch(() => [])
      ]);
      setDrivers(driversList);
      setTrips(tripsList);
    } catch (err) {
      console.error('Erro ao carregar dados da escala operacional:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('puxada:trip-updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);

    return () => {
      window.removeEventListener('puxada:trip-updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, []);

  const confirmDeleteTrip = async () => {
    if (!tripToDelete) return;
    const target = tripToDelete;
    setDeletingTrip(true);
    setDeleteTripError(null);
    try {
      await api.deleteTrip(target.id, {
        date: target.date,
        planned_departure: target.planned_departure,
        driver_name: target.driver_name,
        vehicle_plate: target.vehicle_plate,
        driver_id: target.driver_id,
        vehicle_id: target.vehicle_id,
        factory_id: target.factory_id,
        status: target.status,
      });
      setTrips(prev => prev.filter(t => t.id !== target.id));
      setToastMsg(`Viagem de ${target.driver_name} excluída com sucesso.`);
      setTimeout(() => setToastMsg(null), 3500);
      setTripToDelete(null);
      window.dispatchEvent(new CustomEvent('puxada:trip-updated'));
      loadData();
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('não encontrada')) {
        setTrips(prev => prev.filter(t => t.id !== target.id));
        setToastMsg(`Registro de viagem removido com sucesso.`);
        setTimeout(() => setToastMsg(null), 3500);
        setTripToDelete(null);
        window.dispatchEvent(new CustomEvent('puxada:trip-updated'));
      } else {
        setDeleteTripError(err.message || 'Erro ao excluir viagem');
      }
    } finally {
      setDeletingTrip(false);
    }
  };

  // Ensure all drivers with trips (even if driver table is empty or driver was created as user) are included
  const effectiveDrivers = useMemo(() => {
    const knownDriverIds = new Set(drivers.map(d => d.id));
    const knownDriverNames = new Set(drivers.map(d => d.name.toLowerCase().trim()));
    const extraDrivers: Driver[] = [];

    trips.forEach(t => {
      if (t.driver_id && !knownDriverIds.has(t.driver_id) && (!t.driver_name || !knownDriverNames.has(t.driver_name.toLowerCase().trim()))) {
        knownDriverIds.add(t.driver_id);
        if (t.driver_name) knownDriverNames.add(t.driver_name.toLowerCase().trim());
        extraDrivers.push({
          id: t.driver_id,
          name: t.driver_name || 'Motorista Não Identificado',
          registration: t.driver_registration || '—',
          phone: t.driver_phone,
          status: 'Ativo',
          created_at: t.created_at,
          updated_at: t.updated_at,
        } as Driver);
      }
    });

    return [...drivers, ...extraDrivers];
  }, [drivers, trips]);

  // Associate each registered driver with their active or upcoming trip
  const driverRoster = useMemo(() => {
    return effectiveDrivers.map(driver => {
      // Find trips for this driver
      const driverTrips = trips.filter(t => 
        t.driver_id === driver.id || 
        (driver.user_id && t.driver_id === driver.user_id) ||
        (t.driver_registration && driver.registration && t.driver_registration.trim().toLowerCase() === driver.registration.trim().toLowerCase()) ||
        (t.driver_name && driver.name && t.driver_name.trim().toLowerCase() === driver.name.trim().toLowerCase())
      );
      
      // 1. Viagem em andamento (Prioridade máxima)
      const inProgressTrip = driverTrips.find(t => 
        t.status === 'Em deslocamento' || t.status === 'Na fábrica' || t.status === 'Retornando'
      );
      
      // 2. Viagem agendada / programada
      const scheduledTrip = driverTrips.find(t => 
        t.status === 'Programada' && (!dateFilter || t.date === dateFilter)
      );

      // Latest trip
      const latestTrip = inProgressTrip || scheduledTrip || (
        driverTrips.length > 0 ? driverTrips[0] : null
      );

      // Determine operational status
      // - Sem viagem ativa/agendada -> 'Disponível'
      // - Viagem em andamento -> 'Em Viagem'
      // - Viagem agendada -> 'Programado'
      // - Viagem finalizada -> motorista retorna automaticamente para 'Disponível'
      let operationalStatus: 'Em Viagem' | 'Programado' | 'Disponível' | 'Inativo' = 'Disponível';
      if (driver.status === 'Inativo') {
        operationalStatus = 'Inativo';
      } else if (inProgressTrip) {
        operationalStatus = 'Em Viagem';
      } else if (scheduledTrip) {
        operationalStatus = 'Programado';
      } else {
        operationalStatus = 'Disponível';
      }

      return {
        driver,
        currentTrip: inProgressTrip || scheduledTrip,
        latestTrip,
        operationalStatus,
      };
    });
  }, [effectiveDrivers, trips, dateFilter]);

  // Filter roster by search and status
  const filteredRoster = useMemo(() => {
    return driverRoster.filter(item => {
      const q = search.toLowerCase().trim();
      const matchesSearch = !q || (
        (item.driver.name && item.driver.name.toLowerCase().includes(q)) ||
        (item.driver.registration && item.driver.registration.toLowerCase().includes(q)) ||
        (item.currentTrip?.vehicle_plate && item.currentTrip.vehicle_plate.toLowerCase().includes(q)) ||
        (item.currentTrip?.factory_name && item.currentTrip.factory_name.toLowerCase().includes(q)) ||
        (item.driver.phone && item.driver.phone.includes(q))
      );

      const matchesStatus = !statusFilter || item.operationalStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [driverRoster, search, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = effectiveDrivers.length;
    const inTrip = driverRoster.filter(d => d.operationalStatus === 'Em Viagem').length;
    const programmed = driverRoster.filter(d => d.operationalStatus === 'Programado').length;
    const available = driverRoster.filter(d => d.operationalStatus === 'Disponível').length;
    return { total, inTrip, programmed, available };
  }, [effectiveDrivers, driverRoster]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-600" />
            Escala Operacional de Motoristas
          </h1>
          <p className="text-xs text-zinc-500">
            Visualização consolidada da programação e alocação operacional dos motoristas cadastrados
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Atualizar dados"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            Atualizar
          </button>

          {canManage && onOpenNewTripModal && (
            <button
              onClick={onOpenNewTripModal}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              + Programar Viagem
            </button>
          )}
        </div>
      </div>

      {/* Quick KPI Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Motoristas</span>
            <UserCheck className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            {stats.total}
          </p>
          <span className="text-[10px] text-zinc-400">Cadastrados no sistema</span>
        </div>

        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-3.5 shadow-xs dark:border-emerald-900/50 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Disponíveis</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-900 dark:text-emerald-300">
            {stats.available}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400">Prontos p/ programação</span>
        </div>

        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-3.5 shadow-xs dark:border-amber-900/50 dark:bg-amber-950/20">
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Em Viagem / Rota</span>
            <Truck className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-1 text-2xl font-bold tracking-tight text-amber-900 dark:text-amber-300">
            {stats.inTrip}
          </p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400">Em trânsito ou na fábrica</span>
        </div>

        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/40 p-3.5 shadow-xs dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="flex items-center justify-between text-blue-700 dark:text-blue-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Programados</span>
            <Clock className="h-4 w-4 text-blue-600" />
          </div>
          <p className="mt-1 text-2xl font-bold tracking-tight text-blue-900 dark:text-blue-300">
            {stats.programmed}
          </p>
          <span className="text-[10px] text-blue-600 dark:text-blue-400">Com viagem agendada</span>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por motorista, matrícula, placa ou fábrica..."
                className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              >
                <option value="">Todos os status operacionais</option>
                <option value="Disponível">Disponível para Programação</option>
                <option value="Programado">Viagem Programada</option>
                <option value="Em Viagem">Em Viagem / Rota</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                title="Filtrar por data específica da programação"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main View: Programação dos Motoristas Cadastrados */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        {/* Mobile View: Cards (block md:hidden) */}
        <div className="block md:hidden p-3 space-y-2.5">
          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <span>Carregando escala operacional...</span>
              </div>
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Nenhum motorista encontrado com os filtros selecionados.
            </div>
          ) : (
            filteredRoster.map(({ driver, currentTrip, operationalStatus }) => {
              const hasTrip = !!currentTrip;

              return (
                <div
                  key={driver.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-800/40 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/60 dark:text-blue-300">
                        {driver.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-xs text-zinc-900 dark:text-white truncate">{driver.name}</h4>
                        <span className="font-mono text-[10px] text-zinc-500">Matrícula: {driver.registration}</span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {operationalStatus === 'Em Viagem' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Em Viagem
                        </span>
                      )}
                      {operationalStatus === 'Programado' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                          Programado
                        </span>
                      )}
                      {operationalStatus === 'Disponível' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Disponível
                        </span>
                      )}
                      {operationalStatus === 'Inativo' && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[9px] font-bold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                          Inativo
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-1 pt-1 border-t border-zinc-200/50 dark:border-zinc-700/50">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Destino:</span>
                      <strong className="text-zinc-800 dark:text-zinc-200">
                        {hasTrip ? currentTrip.factory_name : 'Sem viagem alocada'}
                      </strong>
                    </div>
                    <div className="flex items-center justify-between font-mono text-[11px]">
                      <span className="text-zinc-400 font-sans">Veículo:</span>
                      <span className="font-bold text-zinc-800 dark:text-zinc-200">
                        {hasTrip ? currentTrip.vehicle_plate : (driver.default_vehicle_plate || '—')}
                      </span>
                    </div>
                    {hasTrip && (
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-zinc-400">Data / Horário:</span>
                        <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                          {currentTrip.date.split('-').reverse().join('/')} • {formatAppointmentWindow(currentTrip.appointment_window, currentTrip.planned_departure)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Mobile Actions */}
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-end gap-1.5">
                    {hasTrip && onOpenTripDetails && (
                      <button
                        onClick={() => onOpenTripDetails(currentTrip)}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition min-h-[36px]"
                      >
                        <Eye className="h-3.5 w-3.5 text-blue-600" />
                        <span>Detalhes</span>
                      </button>
                    )}
                    {hasTrip && canManage && (
                      <button
                        onClick={() => setEditingTrip(currentTrip)}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 py-2 text-xs font-bold border border-blue-200/80 dark:border-blue-900/60 transition min-h-[36px]"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Editar</span>
                      </button>
                    )}
                    {!hasTrip && canManage && onOpenNewTripModal && (
                      <button
                        onClick={onOpenNewTripModal}
                        className="w-full flex items-center justify-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2 text-xs font-bold shadow-xs transition min-h-[36px]"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Programar Viagem</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40">
                <th className="px-4 py-3">Motorista</th>
                <th className="px-4 py-3">Status Operacional</th>
                <th className="px-4 py-3">Programação / Destino</th>
                <th className="px-4 py-3">Veículo</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Horário Agendado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-zinc-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                      <span>Carregando escala operacional dos motoristas...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRoster.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-zinc-400">
                    Nenhum motorista encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredRoster.map(({ driver, currentTrip, operationalStatus }) => {
                  const hasTrip = !!currentTrip;

                  return (
                    <tr key={driver.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition">
                      {/* Motorista: 1º Avatar, 2º Matrícula, 3º Nome Completo */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {/* 1º Avatar/Imagem de perfil do motorista */}
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/60 dark:text-blue-300">
                            {driver.name.charAt(0).toUpperCase()}
                          </div>

                          {/* 2º Matrícula/Código do motorista */}
                          <span className="font-mono font-bold text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 whitespace-nowrap">
                            {driver.registration}
                          </span>

                          {/* 3º Nome completo do motorista */}
                          <span className="font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                            {driver.name}
                          </span>
                        </div>
                      </td>

                      {/* Status Operacional */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {operationalStatus === 'Em Viagem' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Em Viagem
                          </span>
                        )}

                        {operationalStatus === 'Programado' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                            Viagem Programada
                          </span>
                        )}

                        {operationalStatus === 'Disponível' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Disponível
                          </span>
                        )}

                        {operationalStatus === 'Inativo' && (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                            Inativo
                          </span>
                        )}
                      </td>

                      {/* Programação / Destino (apenas nome da fábrica) */}
                      <td className="px-4 py-3">
                        {hasTrip ? (
                          <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white">
                            <Building2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                            <span>{currentTrip.factory_name}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">Sem viagem alocada</span>
                        )}
                      </td>

                      {/* Veículo */}
                      <td className="px-4 py-3">
                        {hasTrip ? (
                          <div className="font-mono font-bold text-zinc-800 dark:text-zinc-200">
                            {currentTrip.vehicle_plate}
                          </div>
                        ) : driver.default_vehicle_plate ? (
                          <div className="font-mono text-zinc-500">
                            {driver.default_vehicle_plate}
                            <span className="block font-sans text-[10px] text-zinc-400">Veículo padrão</span>
                          </div>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Data */}
                      <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                        {hasTrip ? currentTrip.date.split('-').reverse().join('/') : '—'}
                      </td>

                      {/* Horário Agendado */}
                      <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                        {hasTrip ? formatAppointmentWindow(currentTrip.appointment_window, currentTrip.planned_departure) : '—'}
                      </td>

                      {/* Ações */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasTrip && onOpenTripDetails && (
                            <button
                              onClick={() => onOpenTripDetails(currentTrip)}
                              className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
                              title="Ver detalhes completos da viagem"
                            >
                              <Eye className="h-3.5 w-3.5 text-blue-600" />
                              <span>Detalhes</span>
                            </button>
                          )}

                          {hasTrip && canManage && (
                            <>
                              <button
                                onClick={() => setEditingTrip(currentTrip)}
                                className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200/80 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 transition"
                                title="Editar Viagem"
                              >
                                <Edit2 className="h-3 w-3" />
                                <span>Editar</span>
                              </button>
                              <button
                                onClick={() => setTripToDelete(currentTrip)}
                                className="rounded-lg p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                                title="Excluir Viagem"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Trip Confirmation Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-950/50">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Excluir Viagem?
                </h3>
                <p className="text-xs text-zinc-500">Esta ação removerá permanentemente a programação desta viagem.</p>
              </div>
            </div>

            {deleteTripError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <p>{deleteTripError}</p>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/40 space-y-1">
              <p><span className="text-zinc-500">Data:</span> <strong className="text-zinc-900 dark:text-white">{tripToDelete.date.split('-').reverse().join('/')} às {tripToDelete.planned_departure}</strong></p>
              <p><span className="text-zinc-500">Motorista:</span> <strong className="text-zinc-900 dark:text-white">{tripToDelete.driver_name}</strong></p>
              <p><span className="text-zinc-500">Veículo:</span> <strong className="font-mono text-zinc-900 dark:text-white">{tripToDelete.vehicle_plate}</strong></p>
              <p><span className="text-zinc-500">Destino:</span> <strong>{tripToDelete.factory_name}</strong></p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTripToDelete(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingTrip}
                onClick={confirmDeleteTrip}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {deletingTrip ? 'Excluindo...' : 'Sim, Excluir Viagem'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trip Modal */}
      {editingTrip && (
        <EditTripModal
          isOpen={!!editingTrip}
          trip={editingTrip}
          onClose={() => setEditingTrip(null)}
          onSuccess={() => {
            setToastMsg('Viagem atualizada com sucesso!');
            setTimeout(() => setToastMsg(null), 3500);
            window.dispatchEvent(new CustomEvent('puxada:trip-updated'));
            loadData();
          }}
        />
      )}
    </div>
  );
};
