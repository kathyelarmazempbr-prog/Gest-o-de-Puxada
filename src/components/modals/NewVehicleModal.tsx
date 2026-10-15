import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { X, Truck, AlertTriangle } from 'lucide-react';

interface NewVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const NewVehicleModal: React.FC<NewVehicleModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [plate, setPlate] = useState('');
  const [brand, setBrand] = useState('');
  const [siderPlate, setSiderPlate] = useState('');
  const [year, setYear] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState<'Disponível' | 'Em viagem' | 'Manutenção' | 'Inativo'>('Disponível');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form completely whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setPlate('');
      setBrand('');
      setSiderPlate('');
      setYear('');
      setType('');
      setStatus('Disponível');
      setError(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setPlate('');
    setBrand('');
    setSiderPlate('');
    setYear('');
    setType('');
    setStatus('Disponível');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!plate.trim()) {
      setError('A placa do veículo é obrigatória.');
      return;
    }

    setSubmitting(true);
    try {
      await api.createVehicle({
        plate: plate.trim().toUpperCase(),
        brand: brand.trim() || undefined,
        model: siderPlate.trim().toUpperCase() || undefined, // Stored as model / sider plate
        year: year ? parseInt(year, 10) : undefined,
        type: type.trim() || undefined,
        status,
      });
      // Reset after success
      setPlate('');
      setBrand('');
      setSiderPlate('');
      setYear('');
      setType('');
      setStatus('Disponível');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao cadastrar veículo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-600" />
              Novo Veículo da Frota
            </h2>
            <p className="text-xs text-zinc-500">Cadastrar caminhão / carreta de puxada</p>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
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
          {/* Placa do Veículo (Único obrigatório) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Placa do Veículo *
            </label>
            <input
              type="text"
              required
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              placeholder="Ex: ABC-1234 ou BRA2E19"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-mono font-bold uppercase text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          {/* Marca e Placa do Sider (Opcionais) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Marca
                </label>
                <span className="text-[10px] text-zinc-400">Opcional</span>
              </div>
              <select
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              >
                <option value="">Não informada</option>
                <option value="Scania">Scania</option>
                <option value="Volvo">Volvo</option>
                <option value="Mercedes-Benz">Mercedes-Benz</option>
                <option value="DAF">DAF</option>
                <option value="Volkswagen">Volkswagen</option>
                <option value="Iveco">Iveco</option>
                <option value="Outra">Outra</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Placa do Sider
                </label>
                <span className="text-[10px] text-zinc-400">Opcional</span>
              </div>
              <input
                type="text"
                value={siderPlate}
                onChange={(e) => setSiderPlate(e.target.value.toUpperCase())}
                placeholder="Ex: SID-9876 (Opcional)"
                className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-mono uppercase text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
              />
            </div>
          </div>

          {/* Ano Fabricação (Opcional) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Ano Fabricação
              </label>
              <span className="text-[10px] text-zinc-400">Opcional</span>
            </div>
            <input
              type="number"
              min="1990"
              max="2035"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="Ex: 2024"
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            />
          </div>

          {/* Status Inicial */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
              Status Inicial *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white"
            >
              <option value="Disponível">Disponível</option>
              <option value="Em viagem">Em viagem</option>
              <option value="Manutenção">Manutenção</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : 'Salvar Veículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
