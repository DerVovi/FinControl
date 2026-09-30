import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { apiRequest } from '../../lib/api.js';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  DollarSign,
  PieChart,
  AlertCircle
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ success: boolean; data: any }>(
        `/reports/monthly?month=${month}&year=${year}`
      );
      if (res.success) {
        setData(res.data);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar relatório mensal.');
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

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

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/v1/reports/export?format=csv`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Falha ao exportar extrato.');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fincontrol-extrato-${year}-${String(month).padStart(2, '0')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(err.message || 'Erro ao exportar CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const monthLabel = new Date(year, month - 1).toLocaleString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-emerald-400" /> Relatórios & DRE Financeiro
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Demonstrativo de resultado do exercício pessoal, taxa de poupança e histórico evolutivo
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

          {/* Botão Exportar CSV */}
          <Button
            onClick={handleExportCsv}
            isLoading={isExporting}
            variant="outline"
            className="flex items-center gap-2 border-slate-700 hover:bg-slate-800 text-xs"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Exportar CSV
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3"></div>
          <p className="text-xs text-slate-400">Consolidando demonstrativo do período...</p>
        </div>
      ) : data ? (
        <>
          {/* 4 Cards de DRE do Mês */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Receitas Totais */}
            <Card className="border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Receitas Líquidas</span>
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-emerald-400 tabular-nums tracking-tight">
                  {data.summary.formattedIncome}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Entradas operacionais</div>
              </div>
            </Card>

            {/* Despesas Totais */}
            <Card className="border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Despesas Operacionais</span>
                <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-rose-400 tabular-nums tracking-tight">
                  {data.summary.formattedExpense}
                </div>
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                  <ShieldCheck className="w-3 h-3" /> Sem transferências duplicadas
                </div>
              </div>
            </Card>

            {/* Resultado Líquido / Poupança */}
            <Card className="border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Resultado Líquido</span>
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div
                  className={`text-2xl font-bold tabular-nums tracking-tight ${
                    BigInt(data.summary.netSavingsCents) >= 0n ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {data.summary.formattedNetSavings}
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Superávit / Déficit do mês</div>
              </div>
            </Card>

            {/* Taxa de Poupança */}
            <Card className="border-slate-800 bg-slate-900/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">Taxa de Poupança</span>
                <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                  <PieChart className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-purple-400 tabular-nums tracking-tight">
                  {data.summary.savingsRate}%
                </div>
                <div className="text-[11px] text-slate-500 mt-1">Economia sobre a receita</div>
              </div>
            </Card>
          </div>

          {/* Gráfico / Tabela de Evolução dos Últimos 6 Meses */}
          <Card
            className="border-slate-800 bg-slate-900/60"
            title="Evolução Financeira (Últimos 6 Meses)"
            subtitle="Demonstrativo comparativo de receitas, despesas e resultado consolidado"
          >
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="pb-3 px-3">Mês / Ano</th>
                    <th className="pb-3 px-3 text-right">Receitas</th>
                    <th className="pb-3 px-3 text-right">Despesas</th>
                    <th className="pb-3 px-3 text-right">Resultado Líquido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data.evolution.map((item: any, idx: number) => {
                    const isPositive = BigInt(item.netCents) >= 0n;
                    const isSelected = item.month === month && item.year === year;

                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-slate-800/30 transition-colors ${
                          isSelected ? 'bg-emerald-500/10 font-bold' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-slate-200 capitalize">
                          {item.label} {isSelected && <span className="text-emerald-400 text-[10px] ml-1.5">(Atual)</span>}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400 tabular-nums">
                          {item.formattedIncome}
                        </td>
                        <td className="py-3 px-3 text-right text-rose-400 tabular-nums">
                          {item.formattedExpense}
                        </td>
                        <td
                          className={`py-3 px-3 text-right tabular-nums ${
                            isPositive ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {item.formattedNet}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Composição Detalhada de Despesas */}
          <Card
            className="border-slate-800 bg-slate-900/60"
            title="Detalhamento de Despesas por Categoria"
            subtitle="Análise percentual e volume de transações"
          >
            {data.categoryBreakdown.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Nenhuma despesa registrada para o período selecionado.
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                {data.categoryBreakdown.map((cat: any) => (
                  <div key={cat.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.color || '#EF4444' }}
                        />
                        <span className="font-semibold text-slate-200">{cat.name}</span>
                        <span className="text-[11px] text-slate-500">
                          ({cat.transactionCount} {cat.transactionCount === 1 ? 'lançamento' : 'lançamentos'})
                        </span>
                      </div>
                      <span className="font-bold text-white tabular-nums">
                        {cat.formattedAmount} ({cat.percentage}%)
                      </span>
                    </div>

                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
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
        </>
      ) : null}
    </div>
  );
};
