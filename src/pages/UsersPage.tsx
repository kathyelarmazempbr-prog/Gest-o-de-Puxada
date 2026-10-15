import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api.ts';
import { localDataStore } from '../services/localDataStore.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { User, Role, UserStatus } from '../types/index.ts';
import { 
  Users, Plus, Search, Filter, Shield, UserCheck, Code2,
  Edit2, AlertCircle, CheckCircle2, X, Trash2, AlertTriangle, Truck,
  Eye, EyeOff, RefreshCw
} from 'lucide-react';

interface UsersPageProps {
  onOpenNewUserModal: () => void;
}

export const UsersPage: React.FC<UsersPageProps> = ({ onOpenNewUserModal }) => {
  const { user: currentUser, refreshUser } = useAuth();
  const [users, setUsers] = useState<User[]>(() => localDataStore.getUsers());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Editing state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLogin, setEditLogin] = useState('');
  const [editRole, setEditRole] = useState<Role>('ADMINISTRADOR');
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editStatus, setEditStatus] = useState<UserStatus>('Ativo');
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Deletion state
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers({
        search: search.trim() || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter, statusFilter]);

  // Client-side quick filter for instantaneous typing
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase().trim();
    return users.filter(u => 
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.login && u.login.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q))
    );
  }, [users, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditPhone(user.phone || '');
    setEditEmail(user.email || '');
    setEditLogin(user.login);
    setEditRole(user.role);
    setEditPassword(user.raw_password || user.password || '');
    setShowEditPassword(false);
    setEditStatus(user.status);
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (editPassword.trim() && editPassword.trim().length < 4) {
      setEditError('A nova senha deve possuir pelo menos 4 caracteres.');
      return;
    }

    setSaving(true);
    setEditError(null);

    const cleanEmail = editEmail.trim() ? editEmail.trim().toLowerCase() : null;
    const cleanPhone = editPhone.trim() || null;
    const cleanLogin = editLogin.trim().toUpperCase();
    const cleanName = editName.trim();
    // Allow empty password to leave unchanged, or update if provided
    const cleanPass = editPassword.trim();

    try {
      const payload: any = {
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        login: cleanLogin,
        role: editRole,
        status: editStatus,
      };

      if (cleanPass.length > 0) {
        payload.password = cleanPass;
      }

      const res: any = await api.updateUser(editingUser.id, payload);

      // Update in-memory user list immediately so UI reflects change without latency
      setUsers(prev => prev.map(u => {
        if (u.id === editingUser.id) {
          return {
            ...u,
            name: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
            login: cleanLogin,
            role: editRole,
            status: editStatus,
            raw_password: cleanPass || res?.user?.raw_password || u.raw_password,
            ...(res?.user || {}),
          };
        }
        return u;
      }));

      setSuccessMsg(`Usuário ${cleanName} atualizado com sucesso!`);
      setTimeout(() => setSuccessMsg(null), 3500);
      setEditingUser(null);

      // Refresh current user session if updating own profile
      if (currentUser?.id === editingUser.id) {
        refreshUser?.();
      }

      await loadUsers();
    } catch (err: any) {
      setEditError(err.message || 'Erro ao atualizar dados');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    setDeleting(true);
    setDeleteError(null);

    try {
      await api.deleteUser(userToDelete.id);
      setSuccessMsg(`Usuário ${userToDelete.name} (${userToDelete.login}) excluído permanentemente.`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setUserToDelete(null);
      loadUsers();
    } catch (err: any) {
      setDeleteError(err.message || 'Erro ao excluir usuário');
    } finally {
      setDeleting(false);
    }
  };

  // Harmonious & polished role badges
  const renderRoleBadge = (role: Role) => {
    switch (role) {
      case 'DESENVOLVEDOR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-violet-50 text-violet-700 border border-violet-200/80 shadow-xs dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800/60">
            <Code2 className="h-3 w-3 text-violet-600 dark:text-violet-400" />
            <span>Desenvolvedor</span>
          </span>
        );
      case 'ADMINISTRADOR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60">
            <Shield className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            <span>Administrador</span>
          </span>
        );
      case 'MOTORISTA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide bg-amber-50 text-amber-700 border border-amber-200/80 shadow-xs dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
            <Truck className="h-3 w-3 text-amber-600 dark:text-amber-400" />
            <span>Motorista</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-700 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Usuários
          </h1>
          <p className="text-xs text-zinc-500">
            Gestão unificada de usuários, perfis de acesso e permissões do sistema
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenNewUserModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            + Novo Usuário
          </button>
        </div>
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
                placeholder="Pesquisar por nome, login, e-mail ou telefone..."
                className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            </form>
          </div>

          <div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Todos os perfis</option>
              <option value="DESENVOLVEDOR">Desenvolvedor</option>
              <option value="ADMINISTRADOR">Administrador</option>
              <option value="MOTORISTA">Motorista</option>
            </select>
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
            </select>
          </div>
        </div>

        {/* Counter Summary */}
        <div className="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5 text-[11px] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <span>
            Exibindo <strong>{filteredUsers.length}</strong> de <strong>{users.length}</strong> usuário(s)
          </span>
          <div className="flex gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              {users.filter(u => u.role === 'DESENVOLVEDOR').length} Dev
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              {users.filter(u => u.role === 'ADMINISTRADOR').length} Admins
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {users.filter(u => u.role === 'MOTORISTA').length} Motoristas
            </span>
          </div>
        </div>
      </div>

      {/* Users Container */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
        {/* Mobile View: Cards (block md:hidden) */}
        <div className="block md:hidden p-3 space-y-2.5">
          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                <span>Carregando usuários...</span>
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              <p className="font-semibold text-zinc-600 dark:text-zinc-300">Nenhum usuário localizado.</p>
              <button
                onClick={onOpenNewUserModal}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
              >
                <Plus className="h-3.5 w-3.5" />
                Cadastrar Usuário
              </button>
            </div>
          ) : (
            filteredUsers.map((u) => (
              <div
                key={u.id}
                className="rounded-xl border border-zinc-200 bg-zinc-50/60 p-3 shadow-2xs dark:border-zinc-800 dark:bg-zinc-800/40 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-sm text-zinc-900 dark:text-white">{u.name}</h4>
                    <span className="font-mono text-xs font-bold text-zinc-600 dark:text-zinc-400">
                      Matrícula: {u.login}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {renderRoleBadge(u.role)}
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                      u.status === 'Ativo'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                    }`}>
                      {u.status}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-zinc-500 space-y-0.5">
                  {u.email && <p className="truncate">E-mail: <span className="text-zinc-700 dark:text-zinc-300 font-medium">{u.email}</span></p>}
                  {u.phone && <p className="truncate">Telefone: <span className="text-zinc-700 dark:text-zinc-300 font-medium">{u.phone}</span></p>}
                </div>

                <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex items-center justify-end gap-2">
                  <button
                    onClick={() => startEdit(u)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 py-2 px-3 text-xs font-bold text-zinc-800 dark:text-zinc-200 transition min-h-[36px]"
                  >
                    <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                    <span>Editar</span>
                  </button>
                  {u.id !== 'usr_dev_master' && (
                    <button
                      onClick={() => setUserToDelete(u)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 py-2 px-3 text-xs font-bold border border-rose-200/80 dark:border-rose-900/50 transition min-h-[36px]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Excluir</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table (hidden md:block) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/70 text-[11px] font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/40">
                <th className="px-4 py-3">Nome Completo</th>
                <th className="px-4 py-3">Matrícula</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-zinc-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                      <span>Carregando usuários...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-zinc-400">
                    <p className="font-semibold text-zinc-600 dark:text-zinc-300">Nenhum usuário localizado.</p>
                    <button
                      onClick={onOpenNewUserModal}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Cadastrar Usuário
                    </button>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition">
                    <td className="px-4 py-3 font-semibold text-zinc-900 dark:text-white">
                      {u.name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-700">
                        {u.login}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {u.email || <span className="text-zinc-400 italic">Não informado</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-600 dark:text-zinc-300">
                      {u.phone || <span className="text-zinc-400 italic">Não informado</span>}
                    </td>
                    <td className="px-4 py-3">
                      {renderRoleBadge(u.role)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        u.status === 'Ativo'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          : 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${u.status === 'Ativo' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => startEdit(u)}
                          className="flex items-center gap-1 rounded-lg bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 transition"
                          title="Editar dados do usuário"
                        >
                          <Edit2 className="h-3.5 w-3.5 text-blue-600" />
                          <span>Editar</span>
                        </button>
                        {u.id !== 'usr_dev_master' && (
                          <button
                            onClick={() => setUserToDelete(u)}
                            className="flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-100 border border-rose-200/80 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition"
                            title="Excluir Usuário"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Excluir</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="rounded-xl bg-rose-50 p-3 dark:bg-rose-950/50">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Excluir Usuário?
                </h3>
                <p className="text-xs text-zinc-500">Esta ação é irreversível e excluirá o usuário do sistema.</p>
              </div>
            </div>

            {deleteError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <p>{deleteError}</p>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/40 space-y-1">
              <p><span className="text-zinc-500">Nome:</span> <strong className="text-zinc-900 dark:text-white">{userToDelete.name}</strong></p>
              <p><span className="text-zinc-500">Matrícula:</span> <strong className="font-mono text-zinc-900 dark:text-white">{userToDelete.login}</strong></p>
              <p><span className="text-zinc-500">Perfil:</span> <strong>{userToDelete.role}</strong></p>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-50"
              >
                {deleting ? 'Excluindo...' : 'Sim, Excluir Usuário'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Editar Usuário: {editingUser.name}
              </h3>
              <button onClick={() => setEditingUser(null)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <X className="h-5 w-5" />
              </button>
            </div>

            {editError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                <p>{editError}</p>
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3" autoComplete="off">
              {/* Dummy hidden fields to trap browser password autofill / Google Password Manager */}
              <input type="text" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
              <input type="password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
              {/* Perfil Dropdown */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Perfil do Usuário *
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-medium"
                >
                  <option value="DESENVOLVEDOR">Desenvolvedor</option>
                  <option value="ADMINISTRADOR">Administrador</option>
                  <option value="MOTORISTA">Motorista</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Matrícula *
                  </label>
                  <input
                    type="text"
                    required
                    value={editLogin}
                    onChange={(e) => setEditLogin(e.target.value.toUpperCase())}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-mono font-bold text-zinc-900 uppercase focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="(Opcional)"
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  E-mail
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="exemplo@email.com (Opcional)"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Senha de Acesso
                  </label>
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      id="custom_edit_usr_pwd_val"
                      name="custom_edit_usr_pwd_val"
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="Senha do usuário"
                      autoComplete="new-password"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 pr-8 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-2.5 top-2.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                      tabIndex={-1}
                      title={showEditPassword ? 'Ocultar senha' : 'Exibir senha'}
                    >
                      {showEditPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Status *
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
