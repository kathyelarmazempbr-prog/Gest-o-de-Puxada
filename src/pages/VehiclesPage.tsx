import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { localDataStore } from '../services/localDataStore.ts';
import { Vehicle, VEHICLE_STATUS_CONFIG, Trip, TRIP_STATUS_CONFIG } from '../types/index.ts';
import { formatAppointmentWindow } from '../utils/formatters.ts';
import { 
  Truck, Plus, Search, Filter, Wrench, CheckCircle2, 
  AlertTriangle, History, Eye, X, Power, Trash2, Edit2 
} from 'lucide-react';

interface VehiclesPageProps {
  onOpenNewVehicleModal: () => void;
  onOpenTripDetails: (trip: Trip) => void;
}

export const VehiclesPage: React.FC<VehiclesPageProps> = ({ 
  onOpenNewVehicleModal,
  onOpenTripDetails 
}) => {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => localDataStore.getVehicles());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected vehicle details modal
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);

  // Deletion state
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [deletingVehicle, setDeletingVehicle] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // Editing state
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editPlate, setEditPlate] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editSiderPlate, setEditSiderPlate] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editType, setEditType] = useState('');
  const [editStatus, setEditStatus] = useState<string>('Disponível');
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [editVehicleError, setEditVehicleError] = useState<string | null>(null);

  const startEditVehicle = (v: Vehicle) => {
    setEditingVehicle(v);
    setEditPlate(v.plate);
    setEditBrand(v.brand || '');
    setEditSiderPlate(v.model || '');
    setEditYear(v.year ? String(v.year) : '');
    setEditType(v.type || '');
    setEditStatus(v.status || 'Disponível');
    setEditVehicleError(null);
  };

  const handleSaveVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicle) return;
    setSavingVehicle(true);
    setEditVehicleError(null);

    try {
      await api.updateVehicle(editingVehicle.id, {
        plate: editPlate.trim().toUpperCase(),
        brand: editBrand.trim() || null,
        model: editSiderPlate.trim().toUpperCase() || null,
        year: editYear ? parseInt(editYear, 10) : undefined,
        type: editType.trim() || null,
        status: editStatus,
      });
      setDeleteSuccess(`Veículo de placa ${editPlate} atualizado com sucesso!`);
      setTimeout(() => setDeleteSuccess(null), 3500);
      setEditingVehicle(null);
      loadVehicles();
    } catch (err: any) {
      setEditVehicleError(err.message || 'Erro ao atualizar veículo');
    } finally {
      setSavingVehicle(false);
    }
  };

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const data = await api.getVehicles({
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setVehicles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteVehicle = async () => {
    if (!vehicleToDelete) return;
    setDeletingVehicle(true);
    setDeleteError(null);

    try {
      await api.deleteVehicle(vehicleToDelete.id);
      setDeleteSuccess(`Veículo de placa ${vehicleToDelete.plate} excluído com sucesso!`);
      setTimeout(() => setDeleteSuccess(null), 3500);
      setVehicleToDelete(null);
      loadVehicles();
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao excluir veículo');
    } finally {
      setDeletingVehicle(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadVehicles();
  };

  const handleToggleStatus = async (vehicleId: string, newStatus: string) => {
    try {
      await api.toggleVehicleStatus(vehicleId, newStatus);
      loadVehicles();
      if (selectedVehicle?.id === vehicleId) {
        setSelectedVehicle((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status do veículo');
    }
  };

  const handleViewVehicleDetails = async (vehicleId: string) => {
    try {
      const details = await api.getVehicleDetails(vehicleId);
      setSelectedVehicle(details);
    } catch (err: any) {
      alert(err.message || 'Erro ao consultar veículo');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {deleteSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{deleteSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Frota e Gestão de Veículos
          </h1>
          <p className="text-xs text-zinc-500">
            Controle de cavalos mecânicos, carretas, bitrens e implementos rodoviários
          </p>
        </div>

        <button
          onClick={onOpenNewVehicleModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          + Novo Veículo
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por placa, número de frota, marca ou modelo..."
                className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            </form>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Todos os status</option>
              <option value="Disponível">Disponível</option>
              <option value="Em viagem">Em viagem</option>
              <option value="Manutenção">Manutenção</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicles Container */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        {/* Mobile View: Cards (block md:hidden) */}
        <div className="block md:hidden p-3 space-y-2.5">
          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Carregando veículos...
            </div>
          ) : vehicles.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Nenhum veículo cadastrado na frota.
            </div>
          ) : (
            vehicles.map((v) => {
              const conf = VEHICLE_STATUS_CONFIG[v.status] || VEHICLE_STATUS_CONFIG['Disponível'];
              return (
                <div
                  key={v.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-800/40 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-sm text-zinc-900 dark:text-white bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                      {v.plate}
                    </span>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${conf.badge}`}>
                      {conf.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-zinc-500">
                    <div>
                      <span className="text-zinc-400">Marca: </span>
                      <strong className="text-zinc-800 dark:text-zinc-200 font-semibold">{v.brand || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400">Placa Sider: </span>
                      <strong className="font-mono text-zinc-800 dark:text-zinc-200">{v.model || '—'}</strong>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() => handleViewVehicleDetails(v.id)}
                      className="flex items-center justify-center gap-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition min-h-[36px]"
                    >
                      <Eye className="h-3.5 w-3.5 text-blue-600" />
                      <span>Detalhes</span>
                    </button>
                    <button
                      onClick={() => startEditVehicle(v)}
                      className="flex items-center justify-center gap-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 py-2 text-xs font-bold border border-blue-200/80 dark:border-blue-900/50 transition min-h-[36px]"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => {
                        setVehicleToDelete(v);
                        setDeleteError(null);
                      }}
                      className="flex items-center justify-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 py-2 text-xs font-bold border border-rose-200/80 dark:border-rose-900/50 transition min-h-[36px]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
                <th className="px-4 py-3">Placa</th>
                <th className="px-4 py-3">Marca do Veículo</th>
                <th className="px-4 py-3">Placa do Sider</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-zinc-400">
                    Carregando veículos...
                  </td>
                </tr>
              ) : vehicles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-zinc-400">
                    Nenhum veículo cadastrado na frota.
                  </td>
                </tr>
              ) : (
                vehicles.map((v) => {
                  const conf = VEHICLE_STATUS_CONFIG[v.status] || VEHICLE_STATUS_CONFIG['Disponível'];
                  return (
                    <tr key={v.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-mono font-bold text-zinc-900 dark:text-white">
                        <span className="rounded bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                          {v.plate}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-800 dark:text-zinc-200">
                        {v.brand || '—'}
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-800 dark:text-zinc-200">
                        {v.model || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${conf.badge}`}>
                          {conf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleViewVehicleDetails(v.id)}
                            className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
                          >
                            <Eye className="h-3.5 w-3.5 text-blue-600" />
                            Detalhes
                          </button>
                          <button
                            onClick={() => startEditVehicle(v)}
                            className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200/80 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/60 transition"
                            title="Editar Veículo"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => {
                              setVehicleToDelete(v);
                              setDeleteError(null);
                            }}
                            className="flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 border border-rose-200/80 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition"
                            title="Excluir Veículo"
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

      {/* Vehicle Details Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
              <div className="flex items-center gap-3 flex-wrap">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Veículo: {selectedVehicle.plate}
                </h3>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-800">
                  <span className="text-zinc-500 dark:text-zinc-400 font-normal">Status:</span>
                  <span className={`font-bold ${
                    selectedVehicle.status === 'Disponível' ? 'text-emerald-600 dark:text-emerald-400' :
                    selectedVehicle.status === 'Em viagem' ? 'text-blue-600 dark:text-blue-400' :
                    selectedVehicle.status === 'Manutenção' ? 'text-amber-600 dark:text-amber-400' :
                    'text-zinc-500 dark:text-zinc-400'
                  }`}>
                    {selectedVehicle.status}
                  </span>
                </span>
              </div>
              <button onClick={() => setSelectedVehicle(null)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Trips with this vehicle */}
            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <History className="h-4 w-4 text-blue-600" />
                Últimas Viagens deste Veículo ({selectedVehicle.trips ? selectedVehicle.trips.length : 0})
              </h4>

              {selectedVehicle.trips && selectedVehicle.trips.length > 0 ? (
                <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800 overflow-hidden">
                  {selectedVehicle.trips.map((t: Trip) => {
                    const conf = TRIP_STATUS_CONFIG[t.status] || TRIP_STATUS_CONFIG['Programada'];
                    const formattedTime = formatAppointmentWindow(t.appointment_window, t.planned_departure);
                    return (
                      <div 
                        key={t.id} 
                        onClick={() => onOpenTripDetails(t)}
                        className="flex items-center justify-between p-3.5 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-zinc-900 dark:text-white">
                              {t.date.split('-').reverse().join('/')}
                            </span>
                            <span className="text-zinc-400">•</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
                              {formattedTime}
                            </span>
                            <span className={`rounded-full border px-2 py-0.2 text-[9px] font-bold ${conf.badge}`}>
                              {conf.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                            <span className="text-zinc-400">Motorista:</span> <strong className="text-zinc-800 dark:text-zinc-200">{t.driver_name}</strong> • <span className="text-zinc-400">Destino:</span> <strong className="text-zinc-800 dark:text-zinc-200">{t.factory_name}</strong>
                          </p>
                        </div>
                        <Eye className="h-4 w-4 text-zinc-400 shrink-0 ml-2" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 py-6 text-center">Nenhuma viagem registrada para este veículo.</p>
              )}
            </div>

            <div className="mt-5 flex justify-end border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <button
                onClick={() => setSelectedVehicle(null)}
                className="rounded-xl border border-zinc-200 px-4 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Vehicle Modal */}
      {editingVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-600" />
                Editar Veículo: {editingVehicle.plate}
              </h3>
              <button onClick={() => setEditingVehicle(null)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {editVehicleError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <p>{editVehicleError}</p>
              </div>
            )}

            <form onSubmit={handleSaveVehicle} className="mt-4 space-y-3">
              {/* Placa do Veículo */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Placa do Veículo *
                </label>
                <input
                  type="text"
                  required
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-mono font-bold uppercase text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              {/* Marca e Placa do Sider */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Marca
                  </label>
                  <select
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="">Não informada</option>
                    <option value="Scania">Scania</option>
                    <option value="Volvo">Volvo</option>
                    <option value="Mercedes-Benz">Mercedes-Benz</option>
                    <option value="DAF">DAF</option>
                    <option value="Volkswagen">Volkswagen</option>
                    <option value="Iveco">Iveco</option>
                    <option value="Outra">Outra</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Placa do Sider
                  </label>
                  <input
                    type="text"
                    value={editSiderPlate}
                    onChange={(e) => setEditSiderPlate(e.target.value.toUpperCase())}
                    placeholder="Ex: SID-9876 (Opcional)"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-mono uppercase text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Ano Fabricação */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Ano Fabricação
                </label>
                <input
                  type="number"
                  min="1990"
                  max="2035"
                  value={editYear}
                  onChange={(e) => setEditYear(e.target.value)}
                  placeholder="Ex: 2024"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Status Operacional *
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  <option value="Disponível">Disponível</option>
                  <option value="Em viagem">Em viagem</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingVehicle(null)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingVehicle}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingVehicle ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Vehicle Confirmation Modal */}
      {vehicleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-950/50">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Excluir Veículo?
                </h3>
                <p className="text-xs text-zinc-500">Esta ação removerá o veículo da frota cadastrada.</p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <p>{deleteError}</p>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/40 space-y-1">
              <p><span className="text-zinc-500">Placa:</span> <strong className="font-mono text-zinc-900 dark:text-white">{vehicleToDelete.plate}</strong></p>
              <p><span className="text-zinc-500">Modelo:</span> <strong className="text-zinc-900 dark:text-white">{vehicleToDelete.brand} {vehicleToDelete.model}</strong></p>
              <p><span className="text-zinc-500">Implemento:</span> <strong>{vehicleToDelete.type}</strong></p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setVehicleToDelete(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingVehicle}
                onClick={confirmDeleteVehicle}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {deletingVehicle ? 'Excluindo...' : 'Sim, Excluir Veículo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
