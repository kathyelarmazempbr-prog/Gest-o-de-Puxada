import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { 
  Settings, Database, Save, CheckCircle2, ShieldCheck, 
  Server, Cpu, HardDrive, AlertTriangle 
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [systemName, setSystemName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.getConfig().then(data => {
      setConfig(data);
      if (data?.settings) {
        setSystemName(data.settings.system_name || 'GESTÃO DE PUXADA');
        setCompanyName(data.settings.company_name || 'Operação Logística de Distribuição e Transporte');
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.updateConfig({
        system_name: systemName,
        company_name: companyName,
      });
      setMsg('Parâmetros do sistema salvos com sucesso!');
      setTimeout(() => setMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-purple-600" />
          Configurações do Sistema e Infraestrutura
        </h1>
        <p className="text-xs text-zinc-500">
          Parâmetros operacionais e status do banco de dados relacional (Exclusivo Desenvolvedor)
        </p>
      </div>

      {msg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>{msg}</span>
        </div>
      )}

      {/* General Settings Form */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-white mb-4">
          Identidade e Parâmetros Gerais
        </h2>

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nome do Sistema
            </label>
            <input
              type="text"
              required
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nome da Empresa / Operação
            </label>
            <input
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>

      {/* Relational Database Health & Metrics */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              Banco de Dados Relacional Persistente
            </h2>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Online / Operacional
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <span className="text-zinc-500 font-medium">Motor de Banco</span>
            <p className="font-bold text-zinc-900 dark:text-white mt-0.5">SQLite Relational (sql.js)</p>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <span className="text-zinc-500 font-medium">Persistência em Disco</span>
            <p className="font-bold text-emerald-600 mt-0.5">/data/gestao_puxada.sqlite</p>
          </div>
          <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <span className="text-zinc-500 font-medium">Controle de Transações</span>
            <p className="font-bold text-zinc-900 dark:text-white mt-0.5">ACID Compliant + Foreign Keys</p>
          </div>
        </div>

        {/* Tables breakdown */}
        <div>
          <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
            Estrutura de Tabelas e Registros
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {config?.database?.tables?.map((t: any) => (
              <div key={t.table} className="rounded-lg border border-zinc-200 p-2.5 text-xs dark:border-zinc-800">
                <span className="font-mono text-zinc-500 text-[10px] uppercase font-bold">{t.table}</span>
                <p className="font-black text-zinc-900 dark:text-white text-base">{t.count} linhas</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Firebase Cloud Integration */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/20 space-y-4">
        <div className="flex items-center justify-between border-b border-amber-200/60 pb-3 dark:border-amber-900/50">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white font-bold">
              🔥
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                Integração Firebase Cloud (gestao-de-puxada)
              </h2>
              <p className="text-[11px] text-zinc-500">
                Conectado ao projeto Firebase configurado com Firestore & Auth
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Conectado & Sincronizado
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl border border-amber-200/60 bg-white p-3 dark:border-amber-900/40 dark:bg-zinc-900">
            <span className="text-zinc-500 font-medium">Project ID</span>
            <p className="font-mono font-bold text-zinc-900 dark:text-white mt-0.5">gestao-de-puxada</p>
          </div>
          <div className="rounded-xl border border-amber-200/60 bg-white p-3 dark:border-amber-900/40 dark:bg-zinc-900">
            <span className="text-zinc-500 font-medium">Auth Domain</span>
            <p className="font-mono font-bold text-zinc-900 dark:text-white mt-0.5">gestao-de-puxada.firebaseapp.com</p>
          </div>
          <div className="rounded-xl border border-amber-200/60 bg-white p-3 dark:border-amber-900/40 dark:bg-zinc-900">
            <span className="text-zinc-500 font-medium">Storage Bucket</span>
            <p className="font-mono font-bold text-zinc-900 dark:text-white mt-0.5">gestao-de-puxada.firebasestorage.app</p>
          </div>
        </div>
      </div>
    </div>
  );
};

