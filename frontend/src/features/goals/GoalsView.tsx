import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '../../components/ui/Card.js';
import { Button } from '../../components/ui/Button.js';
import { apiRequest } from '../../lib/api.js';
import { GoalModal } from './GoalModal.js';
import { ContributeGoalModal } from './ContributeGoalModal.js';
import {
  Award,
  Plus,
  PiggyBank,
  Calendar,
  CheckCircle2,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

export const GoalsView: React.FC = () => {
  const [goals, setGoals] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [contributeGoal, setContributeGoal] = useState<{ id: string; name: string } | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [goalsRes, accsRes] = await Promise.all([
        apiRequest<{ success: boolean; data: any[] }>('/goals'),
        apiRequest<{ success: boolean; data: any[] }>('/accounts')
      ]);

      if (goalsRes.success) setGoals(goalsRes.data);
      if (accsRes.success) setAccounts(accsRes.data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar metas financeiras.');
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
            <Award className="w-6 h-6 text-emerald-400" /> Metas Financeiras & Sonhos
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Planeje suas grandes conquistas e acompanhe o ritmo de aportes necessários
          </p>
        </div>

        <Button
          onClick={() => setIsNewGoalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/40"
        >
          <Plus className="w-4 h-4" /> Nova Meta
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mb-3"></div>
          <p className="text-xs text-slate-400">Carregando objetivos e evolução patrimonial...</p>
        </div>
      ) : goals.length === 0 ? (
        <Card className="border-slate-800 bg-slate-900/40 text-center py-12">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4">
            <Award className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white">Nenhuma meta cadastrada ainda</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Crie sua primeira meta (ex: Reserva de Emergência, Viagem das Férias, Carro Novo) e planeje aportes mensais.
          </p>
          <Button onClick={() => setIsNewGoalOpen(true)} className="bg-emerald-600 hover:bg-emerald-500">
            Criar Minha Primeira Meta
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const isCompleted = goal.status === 'COMPLETED' || goal.percentage >= 100;

            return (
              <div
                key={goal.id}
                className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-slate-700 transition-all"
              >
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: goal.color || '#10B981' }}
                />

                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {goal.name}
                      </h3>
                      {goal.deadline && (
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}</span>
                        </div>
                      )}
                    </div>

                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                      style={{
                        backgroundColor: `${goal.color || '#10B981'}20`,
                        color: goal.color || '#10B981'
                      }}
                    >
                      <Award className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Progresso */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Progresso Atual</span>
                      <span className="font-bold text-emerald-400 tabular-nums">
                        {goal.percentage}%
                      </span>
                    </div>

                    <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(goal.percentage, 100)}%`,
                          backgroundColor: goal.color || '#10B981'
                        }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                      <span>Acumulado: <strong className="text-white tabular-nums">{goal.formattedCurrentAmount}</strong></span>
                      <span>Alvo: <strong className="text-white tabular-nums">{goal.formattedTargetAmount}</strong></span>
                    </div>
                  </div>

                  {/* Informações adicionais */}
                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Restante para alcançar:</span>
                      <span className="font-semibold text-white tabular-nums">{goal.formattedRemaining}</span>
                    </div>

                    {goal.formattedSuggestedMonthlyContribution && !isCompleted && (
                      <div className="flex items-center justify-between text-emerald-400 font-medium pt-1 border-t border-slate-800/80">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Aporte sugerido:
                        </span>
                        <span className="tabular-nums font-bold">
                          {goal.formattedSuggestedMonthlyContribution}/mês
                        </span>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-center justify-center py-0.5">
                        <CheckCircle2 className="w-4 h-4" /> Meta 100% Conquistada!
                      </div>
                    )}
                  </div>
                </div>

                {/* Botão de Aporte */}
                {!isCompleted && (
                  <div className="mt-5 pt-4 border-t border-slate-800/80">
                    <Button
                      onClick={() => setContributeGoal({ id: goal.id, name: goal.name })}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500"
                    >
                      <PiggyBank className="w-4 h-4" /> Fazer Aporte
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modais */}
      <GoalModal
        isOpen={isNewGoalOpen}
        onClose={() => setIsNewGoalOpen(false)}
        onSuccess={fetchData}
      />

      {contributeGoal && (
        <ContributeGoalModal
          isOpen={!!contributeGoal}
          onClose={() => setContributeGoal(null)}
          onSuccess={fetchData}
          goalId={contributeGoal.id}
          goalName={contributeGoal.name}
          accounts={accounts}
        />
      )}
    </div>
  );
};
