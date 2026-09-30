import React, { useState } from 'react';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Card } from '../../components/ui/Card.js';
import { useAuthStore } from '../../stores/authStore.js';
import { apiRequest } from '../../lib/api.js';
import { AuthResponse } from '../../types/auth.js';
import { AlertCircle } from 'lucide-react';

interface LoginFormProps {
  onToggleForm: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onToggleForm }) => {
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
      const response = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      if (response.success) {
        setAuth(response.data.user, response.data.accessToken);
      }
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md w-full border-slate-800 bg-slate-900/90 shadow-2xl">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-white tracking-tight">Acesse sua conta</h2>
        <p className="text-xs text-slate-400 mt-1">
          Gerencie seu patrimônio e controle seus gastos em um único lugar
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center gap-2.5 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
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
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Button type="submit" isLoading={isLoading} className="w-full mt-2">
          Entrar no FinControl
        </Button>
      </form>

      <div className="mt-6 text-center text-xs text-slate-400 border-t border-slate-800/80 pt-4">
        Ainda não possui uma conta?{' '}
        <button
          type="button"
          onClick={onToggleForm}
          className="text-emerald-400 hover:text-emerald-300 font-semibold focus:outline-none"
        >
          Cadastre-se grátis
        </button>
      </div>
    </Card>
  );
};
