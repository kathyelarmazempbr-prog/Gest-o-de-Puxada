import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { localDataStore } from '../services/localDataStore.ts';
import { Factory, FACTORY_STATUS_CONFIG } from '../types/index.ts';
import { 
  Building2, Plus, Search, Filter, MapPin, 
  Edit2, AlertTriangle, X, Trash2, CheckCircle2 
} from 'lucide-react';

interface FactoriesPageProps {
  onOpenNewFactoryModal: () => void;
}

export const FactoriesPage: React.FC<FactoriesPageProps> = ({ onOpenNewFactoryModal }) => {
  const [factories, setFactories] = useState<Factory[]>(() => localDataStore.getFactories());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Editing state
  const [editingFactory, setEditingFactory] = useState<Factory | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editState, setEditState] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editStatus, setEditStatus] = useState<'Ativa' | 'Inativa'>('Ativa');
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Deletion state
  const [factoryToDelete, setFactoryToDelete] = useState<Factory | null>(null);
  const [deletingFactory, setDeletingFactory] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const loadFactories = async () => {
    setLoading(true);
    try {
      const data = await api.getFactories({
        search: search || undefined,
        state: stateFilter || undefined,
        status: statusFilter || undefined,
      });
      setFactories(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFactories();
  }, [stateFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadFactories();
  };

  const startEdit = (fac: Factory) => {
    setEditingFactory(fac);
    setEditCode(fac.factory_code);
    setEditName(fac.name);
    setEditState(fac.state);
    setEditCity(fac.city || '');
    setEditStatus(fac.status);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFactory) return;
    setSaving(true);
    setEditError(null);

    try {
      await api.updateFactory(editingFactory.id, {
        factory_code: editCode,
        name: editName,
        state: editState,
        city: editCity,
        status: editStatus,
      });
      setEditingFactory(null);
      loadFactories();
    } catch (err: any) {
      setEditError(err.message || 'Erro ao atualizar fábrica');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteFactory = async () => {
    if (!factoryToDelete) return;
    setDeletingFactory(true);
    setDeleteError(null);
    try {
      await api.deleteFactory(factoryToDelete.id);
      setDeleteSuccess(`Fábrica ${factoryToDelete.name} excluída com sucesso!`);
      setTimeout(() => setDeleteSuccess(null), 3500);
      setFactoryToDelete(null);
      loadFactories();
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao excluir fábrica');
    } finally {
      setDeletingFactory(false);
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
            <Building2 className="h-5 w-5 text-blue-600" />
            Cadastro de Fábricas e Plantas Fabris
          </h1>
          <p className="text-xs text-zinc-500">
            Unidades industriais de carregamento e descarregamento das viagens de puxada
          </p>
        </div>

        <button
          onClick={onOpenNewFactoryModal}
          className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          + Nova Fábrica
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
          <div className="col-span-1 sm:col-span-2">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por código, nome da fábrica ou cidade..."
                className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            </form>
          </div>

          <div>
            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Todos os estados</option>
              <option value="PE">Pernambuco (PE)</option>
              <option value="CE">Ceará (CE)</option>
              <option value="BA">Bahia (BA)</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Todos os status</option>
              <option value="Ativa">Ativa</option>
              <option value="Inativa">Inativa</option>
            </select>
          </div>
        </div>
      </div>

      {/* Factories Container */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        {/* Mobile View: Cards (block md:hidden) */}
        <div className="block md:hidden p-3 space-y-2.5">
          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Carregando fábricas...
            </div>
          ) : factories.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              Nenhuma fábrica cadastrada.
            </div>
          ) : (
            factories.map((fac) => {
              const conf = FACTORY_STATUS_CONFIG[fac.status] || FACTORY_STATUS_CONFIG['Ativa'];
              return (
                <div
                  key={fac.id}
                  className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-800/40 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{fac.name}</h4>
                      <p className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                        Código: {fac.factory_code} • UF: {fac.state}
                      </p>
                    </div>
                    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${conf.badge}`}>
                      {conf.label}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-end gap-2">
                    <button
                      onClick={() => startEdit(fac)}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition min-h-[36px]"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => {
                        setFactoryToDelete(fac);
                        setDeleteError(null);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 py-2 text-xs font-bold border border-rose-200/80 dark:border-rose-900/50 transition min-h-[36px]"
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
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Fábrica</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-zinc-400">
                    Carregando fábricas...
                  </td>
                </tr>
              ) : factories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-zinc-400">
                    Nenhuma fábrica cadastrada.
                  </td>
                </tr>
              ) : (
                factories.map((fac) => {
                  const conf = FACTORY_STATUS_CONFIG[fac.status] || FACTORY_STATUS_CONFIG['Ativa'];
                  return (
                    <tr key={fac.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50">
                      <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {fac.factory_code}
                      </td>
                      <td className="px-4 py-3 font-bold text-zinc-900 dark:text-white">
                        {fac.name}
                      </td>
                      <td className="px-4 py-3 font-bold text-zinc-800 dark:text-zinc-200">
                        {fac.state}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${conf.badge}`}>
                          {conf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEdit(fac)}
                            className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
                            title="Editar fábrica"
                          >
                            <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={() => {
                              setFactoryToDelete(fac);
                              setDeleteError(null);
                            }}
                            className="flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 border border-rose-200/80 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition"
                            title="Excluir Fábrica"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Edit Factory Modal */}
      {editingFactory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Editar Fábrica
              </h3>
              <button onClick={() => setEditingFactory(null)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Código</label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 font-mono font-bold dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Nome da Fábrica</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Estado (UF)</label>
                <input
                  type="text"
                  required
                  maxLength={2}
                  value={editState}
                  onChange={(e) => setEditState(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 uppercase font-bold dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                >
                  <option value="Ativa">Ativa</option>
                  <option value="Inativa">Inativa</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingFactory(null)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white shadow-sm hover:bg-blue-700"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Factory Confirmation Modal */}
      {factoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-950/50">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Excluir Fábrica?
                </h3>
                <p className="text-xs text-zinc-500">Esta ação removerá a unidade fabril do sistema.</p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <p>{deleteError}</p>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/40 space-y-1">
              <p><span className="text-zinc-500">Código:</span> <strong className="font-mono text-zinc-900 dark:text-white">{factoryToDelete.factory_code}</strong></p>
              <p><span className="text-zinc-500">Nome:</span> <strong className="text-zinc-900 dark:text-white">{factoryToDelete.name}</strong></p>
              <p><span className="text-zinc-500">Localização:</span> <strong>{factoryToDelete.city ? `${factoryToDelete.city} - ${factoryToDelete.state}` : factoryToDelete.state}</strong></p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setFactoryToDelete(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingFactory}
                onClick={confirmDeleteFactory}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {deletingFactory ? 'Excluindo...' : 'Sim, Excluir Fábrica'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
