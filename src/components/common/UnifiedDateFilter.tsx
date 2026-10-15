import React from 'react';
import { Calendar, X, RotateCcw } from 'lucide-react';

export interface DateFilterValue {
  startDate: string;  // YYYY-MM-DD
  endDate: string;    // YYYY-MM-DD
  mode?: string;
  singleDate?: string;
}

interface UnifiedDateFilterProps {
  value: DateFilterValue;
  onChange: (val: DateFilterValue) => void;
  className?: string;
}

export const UnifiedDateFilter: React.FC<UnifiedDateFilterProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const hasFilter = Boolean(value.startDate || value.endDate);

  const handleClear = () => {
    onChange({
      startDate: '',
      endDate: '',
      mode: 'range',
      singleDate: '',
    });
  };

  return (
    <div className={`w-full space-y-1.5 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 items-end">
        {/* Data Inicial */}
        <div className="space-y-1">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            Data Inicial
          </label>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="date"
              value={value.startDate || ''}
              onChange={(e) => onChange({ ...value, startDate: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 sm:py-2 pl-9 pr-3 text-xs font-medium text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white min-h-[40px] sm:min-h-0"
            />
          </div>
        </div>

        {/* Data Final */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Data Final
            </label>
            {hasFilter && (
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 dark:text-rose-400 transition"
              >
                <X className="h-3 w-3" />
                <span>Limpar Datas</span>
              </button>
            )}
          </div>
          <div className="relative">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="date"
              value={value.endDate || ''}
              onChange={(e) => onChange({ ...value, endDate: e.target.value })}
              className="w-full rounded-xl border border-zinc-200 bg-white py-2 sm:py-2 pl-9 pr-3 text-xs font-medium text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white min-h-[40px] sm:min-h-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to check if trip date matches the date filter
export const matchesDateFilter = (tripDate: string | undefined | null, filter: DateFilterValue): boolean => {
  if (!tripDate) return false;
  if (!filter.startDate && !filter.endDate) return true;

  if (filter.startDate && tripDate < filter.startDate) return false;
  if (filter.endDate && tripDate > filter.endDate) return false;

  return true;
};
