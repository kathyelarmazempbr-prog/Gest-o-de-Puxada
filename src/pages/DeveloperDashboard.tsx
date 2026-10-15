import React from 'react';
import { LayoutDashboard } from 'lucide-react';
import { PowerBiDashboardView } from '../components/charts/PowerBiDashboardView.tsx';

interface DeveloperDashboardProps {
  onNavigate?: (view: string) => void;
}

export const DeveloperDashboard: React.FC<DeveloperDashboardProps> = () => {
  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="border-b border-blue-950 pb-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <LayoutDashboard className="h-6 w-6 text-blue-500 shrink-0" />
            <span>Dashboard</span>
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-400">
            Monitoramento e Gestão da Puxada
          </p>
        </div>
      </div>

      <PowerBiDashboardView />
    </div>
  );
};
