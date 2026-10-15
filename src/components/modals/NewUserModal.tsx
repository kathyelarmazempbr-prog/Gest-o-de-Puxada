import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { X, Users, AlertTriangle, KeyRound, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react';

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialRole?: 'DESENVOLVEDOR' | 'ADMINISTRADOR' | 'MOTORISTA';
}

export const NewUserModal: React.FC<NewUserModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialRole = 'ADMINISTRADOR'
}) => {
  const [role, setRole] = useState<'DESENVOLVEDOR' | 'ADMINISTRADOR' | 'MOTORISTA'>('ADMINISTRADOR');
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<string>('Ativo');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever opened
  useEffect(() => {
    if (isOpen) {
      setRole(initialRole || 'ADMINISTRADOR');
      setName('');
      setLogin('');
      setPhone('');
      setEmail('');
      setPassword('');
      setShowPassword(false);
      setStatus('Ativo');
      setError(null);
    }
  }, [isOpen, initialRole]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanLogin = login.trim().toUpperCase();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setError('Informe o nome completo.');
      return;
    }

    if (!cleanLogin) {
      setError(role === 'MOTORISTA' ? 'Informe a matrícula do motorista.' : 'Informe o login de acesso.');
      return;
    }

    if (password && password.trim().length > 0 && password.trim().length < 4) {
      setError('A senha deve conter pelo menos 4 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createUser({
        name: cleanName,
        login: cleanLogin,
        role,
        email: cleanEmail || undefined,
        phone: cleanPhone || undefined,
        status,
        password: password.trim() || undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar usuário');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Cadastro de Usuário
            </h2>
            <p className="text-xs text-zinc-500">
              Cadastre usuários com perfil de Desenvolvedor, Administrador ou Motorista
            </p>
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5" autoComplete="off">
          {/* Dummy hidden fields to prevent browser password managers from auto-filling */}
          <input type="text" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
          <input type="password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
          {/* Menu Suspenso de Perfil */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Perfil do Usuário *
            </label>
            <div className="relative">
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as any);
                  setError(null);
                }}
                className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-medium"
              >
                <option value="DESENVOLVEDOR">Desenvolvedor</option>
                <option value="ADMINISTRADOR">Administrador</option>
                <option value="MOTORISTA">Motorista</option>
              </select>
            </div>
          </div>

          {/* Nome Completo */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={role === 'MOTORISTA' ? 'Ex: Manoel Messias' : 'Ex: Carlos Eduardo'}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          {/* Matrícula */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Matrícula *
              </label>
              <span className="text-[10px] text-zinc-400">
                Identificador de acesso
              </span>
            </div>
            <input
              type="text"
              required
              value={login}
              onChange={(e) => setLogin(e.target.value.toUpperCase())}
              placeholder={role === 'MOTORISTA' ? 'Ex: G1044 ou MOT-004' : 'Ex: carlos.mendes'}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-mono font-bold text-zinc-900 uppercase focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          {/* E-mail (Opcional, sem qualquer sugestão automática) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                E-mail
              </label>
              <span className="text-[10px] text-zinc-400">Opcional</span>
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite o e-mail ou deixe em branco"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          {/* Telefone (Opcional) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Telefone de Contato
              </label>
              <span className="text-[10px] text-zinc-400">Opcional</span>
            </div>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: (81) 99999-8888"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
              {role === 'MOTORISTA' && (
                <>
                  <option value="Férias">Férias</option>
                  <option value="Afastado">Afastado</option>
                </>
              )}
            </select>
          </div>

          {/* Opção de Senha */}
          <div className="rounded-xl border border-zinc-200 bg-zinc-50/70 p-3.5 dark:border-zinc-800 dark:bg-zinc-800/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <KeyRound className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                Senha de Acesso
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Senha Inicial
                </label>
                <span className="text-[10px] text-zinc-400">Opcional</span>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="custom_usr_pwd_val"
                  name="custom_usr_pwd_val"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite a senha (ou deixe em branco)"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  data-lpignore="true"
                  data-1p-ignore="true"
                  data-form-type="other"
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
              {submitting ? 'Salvando...' : 'Salvar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
