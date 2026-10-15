import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { AuditLog } from '../types/index.ts';
import { 
  ShieldAlert, Search, Filter, Calendar, Clock, 
  User, ShieldCheck, RefreshCw 
} from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [moduleFilter, setModuleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({
        module: moduleFilter || undefined,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [moduleFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-purple-600" />
            Auditoria e Rastreabilidade do Sistema
          </h1>
          <p className="text-xs text-zinc-500">
            Registro imutável de todas as ações críticas executadas na aplicação (Exclusivo Desenvolvedor)
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar Logs
        </button>
      </div>

      {/* Filters Bar (Section 19) */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Módulo</label>
            <select
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Todos os módulos</option>
              <option value="AUTENTICAÇÃO">Autenticação</option>
              <option value="VIAGENS">Viagens</option>
              <option value="ESCALAS">Escalas</option>
              <option value="MOTORISTAS">Motoristas</option>
              <option value="VEÍCULOS">Veículos</option>
              <option value="FÁBRICAS">Fábricas</option>
              <option value="USUÁRIOS">Usuários</option>
              <option value="CONFIGURAÇÕES">Configurações</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">A partir de</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Até</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-zinc-500 uppercase mb-0.5">Pesquisar</label>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por usuário, ação ou detalhe..."
                className="w-full rounded-xl border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <Search className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
            </form>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40">
                <th className="px-4 py-3">Data e Horário</th>
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Módulo</th>
                <th className="px-4 py-3">Ação Realizada</th>
                <th className="px-4 py-3">Registro / ID</th>
                <th className="px-4 py-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-zinc-400 font-sans">
                    Carregando registros de auditoria...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-zinc-400 font-sans">
                    Nenhum registro de auditoria encontrado.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const d = new Date(log.created_at);
                  const formattedDate = d.toLocaleDateString('pt-BR');
                  const formattedTime = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                  return (
                    <tr key={log.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50">
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-300">
                        <span className="font-bold text-zinc-900 dark:text-white">{formattedDate}</span>
                        <span className="text-zinc-400 ml-1.5">{formattedTime}</span>
                      </td>
                      <td className="px-4 py-3 font-semibold font-sans text-zinc-900 dark:text-white">
                        {log.user_name}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-bold text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                          {log.user_role}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">
                        {log.module}
                      </td>
                      <td className="px-4 py-3 font-sans font-semibold text-zinc-800 dark:text-zinc-200">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {log.record_id || '—'}
                      </td>
                      <td className="px-4 py-3 font-sans text-zinc-600 dark:text-zinc-300 max-w-md">
                        {log.details || '—'}
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
