import React from 'react';
import { useAuthStore } from '../../stores/authStore.js';
import {
  LogOut,
  Wallet,
  Shield,
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Target,
  Award,
  RefreshCw,
  BarChart3,
  Smartphone
} from 'lucide-react';

export type NavTab = 'dashboard' | 'transactions' | 'cards' | 'budgets' | 'goals' | 'recurring' | 'reports' | 'integrations';

interface NavbarProps {
  activeTab?: NavTab;
  onSelectTab?: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab = 'dashboard', onSelectTab }) => {
  const { user, logout } = useAuthStore();

  const navItems: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'transactions', label: 'Transações', icon: <ArrowLeftRight className="w-4 h-4" /> },
    { id: 'cards', label: 'Cartões & Faturas', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'budgets', label: 'Orçamentos', icon: <Target className="w-4 h-4" /> },
    { id: 'goals', label: 'Metas', icon: <Award className="w-4 h-4" /> },
    { id: 'recurring', label: 'Recorrências', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'reports', label: 'Relatórios & DRE', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'integrations', label: 'Automação Mobile', icon: <Smartphone className="w-4 h-4" /> }
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">
              Fin<span className="text-emerald-400">Control</span>
            </span>
            <span className="hidden sm:inline-block text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 ml-1">
              MVP v0.1
            </span>
          </div>

          {user && (
            <div className="flex items-center gap-4">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-xs font-semibold text-slate-200">{user.fullName}</span>
                <span className="text-[11px] text-slate-400">{user.email}</span>
              </div>
              <button
                onClick={() => logout()}
                title="Sair da conta"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition-colors border border-transparent hover:border-slate-800"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {!user && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Ambiente Seguro & LGPD</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs Bar when authenticated */}
        {user && onSelectTab && (
          <nav className="flex items-center gap-1 overflow-x-auto py-2 -mb-px border-t border-slate-800/60 scrollbar-none">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
};
