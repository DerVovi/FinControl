import React, { useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { apiRequest } from '../../lib/api.js';
import { parseMoneyToCents } from '../../lib/formatters.js';
import { X, PiggyBank, AlertCircle } from 'lucide-react';

interface Account {
  id: string;
  name: string;
}

interface ContributeGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  goalId: string;
  goalName: string;
  accounts: Account[];
}

export const ContributeGoalModal: React.FC<ContributeGoalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  goalId,
  goalName,
  accounts
}) => {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [amountStr, setAmountStr] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const amountCents = parseMoneyToCents(amountStr);

      await apiRequest(`/goals/${goalId}/contribute`, {
        method: 'POST',
        body: JSON.stringify({
          accountId,
          amountCents
        })
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar aporte na meta.');
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
              <PiggyBank className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Aportar na Meta</h3>
              <p className="text-xs text-slate-400">{goalName}</p>
            </div>
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
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Conta de Origem do Recurso
            </label>
            <select
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <Input
            label="Valor do Aporte (R$)"
            type="text"
            required
            placeholder="Ex: 500,00"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
          />

          <p className="text-[11px] text-slate-400">
            O valor será debitado do saldo da conta selecionada e somado ao progresso da sua meta.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isLoading} className="bg-emerald-600 hover:bg-emerald-500">
              Confirmar Aporte
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
