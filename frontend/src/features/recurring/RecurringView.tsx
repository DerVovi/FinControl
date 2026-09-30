import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { apiRequest } from '../../lib/api.js';
import { RecurringModal } from './RecurringModal.js';
import {
  RefreshCw,
  Plus,
  Calendar,
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  AlertCircle
} from 'lucide-react';

export const RecurringView: React.FC = () => {
  const [recurringList, setRecurringList] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [recRes, accsRes] = await Promise.all([
        apiRequest<{ success: boolean; data: any[] }>('/recurring'),
        apiRequest<{ success: boolean; data: any[] }>('/accounts')
      ]);

      if (recRes.success) setRecurringList(recRes.data);
      if (accsRes.success) setAccounts(accsRes.data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar transações recorrentes.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Coleta todas as ocorrências futuras da janela de 60 dias de todas as recorrências
  const allUpcoming = recurringList
    .flatMap((r) => r.upcomingInWindow || [])
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const frequencyLabels: Record<string, string> = {
    DAILY: 'Diária',
    WEEKLY: 'Semanal',
    MONTHLY: 'Mensal',
    YEARLY: 'Anual'
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <RefreshCw className="w-6 h-6 text-indigo-400" /> Transações Recorrentes & Assinaturas
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Acompanhe contas fixas, assinaturas e salários recorrentes com janela preditiva de 60 dias
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-950/40"
        >
          <Plus className="w-4 h-4" /> Nova Recorrência
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3"></div>
          <p className="text-xs text-slate-400">Calculando recorrências e cronogramas preditivos...</p>
        </div>
      ) : recurringList.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40 text-center py-12">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Nenhuma recorrência cadastrada</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Cadastre assinaturas como Netflix, condomínio ou seu salário para projetar seu fluxo de caixa.
          </p>
          <Button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-500">
            Cadastrar Primeira Recorrência
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Coluna 1 e 2: Lista de Assinaturas e Recorrências */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider text-slate-400">
              Recorrências Ativas ({recurringList.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {recurringList.map((rec) => {
                const isIncome = rec.type === 'INCOME';

                return (
                  <Card key={rec.id} className="border-slate-800 bg-slate-900/80 p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl ${
                            isIncome
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-rose-500/10 text-rose-400'
                          }`}
                        >
                          {isIncome ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{rec.description}</h4>
                          <span className="text-[11px] text-slate-400">
                            {rec.categoryName} • {rec.accountName}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          isIncome
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                        }`}
                      >
                        {frequencyLabels[rec.frequency] || rec.frequency}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] text-slate-500">Valor do Lançamento</div>
                        <div
                          className={`text-base font-bold tabular-nums ${
                            isIncome ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isIncome ? '+ ' : '- '}
                          {rec.formattedAmount}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] text-slate-500">Próximo Vencimento</div>
                        <div className="text-xs font-semibold text-slate-300 flex items-center gap-1 justify-end mt-0.5">
                          <Calendar className="w-3 h-3 text-indigo-400" />
                          <span>{new Date(rec.nextDueDate).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Coluna 3: Janela Preditiva de 60 Dias */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white tracking-tight uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-400" /> Previsão Próximos 60 Dias
            </h3>

            <Card className="border-slate-800 bg-slate-900/60 p-4">
              {allUpcoming.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  Nenhuma ocorrência prevista nos próximos 60 dias.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80">
                  {allUpcoming.map((item, idx) => {
                    const isIncome = item.type === 'INCOME';

                    return (
                      <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {item.description}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{item.formattedDate}</span>
                          </div>
                        </div>

                        <div
                          className={`text-xs font-bold tabular-nums shrink-0 ${
                            isIncome ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isIncome ? '+ ' : '- '}
                          {item.formattedAmount}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      <RecurringModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        accounts={accounts}
      />
    </div>
  );
};
