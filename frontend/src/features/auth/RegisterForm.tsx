import React, { useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Card } from '../../components/ui/Card.js';
import { useAuthStore } from '../../stores/authStore.js';
import { apiRequest } from '../../lib/api.js';
import { AuthResponse } from '../../types/auth.js';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface RegisterFormProps {
  onToggleForm: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onToggleForm }) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { setAuth } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ fullName, email, password })
      });

      if (response.success) {
        setAuth(response.data.user, response.data.accessToken);
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao cadastrar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md w-full border-slate-800 bg-slate-900/90 shadow-2xl">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">Criar sua conta</h2>
        <p className="text-xs text-slate-400 mt-1">
          Leva menos de 1 minuto para organizar sua vida financeira
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg space-y-2 text-xs text-rose-300">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          {error.toLowerCase().includes('já existe') && (
            <button
              type="button"
              onClick={onToggleForm}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 underline block"
            >
              Clique aqui para entrar com seu e-mail e senha no formulário de login →
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Nome Completo"
          type="text"
          required
          placeholder="Ex: João da Silva"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

        <Input
          label="E-mail"
          type="email"
          required
          placeholder="seu.email@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          label="Senha"
          type="password"
          required
          placeholder="Mínimo 8 caracteres (A-Z, a-z, 0-9)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          helperText="Deve conter ao menos 8 caracteres com letras maiúsculas, minúsculas e números"
        />

        <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Configuração automática inclusa:</span>
          </div>
          <p>• 15 categorias essenciais de receitas e despesas pré-instaladas</p>
          <p>• Moeda padrão BRL com cálculo de centavos exato</p>
        </div>

        <Button type="submit" isLoading={isLoading} className="w-full mt-2">
          Criar Conta Gratuita
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-400 border-t border-slate-800/80 pt-4">
        Já tem uma conta cadastrada?{' '}
        <button
          type="button"
          onClick={onToggleForm}
          className="text-emerald-400 hover:text-emerald-300 font-semibold focus:outline-none"
        >
          Fazer Login
        </button>
      </div>
    </Card>
  );
};
