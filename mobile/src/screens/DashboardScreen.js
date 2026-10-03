import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { api, formatCurrency, formatDate } from '../services/api';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { TransactionDetailsModal } from '../components/TransactionDetailsModal';
import { AccountDetailsModal } from '../components/AccountDetailsModal';
import { RecurringBillsModal } from '../components/RecurringBillsModal';
import { CategoryExpenseChart } from '../components/CategoryExpenseChart';
import { MonthlyForecastSummary } from '../components/MonthlyForecastSummary';

export function DashboardScreen({ user, onNavigateToTransactions }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [cards, setCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recurringBills, setRecurringBills] = useState([]);
  const [hideValues, setHideValues] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [recurringModalVisible, setRecurringModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      // 1. Sincroniza instâncias de contas fixas para o mês corrente
      await api.syncRecurring(user.id);

      // 2. Carrega todos os dados atualizados (100 transações para gráficos e previsão orçamentária)
      const [accs, txs, crds, cats, recs] = await Promise.all([
        api.getAccounts(user.id),
        api.getTransactions(user.id, 100),
        api.getCards(user.id),
        api.getCategories(user.id),
        api.getRecurring(user.id),
      ]);
      setAccounts(accs);
      setTransactions(txs);
      setCards(crds);
      setCategories(cats);
      setRecurringBills(recs || []);
    } catch (err) {
      console.warn('Erro ao carregar dados do Dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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

        {/* 2. RESUMO DO MÊS & PREVISÃO ORÇAMENTÁRIA (COBERTURA DO CARTÃO) */}
        <MonthlyForecastSummary
          accounts={accounts}
          transactions={transactions}
          cards={cards}
          recurringBills={recurringBills}
          hideValues={hideValues}
        />

        {/* 3. CARROSSEL DE CONTAS BANCÁRIAS */}
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

        {/* 4. SEÇÃO DE CONTAS FIXAS & VENCIMENTOS */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Contas Fixas do Mês</Text>
            <Text style={styles.sectionSubtitle}>
              {recurringBills.length === 0
                ? 'Nenhuma configurada'
                : `${recurringBills.length} ativa(s) • ${formatCurrency(recurringBills.reduce((acc, r) => acc + (r.type === 'EXPENSE' ? Number(r.amountCents || 0) : 0), 0))}`}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.manageBillsBtn}
            onPress={() => setRecurringModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="repeat" size={14} color={colors.primary} />
            <Text style={styles.manageBillsText}>Gerenciar</Text>
          </TouchableOpacity>
        </View>

        {recurringBills.length === 0 && !loading ? (
          <TouchableOpacity
            onPress={() => setRecurringModalVisible(true)}
            activeOpacity={0.8}
          >
            <Card style={styles.emptyBillsCard}>
              <View style={styles.emptyBillsLeft}>
                <View style={styles.emptyBillsIconBox}>
                  <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.emptyBillsTitle}>Cadastre suas contas fixas</Text>
                  <Text style={styles.emptyBillsSub}>Aluguel, Luz, Água, Internet e Salário</Text>
                </View>
              </View>
              <Ionicons name="add-circle" size={24} color={colors.primary} />
            </Card>
          </TouchableOpacity>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recurringScroll}>
            {recurringBills.map((item) => {
              const isExpense = item.type === 'EXPENSE';
              return (
                <Card
                  key={item.id}
                  style={styles.recurringCard}
                  elevated
                  onPress={() => setRecurringModalVisible(true)}
                >
                  <View style={styles.recurringCardTop}>
                    <View
                      style={[
                        styles.recurringDayBadge,
                        isExpense ? styles.dayBadgeExpense : styles.dayBadgeIncome,
                      ]}
                    >
                      <Text style={styles.recurringDayNum}>
                        {String(item.dayOfMonth || 5).padStart(2, '0')}
                      </Text>
                      <Text style={styles.recurringDaySub}>DIA</Text>
                    </View>
                    <Badge
                      title={isExpense ? 'MENSAL' : 'RECEITA'}
                      variant={isExpense ? 'warning' : 'success'}
                    />
                  </View>
                  <Text style={styles.recurringCardName} numberOfLines={1}>{item.description}</Text>
                  <Text style={[styles.recurringCardAmount, isExpense ? styles.textExpense : styles.textIncome]}>
                    {hideValues ? '••••' : formatCurrency(item.amountCents)}
                  </Text>
                </Card>
              );
            })}
          </ScrollView>
        )}

        {/* 5. ONDE O DINHEIRO ESTÁ INDO (GRÁFICO POR CATEGORIA COM CORES) */}
        <CategoryExpenseChart
          transactions={transactions}
          categories={categories}
          hideValues={hideValues}
        />

        {/* 6. TRANSAÇÕES RECENTES */}
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
            {transactions.slice(0, 8).map((tx) => {
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
        onUpdated={() => {
          setSelectedAccount(null);
          loadData();
        }}
        onDeleted={() => {
          setSelectedAccount(null);
          loadData();
        }}
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

      {/* MODAL GERENCIAMENTO DE CONTAS FIXAS & RECORRENTES */}
      <RecurringBillsModal
        visible={recurringModalVisible}
        onClose={() => setRecurringModalVisible(false)}
        user={user}
        accounts={accounts}
        categories={categories}
        onUpdate={loadData}
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
  manageBillsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryGhost,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  manageBillsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  emptyBillsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 20,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: colors.borderHighlight,
  },
  emptyBillsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  emptyBillsIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryGhost,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBillsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  emptyBillsSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  recurringScroll: {
    marginBottom: 24,
  },
  recurringCard: {
    width: 170,
    marginRight: 12,
    padding: 14,
  },
  recurringCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recurringDayBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  dayBadgeExpense: {
    backgroundColor: colors.expenseGhost,
  },
  dayBadgeIncome: {
    backgroundColor: colors.incomeGhost,
  },
  recurringDayNum: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.text,
  },
  recurringDaySub: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.textMuted,
    marginTop: -2,
  },
  recurringCardName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  recurringCardAmount: {
    fontSize: 15,
    fontWeight: '900',
  },
  textExpense: {
    color: colors.expense,
  },
  textIncome: {
    color: colors.income,
  },
});
