import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { X, UserCheck, AlertTriangle, KeyRound, Eye, EyeOff } from 'lucide-react';

interface NewDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewDriverModal: React.FC<NewDriverModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [registration, setRegistration] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'Ativo' | 'Inativo' | 'Férias' | 'Afastado'>('Ativo');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setRegistration('');
      setPhone('');
      setStatus('Ativo');
      setPassword('');
      setShowPassword(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanReg = registration.trim();
    const cleanPhone = phone.trim();

    if (!cleanName || !cleanReg) {
      setError('Preencha os campos obrigatórios: Nome Completo e Matrícula.');
      return;
    }

    if (password && password.trim().length > 0 && password.trim().length < 4) {
      setError('A senha deve conter pelo menos 4 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createDriver({
        name: cleanName,
        registration: cleanReg,
        phone: cleanPhone || undefined,
        status,
        password: password.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar motorista');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              Cadastrar Novo Motorista
            </h2>
            <p className="text-xs text-zinc-500">Dados do condutor e credenciais de acesso</p>
          </div>
          <button 
            onClick={onClose} 
            className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Nome Completo */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nome Completo do Motorista *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Roberto Alves de Souza"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          {/* Matrícula (Login) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Matrícula *
              </label>
              <span className="text-[10px] text-blue-600 font-medium">Será o login de acesso</span>
            </div>
            <input
              type="text"
              required
              value={registration}
              onChange={(e) => setRegistration(e.target.value.toUpperCase())}
              placeholder="Ex: MOT-004 ou 10420"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-mono font-bold text-zinc-900 uppercase focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          {/* Telefone (Opcional) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Telefone de Contato
              </label>
              <span className="text-[10px] text-zinc-400 font-medium">Opcional</span>
            </div>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: (81) 99999-8888 (opcional)"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          {/* Status Operacional */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Status Operacional *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="Ativo">Ativo (Habilitado para viagens e escalas)</option>
              <option value="Inativo">Inativo (Bloqueado no sistema)</option>
              <option value="Férias">Férias</option>
              <option value="Afastado">Afastado</option>
            </select>
          </div>

          {/* Opção de Senha do Motorista (Sem preenchimento automático) */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 dark:border-blue-900/40 dark:bg-blue-950/20">
            <div className="flex items-center gap-1.5 mb-1.5">
              <KeyRound className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                Acesso do Motorista
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2">
              O motorista entrará com o login <strong className="text-zinc-800 dark:text-zinc-200 font-mono">{registration || '[Matrícula]'}</strong>
            </p>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Opção de Senha
                </label>
                <span className="text-[10px] text-zinc-400">Opcional</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite uma senha ou deixe em branco"
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 pr-8 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                Se deixar em branco, o sistema definirá a senha padrão <strong className="text-zinc-700 dark:text-zinc-300 font-mono">123456</strong>.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : 'Cadastrar Motorista'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
