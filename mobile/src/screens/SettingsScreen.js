import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { storage } from '../services/storage';
import { notificationListenerService } from '../services/notificationListenerService';
import { formatCurrency } from '../services/api';

export function SettingsScreen({ user, onLogout }) {
  const [permissionStatus, setPermissionStatus] = useState('unknown'); // 'authorized' | 'denied' | 'unknown'
  const [history, setHistory] = useState([]);
  const [loadingCheck, setLoadingCheck] = useState(false);

  const checkStatus = async () => {
    try {
      setLoadingCheck(true);
      const status = await notificationListenerService.getPermissionStatus();
      setPermissionStatus(status);
      const hist = await notificationListenerService.getNotificationHistory();
      setHistory(hist || []);
    } catch (e) {
      console.warn('Erro ao verificar status:', e);
    } finally {
      setLoadingCheck(false);
    }
  };

  useEffect(() => {
    checkStatus();

    // Auto-atualiza o status ao voltar das Configurações do Android
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkStatus();
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const handleOpenSettings = () => {
    try {
      notificationListenerService.requestPermission();
    } catch {
      Alert.alert(
        'Ajuste Manual',
        'Vá em Configurações do Android > Aplicativos > Acesso especial a apps > Acesso a notificações e ative o FinControl.'
      );
    }
  };

  const handleSimulateTest = async () => {
    Alert.alert(
      'Simular Notificação',
      'Deseja simular o recebimento de uma notificação de compra da Carteira do Google (R$ 45,90 no Posto Shell)?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Simular Agora',
          onPress: async () => {
            const simulated = {
              app: 'com.google.android.apps.walletnfcrel',
              title: 'Carteira do Google',
              text: 'R$ 45,90 pago para Posto Shell com Cartão final 1234',
            };
            const result = await notificationListenerService.handleIncomingNotification(simulated);
            if (result.success) {
              Alert.alert('Sucesso!', 'Transação de R$ 45,90 no Posto Shell capturada e gravada no Supabase!');
              checkStatus();
            } else {
              Alert.alert('Aviso', `Resultado: ${result.reason || result.error || 'Não processada'}`);
            }
          },
        },
      ]
    );
  };

  const handleClearCache = async () => {
    try {
      await storage.saveCache(storage.KEYS.ACCOUNTS_CACHE, null);
      await storage.saveCache(storage.KEYS.TRANSACTIONS_CACHE, null);
      await storage.saveCache(storage.KEYS.CARDS_CACHE, null);
      Alert.alert('Sucesso', 'Cache local limpo com sucesso.');
    } catch {
      Alert.alert('Erro', 'Não foi possível limpar o cache.');
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja desconectar do FinControl neste celular?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  const isAuthorized = permissionStatus === 'authorized';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Ajustes & Configurações</Text>
          <Text style={styles.subtitle}>Notificações nativas, segurança e manutenção</Text>
        </View>

        {/* PERFIL */}
        <Card style={styles.profileCard} elevated>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {(user?.fullName || user?.email || 'V')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.fullName || 'Victor'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'vito@email.com'}</Text>
            <Badge title="MOEDA BRL (R$)" style={styles.currencyBadge} />
          </View>
        </Card>

        {/* AUTOMAÇÃO NATIVA DE NOTIFICAÇÕES (SEM MACRODROID) */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Automação Nativa de Notificações</Text>
        </View>

        <Card style={styles.automationCard} elevated>
          <View style={styles.automationHeader}>
            <View style={[styles.automationIconBox, isAuthorized && styles.automationIconBoxActive]}>
              <Ionicons
                name={isAuthorized ? 'notifications' : 'notifications-outline'}
                size={24}
                color={isAuthorized ? colors.primary : colors.warning}
              />
            </View>
            <View style={styles.automationHeaderText}>
              <Text style={styles.automationTitle}>Leitor Automático Android</Text>
              <Text style={styles.automationSubtitle}>
                Google Wallet, Nubank, Itaú, Inter e bancos
              </Text>
            </View>
            <Badge
              title={isAuthorized ? 'ATIVO' : 'DESATIVADO'}
              variant={isAuthorized ? 'success' : 'warning'}
            />
          </View>

          <Text style={styles.automationDescription}>
            Lê notificações de compras em tempo real diretamente no Android e registra
            automaticamente no FinControl. <Text style={styles.boldText}>Sem depender do MacroDroid</Text> ou apps externos.
          </Text>

          <View style={styles.automationActions}>
            <Button
              title="Abrir Configuração no Celular"
              variant={isAuthorized ? 'secondary' : 'primary'}
              onPress={handleOpenSettings}
              icon={<Ionicons name="settings-outline" size={18} color={isAuthorized ? colors.text : colors.background} />}
              style={styles.actionBtn}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={checkStatus}
                activeOpacity={0.7}
              >
                <Ionicons name="sync-outline" size={16} color={colors.primary} />
                <Text style={styles.secondaryActionText}>
                  {loadingCheck ? 'Verificando...' : 'Checar Status'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={handleSimulateTest}
                activeOpacity={0.7}
              >
                <Ionicons name="flask-outline" size={16} color={colors.primary} />
                <Text style={styles.secondaryActionText}>Testar Simulação</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* HISTÓRICO DE NOTIFICAÇÕES RECENTES */}
          {history.length > 0 && (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyTitle}>Últimas Capturas Automáticas</Text>
                <TouchableOpacity onPress={() => notificationListenerService.clearNotificationHistory().then(checkStatus)}>
                  <Text style={styles.historyClearText}>Limpar</Text>
                </TouchableOpacity>
              </View>

              {history.slice(0, 3).map((item) => (
                <View key={item.id} style={styles.historyItem}>
                  <View style={styles.historyItemLeft}>
                    <Ionicons
                      name={item.type === 'INCOME' ? 'arrow-down-circle' : 'arrow-up-circle'}
                      size={20}
                      color={item.type === 'INCOME' ? colors.success : colors.danger}
                    />
                    <View>
                      <Text style={styles.historyItemTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.historyItemDate}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {item.cardLastFour ? ` • Final ${item.cardLastFour}` : ''}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.historyItemAmount, item.type === 'INCOME' && styles.textIncome]}>
                    {formatCurrency(item.amountCents)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        {/* STATUS DO SISTEMA */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Arquitetura & Nuvem</Text>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="cloud-done-outline" size={20} color={colors.primary} />
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Banco de Dados</Text>
              <Text style={styles.infoValue}>Supabase Cloud PostgreSQL (Direto)</Text>
            </View>
            <Badge title="ONLINE" />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Serviço Nativo Android</Text>
              <Text style={styles.infoValue}>HeadlessTask com WakeLock automático</Text>
            </View>
            <Badge title="NATIVO" />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <Ionicons name="calculator-outline" size={20} color={colors.primary} />
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Precisão Monetária</Text>
              <Text style={styles.infoValue}>Centavos Inteiros (BigInt / Prompt Mestre)</Text>
            </View>
            <Badge title="100%" />
          </View>
        </Card>

        {/* AÇÕES DE CONTA */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Manutenção</Text>
        </View>

        <Card style={styles.actionCard}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleClearCache}
            activeOpacity={0.7}
          >
            <View style={styles.actionItemLeft}>
              <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.actionItemText}>Recarregar Cache Local</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* BOTÃO LOGOUT */}
        <Button
          title="Desconectar da Conta"
          variant="danger"
          onPress={confirmLogout}
          style={styles.logoutBtn}
          icon={<Ionicons name="log-out-outline" size={20} color={colors.textInverse} />}
        />

        <Text style={styles.versionText}>FinControl Android Native v1.0.3 (Build 4)</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginBottom: 24,
    gap: 16,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryGhost,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  currencyBadge: {
    alignSelf: 'flex-start',
  },
  sectionHeader: {
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  automationCard: {
    padding: 18,
    marginBottom: 24,
    borderColor: colors.borderHighlight,
  },
  automationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  automationIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.cardHover,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  automationIconBoxActive: {
    backgroundColor: colors.primaryGhost,
    borderColor: colors.primary,
  },
  automationHeaderText: {
    flex: 1,
  },
  automationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  automationSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  automationDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  boldText: {
    color: colors.primary,
    fontWeight: '700',
  },
  automationActions: {
    gap: 10,
  },
  actionBtn: {
    width: '100%',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.cardHover,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  historySection: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  historyClearText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHighlight,
  },
  historyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  historyItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  historyItemDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  historyItemAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.danger,
    marginLeft: 8,
  },
  textIncome: {
    color: colors.success,
  },
  infoCard: {
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoTexts: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  infoValue: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.borderHighlight,
    marginVertical: 12,
  },
  actionCard: {
    padding: 0,
    marginBottom: 24,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  logoutBtn: {
    marginBottom: 20,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
