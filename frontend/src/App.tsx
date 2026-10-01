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

      <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-12 flex flex-col">
        {isAuthenticated ? (
          renderActiveTabContent()
        ) : (
          <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col items-center justify-center space-y-7 sm:space-y-8 my-auto">
            {/* 1. Seu dinheiro e o texto do descubra */}
            <div className="text-center space-y-3 px-2 pt-4 sm:pt-0">
              <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Seu dinheiro sob controle, <span className="text-emerald-400">de verdade</span>.
              </h1>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-lg mx-auto">
                Descubra com precisão matemática quanto dinheiro você tem, quanto pode gastar e para onde cada centavo está indo. Adeus às planilhas confusas.
              </p>
            </div>

            {/* 2. Aí vem o login */}
            <div className="w-full max-w-md">
              {isRegistering ? (
                <RegisterForm onToggleForm={() => setIsRegistering(false)} />
              ) : (
                <LoginForm onToggleForm={() => setIsRegistering(true)} />
              )}
            </div>

            {/* 3. E depois o gestão e os blocos */}
            <div className="w-full max-w-md space-y-4 pt-1">
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                  <Wallet className="w-3.5 h-3.5" />
                  <span>Gestão Financeira Sem Complicações</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 py-4 text-center text-xs text-slate-500">
        FinControl © 2026 — Desenvolvido com Clean Architecture e Precisão Financeira
      </footer>
    </div>
  );
};
