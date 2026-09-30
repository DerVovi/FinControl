import React, { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore.js';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { TransactionModal } from '../transactions/TransactionModal.js';
import { apiRequest } from '../../lib/api.js';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Trash2
} from 'lucide-react';

export const DashboardPlaceholder: React.FC = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await apiRequest<{ success: boolean; data: any }>('/dashboard');
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta transação? O saldo da conta será estornado.')) {
      return;
    }
    try {
      await apiRequest(`/transactions/${id}`, { method: 'DELETE' });
      fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir');
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3"></div>
        <p className="text-xs text-slate-400">Calculando indicadores financeiros consolidados...</p>
      </div>
    );
  }

  const { summary, accounts, recentTransactions, categoryBreakdown } = data;

  return (
    <div className="space-y-8 max-w-7xl mx-auto w-full">
      {/* Topo / Header do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Proteção Ativa Contra Dupla Contagem
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mt-2">
            Olá, {user?.fullName?.split(' ')[0]}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Visão geral em tempo real de liquidez, despesas e patrimônio
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 shadow-lg shadow-emerald-950/40">
            <Plus className="w-4 h-4" /> Nova Transação
          </Button>
        </div>
      </div>

      {/* 4 Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Patrimônio Líquido */}
        <Card className="border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Patrimônio Líquido</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tabular-nums tracking-tight">
              {summary.formattedNetWorth}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Ativos consolidados</div>
          </div>
        </Card>

        {/* Saldo Consolidado */}
        <Card className="border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Saldo Consolidado</span>
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-white tabular-nums tracking-tight">
              {summary.formattedConsolidatedBalance}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Disponível em contas</div>
          </div>
        </Card>

        {/* Receitas do Mês */}
        <Card className="border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Receitas do Mês</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-400 tabular-nums tracking-tight">
              {summary.formattedMonthIncome}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Taxa de poupança: {summary.savingsRate}%</div>
          </div>
        </Card>

        {/* Despesas do Mês */}
        <Card className="border-slate-800 bg-slate-900/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Despesas do Mês</span>
            <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-rose-400 tabular-nums tracking-tight">
              {summary.formattedMonthExpense}
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
              <CheckCircle2 className="w-3 h-3" /> Sem transferências duplicadas
            </div>
          </div>
        </Card>
      </div>

      {/* Grid Principal: Contas & Despesas por Categoria */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contas Cadastradas */}
        <Card className="border-slate-800 bg-slate-900/60" title="Suas Contas Financeiras" subtitle="Saldos atuais calculados deterministicamente">
          <div className="space-y-3 mt-2">
            {accounts.map((acc: any) => (
              <div
                key={acc.id}
                className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: acc.color || '#10B981' }}
                  />
                  <div>
                    <div className="text-sm font-semibold text-white">{acc.name}</div>
                    <div className="text-[11px] text-slate-400 uppercase tracking-wider">{acc.type}</div>
                  </div>
                </div>
                <div className="text-sm font-bold text-white tabular-nums">
                  {acc.formattedCurrentBalance}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Gastos por Categoria */}
        <Card
          className="lg:col-span-2 border-slate-800 bg-slate-900/60"
          title="Despesas por Categoria no Mês"
          subtitle="Acompanhamento proporcional de saídas"
        >
          {categoryBreakdown.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Nenhuma despesa registrada neste mês ainda.
            </div>
          ) : (
            <div className="space-y-3.5 mt-2">
              {categoryBreakdown.map((cat: any) => (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-200">{cat.name}</span>
                    <span className="font-bold text-white tabular-nums">
                      {cat.formattedAmount} ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(cat.percentage, 100)}%`,
                        backgroundColor: cat.color || '#EF4444'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Histórico Recente de Transações */}
      <Card
        className="border-slate-800 bg-slate-900/60"
        title="Transações Recentes"
        subtitle="Extrato contábil auditado das últimas movimentações"
      >
        {recentTransactions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhuma transação lançada ainda. Clique em "Nova Transação" para começar.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80 overflow-x-auto">
            {recentTransactions.map((tx: any) => {
              const isIncome = tx.type === 'INCOME';
              const isTransfer = tx.type === 'TRANSFER';
              const isExpense = tx.type === 'EXPENSE';

              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        isIncome
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : isTransfer
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {isIncome && <ArrowUpRight className="w-4 h-4" />}
                      {isTransfer && <ArrowLeftRight className="w-4 h-4" />}
                      {isExpense && <ArrowDownRight className="w-4 h-4" />}
                    </div>

                    <div className="truncate">
                      <div className="text-sm font-semibold text-white truncate">
                        {tx.description}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span>{tx.account?.name}</span>
                        {isTransfer && (
                          <>
                            <span>→</span>
                            <span className="text-blue-400">{tx.destinationAccount?.name}</span>
                          </>
                        )}
                        {tx.category && (
                          <>
                            <span>•</span>
                            <span>{tx.category.name}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{new Date(tx.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div
                      className={`text-sm font-bold tabular-nums ${
                        isIncome
                          ? 'text-emerald-400'
                          : isTransfer
                          ? 'text-blue-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {isIncome ? '+ ' : isExpense ? '- ' : ''}
                      {tx.formattedAmount}
                    </div>

                    <button
                      onClick={() => handleDeleteTransaction(tx.id)}
                      title="Excluir e estornar saldo"
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal de Transação */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchDashboard}
        accounts={accounts}
      />
    </div>
  );
};
