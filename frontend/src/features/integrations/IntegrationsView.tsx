import React, { useState, useEffect } from 'react';
import { apiRequest } from '../../lib/api.js';
import {
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  Zap,
  ShieldCheck,
  Play,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface WebhookConfig {
  configured: boolean;
  maskedKey?: string;
  createdAt?: string;
  lastUsedAt?: string | null;
  webhookEndpoint: string;
}

export const IntegrationsView: React.FC = () => {
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Estados do Simulador
  const [simTitle, setSimTitle] = useState('Padaria Central');
  const [simText, setSimText] = useState('R$ 24,90 pago com cartão final 1234');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{
    success: boolean;
    message: string;
    data?: any;
  } | null>(null);

  const fetchConfig = async () => {
    try {
      const res = await apiRequest<{ success: boolean; data: WebhookConfig }>('/integrations/webhook/config');
      setConfig(res.data);
    } catch (err) {
      console.error('Erro ao carregar configurações de webhook:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleGenerateKey = async () => {
    if (config?.configured) {
      const confirm = window.confirm(
        'Atenção: Ao regenerar a chave, qualquer automação no MacroDroid configurada com a chave anterior deixará de funcionar até que você atualize para a nova chave. Deseja continuar?'
      );
      if (!confirm) return;
    }

    try {
      setIsRegenerating(true);
      const res = await apiRequest<{ success: boolean; data: { apiKey: string; maskedKey: string } }>(
        '/integrations/webhook/regenerate',
        { method: 'POST' }
      );
      setNewKey(res.data.apiKey);
      await fetchConfig();
    } catch (err) {
      alert('Erro ao gerar chave de API de Webhook.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const getFullWebhookUrl = () => {
    const hostname = window.location.hostname;
    const origin = window.location.origin;
    // Se estiver em porta de desenvolvimento (ex: 5173), aponta para a porta 3333 no mesmo IP/hostname
    const apiUrl = origin.includes(':5173')
      ? `http://${hostname}:3333`
      : origin;
    return `${apiUrl}/api/v1/integrations/webhook/wallet`;
  };

  const handleCopy = (text: string, type: 'url' | 'key') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setSimResult(null);

    try {
      const res = await apiRequest<{ success: boolean; data: any }>('/integrations/webhook/simulate', {
        method: 'POST',
        body: JSON.stringify({
          title: simTitle,
          text: simText
        })
      });

      const data = res.data;
      if (data.duplicate) {
        setSimResult({
          success: true,
          message: 'Idempotência: Notificação já havia sido processada nos últimos 5 minutos. Nenhuma duplicata foi criada!',
          data
        });
      } else {
        const valFormatted = `R$ ${(Number(data.amountCents) / 100).toFixed(2).replace('.', ',')}`;
        setSimResult({
          success: true,
          message: `Despesa de ${valFormatted} registrada com sucesso em ${data.paymentMethod}!`,
          data
        });
      }
      fetchConfig();
    } catch (err: any) {
      setSimResult({
        success: false,
        message: err.message || 'Falha ao processar simulação'
      });
    } finally {
      setSimulating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Smartphone className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-white tracking-tight">
              Automação Mobile & Carteira do Google
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Capture despesas em tempo real na aproximação (NFC) via Carteira do Google no Android — 100% gratuito e seguro.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="w-3.5 h-3.5" />
            Banco Seguro & Oculto
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Chave e Webhook */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card de Configuração de Chave */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">Chave de Acesso do Webhook (X-Api-Key)</h2>
              </div>
              <button
                onClick={handleGenerateKey}
                disabled={isRegenerating}
                className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 font-medium px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${isRegenerating ? 'animate-spin' : ''}`} />
                {config?.configured ? 'Regenerar Chave' : 'Gerar Chave de API'}
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Esta chave autoriza o seu smartphone a registrar pagamentos no FinControl sem precisar da sua senha de login.
            </p>

            {newKey && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                    Sua Nova Chave (Copie agora):
                  </span>
                  <button
                    onClick={() => handleCopy(newKey, 'key')}
                    className="flex items-center gap-1 text-xs text-amber-300 hover:text-white bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30"
                  >
                    {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copiedKey ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
                <div className="font-mono text-xs text-amber-200 bg-slate-950 p-2 rounded border border-slate-800 break-all select-all">
                  {newKey}
                </div>
              </div>
            )}

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  URL do Webhook
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={getFullWebhookUrl()}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 font-mono focus:outline-none"
                  />
                  <button
                    onClick={() => handleCopy(getFullWebhookUrl(), 'url')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                  Chave Ativa Atual
                </label>
                <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs">
                  <span className="font-mono text-slate-400">
                    {config?.configured ? config.maskedKey : 'Nenhuma chave gerada ainda'}
                  </span>
                  {config?.lastUsedAt && (
                    <span className="text-[10px] text-emerald-400">
                      Último uso: {new Date(config.lastUsedAt).toLocaleDateString('pt-BR')} às {new Date(config.lastUsedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Guia de Configuração no MacroDroid */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">1</span>
              Como Configurar no MacroDroid (Android) em 3 Passos
            </h2>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg">
                <span className="font-bold text-emerald-400 block mb-1">Passo 1: Criar o Gatilho (Trigger)</span>
                No MacroDroid, toque em <b>Adicionar Gatilho</b> $\to$ <b>Notificação</b> $\to$ <b>Notificação Recebida</b> $\to$ Selecione o aplicativo <b>Carteira do Google</b>.
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg">
                <span className="font-bold text-emerald-400 block mb-1">Passo 2: Criar a Ação HTTP (POST)</span>
                Toque em <b>Adicionar Ação</b> $\to$ <b>Conectividade</b> $\to$ <b>Fazer Requisição HTTP</b>:
                <ul className="list-disc pl-5 mt-1.5 space-y-1 text-slate-400">
                  <li>Método: <b>POST</b></li>
                  <li>URL: Cole a URL do Webhook acima</li>
                  <li>Cabeçalhos: Adicione <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">X-Api-Key: sua-chave</code> e <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">Content-Type: application/json</code></li>
                  <li>Corpo: Selecione <b>JSON</b> e envie o texto da notificação:
                    <pre className="mt-1 p-2 bg-slate-900 rounded font-mono text-[11px] text-slate-300">
{`{
  "title": "[notification_title]",
  "text": "[notification_text]"
}`}
                    </pre>
                  </li>
                </ul>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-lg">
                <span className="font-bold text-emerald-400 block mb-1">Passo 3: Pronto!</span>
                Basta salvar a macro. Toda vez que você aproximar o celular numa maquininha na rua, o FinControl registrará a despesa na hora!
              </div>
            </div>
          </div>
        </div>

        {/* Painel Direito: Simulador de Notificações */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white">Simulador em Tempo Real</h2>
            </div>
            <p className="text-xs text-slate-400">
              Teste o lançamento automático diretamente aqui antes de configurar no celular.
            </p>

            <form onSubmit={handleSimulate} className="space-y-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Título da Notificação (Estabelecimento)
                </label>
                <input
                  type="text"
                  value={simTitle}
                  onChange={(e) => setSimTitle(e.target.value)}
                  placeholder="Ex: Padaria Central, Posto Ipiranga..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                  Texto da Notificação da Carteira
                </label>
                <textarea
                  rows={2}
                  value={simText}
                  onChange={(e) => setSimText(e.target.value)}
                  placeholder="Ex: R$ 24,90 pago com Visa final 1234"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* Botões rápidos de exemplo */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSimTitle('Supermercado Pão de Açúcar');
                    setSimText('R$ 87,40 pago com cartão final 1234');
                  }}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors"
                >
                  🛒 Mercado (R$ 87,40)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimTitle('Posto Shell');
                    setSimText('R$ 150,00 pago com cartão final 1234');
                  }}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors"
                >
                  ⛽ Posto (R$ 150,00)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSimTitle('Farmácia Drogasil');
                    setSimText('R$ 32,50 pago por aproximação');
                  }}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded transition-colors"
                >
                  💊 Farmácia (R$ 32,50)
                </button>
              </div>

              <button
                type="submit"
                disabled={simulating}
                className="w-full mt-3 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
              >
                {simulating ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                {simulating ? 'Processando Notificação...' : 'Disparar Notificação Simulada'}
              </button>
            </form>

            {/* Resultado da Simulação */}
            {simResult && (
              <div
                className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                  simResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold">
                  {simResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span>{simResult.success ? 'Notificação Processada' : 'Erro no Processamento'}</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">{simResult.message}</p>
                {simResult.data?.duplicate && (
                  <div className="text-[10px] bg-slate-900/60 p-1.5 rounded text-slate-400 mt-1">
                    Trava Anti-Duplicação: Transação idêntica identificada nos últimos 5 minutos.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dicas de Segurança */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Por que esta abordagem é ultra-segura?
            </span>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>Seu aplicativo de banco não precisa ficar desbloqueado nem enviar notificações.</li>
              <li>A chave do Webhook tem permissão exclusiva de <i>apenas registrar</i> gastos via webhook (não tem acesso a ler seus dados, saldos ou alterar senhas).</li>
              <li>Todas as transações passam por deduplicação de 5 minutos.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
