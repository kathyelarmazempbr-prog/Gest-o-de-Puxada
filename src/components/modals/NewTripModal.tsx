import React, { useState, useEffect } from 'react';
import { Driver, Vehicle, Factory } from '../../types/index.ts';
import { api } from '../../services/api.ts';
import { 
  X, Calendar, Clock, Truck, User, Building2, AlertTriangle, 
  Check, FileText, Image as ImageIcon, Upload, Trash2, Hash
} from 'lucide-react';

interface NewTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewTripModal: React.FC<NewTripModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [factories, setFactories] = useState<Factory[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [factoryId, setFactoryId] = useState('');
  const [appointmentStart, setAppointmentStart] = useState('');
  const [appointmentEnd, setAppointmentEnd] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [observation, setObservation] = useState('');

  // Image uploads
  const [appointmentImage, setAppointmentImage] = useState<string | null>(null);
  const [productsImage, setProductsImage] = useState<string | null>(null);
  const [activeImageField, setActiveImageField] = useState<'appointment' | 'products'>('appointment');

  useEffect(() => {
    if (isOpen) {
      loadData();
      setError(null);
      // Reset image previews on open
      setAppointmentImage(null);
      setProductsImage(null);
      setOrderNumber('');
      setAppointmentStart('');
      setAppointmentEnd('');
      setObservation('');
      setActiveImageField('appointment');
    }
  }, [isOpen]);

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

  const handleDriverChange = (newDriverId: string) => {
    setDriverId(newDriverId);
    const d = drivers.find(drv => drv.id === newDriverId);
    if (d && d.default_vehicle_id) {
      setVehicleId(d.default_vehicle_id);
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

  const handlePasteEvent = (e: React.ClipboardEvent | ClipboardEvent, targetSetter?: (val: string | null) => void) => {
    const items = (e as any).clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          const setter = targetSetter || (activeImageField === 'products' ? setProductsImage : setAppointmentImage);
          handleImageUpload(file, setter);
          break;
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

    // Format appointment window
    let appointmentWindow: string | undefined = undefined;
    if (appointmentStart && appointmentEnd) {
      appointmentWindow = `${appointmentStart} – ${appointmentEnd}`;
    } else if (appointmentStart) {
      appointmentWindow = appointmentStart;
    } else if (appointmentEnd) {
      appointmentWindow = appointmentEnd;
    }

    const plannedDep = appointmentStart || '08:00';

    setSubmitting(true);
    try {
      await api.createTrip({
        date,
        driver_id: driverId,
        vehicle_id: vehicleId,
        factory_id: factoryId,
        planned_departure: plannedDep,
        appointment_window: appointmentWindow,
        order_number: orderNumber.trim() || undefined,
        appointment_image_url: appointmentImage || undefined,
        products_image_url: productsImage || undefined,
        observation: observation || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Falha ao programar viagem');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Nova Viagem de Puxada
            </h2>
            <p className="text-xs text-zinc-500">
              Vincule motorista, veículo, fábrica e dados de agendamento/pedido
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Data e Número do Pedido */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Data da Viagem *
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
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                  <Hash className="h-3.5 w-3.5 text-blue-600" />
                  Número do Pedido
                </label>
                <span className="text-[10px] text-zinc-400">Opcional</span>
              </div>
              <input
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Ex: PED-10943"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-mono font-medium text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
          </div>

          {/* Motorista selection */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Motorista *
            </label>
            <select
              required
              value={driverId}
              onChange={(e) => handleDriverChange(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Selecione o motorista...</option>
              {drivers.map(drv => (
                <option 
                  key={drv.id} 
                  value={drv.id}
                  disabled={drv.status !== 'Ativo'}
                >
                  {drv.name}{drv.status !== 'Ativo' ? ' — [Inativo]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Veículo selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Veículo *
              </label>
              {driverId && (
                <span className="text-[11px] text-zinc-400">Preenchido com o veículo do motorista (alterável)</span>
              )}
            </div>
            <select
              required
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="">Selecione o veículo...</option>
              {vehicles.map(veh => (
                <option 
                  key={veh.id} 
                  value={veh.id}
                  disabled={veh.status === 'Inativo' || veh.status === 'Manutenção'}
                >
                  {veh.plate}{veh.status !== 'Disponível' ? ` — [${veh.status}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Fábrica selection */}
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
              {factories.map(fac => (
                <option 
                  key={fac.id} 
                  value={fac.id}
                  disabled={fac.status !== 'Ativa'}
                >
                  {fac.name} - {fac.state}{fac.status !== 'Ativa' ? ' — [Inativa]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Agendamento (Intervalo de Horário: de [horário] até [horário]) */}
          <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-blue-600" />
                Agendamento da Viagem (Janela de Horário)
              </label>
              <span className="text-[10px] text-zinc-400">Opcional</span>
            </div>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">De (Horário Inicial)</label>
                <input
                  type="time"
                  value={appointmentStart}
                  onChange={(e) => setAppointmentStart(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">Até (Horário Limite)</label>
                <input
                  type="time"
                  value={appointmentEnd}
                  onChange={(e) => setAppointmentEnd(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Upload de Imagens: Imagem do Agendamento e Imagem dos Produtos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Imagem do Agendamento */}
            <div 
              tabIndex={0}
              onFocus={() => setActiveImageField('appointment')}
              onClick={() => setActiveImageField('appointment')}
              onPaste={(e) => handlePasteEvent(e, setAppointmentImage)}
              className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-800/40 focus:ring-2 focus:ring-purple-500/40 focus:outline-none transition"
            >
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-purple-600" />
                  Imagem do Agendamento
                </label>
              </div>

              {appointmentImage ? (
                <div className="relative mt-2 rounded-lg border border-zinc-200 overflow-hidden dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-1">
                  <img 
                    src={appointmentImage} 
                    alt="Agendamento" 
                    className="h-28 w-full object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAppointmentImage(null);
                    }}
                    className="absolute top-2 right-2 rounded-full bg-rose-600 p-1 text-white shadow-sm hover:bg-rose-700 transition"
                    title="Remover imagem"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 rounded-xl p-3 cursor-pointer hover:border-purple-500 hover:bg-purple-50/20 dark:border-zinc-700 dark:hover:bg-zinc-800/50 transition">
                  <Upload className="h-5 w-5 text-zinc-400 mb-1" />
                  <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Anexar imagem</span>
                  <span className="text-[9px] text-zinc-400">Clique para buscar ou cole direto do clipboard</span>
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
              onFocus={() => setActiveImageField('products')}
              onClick={() => setActiveImageField('products')}
              onPaste={(e) => handlePasteEvent(e, setProductsImage)}
              className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-800/40 focus:ring-2 focus:ring-emerald-500/40 focus:outline-none transition"
            >
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <ImageIcon className="h-3.5 w-3.5 text-emerald-600" />
                  Imagem dos Produtos
                </label>
              </div>

              {productsImage ? (
                <div className="relative mt-2 rounded-lg border border-zinc-200 overflow-hidden dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 p-1">
                  <img 
                    src={productsImage} 
                    alt="Produtos" 
                    className="h-28 w-full object-cover rounded"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProductsImage(null);
                    }}
                    className="absolute top-2 right-2 rounded-full bg-rose-600 p-1 text-white shadow-sm hover:bg-rose-700 transition"
                    title="Remover imagem"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="mt-2 flex flex-col items-center justify-center border-2 border-dashed border-zinc-200 rounded-xl p-3 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/20 dark:border-zinc-700 dark:hover:bg-zinc-800/50 transition">
                  <Upload className="h-5 w-5 text-zinc-400 mb-1" />
                  <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Anexar imagem</span>
                  <span className="text-[9px] text-zinc-400">Clique para buscar ou cole direto do clipboard</span>
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
              placeholder="Instruções de doca, notas fiscais, paletização ou cuidados de rota..."
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
              {submitting ? 'Programando...' : 'Salvar Viagem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
