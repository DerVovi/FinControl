import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { apiRequest } from '../../lib/api.js';
import { parseMoneyToCents } from '../../lib/formatters.js';
import { X, ShoppingBag, AlertCircle } from 'lucide-react';

interface CardPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  cardId: string;
  cardName: string;
}

interface Category {
  id: string;
  name: string;
}

export const CardPurchaseModal: React.FC<CardPurchaseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  cardId,
  cardName
}) => {
  const [description, setDescription] = useState('');
  const [totalAmountStr, setTotalAmountStr] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await apiRequest<{ success: boolean; data: Category[] }>('/categories?type=EXPENSE');
        if (res.success && res.data.length > 0) {
          setCategories(res.data);
          setCategoryId(res.data[0].id);
        }
      } catch {
        // Fallback
      }
    }
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Calcula prévia do valor da parcela
  let previewInstallmentText = '';
  try {
    const clean = totalAmountStr.replace(/\./g, '').replace(',', '.').trim();
    const num = parseFloat(clean);
    if (!isNaN(num) && num > 0 && installmentsCount > 1) {
      const part = num / installmentsCount;
      previewInstallmentText = `${installmentsCount}x de ${part.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
    }
  } catch {
    //
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const totalAmountCents = parseMoneyToCents(totalAmountStr);

      await apiRequest(`/cards/${cardId}/purchases`, {
        method: 'POST',
        body: JSON.stringify({
          description,
          totalAmountCents,
          installmentsCount: Number(installmentsCount),
          purchaseDate: new Date(purchaseDate).toISOString(),
          categoryId: categoryId || undefined
        })
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao registrar compra no cartão.');
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
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Lançar Compra no Cartão</h3>
              <p className="text-xs text-slate-400">{cardName}</p>
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
          <Input
            label="Descrição da Compra"
            type="text"
            required
            placeholder="Ex: Notebook Dell, Supermercado"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <Input
            label="Valor Total (R$)"
            type="text"
            required
            placeholder="0,00"
            value={totalAmountStr}
            onChange={(e) => setTotalAmountStr(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Parcelas</label>
              <select
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(parseInt(e.target.value, 10))}
              >
                <option value={1}>À vista (1x)</option>
                {Array.from({ length: 23 }, (_, i) => i + 2).map((n) => (
                  <option key={n} value={n}>
                    {n}x parcelas
                  </option>
                ))}
              </select>
            </div>

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
          </div>

          {previewInstallmentText && (
            <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs text-purple-300">
              📊 Distribuição: <strong>{previewInstallmentText}</strong> nas próximas faturas.
            </div>
          )}

          <Input
            label="Data da Compra"
            type="date"
            required
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Confirmar Compra
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
