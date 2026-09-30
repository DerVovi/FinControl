import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { apiRequest } from '../../lib/api.js';
import { formatMoney } from '../../lib/formatters.js';
import { BudgetModal } from './BudgetModal.js';
import {
  Target,
  Plus,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export const BudgetsView: React.FC = () => {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [data, setData] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchBudgets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ success: boolean; data: any }>(`/budgets?month=${month}&year=${year}`);
      if (res.success) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar orçamentos.');
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handlePrevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const monthLabel = new Date(year, month - 1).toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });

  const getStatusBadge = (status: string, percentage: number) => {
    switch (status) {
      case 'OK':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Seguro ({percentage}%)
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            <AlertTriangle className="w-3 h-3" /> Atenção ({percentage}%)
          </span>
        );
      case 'REACHED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <AlertOctagon className="w-3 h-3" /> Limite Atingido (100%)
          </span>
        );
      case 'EXCEEDED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertOctagon className="w-3 h-3" /> Excedido ({percentage}%)
          </span>
        );
      default:
        return null;
    }
  };

  const getProgressBarColor = (status: string) => {
    switch (status) {
      case 'OK':
        return 'bg-emerald-500';
      case 'WARNING':
        return 'bg-amber-500';
      case 'REACHED':
        return 'bg-orange-500';
      case 'EXCEEDED':
        return 'bg-rose-500';
      default:
        return 'bg-blue-500';
    }
  };

  // Garante tratamento flexível se data for array ou objeto com { budgets, summary }
  const budgetsList: any[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.budgets)
    ? (data as any).budgets
    : [];

  let totalLimitCents = 0n;
  let totalSpentCents = 0n;

  for (const b of budgetsList) {
    totalLimitCents += BigInt(b.limitCents || 0);
    totalSpentCents += BigInt(b.spentCents || 0);
  }

  const totalRemainingCents = totalLimitCents - totalSpentCents;
  const overallPercentage = totalLimitCents > 0n
    ? Math.round(Number((totalSpentCents * 100n) / totalLimitCents))
    : 0;

  const formattedTotalLimit = formatMoney(totalLimitCents);
  const formattedTotalSpent = formatMoney(totalSpentCents);
  const formattedTotalRemaining = formatMoney(totalRemainingCents);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-400" /> Gestão de Orçamentos Mensais
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Defina tetos de gastos por categoria e receba alertas antes de estourar seu orçamento
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Navegador de Mês */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-1.5 py-1">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-200 capitalize px-2 min-w-28 text-center">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-950/40"
          >
            <Plus className="w-4 h-4" /> Definir Teto
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-3"></div>
          <p className="text-xs text-slate-400">Calculando consumo e alertas em tempo real...</p>
        </div>
      ) : (
        <>
          {/* Resumo do Orçamento Geral */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-slate-800 bg-slate-900/80">
              <span className="text-xs font-medium text-slate-400">Teto Total Orçado</span>
              <div className="text-2xl font-bold text-white tabular-nums mt-1">
                {formattedTotalLimit}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Soma dos limites cadastrados</div>
            </Card>

            <Card className="border-slate-800 bg-slate-900/80">
              <span className="text-xs font-medium text-slate-400">Gasto Atual Real</span>
              <div className="text-2xl font-bold text-slate-100 tabular-nums mt-1">
                {formattedTotalSpent}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Consumido ({overallPercentage}%)</div>
            </Card>

            <Card className="border-slate-800 bg-slate-900/80">
              <span className="text-xs font-medium text-slate-400">Saldo Disponível Restante</span>
              <div
                className={`text-2xl font-bold tabular-nums mt-1 ${
                  totalRemainingCents < 0n ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {formattedTotalRemaining}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">Margem para o restante do mês</div>
            </Card>
          </div>

          {/* Lista de Orçamentos por Categoria */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider text-slate-400">
                Categorias Orçadas ({budgetsList.length})
              </h3>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Alerta automático aos 80% do limite
              </div>
            </div>

            {budgetsList.length === 0 ? (
              <Card className="border-slate-800 bg-slate-900/40 text-center py-12">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-4">
                  <Target className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-white">Nenhum orçamento definido para este mês</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
                  Defina um limite de gastos para suas categorias mais frequentes (ex: Alimentação, Lazer, Transporte).
                </p>
                <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-500">
                  Definir Primeiro Orçamento
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {budgetsList.map((b: any) => {
                  const catName = b.category?.name || b.categoryName || 'Categoria';
                  const catColor = b.category?.color || b.categoryColor || '#3B82F6';

                  return (
                    <Card key={b.id} className="border-slate-800 bg-slate-900/80 p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: catColor }}
                          />
                          <span className="font-bold text-white text-sm">{catName}</span>
                        </div>
                        {getStatusBadge(b.status, b.percentage)}
                      </div>

                      {/* Barra de Progresso */}
                      <div className="space-y-1.5">
                        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(b.status)}`}
                            style={{ width: `${Math.min(b.percentage, 100)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-slate-400">
                            Gasto: <strong className="text-white tabular-nums">{b.formattedSpent}</strong>
                          </span>
                          <span className="text-slate-400">
                            Teto: <strong className="text-white tabular-nums">{b.formattedLimit}</strong>
                          </span>
                        </div>

                        <div className="text-[11px] text-right text-slate-400 pt-0.5">
                          Restante:{' '}
                          <span
                            className={`font-semibold tabular-nums ${
                              b.status === 'EXCEEDED' ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                          >
                            {b.formattedRemaining}
                          </span>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <BudgetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchBudgets}
        currentMonth={month}
        currentYear={year}
      />
    </div>
  );
};
