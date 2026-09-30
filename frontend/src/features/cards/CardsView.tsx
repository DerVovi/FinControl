import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { apiRequest } from '../../lib/api.js';
import { CardModal } from './CardModal.js';
import { CardPurchaseModal } from './CardPurchaseModal.js';
import { InvoiceModal } from './InvoiceModal.js';
import {
  CreditCard,
  Plus,
  ShoppingBag,
  FileText,
  AlertCircle
} from 'lucide-react';

export const CardsView: React.FC = () => {
  const [cards, setCards] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isNewCardOpen, setIsNewCardOpen] = useState(false);
  const [purchaseCard, setPurchaseCard] = useState<{ id: string; name: string } | null>(null);
  const [activeInvoiceId, setActiveInvoiceId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [cardsRes, accsRes] = await Promise.all([
        apiRequest<{ success: boolean; data: any[] }>('/cards'),
        apiRequest<{ success: boolean; data: any[] }>('/accounts')
      ]);

      if (cardsRes.success) setCards(cardsRes.data);
      if (accsRes.success) setAccounts(accsRes.data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar cartões de crédito.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-purple-400" /> Cartões de Crédito & Faturas
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gestão de limites, compras parceladas e fechamento de faturas sem surpresas
          </p>
        </div>

        <Button
          onClick={() => setIsNewCardOpen(true)}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 shadow-lg shadow-purple-950/40"
        >
          <Plus className="w-4 h-4" /> Novo Cartão
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-3"></div>
          <p className="text-xs text-slate-400">Carregando cartões e faturas vigentes...</p>
        </div>
      ) : cards.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40 text-center py-12">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Nenhum cartão cadastrado</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Cadastre seus cartões de crédito para acompanhar faturas abertas, datas de corte e parcelas futuras.
          </p>
          <Button onClick={() => setIsNewCardOpen(true)} className="bg-purple-600 hover:bg-purple-500">
            Cadastrar Primeiro Cartão
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const limit = Number(card.limitCents);
            const compromised = Number(card.compromisedLimitCents);
            const percentageUsed = limit > 0 ? Math.min(Math.round((compromised / limit) * 100), 100) : 0;

            return (
              <div
                key={card.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all"
              >
                {/* Visual bar no topo */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: card.color || '#8B5CF6' }}
                />

                <div className="space-y-4">
                  {/* Cabeçalho do Cartão */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        {card.institution || 'Cartão de Crédito'}
                      </div>
                      <h3 className="text-lg font-bold text-white tracking-tight mt-0.5">
                        {card.name}
                      </h3>
                      {card.last4Digits && (
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          •••• •••• •••• {card.last4Digits}
                        </div>
                      )}
                    </div>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                      style={{ backgroundColor: `${card.color || '#8B5CF6'}20`, color: card.color || '#8B5CF6' }}
                    >
                      <CreditCard className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Limites */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Limite Disponível</span>
                      <span className="font-bold text-emerald-400 tabular-nums">
                        {card.formattedAvailableLimit}
                      </span>
                    </div>

                    {/* Barra de Limite */}
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          percentageUsed > 85 ? 'bg-rose-500' : percentageUsed > 60 ? 'bg-amber-500' : 'bg-purple-500'
                        }`}
                        style={{ width: `${percentageUsed}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Usado: {card.formattedCompromisedLimit} ({percentageUsed}%)</span>
                      <span>Total: {card.formattedLimit}</span>
                    </div>
                  </div>

                  {/* Fatura Vigente */}
                  <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Fatura Atual</span>
                      <span className="text-xs font-bold text-white tabular-nums">
                        {card.currentInvoice?.formattedTotalAmount || 'R$ 0,00'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Fecha dia {card.closingDay}</span>
                      <span>Vence dia {card.dueDay}</span>
                    </div>
                  </div>
                </div>

                {/* Ações */}
                <div className="grid grid-cols-2 gap-2 mt-5 pt-4 border-t border-slate-800/80">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center justify-center gap-1.5 text-xs"
                    onClick={() => setPurchaseCard({ id: card.id, name: card.name })}
                  >
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" /> Nova Compra
                  </Button>

                  <Button
                    size="sm"
                    className="flex items-center justify-center gap-1.5 text-xs bg-purple-600 hover:bg-purple-500"
                    onClick={() => {
                      if (card.currentInvoice?.id) {
                        setActiveInvoiceId(card.currentInvoice.id);
                      } else {
                        alert('Nenhuma fatura aberta encontrada para este cartão.');
                      }
                    }}
                  >
                    <FileText className="w-3.5 h-3.5" /> Ver Fatura
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modais */}
      <CardModal
        isOpen={isNewCardOpen}
        onClose={() => setIsNewCardOpen(false)}
        onSuccess={fetchData}
      />

      {purchaseCard && (
        <CardPurchaseModal
          isOpen={!!purchaseCard}
          onClose={() => setPurchaseCard(null)}
          onSuccess={fetchData}
          cardId={purchaseCard.id}
          cardName={purchaseCard.name}
        />
      )}

      {activeInvoiceId && (
        <InvoiceModal
          isOpen={!!activeInvoiceId}
          onClose={() => setActiveInvoiceId(null)}
          onSuccess={fetchData}
          invoiceId={activeInvoiceId}
          accounts={accounts}
        />
      )}
    </div>
  );
};
