import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button.js';
import { apiRequest } from '../../lib/api.js';
import { X, FileText, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

interface InvoiceItem {
  id: string;
  description: string;
  amountCents: string;
  formattedAmount: string;
  purchaseDate: string;
  installmentNumber: number;
  totalInstallments: number;
  categoryName: string;
}

interface InvoiceDetail {
  id: string;
  cardId: string;
  cardName: string;
  month: number;
  year: number;
  status: 'OPEN' | 'CLOSED' | 'PAID' | 'OVERDUE';
  totalAmountCents: string;
  formattedTotalAmount: string;
  closingDate: string;
  dueDate: string;
  paidAt?: string;
  items: InvoiceItem[];
}

interface Account {
  id: string;
  name: string;
  formattedCurrentBalance?: string;
}

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  invoiceId: string;
  accounts: Account[];
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  invoiceId,
  accounts
}) => {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [selectedAccountId, setSelectedAccountId] = useState(accounts[0]?.id || '');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPayForm, setShowPayForm] = useState(false);

  useEffect(() => {
    async function loadInvoice() {
      if (!invoiceId) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiRequest<{ success: boolean; data: InvoiceDetail }>(`/invoices/${invoiceId}`);
        if (res.success) {
          setInvoice(res.data);
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar fatura.');
      } finally {
        setIsLoading(false);
      }
    }

    if (isOpen) {
      loadInvoice();
    }
  }, [isOpen, invoiceId]);

  if (!isOpen) return null;

  const handlePayInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setError(null);
    setIsPaying(true);

    try {
      await apiRequest(`/invoices/${invoice.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          accountId: selectedAccountId,
          paymentDate: new Date(paymentDate).toISOString()
        })
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao quitar fatura.');
    } finally {
      setIsPaying(false);
    }
  };

  const statusLabels: Record<string, { label: string; bg: string; text: string }> = {
    OPEN: { label: 'Aberta', bg: 'bg-blue-500/10', text: 'text-blue-400' },
    CLOSED: { label: 'Fechada', bg: 'bg-amber-500/10', text: 'text-amber-400' },
    PAID: { label: 'Paga', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    OVERDUE: { label: 'Vencida', bg: 'bg-rose-500/10', text: 'text-rose-400' }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Fatura {invoice ? `${invoice.cardName} (${invoice.month.toString().padStart(2, '0')}/${invoice.year})` : ''}
              </h3>
              <p className="text-xs text-slate-400">Detalhamento dos lançamentos e parcelamentos</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-3"></div>
              <p className="text-xs text-slate-400">Carregando itens da fatura...</p>
            </div>
          ) : invoice ? (
            <>
              {/* Resumo da Fatura */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                <div>
                  <div className="text-[11px] text-slate-400">Valor Total</div>
                  <div className="text-lg font-bold text-white tabular-nums">
                    {invoice.formattedTotalAmount}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Status</div>
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                      statusLabels[invoice.status]?.bg || 'bg-slate-800'
                    } ${statusLabels[invoice.status]?.text || 'text-slate-300'}`}
                  >
                    {statusLabels[invoice.status]?.label || invoice.status}
                  </span>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Fechamento</div>
                  <div className="text-xs font-medium text-slate-200 mt-1">
                    {new Date(invoice.closingDate).toLocaleDateString('pt-BR')}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-slate-400">Vencimento</div>
                  <div className="text-xs font-medium text-slate-200 mt-1">
                    {new Date(invoice.dueDate).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </div>

              {/* Lista de Itens da Fatura */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Lançamentos nesta Fatura ({invoice.items.length})
                </h4>

                {invoice.items.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60">
                    Nenhum lançamento registrado nesta fatura até o momento.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80 bg-slate-950/40 rounded-xl border border-slate-800/80 px-4">
                    {invoice.items.map((item) => (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white flex items-center gap-2">
                            <span>{item.description}</span>
                            {item.totalInstallments > 1 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                {item.installmentNumber}/{item.totalInstallments}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{item.categoryName}</span>
                            <span>•</span>
                            <span>{new Date(item.purchaseDate).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>

                        <div className="text-sm font-bold text-white tabular-nums shrink-0">
                          {item.formattedAmount}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botão de Pagamento ou Form */}
              {invoice.status !== 'PAID' && (
                <div className="pt-2 border-t border-slate-800/80">
                  {!showPayForm ? (
                    <Button
                      onClick={() => setShowPayForm(true)}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Pagar Fatura
                    </Button>
                  ) : (
                    <form onSubmit={handlePayInvoice} className="space-y-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Quitação com Débito Automático em Conta</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        O pagamento da fatura debitará a conta selecionada e liquidará esta fatura sem duplicar despesas no mês.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                            Débito da Conta
                          </label>
                          <select
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                          >
                            {accounts.map((acc) => (
                              <option key={acc.id} value={acc.id}>
                                {acc.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                            Data do Pagamento
                          </label>
                          <input
                            type="date"
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500"
                            value={paymentDate}
                            onChange={(e) => setPaymentDate(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setShowPayForm(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" isLoading={isPaying} variant="primary">
                          Confirmar Quitação ({invoice.formattedTotalAmount})
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
