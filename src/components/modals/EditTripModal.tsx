import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Trip, Driver, Vehicle, Factory } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { formatAppointmentWindow } from '../../utils/formatters.ts';
import { 
  X, Calendar, Clock, Truck, User, Building2, AlertTriangle, 
  FileText, Image as ImageIcon, Upload, Trash2, Edit2, Lock, CheckCircle2
} from 'lucide-react';

interface EditTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  trip: Trip | null;
}

export const EditTripModal: React.FC<EditTripModalProps> = ({ isOpen, onClose, onSuccess, trip }) => {
  const { role } = useAuth();
  const isFinished = trip?.status === 'Finalizada';
  const isDev = role === 'DESENVOLVEDOR';
  const isBlockedFromEditing = isFinished && !isDev;

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [date, setDate] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [factoryId, setFactoryId] = useState('');
  const [plannedDeparture, setPlannedDeparture] = useState('');
  const [appointmentWindow, setAppointmentWindow] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [observation, setObservation] = useState('');

  // Image uploads
  const [appointmentImage, setAppointmentImage] = useState<string | null>(null);
  const [productsImage, setProductsImage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && trip) {
      loadData();
      setError(null);
      setDate(trip.date || '');
      setDriverId(trip.driver_id || '');
      setVehicleId(trip.vehicle_id || '');
      setFactoryId(trip.factory_id || '');
      setPlannedDeparture(trip.planned_departure || '');
      setAppointmentWindow(trip.appointment_window ? formatAppointmentWindow(trip.appointment_window) : '');
      setOrderNumber(trip.order_number ? trip.order_number.replace(/^#\s*/, '') : '');
      setObservation(trip.observation || '');
      setAppointmentImage(trip.appointment_image_url || null);
      setProductsImage(trip.products_image_url || null);
    }
  }, [isOpen, trip]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dList, vList, fList] = await Promise.all([
        api.getDrivers(),
        api.getVehicles(),
        api.getFactories()
      ]);
      setDrivers(dList);
      setVehicles(vList);
      setFactories(fList);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados complementares');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (file: File, setImage: (val: string | null) => void) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Selecione um arquivo de imagem válido (JPG, PNG, WebP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePasteEvent = (e: React.ClipboardEvent, setImage: (val: string | null) => void) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageUpload(file, setImage);
          e.preventDefault();
          break;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;
    setError(null);

    if (isBlockedFromEditing) {
      setError('Apenas usuários com perfil de DESENVOLVEDOR podem alterar viagens finalizadas.');
      return;
    }

    if (!driverId) {
      setError('Selecione obrigatoriamente um motorista.');
      return;
    }
    if (!vehicleId) {
      setError('Selecione obrigatoriamente um veículo.');
      return;
    }
    if (!factoryId) {
      setError('Selecione obrigatoriamente a fábrica de destino.');
      return;
    }
    if (!date) {
      setError('Defina a data da viagem.');
      return;
    }

    setSubmitting(true);
    try {
      await api.updateTrip(trip.id, {
        date,
        driver_id: driverId,
        vehicle_id: vehicleId,
        factory_id: factoryId,
        planned_departure: plannedDeparture || trip.planned_departure || '08:00',
        appointment_window: appointmentWindow.trim() ? formatAppointmentWindow(appointmentWindow) : undefined,
        order_number: orderNumber.trim() ? orderNumber.trim().replace(/^#\s*/, '') : undefined,
        appointment_image_url: appointmentImage || undefined,
        products_image_url: productsImage || undefined,
        observation: observation.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao atualizar viagem');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !trip) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-blue-600" />
              Editar Viagem de Puxada
            </h2>
            <p className="text-xs text-zinc-500">
              Atualize informações, agendamento, motorista, veículo ou destino da viagem
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

        {isBlockedFromEditing && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <Lock className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <span className="font-bold">Bloqueio Operacional:</span> Esta viagem foi <strong>Finalizada</strong>. Conforme as regras de governança e integridade operacional, SOMENTE usuários com perfil de <strong>DESENVOLVEDOR</strong> possuem permissão para alterar dados ou histórico de viagens concluídas.
            </div>
          </div>
        )}

        {isFinished && isDev && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 p-2.5 text-xs text-violet-800 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-600" />
            <span><strong>Acesso Desenvolvedor:</strong> Modo de alteração autorizado para viagem finalizada.</span>
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-400">
            Carregando dados da viagem...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4" autoComplete="off">
            {/* Linha 1: Data da Viagem */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Data da Viagem *
              </label>
              <div className="relative">
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 pl-9 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
                <Calendar className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              </div>
            </div>

            {/* Linha 2: Motorista e Veículo (Exibindo apenas a PLACA do veículo) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Motorista Escalado *
                </label>
                <div className="relative">
                  <select
                    required
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 pl-9 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="">Selecione o motorista...</option>
                    {drivers.map((drv) => (
                      <option key={drv.id} value={drv.id}>
                        {drv.name}{drv.status !== 'Ativo' ? ` — [${drv.status}]` : ''}
                      </option>
                    ))}
                  </select>
                  <User className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Veículo da Viagem *
                </label>
                <div className="relative">
                  <select
                    required
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 pl-9 text-xs font-mono font-bold text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="">Selecione o veículo...</option>
                    {vehicles.map((veh) => (
                      <option key={veh.id} value={veh.id}>
                        {veh.plate}
                      </option>
                    ))}
                  </select>
                  <Truck className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                </div>
              </div>
            </div>

            {/* Linha 3: Fábrica e Número do Pedido (sem caractere #) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Fábrica de Destino *
                </label>
                <div className="relative">
                  <select
                    required
                    value={factoryId}
                    onChange={(e) => setFactoryId(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 pl-9 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                  >
                    <option value="">Selecione a fábrica de destino...</option>
                    {factories.map((fac) => (
                      <option key={fac.id} value={fac.id}>
                        {fac.name} - {fac.state}
                      </option>
                    ))}
                  </select>
                  <Building2 className="pointer-events-none absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Número do Pedido
                  </label>
                  <span className="text-[10px] text-zinc-400">Opcional</span>
                </div>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value.replace(/^#\s*/, ''))}
                  placeholder="Ex: PED-2024-987"
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-mono font-semibold text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>

            {/* Linha 4: Agendamento */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Agendamento
                </label>
                <span className="text-[10px] text-zinc-400">Opcional</span>
              </div>
              <input
                type="text"
                value={appointmentWindow}
                onChange={(e) => setAppointmentWindow(e.target.value)}
                placeholder="Ex: 08:00 – 10:00 ou 14:00"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>

            {/* Anexos de Imagens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Imagem do Agendamento */}
              <div 
                tabIndex={0}
                onPaste={(e) => handlePasteEvent(e, setAppointmentImage)}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40 focus:ring-2 focus:ring-purple-500/40 focus:outline-none transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Foto do Agendamento
                  </span>
                </div>
                {appointmentImage ? (
                  <div className="relative">
                    <img
                      src={appointmentImage}
                      alt="Agendamento"
                      className="h-24 w-full rounded-lg object-cover border border-zinc-200 dark:border-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={() => setAppointmentImage(null)}
                      className="absolute right-1.5 top-1.5 rounded-md bg-rose-600 p-1 text-white hover:bg-rose-700 shadow"
                      title="Remover anexo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-zinc-300 rounded-lg cursor-pointer hover:border-purple-500 dark:border-zinc-700 transition">
                    <Upload className="h-5 w-5 text-zinc-400 mb-1" />
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-300">Anexar imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, setAppointmentImage);
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Imagem dos Produtos */}
              <div 
                tabIndex={0}
                onPaste={(e) => handlePasteEvent(e, setProductsImage)}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40 focus:ring-2 focus:ring-emerald-500/40 focus:outline-none transition"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Foto dos Produtos
                  </span>
                </div>
                {productsImage ? (
                  <div className="relative">
                    <img
                      src={productsImage}
                      alt="Produtos"
                      className="h-24 w-full rounded-lg object-cover border border-zinc-200 dark:border-zinc-700"
                    />
                    <button
                      type="button"
                      onClick={() => setProductsImage(null)}
                      className="absolute right-1.5 top-1.5 rounded-md bg-rose-600 p-1 text-white hover:bg-rose-700 shadow"
                      title="Remover anexo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-zinc-300 rounded-lg cursor-pointer hover:border-emerald-500 dark:border-zinc-700 transition">
                    <Upload className="h-5 w-5 text-zinc-400 mb-1" />
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-300">Anexar imagem</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file, setProductsImage);
                      }}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Observações Operacionais
              </label>
              <textarea
                rows={2}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Instruções de carregamento, notas de entrega, contato no destino..."
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
                disabled={submitting || isBlockedFromEditing}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Salvando...' : isBlockedFromEditing ? 'Edição Bloqueada' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
