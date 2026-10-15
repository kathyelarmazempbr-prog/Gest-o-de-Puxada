import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Home, Navigation, TrendingUp, Utensils, CalendarClock,
  LayoutDashboard, Menu
} from 'lucide-react';

interface MobileBottomNavProps {
  currentView: string;
  onSelectView: (view: string) => void;
  onToggleMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onSelectView,
  onToggleMenu,
}) => {
  const { role } = useAuth();

  // Navigation tabs for DRIVER (5 direct items: Início, Viagens, Desempenho, Refeições, Minha Escala)
  if (role === 'MOTORISTA') {
    const tabs = [
      { id: 'driver-home', label: 'Início', icon: Home },
      { id: 'my-trips', label: 'Viagens', icon: Navigation },
      { id: 'driver-performance', label: 'Desempenho', icon: TrendingUp },
      { id: 'driver-meals', label: 'Refeições', icon: Utensils },
      { id: 'my-schedule', label: 'Minha Escala', icon: CalendarClock },
    ];

    return (
      <nav 
        aria-label="Navegação inferior mobile do motorista"
        className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#0B1530]/95 backdrop-blur-md border-t border-blue-950/80 shadow-2xl px-1 py-1"
        style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
      >
        <div className="grid grid-cols-5 items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectView(tab.id)}
                className={`flex flex-col items-center justify-center py-1.5 px-0.5 min-h-[48px] rounded-xl transition-all ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-bold'
                    : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
                }`}
              >
                <div className={`relative flex items-center justify-center p-1 rounded-xl transition ${
                  isActive ? 'bg-blue-50 dark:bg-blue-950/60' : ''
                }`}>
                  <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                  {isActive && (
                    <span className="absolute -bottom-0.5 h-1 w-3 rounded-full bg-blue-600 dark:bg-blue-400" />
                  )}
                </div>
                <span className="text-[10px] tracking-tight leading-tight mt-0.5 truncate max-w-[64px]">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    );
  }

  // Navigation tabs for ADMIN / DEVELOPER
  const adminTabs = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'trips', label: 'Viagens', icon: Navigation },
    { id: 'schedules', label: 'Escalas', icon: CalendarClock },
    { id: 'indicators', label: 'KPIs', icon: TrendingUp },
  ];

  return (
    <nav 
      aria-label="Navegação inferior mobile"
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-[#0B1530]/95 backdrop-blur-md border-t border-blue-950/80 shadow-2xl px-1 py-1"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
    >
      <div className="grid grid-cols-5 items-center justify-around">
        {adminTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentView === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectView(tab.id)}
              className={`flex flex-col items-center justify-center py-1.5 px-1 min-h-[48px] rounded-xl transition-all ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
              }`}
            >
              <div className={`relative flex items-center justify-center p-1 rounded-xl transition ${
                isActive ? 'bg-blue-50 dark:bg-blue-950/60' : ''
              }`}>
                <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {isActive && (
                  <span className="absolute -bottom-0.5 h-1 w-3 rounded-full bg-blue-600 dark:bg-blue-400" />
                )}
              </div>
              <span className="text-[10px] tracking-tight leading-tight mt-0.5 truncate max-w-[62px]">
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* Menu Drawer Toggle */}
        <button
          onClick={onToggleMenu}
          className="flex flex-col items-center justify-center py-1.5 px-1 min-h-[48px] rounded-xl text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium transition-all"
        >
          <div className="flex items-center justify-center p-1 rounded-xl">
            <Menu className="h-5 w-5 stroke-2" />
          </div>
          <span className="text-[10px] tracking-tight leading-tight mt-0.5 truncate">
            Mais
          </span>
        </button>
      </div>
    </nav>
  );
};
