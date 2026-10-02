import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { api, formatCurrency, formatDate } from '../services/api';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { TransactionDetailsModal } from '../components/TransactionDetailsModal';
import { AccountDetailsModal } from '../components/AccountDetailsModal';
import { notificationListenerService } from '../services/notificationListenerService';

export function DashboardScreen({ user, onNavigateToTransactions }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [hideValues, setHideValues] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const checkNotificationPermission = useCallback(async () => {
    try {
      const status = await notificationListenerService.getPermissionStatus();
      setPermissionStatus(status);
    } catch {}
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [accs, txs, crds, cats] = await Promise.all([
        api.getAccounts(user.id),
        api.getTransactions(user.id, 10),
        api.getCards(user.id),
        api.getCategories(user.id),
      ]);
      setAccounts(accs);
      setTransactions(txs);
      setCards(crds);
      setCategories(cats);
    } catch (err) {
      console.warn('Erro ao carregar dados do Dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    checkNotificationPermission();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadData();
        checkNotificationPermission();
      }
    });

    return () => sub.remove();
  }, [loadData, checkNotificationPermission]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    checkNotificationPermission();
  };

  // Cálculo de Saldo Total
  const totalBalanceCents = accounts.reduce(
    (acc, item) => acc + Number(item.currentBalanceCents || 0),
    0
  );

  // Cálculo de Receitas e Despesas Recentes
  const totalIncomeCents = transactions
    .filter((t) => t.type === 'INCOME')
    .reduce((acc, t) => acc + Number(t.amountCents || 0), 0);

  const totalExpenseCents = transactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + Number(t.amountCents || 0), 0);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* BOAS-VINDAS & OLHO OCULTAR VALORES */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>Olá, {user.fullName || 'Victor'} 👋</Text>
            <Text style={styles.subtitle}>Visão Geral do seu Patrimônio</Text>
          </View>
          <TouchableOpacity
            onPress={() => setHideValues(!hideValues)}
            style={styles.eyeBtn}
            activeOpacity={0.7}
          >
            <Ionicons
              name={hideValues ? 'eye-off-outline' : 'eye-outline'}
              size={22}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* 1. CARD PRINCIPAL DE SALDO GERAL */}
        <Card style={styles.mainBalanceCard}>
          <View style={styles.mainBalanceHeader}>
            <Text style={styles.mainBalanceLabel}>Saldo Geral em Contas</Text>
            <Badge title="NUVEM SUPABASE" />
          </View>

          <Text style={[styles.mainBalanceValue, totalBalanceCents < 0 && { color: colors.expense }]}>
            {hideValues ? '••••••••' : formatCurrency(totalBalanceCents)}
          </Text>

          {/* Mini Resumo: Receitas vs Despesas */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconGreen}>
                <Ionicons name="arrow-up" size={16} color={colors.income} />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Receitas</Text>
                <Text style={styles.summaryIncomeValue}>
                  {hideValues ? '••••' : formatCurrency(totalIncomeCents)}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryItem}>
              <View style={styles.summaryIconRed}>
                <Ionicons name="arrow-down" size={16} color={colors.expense} />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Despesas</Text>
                <Text style={styles.summaryExpenseValue}>
                  {hideValues ? '••••' : formatCurrency(totalExpenseCents)}
                </Text>
              </View>
            </View>
          </View>
        </Card>

        {/* BANNER DE NOTIFICAÇÃO NATIVA (SE NÃO ATIVADA) */}
        {!bannerDismissed && permissionStatus !== 'authorized' && (
          <TouchableOpacity
            style={styles.notifBanner}
            activeOpacity={0.85}
            onPress={() => notificationListenerService.requestPermission()}
          >
            <View style={styles.notifBannerIcon}>
              <Ionicons name="notifications" size={20} color={colors.warning} />
            </View>
            <View style={styles.notifBannerContent}>
              <View style={styles.notifBannerTitleRow}>
                <Text style={styles.notifBannerTitle}>Ativar Leitura Automática</Text>
                <Badge title="NATIVO" variant="warning" />
              </View>
              <Text style={styles.notifBannerDesc}>
                Toque aqui para permitir que o FinControl leia compras do Google Wallet e bancos direto no celular.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.notifBannerClose}
              onPress={() => setBannerDismissed(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}

        {/* 2. CARROSSEL DE CONTAS BANCÁRIAS */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Suas Contas</Text>
          <Text style={styles.sectionSubtitle}>{accounts.length} cadastrada(s)</Text>
        </View>

        {accounts.length === 0 && !loading ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="wallet-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhuma conta cadastrada ainda.</Text>
          </Card>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsScroll}>
            {accounts.map((acc) => (
              <Card
                key={acc.id}
                style={styles.accountCard}
                elevated
                onPress={() => setSelectedAccount(acc)}
              >
                <View style={styles.accountCardTop}>
                  <View style={[styles.accountColorDot, { backgroundColor: acc.color || colors.primary }]} />
                  <Text style={styles.accountType}>{acc.type}</Text>
                </View>
                <Text style={styles.accountName} numberOfLines={1}>{acc.name}</Text>
                <Text style={[styles.accountBalance, Number(acc.currentBalanceCents) < 0 && { color: colors.expense }]}>
                  {hideValues ? '••••' : formatCurrency(acc.currentBalanceCents)}
                </Text>
              </Card>
            ))}
          </ScrollView>
        )}

        {/* 3. TRANSAÇÕES RECENTES */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Últimas Transações</Text>
          {onNavigateToTransactions && (
            <TouchableOpacity onPress={onNavigateToTransactions}>
              <Text style={styles.seeAllText}>Ver todas</Text>
            </TouchableOpacity>
          )}
        </View>

        {transactions.length === 0 && !loading ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="receipt-outline" size={32} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhuma movimentação registrada.</Text>
          </Card>
        ) : (
          <View style={styles.txList}>
            {transactions.map((tx) => {
              const isExpense = tx.type === 'EXPENSE';
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.txItem}
                  activeOpacity={0.7}
                  onPress={() => setSelectedTx(tx)}
                >
                  <View
                    style={[
                      styles.txIconContainer,
                      { backgroundColor: isExpense ? colors.expenseGhost : colors.incomeGhost },
                    ]}
                  >
                    <Ionicons
                      name={isExpense ? 'arrow-down' : 'arrow-up'}
                      size={18}
                      color={isExpense ? colors.expense : colors.income}
                    />
                  </View>

                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc} numberOfLines={1} ellipsizeMode="tail">
                      {tx.description}
                    </Text>
                    <Text style={styles.txDate} numberOfLines={1} ellipsizeMode="tail">
                      {formatDate(tx.date)}
                    </Text>
                  </View>

                  <View style={styles.txRightCol}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isExpense ? colors.expense : colors.income },
                      ]}
                      numberOfLines={1}
                    >
                      {isExpense ? '-' : '+'}
                      {hideValues ? '••••' : formatCurrency(tx.amountCents)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* BOTÃO FLUTUANTE NOVA TRANSAÇÃO */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      {/* MODAL NATIVO NOVA TRANSAÇÃO */}
      <NewTransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => loadData()}
        user={user}
        accounts={accounts}
        cards={cards}
        categories={categories}
      />

      {/* MODAL DETALHES DA CONTA BANCÁRIA */}
      <AccountDetailsModal
        visible={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        account={selectedAccount}
        transactions={transactions}
        onSelectTransaction={(tx) => setSelectedTx(tx)}
      />

      {/* MODAL DETALHES DO LANÇAMENTO / CONTA */}
      <TransactionDetailsModal
        visible={!!selectedTx}
        onClose={() => setSelectedTx(null)}
        transaction={selectedTx}
        accounts={accounts}
        cards={cards}
        categories={categories}
        onDeleted={() => {
          setSelectedTx(null);
          loadData();
        }}
      />
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
    paddingBottom: 90,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  eyeBtn: {
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
  },
  mainBalanceCard: {
    marginBottom: 24,
    padding: 20,
  },
  mainBalanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  mainBalanceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  mainBalanceValue: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.borderHighlight,
    paddingTop: 16,
    justifyContent: 'space-between',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  divider: {
    width: 1,
    height: '100%',
    backgroundColor: colors.borderHighlight,
    marginHorizontal: 12,
  },
  summaryIconGreen: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.incomeGhost,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryIconRed: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.expenseGhost,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  summaryIncomeValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.income,
  },
  summaryExpenseValue: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.expense,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  accountsScroll: {
    marginBottom: 24,
  },
  accountCard: {
    width: 160,
    marginRight: 12,
    padding: 14,
  },
  accountCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  accountColorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  accountType: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  txList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  txItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  txIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  txInfo: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  txDesc: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 3,
  },
  txDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  txRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    flexShrink: 0,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
  },
  notifBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    gap: 12,
  },
  notifBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBannerContent: {
    flex: 1,
  },
  notifBannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  notifBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  notifBannerDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
  notifBannerClose: {
    padding: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
