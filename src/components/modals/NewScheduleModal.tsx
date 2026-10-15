import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { Driver, Vehicle, Factory } from '../../types/index.ts';
import { X, CalendarClock, AlertTriangle } from 'lucide-react';

interface NewScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewScheduleModal: React.FC<NewScheduleModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [factoryId, setFactoryId] = useState('');
  const [shiftTime, setShiftTime] = useState('18:00');
  const [observation, setObservation] = useState('');
  const [status, setStatus] = useState<'Confirmada' | 'Pendente' | 'Cancelada'>('Confirmada');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      Promise.all([api.getDrivers(), api.getVehicles(), api.getFactories()])
        .then(([dList, vList, fList]) => {
          setDrivers(dList);
          setVehicles(vList);
          setFactories(fList);
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const handleDriverChange = (id: string) => {
    setDriverId(id);
    const d = drivers.find(drv => drv.id === id);
    if (d?.default_vehicle_id) {
      setVehicleId(d.default_vehicle_id);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!date || !driverId || !vehicleId || !factoryId || !shiftTime) {
      setError('Preencha todos os campos obrigatórios da escala.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createSchedule({
        date,
        driver_id: driverId,
        vehicle_id: vehicleId,
        factory_id: factoryId,
        shift_time: shiftTime,
        observation: observation || undefined,
        status,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar escala');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-blue-600" />
              Programar Escala do Motorista
            </h2>
            <p className="text-xs text-zinc-500">Agendar turno de trabalho e puxada para o motorista</p>
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Data da Escala *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Horário do Turno *
              </label>
              <input
                type="time"
                required
                value={shiftTime}
                onChange={(e) => setShiftTime(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Motorista Escalado *
            </label>
            <select
              required
              value={driverId}
              onChange={(e) => handleDriverChange(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Selecione o motorista...</option>
              {drivers.map(d => (
                <option key={d.id} value={d.id} disabled={d.status !== 'Ativo'}>
                  {d.name} ({d.registration}) {d.status !== 'Ativo' ? `[${d.status}]` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Veículo *
              </label>
              <select
                required
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              >
                <option value="">Selecione o veículo...</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id} disabled={v.status === 'Inativo'}>
                    {v.plate} ({v.brand} #{v.vehicle_number})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Fábrica de Destino *
              </label>
              <select
                required
                value={factoryId}
                onChange={(e) => setFactoryId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              >
                <option value="">Selecione a fábrica...</option>
                {factories.map(f => (
                  <option key={f.id} value={f.id} disabled={f.status !== 'Ativa'}>
                    {f.name} ({f.state})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Status da Escala *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="Confirmada">Confirmada</option>
              <option value="Pendente">Pendente de Confirmação</option>
              <option value="Cancelada">Cancelada</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Observações da Escala
            </label>
            <textarea
              rows={2}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Ex: Escala Noturna - Puxada Itapissuma..."
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
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
              {submitting ? 'Salvando...' : 'Programar Escala'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
