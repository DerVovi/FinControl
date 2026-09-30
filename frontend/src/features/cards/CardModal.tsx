import React, { useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { apiRequest } from '../../lib/api.js';
import { parseMoneyToCents } from '../../lib/formatters.js';
import { X, CreditCard, AlertCircle } from 'lucide-react';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CardModal: React.FC<CardModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [institution, setInstitution] = useState('');
  const [limitStr, setLimitStr] = useState('');
  const [closingDay, setClosingDay] = useState('20');
  const [dueDay, setDueDay] = useState('27');
  const [last4Digits, setLast4Digits] = useState('');
  const [color, setColor] = useState('#8B5CF6');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const limitCents = parseMoneyToCents(limitStr);
      const cDay = parseInt(closingDay, 10);
      const dDay = parseInt(dueDay, 10);

      if (cDay < 1 || cDay > 31 || dDay < 1 || dDay > 31) {
        throw new Error('Dias de fechamento e vencimento devem ser entre 1 e 31.');
      }

      await apiRequest('/cards', {
        method: 'POST',
        body: JSON.stringify({
          name,
          institution: institution || undefined,
          limitCents,
          closingDay: cDay,
          dueDay: dDay,
          last4Digits: last4Digits || undefined,
          color
        })
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao criar cartão de crédito.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Novo Cartão de Crédito</h3>
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
            label="Nome do Cartão"
            type="text"
            required
            placeholder="Ex: Nubank Ultravioleta"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Input
            label="Instituição / Banco"
            type="text"
            placeholder="Ex: Nubank, Itaú, Inter"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
          />

          <Input
            label="Limite Total (R$)"
            type="text"
            required
            placeholder="5.000,00"
            value={limitStr}
            onChange={(e) => setLimitStr(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Dia do Fechamento"
              type="number"
              min="1"
              max="31"
              required
              value={closingDay}
              onChange={(e) => setClosingDay(e.target.value)}
            />

            <Input
              label="Dia do Vencimento"
              type="number"
              min="1"
              max="31"
              required
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Últimos 4 Dígitos"
              type="text"
              maxLength={4}
              placeholder="1234"
              value={last4Digits}
              onChange={(e) => setLast4Digits(e.target.value)}
            />

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Cor do Cartão</label>
              <input
                type="color"
                className="w-full h-10 rounded-lg border border-slate-800 bg-slate-900 cursor-pointer p-1"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Salvar Cartão
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
