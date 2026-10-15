import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  LayoutDashboard, Users, Truck, Factory, Navigation, 
  CalendarClock, Calendar, TrendingUp, Settings,
  Home, User, X, Utensils
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView, isOpen, onClose }) => {
  const { role, user } = useAuth();

  const getMenuItems = () => {
    if (role === 'DESENVOLVEDOR') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'users', label: 'Usuários', icon: Users },
        { id: 'vehicles', label: 'Veículos', icon: Truck },
        { id: 'factories', label: 'Fábricas', icon: Factory },
        { id: 'trips', label: 'Viagens e Histórico', icon: Navigation },
        { id: 'schedules', label: 'Escalas', icon: CalendarClock },
        { id: 'calendar', label: 'Calendário', icon: Calendar },
        { id: 'indicators', label: 'Indicadores', icon: TrendingUp },
        { id: 'settings', label: 'Configurações', icon: Settings },
      ];
    }

    if (role === 'ADMINISTRADOR') {
      return [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'users', label: 'Usuários', icon: Users },
        { id: 'vehicles', label: 'Veículos', icon: Truck },
        { id: 'factories', label: 'Fábricas', icon: Factory },
        { id: 'trips', label: 'Viagens e Histórico', icon: Navigation },
        { id: 'schedules', label: 'Escalas', icon: CalendarClock },
        { id: 'calendar', label: 'Calendário', icon: Calendar },
        { id: 'indicators', label: 'Indicadores', icon: TrendingUp },
      ];
    }

    // MOTORISTA
    return [
      { id: 'driver-home', label: 'Início', icon: Home },
      { id: 'my-trips', label: 'Minhas Viagens', icon: Navigation },
      { id: 'driver-performance', label: 'Desempenho', icon: TrendingUp },
      { id: 'driver-meals', label: 'Refeições', icon: Utensils },
      { id: 'my-schedule', label: 'Minha Escala', icon: CalendarClock },
      { id: 'my-profile', label: 'Meu Perfil', icon: User },
    ];
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-blue-950/80 bg-[#0B1530] transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-blue-950 px-4 lg:hidden">
          <span className="font-bold text-white">Navegação</span>
          <button 
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-[#0D1B3E] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 py-3">
          <div className="rounded-xl border border-blue-900/50 bg-[#081028] p-3 shadow-inner">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Perfil Ativo</p>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-xs font-bold text-white truncate max-w-[130px]">{user?.name}</span>
              <span className="rounded bg-blue-950/80 border border-blue-800/80 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">
                {role}
              </span>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectView(item.id);
                  onClose();
                }}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                    : 'text-slate-300 hover:bg-[#0D1B3E] hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-blue-950 p-3 text-center">
          <p className="text-[10px] text-slate-500">
            Gestão de Puxada • Operação Logística
          </p>
        </div>
      </aside>
    </>
  );
};
