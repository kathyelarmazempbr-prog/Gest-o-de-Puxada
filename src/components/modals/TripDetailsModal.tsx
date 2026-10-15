import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../services/api.ts';
import { Trip, TRIP_STATUS_CONFIG } from '../../types/index.ts';
import { formatAppointmentWindow } from '../../utils/formatters.ts';
import { 
  X, Calendar, Clock, Truck, User, Building2, 
  FileText, Image as ImageIcon, ZoomIn, AlertTriangle,
  Play, Utensils, CheckCircle2, Gauge, Timer, Check, Plus, Minus,
  MapPin, PackageCheck, PackageOpen, LogOut, ArrowRight, CheckCircle
} from 'lucide-react';

interface TripDetailsModalProps {
  trip: Trip | null;
  onClose: () => void;
  onOpenStatusModal?: (trip: Trip) => void;
  canManage?: boolean;
}

export const TripDetailsModal: React.FC<TripDetailsModalProps> = ({
  trip,
  onClose,
}) => {
  const { role } = useAuth();
  const isDriverUser = role === 'MOTORISTA';
  const isDev = role === 'DESENVOLVEDOR';
  // Motorista ou Operador (Administrador / Desenvolvedor) podem registrar as etapas sequenciais
  const canOperate = role === 'MOTORISTA' || role === 'ADMINISTRADOR' || role === 'DESENVOLVEDOR';
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(trip);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Modal 1: Iniciar Viagem
  const [showStartModal, setShowStartModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startDeparture, setStartDeparture] = useState('');
  const [startKm, setStartKm] = useState('');
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // Modal 2: Registrar Refeições
  const [showMealsModal, setShowMealsModal] = useState(false);
  const [mealsCount, setMealsCount] = useState(0);
  const [savingMeals, setSavingMeals] = useState(false);
  const [mealsError, setMealsError] = useState<string | null>(null);

  // Modal 3: Finalizar Viagem
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [finishDate, setFinishDate] = useState('');
  const [finishArrival, setFinishArrival] = useState('');
  const [finishKm, setFinishKm] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  // Estados e controle de etapas intermediárias
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setCurrentTrip(trip);
  }, [trip]);

  if (!currentTrip) return null;

  const statusConfig = TRIP_STATUS_CONFIG[currentTrip.status] || TRIP_STATUS_CONFIG['Programada'];
  const isInProgress = ['Em deslocamento', 'Na fábrica', 'Retornando'].includes(currentTrip.status);
  const isFinished = currentTrip.status === 'Finalizada';
  const isProgrammed = currentTrip.status === 'Programada';

  // Helper for live time difference estimation
  const estimateDuration = (depTime?: string, arrTime?: string, depDate?: string, arrDate?: string) => {
    if (!depTime || !arrTime) return '—';
    try {
      if (depDate && arrDate) {
        const depParts = depTime.match(/(\d{1,2}):(\d{2})/);
        const arrParts = arrTime.match(/(\d{1,2}):(\d{2})/);
        if (depParts && arrParts) {
          const d1 = new Date(`${depDate}T${depParts[1].padStart(2, '0')}:${depParts[2]}:00`);
          const d2 = new Date(`${arrDate}T${arrParts[1].padStart(2, '0')}:${arrParts[2]}:00`);
          if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
            const diffMins = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60));
            if (diffMins >= 0) {
              const h = Math.floor(diffMins / 60);
              const m = diffMins % 60;
              return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
            }
          }
        }
      }
      const depParts = depTime.match(/(\d{1,2}):(\d{2})/);
      const arrParts = arrTime.match(/(\d{1,2}):(\d{2})/);
      if (!depParts || !arrParts) return '—';
      const depMins = parseInt(depParts[1], 10) * 60 + parseInt(depParts[2], 10);
      let arrMins = parseInt(arrParts[1], 10) * 60 + parseInt(arrParts[2], 10);
      let diff = arrMins - depMins;
      if (diff < 0) diff += 24 * 60;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
    } catch {
      return '—';
    }
  };

  const handleConfirmStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrip) return;
    const kmNum = parseFloat(startKm);
    if (isNaN(kmNum) || kmNum < 0) {
      setStartError('Informe um KM Inicial (hodômetro) válido maior ou igual a zero.');
      return;
    }

    setStarting(true);
    setStartError(null);
    try {
      const res = await api.startTrip(currentTrip.id, {
        actual_departure_date: startDate || currentTrip.date,
        actual_departure: startDeparture || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        initial_km: kmNum,
      });
      setCurrentTrip(res.trip);
      setShowStartModal(false);
      setToastMsg('Viagem iniciada com sucesso! Status alterado para Em deslocamento.');
      setTimeout(() => setToastMsg(null), 3500);
      window.dispatchEvent(new CustomEvent('puxada:trip-updated'));
    } catch (err: any) {
      setStartError(err.message || 'Erro ao iniciar viagem');
    } finally {
      setStarting(false);
    }
  };

  const handleConfirmMeals = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrip) return;
    if (mealsCount < 0) {
      setMealsError('Informe uma quantidade válida de refeições (zero ou mais).');
      return;
    }

    setSavingMeals(true);
    setMealsError(null);
    try {
      const res = await api.updateTripMeals(currentTrip.id, mealsCount);
      setCurrentTrip(res.trip);
      setShowMealsModal(false);
      setToastMsg(`Refeições registradas com sucesso: ${mealsCount} refeição(ões).`);
      setTimeout(() => setToastMsg(null), 3500);
      window.dispatchEvent(new CustomEvent('puxada:trip-updated'));
    } catch (err: any) {
      setMealsError(err.message || 'Erro ao registrar refeições');
    } finally {
      setSavingMeals(false);
    }
  };

  const handleConfirmFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrip) return;
    const kmNum = parseFloat(finishKm);
    if (isNaN(kmNum) || kmNum < 0) {
      setFinishError('Informe um KM Final (hodômetro de chegada) válido.');
      return;
    }

    const startKmVal = currentTrip.initial_km !== undefined && currentTrip.initial_km !== null ? currentTrip.initial_km : 0;
    if (currentTrip.initial_km !== undefined && currentTrip.initial_km !== null && kmNum < startKmVal) {
      setFinishError(`O KM Final (${kmNum}) não pode ser inferior ao KM Inicial (${startKmVal}).`);
      return;
    }

    setFinishing(true);
    setFinishError(null);
    try {
      const res = await api.finishTrip(currentTrip.id, {
        actual_arrival_date: finishDate || new Date().toISOString().split('T')[0],
        actual_arrival: finishArrival || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        final_km: kmNum,
      });
      setCurrentTrip(res.trip);
      setShowFinishModal(false);
      setToastMsg('Viagem finalizada com sucesso! Tempo e KM rodado calculados e consolidados.');
      setTimeout(() => setToastMsg(null), 4000);
      window.dispatchEvent(new CustomEvent('puxada:trip-updated'));
    } catch (err: any) {
      setFinishError(err.message || 'Erro ao finalizar viagem');
    } finally {
      setFinishing(false);
    }
  };

  const handleRegisterFactoryArrival = async () => {
    if (!currentTrip) return;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setActionLoading('arrival');
    setActionError(null);
    try {
      const res = await api.registerFactoryArrival(currentTrip.id, nowTime);
      setCurrentTrip(res.trip);
      setToastMsg(`Chegada na portaria da fábrica registrada às ${nowTime}!`);
      setTimeout(() => setToastMsg(null), 3500);
      window.dispatchEvent(new CustomEvent('puxada:trip-updated'));
    } catch (err: any) {
      setActionError(err.message || 'Erro ao registrar chegada na fábrica');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegisterLoadingStart = async () => {
    if (!currentTrip) return;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setActionLoading('loading-start');
    setActionError(null);
    try {
      const res = await api.registerLoadingStart(currentTrip.id, nowTime);
      setCurrentTrip(res.trip);
      setToastMsg(`Início de carregamento registrado às ${nowTime}!`);
      setTimeout(() => setToastMsg(null), 3500);
      window.dispatchEvent(new CustomEvent('puxada:trip-updated'));
    } catch (err: any) {
      setActionError(err.message || 'Erro ao registrar início do carregamento');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegisterLoadingEnd = async () => {
    if (!currentTrip) return;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setActionLoading('loading-end');
    setActionError(null);
    try {
      const res = await api.registerLoadingEnd(currentTrip.id, nowTime);
      setCurrentTrip(res.trip);
      setToastMsg(`Carregamento finalizado às ${nowTime}! Veículo liberado para retorno.`);
      setTimeout(() => setToastMsg(null), 3500);
      window.dispatchEvent(new CustomEvent('puxada:trip-updated'));
    } catch (err: any) {
      setActionError(err.message || 'Erro ao registrar término do carregamento');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRegisterFactoryDeparture = async () => {
    if (!currentTrip) return;
    const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    setActionLoading('departure');
    setActionError(null);
    try {
      const res = await api.registerFactoryDeparture(currentTrip.id, nowTime);
      setCurrentTrip(res.trip);
      setToastMsg(`Saída da portaria da fábrica registrada às ${nowTime}!`);
      setTimeout(() => setToastMsg(null), 3500);
      window.dispatchEvent(new CustomEvent('puxada:trip-updated'));
    } catch (err: any) {
      setActionError(err.message || 'Erro ao registrar saída da fábrica');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in duration-150">
        <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
          
          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-100 pb-4 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusConfig.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot} ${isInProgress ? 'animate-pulse' : ''}`} />
                  {statusConfig.label}
                </span>
                {currentTrip.order_number && (
                  <span className="text-xs font-mono font-medium text-zinc-500 dark:text-zinc-400">
                    Pedido: {currentTrip.order_number}
                  </span>
                )}
              </div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
                Viagem para {currentTrip.factory_name} – {currentTrip.factory_state}
              </h2>
              <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1 flex-wrap">
                <span className="font-medium">
                  <strong>Data Programada:</strong> {currentTrip.date.split('-').reverse().join('/')}
                </span>
                {currentTrip.actual_departure_date && (
                  <span className="font-medium text-blue-700 dark:text-blue-300">
                    <strong>Saída Real:</strong> {currentTrip.actual_departure_date.split('-').reverse().join('/')} {currentTrip.actual_departure ? `às ${currentTrip.actual_departure}` : ''}
                  </span>
                )}
                {currentTrip.actual_arrival_date && (
                  <span className="font-medium text-emerald-700 dark:text-emerald-300">
                    <strong>Chegada Real:</strong> {currentTrip.actual_arrival_date.split('-').reverse().join('/')} {currentTrip.actual_arrival ? `às ${currentTrip.actual_arrival}` : ''}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Toast Notification */}
          {toastMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{toastMsg}</span>
            </div>
          )}

          {/* Cancellation reason if cancelled */}
          {currentTrip.cancel_reason && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              <div>
                <span className="font-bold">Motivo do Cancelamento:</span> {currentTrip.cancel_reason}
              </div>
            </div>
          )}

          {/* PAINEL DE CONTROLE OPERACIONAL (Fluxo de Execução da Viagem - Disponível para Motorista e Operador) */}
          {canOperate && isProgrammed && (
            <div className="rounded-2xl border-2 border-blue-200 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 p-4 dark:border-blue-900/50 dark:from-zinc-900 dark:to-zinc-900">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                    <Play className="h-4 w-4 text-blue-600" />
                    Controle de Execução da Viagem
                  </h3>
                  <p className="text-xs text-blue-700/80 dark:text-blue-400 mt-0.5">
                    Viagem programada. Registre o horário real e o hodômetro para iniciar o deslocamento.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setStartDate(currentTrip.date || new Date().toISOString().split('T')[0]);
                    setStartDeparture(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                    setStartKm('');
                    setStartError(null);
                    setShowStartModal(true);
                  }}
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/20 hover:bg-blue-700 transition shrink-0"
                >
                  <Play className="h-4 w-4 fill-white" />
                  Iniciar Viagem
                </button>
              </div>
            </div>
          )}

          {isInProgress && (
            <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/40 p-4 dark:border-amber-700/50 dark:bg-amber-950/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                  </span>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                      Fluxo Operacional da Viagem em Andamento
                    </h3>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Registre as etapas sequenciais da rota e o controle de refeições até a finalização da viagem.
                    </p>
                  </div>
                </div>

                {/* Botão de Refeições acessível durante todo o percurso para Motorista e Operador */}
                {canOperate && (
                  <button
                    onClick={() => {
                      setMealsCount(currentTrip.meals_count || 0);
                      setMealsError(null);
                      setShowMealsModal(true);
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-300 bg-white px-3.5 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50 dark:border-amber-700 dark:bg-zinc-800 dark:text-amber-300 transition shadow-xs shrink-0 self-start sm:self-auto"
                  >
                    <Utensils className="h-4 w-4 text-amber-600" />
                    <span>Registrar Refeições ({currentTrip.meals_count || 0})</span>
                  </button>
                )}
              </div>

              {/* Linha do Tempo e Botões de Ação Sequenciais da Viagem */}
              {actionError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                  <p>{actionError}</p>
                </div>
              )}

              <div className="rounded-xl border border-blue-900/40 bg-[#0B1530] p-3.5 shadow-md space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block">
                  Etapas Sequenciais do Percurso (Motorista / Operador)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                  {/* Etapa 1: Saída */}
                  <div className="rounded-xl border border-blue-900/60 p-2.5 bg-[#132247] flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        1. Saída Realizada
                      </span>
                      <p className="mt-1 font-mono font-bold text-xs text-white">
                        {currentTrip.actual_departure ? `${currentTrip.actual_departure}` : '—'}
                      </p>
                      <p className="text-[10px] text-slate-300">
                        KM: {currentTrip.initial_km !== undefined ? `${currentTrip.initial_km} km` : '—'}
                      </p>
                    </div>
                  </div>

                  {/* Etapa 2: Chegada na Fábrica */}
                  <div className="rounded-xl border border-blue-900/60 p-2.5 bg-[#132247] flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-blue-400 flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-blue-400" />
                        2. Portaria / Entrada
                      </span>
                      <p className="mt-1 font-mono font-bold text-xs text-white">
                        {currentTrip.arrival_at_factory_time ? `Chegou às ${currentTrip.arrival_at_factory_time}` : 'Aguardando chegada'}
                      </p>
                    </div>
                    {canOperate && !currentTrip.arrival_at_factory_time && (
                      <button
                        onClick={handleRegisterFactoryArrival}
                        disabled={actionLoading === 'arrival'}
                        className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {actionLoading === 'arrival' ? 'Registrando...' : 'Registrar Chegada'}
                      </button>
                    )}
                  </div>

                  {/* Etapa 3: Carregamento */}
                  <div className="rounded-xl border border-blue-900/60 p-2.5 bg-[#132247] flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-purple-400 flex items-center gap-1">
                        <Truck className="h-3 w-3 text-purple-400" />
                        3. Carregamento
                      </span>
                      <div className="mt-1 space-y-0.5">
                        <p className="font-mono text-[11px] font-semibold text-slate-300">
                          Início: <span className="font-bold text-white">{currentTrip.loading_start_time || '—'}</span>
                        </p>
                        <p className="font-mono text-[11px] font-semibold text-slate-300">
                          Fim: <span className="font-bold text-white">{currentTrip.loading_end_time || '—'}</span>
                        </p>
                      </div>
                    </div>
                    {canOperate && (
                      <div className="mt-2 space-y-1">
                        {!currentTrip.loading_start_time && (
                          <button
                            onClick={handleRegisterLoadingStart}
                            disabled={actionLoading === 'loading-start'}
                            className="w-full flex items-center justify-center gap-1 rounded-lg bg-purple-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-purple-700 transition disabled:opacity-50"
                          >
                            <PackageOpen className="h-3.5 w-3.5" />
                            {actionLoading === 'loading-start' ? 'Gravando...' : 'Iniciar Carregamento'}
                          </button>
                        )}
                        {currentTrip.loading_start_time && !currentTrip.loading_end_time && (
                          <button
                            onClick={handleRegisterLoadingEnd}
                            disabled={actionLoading === 'loading-end'}
                            className="w-full flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-indigo-700 transition disabled:opacity-50"
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                            {actionLoading === 'loading-end' ? 'Gravando...' : 'Finalizar Carregamento'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Etapa 4: Saída da Fábrica */}
                  <div className="rounded-xl border border-blue-900/60 p-2.5 bg-[#132247] flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-amber-400 flex items-center gap-1">
                        <Truck className="h-3 w-3 text-amber-400" />
                        4. Saída da Fábrica
                      </span>
                      <p className="mt-1 font-mono font-bold text-xs text-white">
                        {currentTrip.departure_from_factory_time 
                          ? `Saiu às ${currentTrip.departure_from_factory_time}` 
                          : (currentTrip.loading_end_time ? `Saiu às ${currentTrip.loading_end_time}` : 'Aguardando saída')}
                      </p>
                    </div>
                    {canOperate && !currentTrip.departure_from_factory_time && currentTrip.loading_end_time && (
                      <button
                        onClick={handleRegisterFactoryDeparture}
                        disabled={actionLoading === 'departure'}
                        className="mt-2.5 flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {actionLoading === 'departure' ? 'Registrando...' : 'Confirmar Saída'}
                      </button>
                    )}
                  </div>

                  {/* Etapa 5: Finalização e Retorno */}
                  <div className="rounded-xl border border-blue-900/60 p-2.5 bg-[#132247] flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                        5. Finalização
                      </span>
                      <p className="mt-1 text-[11px] text-slate-300">
                        Chegada na base, registro do KM Final e encerramento.
                      </p>
                    </div>
                    {canOperate && (
                      <button
                        onClick={() => {
                          setFinishDate(currentTrip.date || new Date().toISOString().split('T')[0]);
                          setFinishArrival(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
                          setFinishKm('');
                          setFinishError(null);
                          setShowFinishModal(true);
                        }}
                        className="mt-2.5 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Finalizar Viagem
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Indicadores em Tempo Real da Viagem */}
              <div className="grid grid-cols-3 gap-2 border-t border-amber-200/80 pt-3 dark:border-amber-800/50 text-xs">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Saída Realizada</span>
                  <p className="font-bold text-zinc-900 dark:text-white font-mono text-xs">
                    {currentTrip.actual_departure_date ? `${currentTrip.actual_departure_date.split('-').reverse().join('/')} ` : ''}
                    {currentTrip.actual_departure || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">KM Inicial (Saída)</span>
                  <p className="font-bold text-zinc-900 dark:text-white font-mono text-sm">
                    {currentTrip.initial_km !== undefined && currentTrip.initial_km !== null
                      ? `${Number(currentTrip.initial_km).toLocaleString('pt-BR')} km`
                      : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase font-semibold">Total de Refeições</span>
                  <p className="font-bold text-amber-700 dark:text-amber-400 text-sm">
                    {currentTrip.meals_count || 0} refeição(ões)
                  </p>
                </div>
              </div>
            </div>
          )}

          {isFinished && (
            <div className="rounded-2xl border-2 border-emerald-500 bg-[#0B1530] p-4 text-white shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                    Resumo Operacional da Viagem Concluída
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
                  <Utensils className="h-3 w-3 text-emerald-400" />
                  <span>Refeições Registradas: {currentTrip.meals_count || 0}</span>
                </div>
              </div>

              {/* 4 Indicadores Principais com as Fórmulas Exatas Solicitadas */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl bg-blue-900/20 p-3 border border-blue-800/40 text-xs">
                {(() => {
                  // TMV = tempo de chegada - tempo de saida em horas
                  let tmvStr = '—';
                  if (currentTrip.actual_departure && currentTrip.actual_arrival) {
                    const [dh, dm] = currentTrip.actual_departure.split(':').map((n: string) => parseInt(n, 10) || 0);
                    const [ah, am] = currentTrip.actual_arrival.split(':').map((n: string) => parseInt(n, 10) || 0);
                    let diff = (ah * 60 + am) - (dh * 60 + dm);
                    if (diff < 0) diff += 24 * 60;
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    tmvStr = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}min`;
                  } else if (currentTrip.total_time) {
                    tmvStr = currentTrip.total_time;
                  }

                  // TMA = Saida fabrica - chegada fabrica
                  let tmaStr = '—';
                  const exitF = currentTrip.departure_from_factory_time || currentTrip.loading_end_time;
                  if (currentTrip.arrival_at_factory_time && exitF) {
                    const [ah, am] = currentTrip.arrival_at_factory_time.split(':').map((n: string) => parseInt(n, 10) || 0);
                    const [xh, xm] = exitF.split(':').map((n: string) => parseInt(n, 10) || 0);
                    let diff = (xh * 60 + xm) - (ah * 60 + am);
                    if (diff < 0) diff += 24 * 60;
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    tmaStr = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}min`;
                  }

                  // TME = entrada carregamento - chegada fabrica
                  let tmeStr = '—';
                  if (currentTrip.arrival_at_factory_time && currentTrip.loading_start_time) {
                    const [ah, am] = currentTrip.arrival_at_factory_time.split(':').map((n: string) => parseInt(n, 10) || 0);
                    const [sh, sm] = currentTrip.loading_start_time.split(':').map((n: string) => parseInt(n, 10) || 0);
                    let diff = (sh * 60 + sm) - (ah * 60 + am);
                    if (diff < 0) diff += 24 * 60;
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    tmeStr = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}min`;
                  }

                  // TMC = carregamento finalizado - inicio carregamento
                  let tmcStr = '—';
                  if (currentTrip.loading_start_time && currentTrip.loading_end_time) {
                    const [sh, sm] = currentTrip.loading_start_time.split(':').map((n: string) => parseInt(n, 10) || 0);
                    const [eh, em] = currentTrip.loading_end_time.split(':').map((n: string) => parseInt(n, 10) || 0);
                    let diff = (eh * 60 + em) - (sh * 60 + sm);
                    if (diff < 0) diff += 24 * 60;
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    tmcStr = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}min`;
                  }

                  return (
                    <>
                      <div className="bg-[#0B1530] p-2.5 rounded-lg border border-blue-900/60">
                        <span className="text-[10px] uppercase font-bold text-blue-400 block">TMV (Viagem)</span>
                        <p className="font-mono font-bold text-white text-xs mt-0.5">{tmvStr}</p>
                        <span className="text-[9px] text-slate-400">Chegada - Saída</span>
                      </div>
                      <div className="bg-[#0B1530] p-2.5 rounded-lg border border-blue-900/60">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block">TMA (Fábrica)</span>
                        <p className="font-mono font-bold text-white text-xs mt-0.5">{tmaStr}</p>
                        <span className="text-[9px] text-slate-400">Saída - Chegada Fábrica</span>
                      </div>
                      <div className="bg-[#0B1530] p-2.5 rounded-lg border border-blue-900/60">
                        <span className="text-[10px] uppercase font-bold text-purple-400 block">TME (Espera)</span>
                        <p className="font-mono font-bold text-white text-xs mt-0.5">{tmeStr}</p>
                        <span className="text-[9px] text-slate-400">Carreg. - Chegada</span>
                      </div>
                      <div className="bg-[#0B1530] p-2.5 rounded-lg border border-blue-900/60">
                        <span className="text-[10px] uppercase font-bold text-emerald-400 block">TMC (Carregamento)</span>
                        <p className="font-mono font-bold text-white text-xs mt-0.5">{tmcStr}</p>
                        <span className="text-[9px] text-slate-400">Fim - Início Carreg.</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* 6 Indicadores Calculados Automaticamente a partir dos registros de execução */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 border-t border-emerald-800/50 pt-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Saída Real</span>
                  <p className="font-bold text-white font-mono text-xs">
                    {currentTrip.actual_departure_date ? `${currentTrip.actual_departure_date.split('-').reverse().join('/')} ` : ''}
                    {currentTrip.actual_departure || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Chegada Real</span>
                  <p className="font-bold text-white font-mono text-xs">
                    {currentTrip.actual_arrival_date ? `${currentTrip.actual_arrival_date.split('-').reverse().join('/')} ` : ''}
                    {currentTrip.actual_arrival || '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">Tempo Total</span>
                  <p className="font-bold text-blue-400 font-mono text-xs">{currentTrip.total_time || '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">KM Inicial</span>
                  <p className="font-bold text-white font-mono">
                    {currentTrip.initial_km !== undefined && currentTrip.initial_km !== null ? `${Number(currentTrip.initial_km).toLocaleString('pt-BR')} km` : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold">KM Final</span>
                  <p className="font-bold text-white font-mono">
                    {currentTrip.final_km !== undefined && currentTrip.final_km !== null ? `${Number(currentTrip.final_km).toLocaleString('pt-BR')} km` : '—'}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold">KM Rodado Total</span>
                  <p className="font-bold text-emerald-300 font-mono text-sm">
                    {currentTrip.total_km !== undefined && currentTrip.total_km !== null ? `${Number(currentTrip.total_km).toLocaleString('pt-BR')} km` : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Cards Simplificados da Viagem */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Card MOTORISTA */}
            <div className="rounded-xl border border-blue-900/60 p-3.5 bg-[#0B1530]">
              <div className="flex items-center gap-2 text-slate-300">
                <User className="h-4 w-4 text-blue-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Motorista</span>
              </div>
              <p className="mt-2 text-sm font-bold text-white">
                Motorista: {currentTrip.driver_name}
              </p>
            </div>

            {/* Card VEÍCULO */}
            <div className="rounded-xl border border-blue-900/60 p-3.5 bg-[#0B1530]">
              <div className="flex items-center gap-2 text-slate-300">
                <Truck className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Veículo</span>
              </div>
              <p className="mt-2 text-sm font-bold font-mono text-white">
                Veículo: {currentTrip.vehicle_plate}
              </p>
            </div>

            {/* Card FÁBRICA DE DESTINO */}
            <div className="rounded-xl border border-blue-900/60 p-3.5 bg-[#0B1530]">
              <div className="flex items-center gap-2 text-slate-300">
                <Building2 className="h-4 w-4 text-purple-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Fábrica de Destino</span>
              </div>
              <p className="mt-2 text-sm font-bold text-white">
                Fábrica Destino: {currentTrip.factory_name}
              </p>
            </div>

            {/* Card HORÁRIOS E AGENDAMENTO */}
            <div className="rounded-xl border border-blue-900/60 p-3.5 bg-[#0B1530]">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Horários e Agendamento</span>
              </div>
              <p className="mt-2 text-sm font-bold text-white">
                Horário Agendado: {formatAppointmentWindow(currentTrip.appointment_window, currentTrip.planned_departure, currentTrip.planned_arrival)}
              </p>
            </div>
          </div>

          {/* Imagens Anexadas: Agendamento e Produtos */}
          {(currentTrip.appointment_image_url || currentTrip.products_image_url) && (
            <div className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 text-xs font-bold uppercase tracking-wider mb-3">
                <ImageIcon className="h-4 w-4 text-blue-600" />
                Anexos da Viagem
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {currentTrip.appointment_image_url && (
                  <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-2 flex items-center justify-between">
                      <span>Imagem do Agendamento</span>
                      <span className="text-[10px] text-zinc-400">Clique para ampliar</span>
                    </p>
                    <div 
                      onClick={() => setLightboxImage({ src: currentTrip.appointment_image_url!, title: 'Comprovante de Agendamento' })}
                      className="relative group cursor-pointer overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900"
                    >
                      <img 
                        src={currentTrip.appointment_image_url} 
                        alt="Agendamento" 
                        className="h-36 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium gap-1">
                        <ZoomIn className="h-4 w-4" />
                        Visualizar
                      </div>
                    </div>
                  </div>
                )}

                {currentTrip.products_image_url && (
                  <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
                    <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-2 flex items-center justify-between">
                      <span>Imagem dos Produtos</span>
                      <span className="text-[10px] text-zinc-400">Clique para ampliar</span>
                    </p>
                    <div 
                      onClick={() => setLightboxImage({ src: currentTrip.products_image_url!, title: 'Carga / Produtos da Puxada' })}
                      className="relative group cursor-pointer overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-900"
                    >
                      <img 
                        src={currentTrip.products_image_url} 
                        alt="Produtos" 
                        className="h-36 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium gap-1">
                        <ZoomIn className="h-4 w-4" />
                        Visualizar
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Observation */}
          {currentTrip.observation && (
            <div className="rounded-xl border border-zinc-200 p-3.5 dark:border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                <FileText className="h-4 w-4 text-zinc-500" />
                Observações Operacionais
              </div>
              <p className="mt-1.5 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line">
                {currentTrip.observation}
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <button
              onClick={onClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: Iniciar Viagem */}
      {showStartModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Play className="h-5 w-5 text-blue-600 fill-blue-600" />
                  Iniciar Viagem de Puxada
                </h3>
                <p className="text-xs text-zinc-500">
                  Destino: {currentTrip.factory_name} • Veículo: {currentTrip.vehicle_plate}
                </p>
              </div>
              <button onClick={() => setShowStartModal(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {startError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <p>{startError}</p>
              </div>
            )}

            <form onSubmit={handleConfirmStart} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Data Real de Saída *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <span className="text-[10px] text-zinc-400 mt-0.5 block">Data em que a viagem está sendo iniciada</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Horário Real de Saída *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="time"
                    required
                    value={startDeparture}
                    onChange={(e) => setStartDeparture(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <span className="text-[10px] text-zinc-400 mt-0.5 block">Preenchido com o horário corrente (editável)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  KM Inicial (Hodômetro de Saída) *
                </label>
                <div className="relative">
                  <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={startKm}
                    onChange={(e) => setStartKm(e.target.value)}
                    placeholder="Ex: 145200"
                    className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <span className="text-[10px] text-zinc-400 mt-0.5 block">Informe a quilometragem exibida no painel do veículo ao sair</span>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={starting}
                  className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {starting ? 'Iniciando...' : 'Confirmar Início de Viagem'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Registrar Refeições */}
      {showMealsModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <Utensils className="h-5 w-5 text-amber-600" />
                Registrar Refeições
              </h3>
              <button onClick={() => setShowMealsModal(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {mealsError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <p>{mealsError}</p>
              </div>
            )}

            <form onSubmit={handleConfirmMeals} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                  Quantidade Total de Refeições Realizadas
                </label>
                
                {/* Stepper Control */}
                <div className="flex items-center justify-center gap-4 py-2">
                  <button
                    type="button"
                    onClick={() => setMealsCount(prev => Math.max(0, prev - 1))}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-bold transition"
                  >
                    <Minus className="h-4 w-4" />
                  </button>

                  <input
                    type="number"
                    min="0"
                    value={mealsCount}
                    onChange={(e) => setMealsCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-20 text-center font-bold font-mono text-2xl rounded-xl border border-zinc-200 bg-white py-1.5 text-zinc-900 focus:border-amber-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />

                  <button
                    type="button"
                    onClick={() => setMealsCount(prev => prev + 1)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white font-bold transition"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-center text-[11px] text-zinc-400 mt-1">
                  Almoço, jantar ou lanche realizados durante a rota
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowMealsModal(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingMeals}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
                >
                  {savingMeals ? 'Salvando...' : 'Salvar Refeições'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Finalizar Viagem */}
      {showFinishModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Finalizar e Encerrar Viagem
                </h3>
                <p className="text-xs text-zinc-500">
                  Destino: {currentTrip.factory_name} • Veículo: {currentTrip.vehicle_plate}
                </p>
              </div>
              <button onClick={() => setShowFinishModal(false)} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Informações registradas no início */}
            <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/40 grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">Saída Real</span>
                <p className="font-bold text-zinc-900 dark:text-white font-mono">
                  {currentTrip.actual_departure || currentTrip.planned_departure || '08:00'}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase font-semibold">KM Inicial (Saída)</span>
                <p className="font-bold text-zinc-900 dark:text-white font-mono">
                  {currentTrip.initial_km !== undefined && currentTrip.initial_km !== null
                    ? `${Number(currentTrip.initial_km).toLocaleString('pt-BR')} km`
                    : '0 km'}
                </p>
              </div>
            </div>

            {finishError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <p>{finishError}</p>
              </div>
            )}

            <form onSubmit={handleConfirmFinish} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Data Real de Chegada / Encerramento *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="date"
                    required
                    value={finishDate}
                    onChange={(e) => setFinishDate(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
                <span className="text-[10px] text-zinc-400 mt-0.5 block">Data em que a viagem está sendo finalizada</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Horário Real de Chegada *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="time"
                    required
                    value={finishArrival}
                    onChange={(e) => setFinishArrival(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  KM Final (Hodômetro de Chegada) *
                </label>
                <div className="relative">
                  <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                  <input
                    type="number"
                    step="any"
                    min={currentTrip.initial_km || 0}
                    required
                    value={finishKm}
                    onChange={(e) => setFinishKm(e.target.value)}
                    placeholder="Ex: 145480"
                    className="w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:border-emerald-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  />
                </div>
              </div>

              {/* Prévia automática dos cálculos */}
              {finishKm && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-xs dark:border-emerald-900/40 dark:bg-emerald-950/20 grid grid-cols-2 gap-2 animate-in fade-in">
                  <div>
                    <span className="text-[10px] text-emerald-800 dark:text-emerald-400 font-semibold uppercase">KM Rodado Total</span>
                    <p className="font-bold text-emerald-900 dark:text-emerald-300 font-mono text-sm">
                      {Math.max(0, parseFloat(finishKm) - (currentTrip.initial_km || 0)).toLocaleString('pt-BR')} km
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-blue-800 dark:text-blue-400 font-semibold uppercase">Tempo Total Estimado</span>
                    <p className="font-bold text-blue-900 dark:text-blue-300 font-mono text-sm">
                      {estimateDuration(
                        currentTrip.actual_departure || currentTrip.planned_departure, 
                        finishArrival, 
                        currentTrip.actual_departure_date || currentTrip.date, 
                        finishDate
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowFinishModal(false)}
                  className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={finishing}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                >
                  {finishing ? 'Finalizando...' : 'Confirmar e Finalizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lightbox / Zoom Modal for Images */}
      {lightboxImage && (
        <div 
          onClick={() => setLightboxImage(null)}
          className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()} 
            className="relative max-w-3xl max-h-[90vh] bg-zinc-900 rounded-2xl overflow-hidden p-2 border border-zinc-700 shadow-2xl flex flex-col items-center"
          >
            <div className="w-full flex items-center justify-between p-2 text-white border-b border-zinc-800">
              <span className="text-xs font-bold">{lightboxImage.title}</span>
              <button 
                onClick={() => setLightboxImage(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-2 overflow-auto max-h-[78vh] flex items-center justify-center">
              <img 
                src={lightboxImage.src} 
                alt={lightboxImage.title} 
                className="max-h-[74vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
