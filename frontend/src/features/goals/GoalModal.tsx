import React, { useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { apiRequest } from '../../lib/api.js';
import { parseMoneyToCents } from '../../lib/formatters.js';
import { X, Award, AlertCircle } from 'lucide-react';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('');
  const [deadline, setDeadline] = useState('');
  const [color, setColor] = useState('#10B981');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const targetAmountCents = parseMoneyToCents(targetAmountStr);

      await apiRequest('/goals', {
        method: 'POST',
        body: JSON.stringify({
          name,
          targetAmountCents,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          color,
          icon: 'target'
        })
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar meta financeira.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Nova Meta Financeira</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Objetivo / Nome da Meta"
            type="text"
            required
            placeholder="Ex: Reserva de Emergência, Viagem, Comprar Carro"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Valor Alvo (R$)"
            type="text"
            required
            placeholder="Ex: 20.000,00"
            value={targetAmountStr}
            onChange={(e) => setTargetAmountStr(e.target.value)}
          />

          <Input
            label="Data Limite / Prazo (Opcional)"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Cor da Meta</label>
            <input
              type="color"
              className="w-full h-10 rounded-lg border border-slate-800 bg-slate-900 cursor-pointer p-1"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isLoading} className="bg-emerald-600 hover:bg-emerald-500">
              Criar Meta
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
