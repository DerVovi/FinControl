import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { apiRequest } from '../../lib/api.js';
import { TransactionModal } from './TransactionModal.js';
import {
  ArrowDownRight,
  ArrowUpRight,
  ArrowLeftRight,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedAccountId, setSelectedAccountId] = useState('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [txRes, accsRes, catRes] = await Promise.all([
        apiRequest<{ success: boolean; data: any[] }>('/transactions'),
        apiRequest<{ success: boolean; data: any[] }>('/accounts'),
        apiRequest<{ success: boolean; data: any[] }>('/categories')
      ]);

      if (txRes.success) setTransactions(txRes.data);
      if (accsRes.success) setAccounts(accsRes.data);
      if (catRes.success) setCategories(catRes.data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar transações.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta transação? O saldo da conta será estornado.')) {
      return;
    }
    try {
      await apiRequest(`/transactions/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Erro ao excluir transação.');
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    if (selectedType !== 'ALL' && tx.type !== selectedType) return false;
    if (selectedAccountId !== 'ALL' && tx.accountId !== selectedAccountId && tx.destinationAccountId !== selectedAccountId) return false;
    if (selectedCategoryId !== 'ALL' && tx.categoryId !== selectedCategoryId) return false;
    if (search.trim()) {
      const term = search.toLowerCase();
      const matchDesc = tx.description?.toLowerCase().includes(term);
      const matchCat = tx.category?.name?.toLowerCase().includes(term);
      const matchAcc = tx.account?.name?.toLowerCase().includes(term);
      if (!matchDesc && !matchCat && !matchAcc) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-emerald-400" /> Extrato Contábil de Transações
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Histórico auditado de receitas, despesas, transferências e liquidações
          </p>
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/40"
        >
          <Plus className="w-4 h-4" /> Nova Transação
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-slate-900/80 border border-slate-800 rounded-2xl">
        {/* Busca por texto */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Filtro de Tipo */}
        <div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="EXPENSE">Apenas Despesas</option>
            <option value="INCOME">Apenas Receitas</option>
            <option value="TRANSFER">Apenas Transferências</option>
            <option value="INVOICE_PAYMENT">Pagamentos de Fatura</option>
          </select>
        </div>

        {/* Filtro de Categoria */}
        <div>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Todas as Categorias</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Conta */}
        <div>
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">Todas as Contas</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3"></div>
          <p className="text-xs text-slate-400">Carregando livro contábil...</p>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40 text-center py-12">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Nenhuma transação encontrada</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Não há lançamentos correspondentes aos filtros selecionados.
          </p>
          <Button onClick={() => setIsModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500">
            Cadastrar Transação
          </Button>
        </Card>
      ) : (
        <Card className="border-slate-800 bg-slate-900/60 p-0 overflow-hidden">
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Mostrando {filteredTransactions.length} lançamentos</span>
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Reversão atômica de saldos garantida
            </span>
          </div>

          <div className="divide-y divide-slate-800/80 overflow-x-auto">
            {filteredTransactions.map((tx) => {
              const isIncome = tx.type === 'INCOME';
              const isTransfer = tx.type === 'TRANSFER';
              const isInvoicePay = tx.type === 'INVOICE_PAYMENT';
              const isExpense = tx.type === 'EXPENSE';

              return (
                <div key={tx.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2.5 rounded-xl shrink-0 ${
                        isIncome
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : isTransfer
                          ? 'bg-blue-500/10 text-blue-400'
                          : isInvoicePay
                          ? 'bg-purple-500/10 text-purple-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {isIncome && <ArrowUpRight className="w-4 h-4" />}
                      {isTransfer && <ArrowLeftRight className="w-4 h-4" />}
                      {isInvoicePay && <CheckCircle2 className="w-4 h-4" />}
                      {isExpense && <ArrowDownRight className="w-4 h-4" />}
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {tx.description}
                      </div>
                      <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-slate-300">{tx.account?.name}</span>
                        {isTransfer && (
                          <>
                            <span>→</span>
                            <span className="text-blue-400">{tx.destinationAccount?.name}</span>
                          </>
                        )}
                        {tx.category && (
                          <>
                            <span>•</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {tx.category.name}
                            </span>
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
                          : isInvoicePay
                          ? 'text-purple-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {isIncome ? '+ ' : isExpense || isInvoicePay ? '- ' : ''}
                      {tx.formattedAmount}
                    </div>

                    <button
                      onClick={() => handleDelete(tx.id)}
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
        </Card>
      )}

      {/* Modal de Transação */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchData}
        accounts={accounts}
      />
    </div>
  );
};
