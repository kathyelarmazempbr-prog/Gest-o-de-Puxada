import React, { useState, useEffect } from 'react';
import { api } from '../services/api.ts';
import { Trip, TRIP_STATUS_CONFIG } from '../types/index.ts';
import { formatAppointmentWindow } from '../utils/formatters.ts';
import { 
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, 
  Clock, MapPin, Truck, Eye, Plus 
} from 'lucide-react';

interface CalendarPageProps {
  onOpenTripDetails: (trip: Trip) => void;
  onOpenNewTripModal?: () => void;
  canManage?: boolean;
}

const getLocalDateStr = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const CalendarPage: React.FC<CalendarPageProps> = ({ 
  onOpenTripDetails,
  onOpenNewTripModal,
  canManage = true
}) => {
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const data = await api.getTrips();
      setTrips(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, []);

  // Today string in local time
  const todayStr = getLocalDateStr(new Date());

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Month grid calculation
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: Array<{ dateStr: string; dayNum: number; isCurrentMonth: boolean }> = [];

    // Prev month padding
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      days.push({ 
        dateStr: getLocalDateStr(prevDate), 
        dayNum: d, 
        isCurrentMonth: false 
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const currDate = new Date(year, month, i);
      days.push({ 
        dateStr: getLocalDateStr(currDate), 
        dayNum: i, 
        isCurrentMonth: true 
      });
    }

    // Next month padding to fill complete weeks (multiple of 7)
    const totalCells = Math.ceil(days.length / 7) * 7;
    let nextDayNum = 1;
    while (days.length < totalCells) {
      const nextDate = new Date(year, month + 1, nextDayNum);
      days.push({ 
        dateStr: getLocalDateStr(nextDate), 
        dayNum: nextDayNum, 
        isCurrentMonth: false 
      });
      nextDayNum++;
    }

    return days;
  };

  const monthDays = getDaysInMonth();
  const currentFormatted = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Filter trips for given dateStr
  const getTripsForDate = (dateStr: string) => {
    return trips.filter(t => t.date === dateStr);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-blue-600" />
            Calendário Operacional de Puxadas
          </h1>
          <p className="text-xs text-zinc-500">
            Visualização cronológica por dia, semana ou mês com detalhes de motorista, fábrica e horário
          </p>
        </div>

        {canManage && onOpenNewTripModal && (
          <button
            onClick={onOpenNewTripModal}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            + Nova Viagem
          </button>
        )}
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={handleToday}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300 transition"
            title="Ir para hoje"
          >
            Hoje
          </button>
          <button
            onClick={handleNext}
            className="rounded-lg border border-zinc-200 p-1.5 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Próximo"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <span className="ml-2 text-sm font-bold text-zinc-900 dark:text-white capitalize">
            {currentFormatted}
          </span>
        </div>

        {/* View mode toggle: dia, semana, mês */}
        <div className="flex items-center rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
          <button
            onClick={() => setViewMode('day')}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
              viewMode === 'day' 
                ? 'bg-white text-blue-600 shadow-sm dark:bg-zinc-900 dark:text-blue-400' 
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Dia
          </button>
          <button
            onClick={() => setViewMode('week')}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
              viewMode === 'week' 
                ? 'bg-white text-blue-600 shadow-sm dark:bg-zinc-900 dark:text-blue-400' 
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setViewMode('month')}
            className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
              viewMode === 'month' 
                ? 'bg-white text-blue-600 shadow-sm dark:bg-zinc-900 dark:text-blue-400' 
                : 'text-zinc-600 dark:text-zinc-400'
            }`}
          >
            Mês
          </button>
        </div>
      </div>

      {/* VIEW: MÊS */}
      {viewMode === 'month' && (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50 text-center text-xs font-bold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-800/50 py-2.5">
            <div>Dom</div>
            <div>Seg</div>
            <div>Ter</div>
            <div>Qua</div>
            <div>Qui</div>
            <div>Sex</div>
            <div>Sáb</div>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-zinc-200 dark:divide-zinc-800">
            {monthDays.map((cell, idx) => {
              const dayTrips = getTripsForDate(cell.dateStr);
              const isToday = cell.dateStr === todayStr;

              return (
                <div
                  key={idx}
                  className={`min-h-[110px] p-2 transition ${
                    cell.isCurrentMonth
                      ? 'bg-white dark:bg-zinc-900'
                      : 'bg-zinc-50/50 text-zinc-400 dark:bg-zinc-900/40'
                  } ${isToday ? 'ring-2 ring-blue-500/60 inset-0 z-10 bg-blue-50/15' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${
                      isToday 
                        ? 'flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm' 
                        : cell.isCurrentMonth ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400'
                    }`}>
                      {cell.dayNum}
                    </span>
                    {dayTrips.length > 0 && (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        {dayTrips.length} {dayTrips.length === 1 ? 'viagem' : 'viagens'}
                      </span>
                    )}
                  </div>

                  {/* Events list */}
                  <div className="space-y-1">
                    {dayTrips.slice(0, 3).map((t) => {
                      const conf = TRIP_STATUS_CONFIG[t.status] || TRIP_STATUS_CONFIG['Programada'];
                      const timeStr = formatAppointmentWindow(t.appointment_window, t.planned_departure);

                      return (
                        <div
                          key={t.id}
                          onClick={() => onOpenTripDetails(t)}
                          className={`cursor-pointer rounded-lg border p-1 text-[10px] transition hover:scale-[1.02] ${conf.badge}`}
                          title={`${t.driver_name} ➔ ${t.factory_name} (${timeStr})`}
                        >
                          <div className="font-bold truncate flex items-center justify-between">
                            <span>{timeStr} • {t.driver_name.split(' ')[0]}</span>
                            <span className="font-mono text-[9px]">{t.factory_state}</span>
                          </div>
                          <div className="text-[9px] text-zinc-600 dark:text-zinc-400 truncate">
                            {t.factory_name} • {t.vehicle_plate}
                          </div>
                        </div>
                      );
                    })}
                    {dayTrips.length > 3 && (
                      <p className="text-[10px] text-zinc-400 text-center font-semibold">
                        +{dayTrips.length - 3} mais
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW: DIA */}
      {viewMode === 'day' && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                Programação do Dia: {currentDate.toLocaleDateString('pt-BR')}
              </h3>
              {getLocalDateStr(currentDate) === todayStr && (
                <span className="inline-block mt-0.5 rounded bg-blue-100 px-1.5 py-0.2 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  Hoje
                </span>
              )}
            </div>
            <span className="text-xs text-zinc-400">
              {getTripsForDate(getLocalDateStr(currentDate)).length} viagens agendadas
            </span>
          </div>

          <div className="space-y-3">
            {getTripsForDate(getLocalDateStr(currentDate)).length === 0 ? (
              <p className="text-xs text-zinc-400 py-6 text-center">Nenhuma viagem programada para este dia.</p>
            ) : (
              getTripsForDate(getLocalDateStr(currentDate)).map(trip => {
                const conf = TRIP_STATUS_CONFIG[trip.status];
                const timeStr = formatAppointmentWindow(trip.appointment_window, trip.planned_departure);

                return (
                  <div
                    key={trip.id}
                    onClick={() => onOpenTripDetails(trip)}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-xl border border-zinc-200 p-4 hover:border-blue-500 cursor-pointer transition dark:border-zinc-800"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-24 px-2 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 font-bold text-xs whitespace-nowrap text-center">
                        {timeStr}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-zinc-900 dark:text-white text-sm">
                            {trip.driver_name} ➔ Fábrica {trip.factory_name}
                          </h4>
                          <span className={`rounded-full border px-2 py-0.2 text-[10px] font-bold ${conf.badge}`}>
                            {conf.label}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Veículo: <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{trip.vehicle_plate}</span> • Local: {trip.factory_city} - {trip.factory_state}
                        </p>
                      </div>
                    </div>

                    <button className="mt-3 sm:mt-0 flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
                      <Eye className="h-4 w-4" />
                      Ver Detalhes
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW: SEMANA */}
      {viewMode === 'week' && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 space-y-4">
          <p className="text-xs text-zinc-500 mb-2">
            Visão semanal das puxadas programadas:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {Array.from({ length: 7 }).map((_, i) => {
              const startOfWeek = new Date(currentDate);
              startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
              const d = new Date(startOfWeek);
              d.setDate(startOfWeek.getDate() + i);

              const dStr = getLocalDateStr(d);
              const dayTrips = getTripsForDate(dStr);
              const isToday = dStr === todayStr;

              return (
                <div
                  key={i}
                  className={`rounded-xl border p-2.5 text-xs transition ${
                    isToday ? 'border-blue-500 bg-blue-50/20 ring-1 ring-blue-500/40' : 'border-zinc-200 dark:border-zinc-800'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-zinc-700 dark:text-zinc-300 capitalize">
                      {d.toLocaleDateString('pt-BR', { weekday: 'short' })}
                    </span>
                    <span className={`text-[11px] font-bold ${isToday ? 'text-blue-600' : 'text-zinc-500'}`}>
                      {d.getDate()}/{d.getMonth() + 1}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {dayTrips.length === 0 ? (
                      <p className="text-[10px] text-zinc-400 italic">Sem viagens</p>
                    ) : (
                      dayTrips.map(t => {
                        const timeStr = formatAppointmentWindow(t.appointment_window, t.planned_departure);
                        return (
                          <div
                            key={t.id}
                            onClick={() => onOpenTripDetails(t)}
                            className="cursor-pointer rounded-lg border border-zinc-200 bg-zinc-50 p-1.5 text-[10px] hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 transition"
                          >
                            <p className="font-bold text-blue-600 truncate">{timeStr} • {t.driver_name.split(' ')[0]}</p>
                            <p className="text-zinc-600 dark:text-zinc-400 truncate">{t.factory_name}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
