import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { apiRequest } from '../../lib/api.js';
import { X, ArrowDownRight, ArrowUpRight, ArrowLeftRight, AlertCircle } from 'lucide-react';

interface Account {
  id: string;
  name: string;
  currentBalanceCents: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
  color?: string;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  accounts: Account[];
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accounts
}) => {
  const [type, setType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [destinationAccountId, setDestinationAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
    if (accounts.length > 1 && !destinationAccountId) {
      const other = accounts.find((a) => a.id !== accounts[0].id);
      if (other) setDestinationAccountId(other.id);
    }
  }, [accounts, accountId, destinationAccountId]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const catType = type === 'TRANSFER' ? undefined : type;
        const query = catType ? `?type=${catType}` : '';
        const res = await apiRequest<{ success: boolean; data: Category[] }>(`/categories${query}`);
        if (res.success) {
          setCategories(res.data);
          if (res.data.length > 0) {
            setCategoryId(res.data[0].id);
          }
        }
      } catch {
        // Ignora erro de categorias
      }
    }

    if (isOpen && type !== 'TRANSFER') {
      loadCategories();
    }
  }, [isOpen, type]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Converte valor monetário em centavos (ex: "150,50" -> 15050)
      const cleanVal = amountStr.replace(/\./g, '').replace(',', '.').trim();
      const num = parseFloat(cleanVal);
      if (isNaN(num) || num <= 0) {
        throw new Error('Informe um valor monetário positivo válido.');
      }
      const amountCents = Math.round(num * 100).toString();

      await apiRequest('/transactions', {
        method: 'POST',
        body: JSON.stringify({
          accountId,
          destinationAccountId: type === 'TRANSFER' ? destinationAccountId : undefined,
          categoryId: type !== 'TRANSFER' ? categoryId : undefined,
          type,
          amountCents,
          date: new Date(date).toISOString(),
          description
        })
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar transação');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <h3 className="text-lg font-bold text-white tracking-tight">Nova Transação</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chaveador de Tipo */}
        <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setType('EXPENSE')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              type === 'EXPENSE'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownRight className="w-4 h-4 text-rose-400" /> Despesa
          </button>
          <button
            type="button"
            onClick={() => setType('INCOME')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              type === 'INCOME'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-400" /> Receita
          </button>
          <button
            type="button"
            onClick={() => setType('TRANSFER')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              type === 'TRANSFER'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4 text-blue-400" /> Transferência
          </button>
        </div>

        {type === 'TRANSFER' && (
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300">
            ℹ️ Transferências entre suas contas <strong>não são contabilizadas como despesa ou receita</strong> do mês.
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Valor (R$)"
            type="text"
            required
            placeholder="0,00"
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
          />

          <Input
            label="Descrição"
            type="text"
            required
            placeholder={type === 'EXPENSE' ? 'Ex: Supermercado' : type === 'INCOME' ? 'Ex: Salário' : 'Ex: Transferência'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                {type === 'TRANSFER' ? 'Conta de Origem' : 'Conta'}
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

            {type === 'TRANSFER' ? (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Conta de Destino
                </label>
                <select
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                  value={destinationAccountId}
                  onChange={(e) => setDestinationAccountId(e.target.value)}
                >
                  {accounts
                    .filter((a) => a.id !== accountId)
                    .map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Categoria</label>
                <select
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <Input
            label="Data"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              isLoading={isLoading}
              variant={type === 'EXPENSE' ? 'danger' : 'primary'}
            >
              Confirmar {type === 'EXPENSE' ? 'Despesa' : type === 'INCOME' ? 'Receita' : 'Transferência'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
