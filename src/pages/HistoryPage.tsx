import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { Trip, TRIP_STATUS_CONFIG, Driver, Vehicle, Factory } from '../types/index.ts';
import { formatAppointmentWindow } from '../utils/formatters.ts';
import { 
  History, Search, Filter, Download, Calendar, Eye, 
  RefreshCw, FileSpreadsheet, CheckCircle2 
} from 'lucide-react';

interface HistoryPageProps {
  onOpenTripDetails: (trip: Trip) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onOpenTripDetails }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  // Aux options
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [factoryId, setFactoryId] = useState('');
  const [state, setState] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [tripsData, dList, vList, fList] = await Promise.all([
        api.getTrips({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          driverId: driverId || undefined,
          vehicleId: vehicleId || undefined,
          factoryId: factoryId || undefined,
          state: state || undefined,
          status: status || undefined,
          search: search || undefined,
        }),
        api.getDrivers(),
        api.getVehicles(),
        api.getFactories(),
      ]);
      setTrips(tripsData);
      setDrivers(dList);
      setVehicles(vList);
      setFactories(fList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate, driverId, vehicleId, factoryId, state, status]);

  const handleExportCSV = () => {
    if (trips.length === 0) return;

    const headers = [
      'ID Viagem',
      'Data',
      'Horário Agendado',
      'Motorista',
      'CPF Motorista',
      'Placa Veículo',
      'Fábrica',
      'Código Fábrica',
      'Cidade',
      'Estado',
      'Status',
      'Observações',
      'Justificativa Cancelamento'
    ];

    const rows = trips.map(t => [
      t.id,
      t.date,
      formatAppointmentWindow(t.appointment_window, t.planned_departure, t.planned_arrival),
      t.driver_name,
      t.driver_cpf || '',
      t.vehicle_plate,
      t.factory_name,
      t.factory_code,
      t.factory_city,
      t.factory_state,
      t.status,
      `"${(t.observation || '').replace(/"/g, '""')}"`,
      `"${(t.cancel_reason || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + 
      [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `historico_puxadas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            Histórico Geral de Viagens
          </h1>
          <p className="text-xs text-zinc-500">
            Consulta consolidada de todas as viagens realizadas, em andamento ou canceladas
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={trips.length === 0}
          className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
          Exportar Histórico (CSV/Excel)
        </button>
      </div>

      {/* Filter Bar (Section 17 & 18) */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Motorista</label>
            <select
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Todos os motoristas</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Veículo</label>
            <select
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Todos os veículos</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>{v.plate} (#{v.vehicle_number})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Fábrica</label>
            <select
              value={factoryId}
              onChange={(e) => setFactoryId(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Todas as fábricas</option>
              {factories.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.state})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Estado</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Todos</option>
              <option value="PE">PE</option>
              <option value="CE">CE</option>
              <option value="BA">BA</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Todos</option>
              <option value="Finalizada">Finalizada</option>
              <option value="Em deslocamento">Em deslocamento</option>
              <option value="Na fábrica">Na fábrica</option>
              <option value="Retornando">Retornando</option>
              <option value="Programada">Programada</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        <div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar histórico por motorista, placa, fábrica ou observações..."
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40">
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Motorista</th>
                <th className="px-4 py-3">Veículo</th>
                <th className="px-4 py-3">Fábrica</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Horário Agendado</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Observações</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-zinc-400">
                    Carregando histórico de viagens...
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-xs text-zinc-400">
                    Nenhum registro encontrado no histórico para os filtros aplicados.
                  </td>
                </tr>
              ) : (
                trips.map((t) => {
                  const conf = TRIP_STATUS_CONFIG[t.status] || TRIP_STATUS_CONFIG['Programada'];
                  return (
                    <tr key={t.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-white whitespace-nowrap">
                        {t.date.split('-').reverse().join('/')}
                      </td>
                      <td className="px-4 py-3 font-bold text-zinc-900 dark:text-white">
                        {t.driver_name}
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-zinc-800 dark:text-zinc-200">
                        {t.vehicle_plate}
                      </td>
                      <td className="px-4 py-3 text-zinc-800 dark:text-zinc-200">
                        {t.factory_name}
                      </td>
                      <td className="px-4 py-3 font-bold text-zinc-700 dark:text-zinc-300">
                        {t.factory_state}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                        {formatAppointmentWindow(t.appointment_window, t.planned_departure, t.planned_arrival)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${conf.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
                          {conf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500 max-w-xs truncate">
                        {t.cancel_reason ? (
                          <span className="text-rose-600 font-medium">Cancelada: {t.cancel_reason}</span>
                        ) : (
                          t.observation || '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => onOpenTripDetails(t)}
                          className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                          title="Ver detalhes completos"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
