import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.ts';
import { Driver, DRIVER_STATUS_CONFIG, Trip, TRIP_STATUS_CONFIG } from '../types/index.ts';
import { 
  UserCheck, Plus, Search, Filter, Phone, KeyRound, 
  Eye, History, X, RefreshCw, Edit3, CheckCircle2, AlertTriangle, ShieldCheck
} from 'lucide-react';

interface DriversPageProps {
  onOpenNewDriverModal: () => void;
  onOpenTripDetails: (trip: Trip) => void;
}

export const DriversPage: React.FC<DriversPageProps> = ({ 
  onOpenNewDriverModal,
  onOpenTripDetails
}) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'recent' | 'name'>('recent');

  // Driver details modal
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Edit driver modal
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editName, setEditName] = useState('');
  const [editRegistration, setEditRegistration] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState<'Ativo' | 'Inativo' | 'Férias' | 'Afastado'>('Ativo');
  const [editPassword, setEditPassword] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const data = await api.getDrivers({
        search: search.trim() || undefined,
        status: statusFilter || undefined,
      });
      setDrivers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrivers();
  }, [statusFilter, sortOrder]);

  // Client-side quick filter for instantaneous typing response
  const filteredDrivers = useMemo(() => {
    let list = [...drivers];
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(d => 
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.registration && d.registration.toLowerCase().includes(q)) ||
        (d.phone && d.phone.toLowerCase().includes(q)) ||
        (d.cpf && d.cpf.includes(q))
      );
    }
    if (sortOrder === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    }
    return list;
  }, [drivers, search, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadDrivers();
  };

  const handleToggleStatus = async (driver: Driver, newStatus: string) => {
    try {
      await api.toggleDriverStatus(driver.id, newStatus);
      setActionSuccess(`Status do motorista ${driver.name} alterado para ${newStatus}`);
      setTimeout(() => setActionSuccess(null), 3500);
      loadDrivers();
      if (selectedDriver?.id === driver.id) {
        setSelectedDriver((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err: any) {
      alert(err.message || 'Erro ao alterar status do motorista');
    }
  };

  const handleViewHistory = async (driverId: string) => {
    setLoadingDetails(true);
    try {
      const details = await api.getDriverDetails(driverId);
      setSelectedDriver(details);
    } catch (err: any) {
      alert(err.message || 'Erro ao carregar detalhes do motorista');
    } finally {
      setLoadingDetails(false);
    }
  };

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver);
    setEditName(driver.name);
    setEditRegistration(driver.registration);
    setEditPhone(driver.phone || '');
    setEditStatus(driver.status as any || 'Ativo');
    setEditPassword('');
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDriver) return;
    setSavingEdit(true);
    setEditError(null);

    try {
      await api.updateDriver(editingDriver.id, {
        name: editName.trim(),
        registration: editRegistration.trim().toUpperCase(),
        phone: editPhone.trim() || null,
        status: editStatus,
      });

      // If password provided and driver has user_id, update user's password too
      if (editPassword.trim().length >= 4 && editingDriver.user_id) {
        await api.updateUser(editingDriver.user_id, {
          password: editPassword.trim(),
        });
      }

      setActionSuccess(`Cadastro do motorista ${editName} atualizado com sucesso!`);
      setTimeout(() => setActionSuccess(null), 4000);
      setEditingDriver(null);
      loadDrivers();
    } catch (err: any) {
      setEditError(err.message || 'Erro ao salvar alterações');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {actionSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            Cadastro e Gestão de Motoristas
          </h1>
          <p className="text-xs text-zinc-500">
            Controle operacional de condutores, matrículas de acesso e status de frota
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadDrivers}
            className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Atualizar lista"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={onOpenNewDriverModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            + Novo Motorista
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por nome, matrícula ou telefone..."
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
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
              <option value="Férias">Férias</option>
              <option value="Afastado">Afastado</option>
            </select>
          </div>

          <div>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="recent">Mais recentes primeiro</option>
              <option value="name">Ordem alfabética (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Counter Summary */}
        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <span>
            Exibindo <strong>{filteredDrivers.length}</strong> de <strong>{drivers.length}</strong> motorista(s)
          </span>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {drivers.filter(d => d.status === 'Ativo').length} Ativos
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-zinc-400" />
              {drivers.filter(d => d.status === 'Inativo').length} Inativos
            </span>
          </div>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40">
                <th className="px-4 py-3">Nome do Motorista</th>
                <th className="px-4 py-3">Matrícula (Login de Acesso)</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Status Operacional</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-zinc-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                      <span>Carregando motoristas...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredDrivers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-zinc-400">
                    <p className="font-semibold text-zinc-600 dark:text-zinc-300">Nenhum motorista encontrado.</p>
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {search ? 'Tente ajustar os termos da pesquisa.' : 'Cadastre seu primeiro motorista no botão acima.'}
                    </p>
                    <button
                      onClick={onOpenNewDriverModal}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Cadastrar Motorista
                    </button>
                  </td>
                </tr>
              ) : (
                filteredDrivers.map((d) => {
                  const conf = DRIVER_STATUS_CONFIG[d.status] || DRIVER_STATUS_CONFIG['Ativo'];
                  const isRecent = d.created_at && (Date.now() - new Date(d.created_at).getTime() < 1000 * 60 * 60 * 24);

                  return (
                    <tr key={d.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-900 dark:text-white">
                            {d.name}
                          </span>
                          {isRecent && (
                            <span className="rounded-full bg-blue-100 px-2 py-0.2 text-[9px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                              Novo
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900">
                          {d.registration}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-700 dark:text-zinc-300 font-medium">
                        {d.phone ? (
                          <span>{d.phone}</span>
                        ) : (
                          <span className="text-zinc-400 italic">Não informado</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${conf.badge}`}>
                          {conf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditModal(d)}
                            className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                            title="Editar motorista"
                          >
                            <Edit3 className="h-3.5 w-3.5 text-zinc-500" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleViewHistory(d.id)}
                            className="flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50"
                            title="Ver histórico de viagens"
                          >
                            <History className="h-3.5 w-3.5 text-blue-600" />
                            Histórico
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

      {/* Edit Driver Modal */}
      {editingDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Edit3 className="h-5 w-5 text-blue-600" />
                  Editar Motorista
                </h3>
                <p className="text-xs text-zinc-500">Atualizar dados ou credenciais do condutor</p>
              </div>
              <button 
                onClick={() => setEditingDriver(null)} 
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <p>{editError}</p>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Matrícula (Login de Acesso) *
                </label>
                <input
                  type="text"
                  required
                  value={editRegistration}
                  onChange={(e) => setEditRegistration(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-mono font-bold text-zinc-900 uppercase focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Telefone de Contato (Opcional)
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Ex: (81) 99999-8888"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Status Operacional *
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  <option value="Ativo">Ativo (Habilitado para viagens e escalas)</option>
                  <option value="Inativo">Inativo (Bloqueado no sistema)</option>
                  <option value="Férias">Férias</option>
                  <option value="Afastado">Afastado</option>
                </select>
              </div>

              {/* Redefinição de Senha */}
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
                <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nova Senha (deixe em branco para manter a atual)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Digite uma nova senha se desejar alterar"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingDriver(null)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Driver History Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-start justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Histórico do Motorista: {selectedDriver.name}
                  </h3>
                  <span className={`rounded-full border px-2 py-0.2 text-[10px] font-bold ${DRIVER_STATUS_CONFIG[selectedDriver.status as keyof typeof DRIVER_STATUS_CONFIG]?.badge}`}>
                    {selectedDriver.status}
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Matrícula (Login): <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{selectedDriver.registration}</span> • Telefone: {selectedDriver.phone || 'Não informado'}
                </p>
              </div>
              <button onClick={() => setSelectedDriver(null)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Status Alteration */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/40">
              <span className="font-medium text-zinc-600 dark:text-zinc-300">Alterar Status Operacional:</span>
              <div className="flex flex-wrap gap-1.5">
                {(['Ativo', 'Inativo', 'Férias', 'Afastado'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => handleToggleStatus(selectedDriver, st)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                      selectedDriver.status === st
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Trip List */}
            <div className="mt-4 space-y-3">
              <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                Viagens Registradas ({selectedDriver.trips ? selectedDriver.trips.length : 0})
              </h4>

              {selectedDriver.trips && selectedDriver.trips.length > 0 ? (
                <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800 overflow-hidden">
                  {selectedDriver.trips.map((t: Trip) => {
                    const conf = TRIP_STATUS_CONFIG[t.status] || TRIP_STATUS_CONFIG['Programada'];
                    return (
                      <div 
                        key={t.id} 
                        onClick={() => onOpenTripDetails(t)}
                        className="flex items-center justify-between p-3 text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-900 dark:text-white">
                              {t.date.split('-').reverse().join('/')} às {t.planned_departure}
                            </span>
                            <span className={`rounded-full border px-1.5 py-0.2 text-[9px] font-bold ${conf.badge}`}>
                              {conf.label}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            Destino: {t.factory_name} ({t.factory_state}) • Veículo: {t.vehicle_plate}
                          </p>
                        </div>
                        <Eye className="h-4 w-4 text-zinc-400 hover:text-zinc-600" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 py-4 text-center">Nenhuma viagem vinculada a este motorista.</p>
              )}
            </div>

            <div className="mt-5 flex justify-end border-t border-zinc-100 pt-3 dark:border-zinc-800">
              <button
                onClick={() => setSelectedDriver(null)}
                className="rounded-xl border border-zinc-200 px-4 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
