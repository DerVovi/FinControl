import React, { useState, useEffect } from 'react';
import { useAuthStore } from './stores/authStore.js';
import { Navbar, NavTab } from './components/layout/Navbar.js';
import { LoginForm } from './features/auth/LoginForm.js';
import { RegisterForm } from './features/auth/RegisterForm.js';
import { DashboardPlaceholder } from './features/dashboard/DashboardPlaceholder.js';
import { TransactionsView } from './features/transactions/TransactionsView.js';
import { CardsView } from './features/cards/CardsView.js';
import { BudgetsView } from './features/budgets/BudgetsView.js';
import { GoalsView } from './features/goals/GoalsView.js';
import { RecurringView } from './features/recurring/RecurringView.js';
import { ReportsView } from './features/reports/ReportsView.js';
import { IntegrationsView } from './features/integrations/IntegrationsView.js';
import { Wallet, Shield, Zap } from 'lucide-react';

export const App: React.FC = () => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const [isRegistering, setIsRegistering] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
        <p className="text-xs text-slate-400 font-medium">Carregando ambiente seguro...</p>
      </div>
    );
  }

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPlaceholder />;
      case 'transactions':
        return <TransactionsView />;
      case 'cards':
        return <CardsView />;
      case 'budgets':
        return <BudgetsView />;
      case 'goals':
        return <GoalsView />;
      case 'recurring':
        return <RecurringView />;
      case 'reports':
        return <ReportsView />;
      case 'integrations':
        return <IntegrationsView />;
      default:
        return <DashboardPlaceholder />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col text-slate-100">
      <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col">
        {isAuthenticated ? (
          renderActiveTabContent()
        ) : (
          <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14 py-6 sm:py-8 lg:py-12">
            {/* Bloco de Apresentação com espaçamento seguro para o menu do celular */}
            <div className="max-w-xl text-center lg:text-left space-y-5 pt-3 sm:pt-6 lg:pt-0">
              {/* 1. Seu dinheiro em cima */}
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Seu dinheiro sob controle, <span className="text-emerald-400">de verdade</span>.
              </h1>

              {/* 2. Texto do Descubra em cima */}
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-lg mx-auto lg:mx-0">
                Descubra com precisão matemática quanto dinheiro você tem, quanto pode gastar e para onde cada centavo está indo. Adeus às planilhas confusas.
              </p>

              {/* 3. Aí embaixo: Gestão Financeira */}
              <div className="flex justify-center lg:justify-start pt-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Gestão Financeira Sem Complicações</span>
                </div>
              </div>

              {/* 4. Aí embaixo: 100% Seguro e Cálculo Preciso */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-1 max-w-md mx-auto lg:mx-0">
                <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white">100% Seguro</div>
                    <div className="text-[11px] text-slate-400">Seus dados protegidos</div>
                  </div>
                </div>

                <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="text-xs font-semibold text-white">Cálculo Preciso</div>
                    <div className="text-[11px] text-slate-400">Zero erros de centavos</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulário de Autenticação */}
            <div className="w-full max-w-md pt-2 sm:pt-4 lg:pt-0">
              {isRegistering ? (
                <RegisterForm onToggleForm={() => setIsRegistering(false)} />
              ) : (
                <LoginForm onToggleForm={() => setIsRegistering(true)} />
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        FinControl © 2026 — Desenvolvido com Clean Architecture e Precisão Financeira
      </footer>
    </div>
  );
};
