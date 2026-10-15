import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../services/api.ts';
import { 
  User, CreditCard, Phone, Truck, ShieldCheck, 
  Calendar, CheckCircle2 
} from 'lucide-react';

export const DriverProfilePage: React.FC = () => {
  const { user } = useAuth();
  const [driver, setDriver] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const driverId = user?.driver_id || (user as any)?.driverId;
    if (driverId) {
      api.getDriverDetails(driverId)
        .then(setDriver)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <User className="h-5 w-5 text-blue-600" />
          Meu Perfil de Motorista
        </h1>
        <p className="text-xs text-zinc-500">
          Dados cadastrais, documento de habilitação e vínculo com a frota
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-6">
        {/* User Card */}
        <div className="flex items-center gap-4 border-b border-zinc-100 pb-5 dark:border-zinc-800">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white font-black text-2xl shadow-md shadow-blue-500/20">
            {user?.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">{user?.name}</h2>
            <p className="text-xs text-zinc-500">Usuário do Sistema: <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200">{user?.login}</span></p>
            <p className="text-xs text-zinc-500">E-mail: {user?.email}</p>
          </div>
        </div>

        {/* Driver Attributes */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900/40 dark:bg-blue-950/20">
            <span className="text-[10px] text-zinc-500 font-bold uppercase">Matrícula (Login de Acesso)</span>
            <p className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm mt-1">
              {driver?.registration || user?.login || 'MOT-001'}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <span className="text-[10px] text-zinc-400 font-bold uppercase">Telefone de Contato</span>
            <p className="font-semibold text-zinc-900 dark:text-white mt-1">
              {driver?.phone || user?.phone || 'Não informado'}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <span className="text-[10px] text-zinc-400 font-bold uppercase">Status Operacional</span>
            <p className="font-bold text-emerald-600 mt-1">
              {driver?.status || 'Ativo'}
            </p>
          </div>

          {driver?.cnh && (
            <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
              <span className="text-[10px] text-zinc-400 font-bold uppercase">CNH</span>
              <p className="font-mono font-bold text-zinc-900 dark:text-white mt-1">
                {driver.cnh} (Cat {driver.cnh_category || 'E'})
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>Cadastro ativo, apto para condução rodoviária e escalas de puxada.</span>
        </div>
      </div>
    </div>
  );
};
