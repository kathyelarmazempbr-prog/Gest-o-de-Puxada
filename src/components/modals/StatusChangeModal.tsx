import React, { useState } from 'react';
import { Trip, TripStatus, TRIP_STATUS_CONFIG } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { X, ArrowRight, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface StatusChangeModalProps {
  trip: Trip | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({ trip, isOpen, onClose, onSuccess }) => {
  if (!isOpen || !trip) return null;

  const [selectedStatus, setSelectedStatus] = useState<TripStatus>(() => {
    // suggest next logical status
    switch (trip.status) {
      case 'Programada': return 'Em deslocamento';
      case 'Em deslocamento': return 'Na fábrica';
      case 'Na fábrica': return 'Finalizada';
      default: return 'Finalizada';
    }
  });
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedStatus === 'Cancelada' && !cancelReason.trim()) {
      setError('A justificativa de cancelamento é obrigatória.');
      return;
    }

    setSubmitting(true);
    try {
      await api.updateTripStatus(trip.id, {
        status: selectedStatus,
        cancel_reason: selectedStatus === 'Cancelada' ? cancelReason.trim() : undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar status da viagem');
    } finally {
      setSubmitting(false);
    }
  };

  const statusOptions: TripStatus[] = [
    'Programada',
    'Em deslocamento',
    'Na fábrica',
    'Finalizada',
    'Cancelada'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white">
              Atualizar Status da Viagem
            </h2>
            <p className="text-xs text-zinc-500">
              {trip.driver_name} • {trip.factory_name} ({trip.vehicle_plate})
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs dark:border-zinc-800 dark:bg-zinc-800/40">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Status Atual</span>
              <p className="font-bold text-zinc-800 dark:text-zinc-200">{trip.status}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-zinc-400" />
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-bold">Novo Status</span>
              <p className="font-bold text-blue-600 dark:text-blue-400">{selectedStatus}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
              Selecione o Novo Status *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((st) => {
                const conf = TRIP_STATUS_CONFIG[st];
                const isSelected = selectedStatus === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSelectedStatus(st)}
                    className={`flex items-center justify-between rounded-xl border p-2.5 text-xs text-left transition-all ${
                      isSelected
                        ? `${conf.badge} ring-2 ring-blue-500/40 font-bold`
                        : 'border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${conf.dot}`} />
                      <span>{conf.label}</span>
                    </div>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedStatus === 'Cancelada' && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 dark:border-rose-900/50 dark:bg-rose-950/20">
              <label className="block text-xs font-semibold text-rose-800 dark:text-rose-300 mb-1">
                Justificativa Obrigatória do Cancelamento *
              </label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Informe o motivo (ex: avaria mecânica, reprogramação da fábrica, recusa de carga...)"
                className="w-full rounded-xl border border-rose-300 bg-white p-2.5 text-xs text-zinc-900 focus:border-rose-500 focus:outline-none dark:border-rose-800 dark:bg-zinc-900 dark:text-white"
              />
            </div>
          )}

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
              {submitting ? 'Salvando...' : 'Confirmar Alteração'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
