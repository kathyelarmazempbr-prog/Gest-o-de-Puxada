import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Truck, LogOut, User, Menu, ChevronDown
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
  onOpenTestsModal: () => void;
  currentView: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, role, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const getRoleBadge = (r: string) => {
    switch (r) {
      case 'DESENVOLVEDOR':
        return 'bg-purple-950/70 text-purple-300 border-purple-800';
      case 'ADMINISTRADOR':
        return 'bg-blue-950/70 text-blue-300 border-blue-800';
      case 'MOTORISTA':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800';
      default:
        return 'bg-slate-900 text-slate-300 border-slate-700';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-blue-950/80 bg-[#0B1530]/95 px-4 backdrop-blur-md lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-lg p-2 text-slate-300 hover:bg-[#0D1B3E] hover:text-white focus:outline-none lg:hidden"
          title="Alternar Menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/30">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white">
                Gestão de Puxada
              </span>
            </div>
            <p className="hidden text-xs text-slate-400 sm:block">
              Operação Logística de Puxada
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* User Profile Pill & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-xl border border-blue-900/60 bg-[#0D1B3E] p-1.5 pr-3 text-left transition hover:bg-[#122452] text-white"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/30 font-semibold text-blue-300 border border-blue-500/30">
              {user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-tight text-white">
                {user?.name}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-block rounded border px-1.5 py-0.2 text-[9px] font-bold ${getRoleBadge(role || '')}`}>
                  {role}
                </span>
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-blue-900 bg-[#0B1530] p-2 shadow-2xl z-50">
              <div className="px-3 py-2 border-b border-blue-950">
                <p className="text-xs font-medium text-slate-400">Conectado como</p>
                <p className="text-xs font-bold text-white truncate">{user?.login}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sair da Conta
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
