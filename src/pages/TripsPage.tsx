import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { localDataStore } from '../services/localDataStore.ts';
import { Trip, TRIP_STATUS_CONFIG, Driver, Vehicle, Factory } from '../types/index.ts';
import { formatAppointmentWindow } from '../utils/formatters.ts';
import { 
  Navigation, Plus, Search, Filter, Calendar, MapPin, 
  Clock, Eye, RefreshCw, X, Hash, Image as ImageIcon,
  Edit2, Trash2, AlertTriangle, CheckCircle2, Lock,
  FileSpreadsheet, History
} from 'lucide-react';
import { EditTripModal } from '../components/modals/EditTripModal.tsx';

interface TripsPageProps {
  onOpenNewTripModal: () => void;
  onOpenTripDetails: (trip: Trip) => void;
  onOpenStatusModal?: (trip: Trip) => void;
}

export const TripsPage: React.FC<TripsPageProps> = ({
  onOpenNewTripModal,
  onOpenTripDetails,
}) => {
  const { role } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  // Aux data for filters
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);

  // Trip Edit and Delete states
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [tripToDelete, setTripToDelete] = useState<Trip | null>(null);
  const [deletingTrip, setDeletingTrip] = useState(false);
  const [deleteTripError, setDeleteTripError] = useState<string | null>(null);
  const [toastSuccess, setToastSuccess] = useState<string | null>(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [factoryId, setFactoryId] = useState('');
  const [state, setState] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'scheduled' | 'finished' | 'canceled'>('all');

  const loadAuxData = async () => {
    try {
      const [dList, vList, fList] = await Promise.all([
        api.getDrivers(),
        api.getVehicles(),
        api.getFactories()
      ]);
      setDrivers(dList);
      setVehicles(vList);
      setFactories(fList);
    } catch (e) {
      console.error(e);
    }
  };

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

      // Optimistically remove from state and store
      setTrips(prev => prev.filter(t => t.id !== target.id));
      localDataStore.removeTrip(target.id, target);

      setToastSuccess(`Viagem de ${target.driver_name} (${target.date.split('-').reverse().join('/')}) excluída com sucesso.`);
      setTimeout(() => setToastSuccess(null), 3500);
      setTripToDelete(null);
      window.dispatchEvent(new CustomEvent('puxada:trip-updated'));
      await loadTrips();
    } catch (err: any) {
      // If server returned 404/not found, it means it's already removed on backend!
      if (err.message && err.message.toLowerCase().includes('não encontrada')) {
        setTrips(prev => prev.filter(t => t.id !== target.id));
        localDataStore.removeTrip(target.id, target);
        setToastSuccess(`Registro de viagem removido com sucesso.`);
        setTimeout(() => setToastSuccess(null), 3500);
        setTripToDelete(null);
        window.dispatchEvent(new CustomEvent('puxada:trip-updated'));
      } else {
        setDeleteTripError(err.message || 'Erro ao excluir viagem');
      }
    } finally {
      setDeletingTrip(false);
    }
  };

  const loadTrips = async () => {
    setLoading(true);
    try {
      const data = await api.getTrips({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        driverId: driverId || undefined,
        vehicleId: vehicleId || undefined,
        factoryId: factoryId || undefined,
        state: state || undefined,
        status: status || undefined,
        search: search || undefined,
      });
      setTrips(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuxData();
  }, []);

  useEffect(() => {
    loadTrips();
  }, [startDate, endDate, driverId, vehicleId, factoryId, state, status]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadTrips();
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setDriverId('');
    setVehicleId('');
    setFactoryId('');
    setState('');
    setStatus('');
    setSearch('');
    setActiveTab('all');
  };

  // Filter trips based on quick tab
  const displayedTrips = useMemo(() => {
    if (activeTab === 'active') {
      return trips.filter(t => ['Em deslocamento', 'Na fábrica', 'Retornando'].includes(t.status));
    }
    if (activeTab === 'scheduled') {
      return trips.filter(t => t.status === 'Programada');
    }
    if (activeTab === 'finished') {
      return trips.filter(t => t.status === 'Finalizada');
    }
    if (activeTab === 'canceled') {
      return trips.filter(t => t.status === 'Cancelada');
    }
    return trips;
  }, [trips, activeTab]);

  // Counts for tabs
  const activeCount = useMemo(() => trips.filter(t => ['Em deslocamento', 'Na fábrica', 'Retornando'].includes(t.status)).length, [trips]);
  const scheduledCount = useMemo(() => trips.filter(t => t.status === 'Programada').length, [trips]);
  const finishedCount = useMemo(() => trips.filter(t => t.status === 'Finalizada').length, [trips]);
  const canceledCount = useMemo(() => trips.filter(t => t.status === 'Cancelada').length, [trips]);

  const handleExportCSV = () => {
    if (displayedTrips.length === 0) return;

    const headers = [
      'ID Viagem',
      'Data Programada',
      'Horário Agendado',
      'Data/Hora Saída Real',
      'Data/Hora Chegada Real',
      'Motorista',
      'CPF Motorista',
      'Placa Veículo',
      'Marca',
      'Fábrica Destino',
      'Código Fábrica',
      'Cidade',
      'Estado',
      'Status',
      'KM Inicial',
      'KM Final',
      'KM Rodado',
      'Tempo de Viagem',
      'Refeições',
      'Observações',
      'Justificativa Cancelamento'
    ];

    const rows = displayedTrips.map(t => [
      t.id,
      t.date,
      formatAppointmentWindow(t.appointment_window, t.planned_departure, t.planned_arrival),
      t.actual_departure ? `${t.actual_departure_date || t.date} ${t.actual_departure}` : '',
      t.actual_arrival ? `${t.actual_arrival_date || t.date} ${t.actual_arrival}` : '',
      t.driver_name,
      t.driver_cpf || '',
      t.vehicle_plate,
      t.vehicle_brand || '',
      t.factory_name,
      t.factory_code || '',
      t.factory_city || '',
      t.factory_state || '',
      t.status,
      t.initial_km !== undefined && t.initial_km !== null ? t.initial_km : '',
      t.final_km !== undefined && t.final_km !== null ? t.final_km : '',
      t.total_km !== undefined && t.total_km !== null ? `${t.total_km} km` : '',
      t.total_time || '',
      t.meals_count || 0,
      `"${(t.observation || '').replace(/"/g, '""')}"`,
      `"${(t.cancel_reason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `gestao_e_historico_viagens_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {toastSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{toastSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Navigation className="h-5 w-5 text-blue-600 shrink-0" />
            <span>Gestão e Histórico de Viagens</span>
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Central unificada de monitoramento e histórico consolidado de viagens (em andamento e finalizadas)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            disabled={displayedTrips.length === 0}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 shadow-xs transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            title="Exportar registros filtrados para CSV/Excel"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Exportar Histórico (CSV)</span>
          </button>

          <button
            onClick={onOpenNewTripModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>+ Nova Viagem</span>
          </button>
        </div>
      </div>

      {/* Advanced Filters Bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-3.5 sm:p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-2 dark:border-zinc-800">
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Filter className="h-3.5 w-3.5 text-blue-600" />
            <span>Filtros Operacionais</span>
          </span>
          <button
            onClick={clearFilters}
            className="text-[11px] font-medium text-blue-600 hover:text-blue-500 hover:underline"
          >
            Limpar Filtros
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {/* Data Inicial */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-2 sm:py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white min-h-[40px] sm:min-h-0"
            />
          </div>

          {/* Data Final */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-2 sm:py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white min-h-[40px] sm:min-h-0"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-2 sm:py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white min-h-[40px] sm:min-h-0 font-medium"
            >
              <option value="">Todos</option>
              <option value="Programada">Programada</option>
              <option value="Em deslocamento">Em deslocamento</option>
              <option value="Na fábrica">Na fábrica</option>
              <option value="Retornando">Retornando</option>
              <option value="Finalizada">Finalizada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>

          {/* Motorista */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Motorista</label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-2 sm:py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white min-h-[40px] sm:min-h-0 font-medium"
            >
              <option value="">Todos os motoristas</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Veículo */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Veículo</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-2 sm:py-1.5 text-xs font-mono text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white min-h-[40px] sm:min-h-0 font-medium"
            >
              <option value="">Todos os veículos</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate}</option>
              ))}
            </select>
          </div>

          {/* Fábrica */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Fábrica</label>
            <select
              value={factoryId}
              onChange={(e) => setFactoryId(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-2 sm:py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white min-h-[40px] sm:min-h-0 font-medium"
            >
              <option value="">Todas as fábricas</option>
              {factories.map(f => (
                <option key={f.id} value={f.id}>{f.name} - {f.state}</option>
              ))}
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Estado</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-2.5 py-2 sm:py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white min-h-[40px] sm:min-h-0 font-medium"
            >
              <option value="">Todos</option>
              <option value="PE">PE</option>
              <option value="CE">CE</option>
              <option value="BA">BA</option>
              <option value="PB">PB</option>
              <option value="RN">RN</option>
            </select>
          </div>
        </div>

        {/* Text Search */}
        <div>
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar por motorista, placa, fábrica ou cidade..."
              className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 sm:py-2 pl-9 pr-3 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white min-h-[40px] sm:min-h-0"
            />
            <Search className="pointer-events-none absolute left-3 top-3 sm:top-2.5 h-4 w-4 text-zinc-400" />
          </form>
        </div>
      </div>

      {/* Quick Status Filter Tabs (Unificação Centralizada) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          <span>Todas as Viagens</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'all' ? 'bg-blue-700 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
          }`}>{trips.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('active')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'active'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-amber-400" />
          <span>Em Andamento / Ativas</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'active' ? 'bg-amber-700 text-white' : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
          }`}>{activeCount}</span>
        </button>

        <button
          onClick={() => setActiveTab('scheduled')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'scheduled'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          <span>Programadas</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'scheduled' ? 'bg-blue-700 text-white' : 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
          }`}>{scheduledCount}</span>
        </button>

        <button
          onClick={() => setActiveTab('finished')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'finished'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          <span>Finalizadas (Histórico)</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'finished' ? 'bg-emerald-700 text-white' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
          }`}>{finishedCount}</span>
        </button>

        <button
          onClick={() => setActiveTab('canceled')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'canceled'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
          }`}
        >
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          <span>Canceladas</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            activeTab === 'canceled' ? 'bg-rose-700 text-white' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
          }`}>{canceledCount}</span>
        </button>
      </div>

      {/* Trips Container */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        {/* Mobile View: Cards (md:hidden) */}
        <div className="block md:hidden p-3 space-y-2.5">
          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              <RefreshCw className="h-4 w-4 animate-spin mx-auto text-blue-600 mb-2" />
              Carregando viagens...
            </div>
          ) : displayedTrips.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Nenhuma viagem encontrada com os filtros informados.
            </div>
          ) : (
            displayedTrips.map((t) => {
              const conf = TRIP_STATUS_CONFIG[t.status] || TRIP_STATUS_CONFIG['Programada'];
              const timeStr = formatAppointmentWindow(t.appointment_window, t.planned_departure, t.planned_arrival);

              return (
                <div
                  key={t.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-800/40 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${conf.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
                      {conf.label}
                    </span>
                    <span className="font-mono text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      {t.date.split('-').reverse().join('/')}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{t.factory_name} ({t.factory_state})</h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 font-semibold mt-0.5">
                      Motorista: <span className="text-zinc-900 dark:text-white">{t.driver_name}</span>
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono mt-1 flex-wrap">
                      <span>Placa: {t.vehicle_plate}</span>
                      <span>•</span>
                      <span>Horário: {timeStr}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => onOpenTripDetails(t)}
                      className="flex items-center justify-center gap-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition min-h-[36px]"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                      <span>Detalhes</span>
                    </button>
                    {t.status === 'Finalizada' && role !== 'DESENVOLVEDOR' ? (
                      <button
                        onClick={() => {
                          alert('Bloqueio Operacional: Após o término e finalização da viagem, SOMENTE o perfil de DESENVOLVEDOR poderá editar os dados e históricos registrados.');
                        }}
                        className="flex items-center justify-center gap-1 rounded-lg bg-zinc-100 text-zinc-400 dark:bg-zinc-800/60 dark:text-zinc-500 py-2 text-xs font-medium border border-zinc-200 dark:border-zinc-700/60 transition min-h-[36px] cursor-not-allowed"
                        title="Bloqueado: Apenas Desenvolvedor pode editar viagens finalizadas"
                      >
                        <Lock className="h-3 w-3" />
                        <span>Editar</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setEditingTrip(t)}
                        className="flex items-center justify-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 py-2 text-xs font-bold border border-blue-200/80 dark:border-blue-900/50 transition min-h-[36px]"
                        title={t.status === 'Finalizada' ? 'Editar Viagem (Permissão Desenvolvedor)' : 'Editar Viagem'}
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Editar</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setTripToDelete(t);
                        setDeleteTripError(null);
                      }}
                      className="flex items-center justify-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 py-2 text-xs font-bold border border-rose-200/80 dark:border-rose-900/50 transition min-h-[36px]"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Excluir</span>
                    </button>
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
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Horário Agendado</th>
                <th className="px-4 py-3">Motorista</th>
                <th className="px-4 py-3">Veículo</th>
                <th className="px-4 py-3">Fábrica de Destino</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-zinc-400">
                    Carregando viagens...
                  </td>
                </tr>
              ) : displayedTrips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-zinc-400">
                    Nenhuma viagem encontrada com os filtros informados.
                  </td>
                </tr>
              ) : (
                displayedTrips.map((t) => {
                  const conf = TRIP_STATUS_CONFIG[t.status] || TRIP_STATUS_CONFIG['Programada'];
                  return (
                    <tr key={t.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                        {t.date.split('-').reverse().join('/')}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                        {formatAppointmentWindow(t.appointment_window, t.planned_departure, t.planned_arrival)}
                      </td>
                      <td className="px-4 py-3 font-bold text-zinc-900 dark:text-white">
                        {t.driver_name}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-zinc-800 dark:text-zinc-200">
                        {t.vehicle_plate}
                      </td>
                      <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200">
                        <span className="font-semibold">{t.factory_name}</span>
                      </td>
                      <td className="px-4 py-3 font-bold text-zinc-700 dark:text-zinc-300">
                        {t.factory_state}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${conf.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
                          {conf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onOpenTripDetails(t)}
                            className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
                            title="Ver detalhes da viagem"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-600" />
                            <span>Detalhes</span>
                          </button>
                          {t.status === 'Finalizada' && role !== 'DESENVOLVEDOR' ? (
                            <button
                              onClick={() => {
                                alert('Bloqueio Operacional: Após o término e finalização da viagem, SOMENTE o perfil de DESENVOLVEDOR poderá editar os dados e históricos registrados.');
                              }}
                              className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-400 border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-800/40 dark:text-zinc-500 cursor-not-allowed transition"
                              title="Bloqueado: Apenas Desenvolvedor pode editar viagens finalizadas"
                            >
                              <Lock className="h-3 w-3 text-zinc-400" />
                              <span>Editar</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditingTrip(t)}
                              className="flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200/80 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 transition"
                              title={t.status === 'Finalizada' ? 'Editar Viagem (Permissão Desenvolvedor)' : 'Editar Viagem'}
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Editar</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setTripToDelete(t);
                              setDeleteTripError(null);
                            }}
                            className="flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 border border-rose-200/80 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition"
                            title="Excluir Viagem"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Excluir</span>
                          </button>
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
          <div className="relative w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-950/50 shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Excluir Viagem?
                </h3>
                <p className="text-xs text-zinc-500">Esta ação cancelará e removerá a viagem permanentemente.</p>
              </div>
            </div>

            {deleteTripError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <p>{deleteTripError}</p>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/40 space-y-1">
              <p><span className="text-zinc-500">Data / Horário:</span> <strong className="text-zinc-900 dark:text-white">{tripToDelete.date.split('-').reverse().join('/')} às {tripToDelete.planned_departure}</strong></p>
              <p><span className="text-zinc-500">Motorista:</span> <strong className="text-zinc-900 dark:text-white">{tripToDelete.driver_name}</strong></p>
              <p><span className="text-zinc-500">Veículo:</span> <strong className="font-mono text-zinc-900 dark:text-white">{tripToDelete.vehicle_plate}</strong></p>
              <p><span className="text-zinc-500">Fábrica:</span> <strong>{tripToDelete.factory_name} ({tripToDelete.factory_state})</strong></p>
              <p><span className="text-zinc-500">Status Atual:</span> <strong>{tripToDelete.status}</strong></p>
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
                className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {deletingTrip ? 'Excluindo...' : 'Confirmar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Trip Modal */}
      {editingTrip && (
        <EditTripModal
          trip={editingTrip}
          isOpen={true}
          onClose={() => setEditingTrip(null)}
          onSuccess={() => {
            setEditingTrip(null);
            setToastSuccess('Viagem atualizada com sucesso!');
            setTimeout(() => setToastSuccess(null), 3500);
            loadTrips();
          }}
        />
      )}
    </div>
  );
};
