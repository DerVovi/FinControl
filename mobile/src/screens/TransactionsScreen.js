import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { api, formatCurrency, formatDate } from '../services/api';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { TransactionDetailsModal } from '../components/TransactionDetailsModal';
import { CategoryPieChart } from '../components/CategoryPieChart';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function TransactionsScreen({ user }) {
  const now = new Date();
  const initialCache = api.getSyncMemoryCache();
  const hasInitialData = initialCache.transactions.length > 0;

  const [viewMode, setViewMode] = useState('LIST'); // 'LIST' | 'CHART'
  const [loading, setLoading] = useState(!hasInitialData);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState(initialCache.transactions);
  const [accounts, setAccounts] = useState(initialCache.accounts);
  const [cards, setCards] = useState(initialCache.cards);
  const [categories, setCategories] = useState(initialCache.categories);

  // Filtros de Tipo e Busca
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'EXPENSE' | 'INCOME' | 'RECURRING'
  const [search, setSearch] = useState('');

  // Filtro de Datas
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [dateFilterMode, setDateFilterMode] = useState('CURRENT_MONTH'); // 'CURRENT_MONTH' | 'PREV_MONTH' | 'LAST_30_DAYS' | 'CUSTOM_MONTH' | 'ALL'

  // Modais
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  // Hidratação imediata do cache local (0ms)
  useEffect(() => {
    let mounted = true;
    async function hydrateCache() {
      const cached = await api.loadAllCached();
      if (!mounted) return;
      if (cached.transactions.length > 0) setTransactions(cached.transactions);
      if (cached.accounts.length > 0) setAccounts(cached.accounts);
      if (cached.cards.length > 0) setCards(cached.cards);
      if (cached.categories.length > 0) setCategories(cached.categories);
      if (cached.transactions.length > 0) setLoading(false);
    }
    hydrateCache();
    return () => {
      mounted = false;
    };
  }, []);

  const loadData = useCallback(async (isManualRefresh = false) => {
    if (!user) return;
    try {
      // 1. Carrega transações em paralelo sem travar esperando syncRecurring
      const [txs, accs, crds, cats] = await Promise.all([
        api.getTransactions(user.id, 250),
        api.getAccounts(user.id),
        api.getCards(user.id),
        api.getCategories(user.id),
      ]);
      setTransactions(txs);
      setAccounts(accs);
      setCards(crds);
      setCategories(cats);

      // 2. Sincroniza em background
      api.syncRecurring(user.id, isManualRefresh).then((res) => {
        if (res && res.createdCount > 0) {
          api.getTransactions(user.id, 250).then(setTransactions);
        }
      }).catch(console.warn);
    } catch (err) {
      console.warn('Erro ao carregar transações:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Carrega ao montar e se inscreve para atualizações em tempo real
  useEffect(() => {
    loadData();
    const unsubscribe = api.subscribe(() => {
      loadData(false);
    });
    return () => unsubscribe();
  }, [loadData]);

  // Controles de navegação de data
  const handlePrevMonth = () => {
    let m = selectedMonth - 1;
    let y = selectedYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    setSelectedMonth(m);
    setSelectedYear(y);
    setDateFilterMode('CUSTOM_MONTH');
  };

  const handleNextMonth = () => {
    let m = selectedMonth + 1;
    let y = selectedYear;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    setSelectedMonth(m);
    setSelectedYear(y);
    setDateFilterMode('CUSTOM_MONTH');
  };

  const handleSetCurrentMonth = () => {
    setSelectedMonth(now.getMonth());
    setSelectedYear(now.getFullYear());
    setDateFilterMode('CURRENT_MONTH');
  };

  const handleSetPrevMonth = () => {
    let m = now.getMonth() - 1;
    let y = now.getFullYear();
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    setSelectedMonth(m);
    setSelectedYear(y);
    setDateFilterMode('PREV_MONTH');
  };

  // Label do período exibido
  let periodLabel = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
  if (dateFilterMode === 'LAST_30_DAYS') {
    periodLabel = 'Últimos 30 dias';
  } else if (dateFilterMode === 'ALL') {
    periodLabel = 'Todas as Datas';
  }

  // 1. Filtro por Data
  const dateFilteredTransactions = transactions.filter((tx) => {
    if (dateFilterMode === 'ALL') return true;

    const txDate = new Date(tx.date);

    if (dateFilterMode === 'LAST_30_DAYS') {
      const diffMs = now.getTime() - txDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays >= -1 && diffDays <= 30;
    }

    // CURRENT_MONTH, PREV_MONTH ou CUSTOM_MONTH
    return (
      txDate.getMonth() === selectedMonth &&
      txDate.getFullYear() === selectedYear
    );
  });

  // 2. Filtro por Tipo e Busca (para a lista de extrato)
  const filteredTransactions = dateFilteredTransactions.filter((tx) => {
    const isRecurringOrInstallment =
      Boolean(tx.isRecurring) ||
      Boolean(tx.recurringTransactionId) ||
      (typeof tx.notes === 'string' && (tx.notes.includes('Parcela ') || tx.notes.includes('parcela')));

    const matchesType =
      filterType === 'ALL'
        ? true
        : filterType === 'RECURRING'
        ? isRecurringOrInstallment
        : tx.type === filterType;

    const matchesSearch =
      search.trim() === ''
        ? true
        : (tx.description || '').toLowerCase().includes(search.toLowerCase());

    return matchesType && matchesSearch;
  });

  // Totais do período filtrado
  const periodIncomeCents = dateFilteredTransactions
    .filter((t) => t.type === 'INCOME')
    .reduce((acc, t) => acc + Number(t.amountCents || 0), 0);

  const periodExpenseCents = dateFilteredTransactions
    .filter((t) => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + Number(t.amountCents || 0), 0);

  return (
    <View style={styles.container}>
      {/* SELETOR DE MODO: LISTA DE EXTRATO VS ANÁLISE DE GASTOS */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'LIST' && styles.viewModeTabActive]}
          onPress={() => setViewMode('LIST')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="list"
            size={16}
            color={viewMode === 'LIST' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.viewModeTabText,
              viewMode === 'LIST' && styles.viewModeTabTextActive,
            ]}
          >
            Extrato
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeTab, viewMode === 'CHART' && styles.viewModeTabActive]}
          onPress={() => setViewMode('CHART')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="stats-chart"
            size={16}
            color={viewMode === 'CHART' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.viewModeTabText,
              viewMode === 'CHART' && styles.viewModeTabTextActive,
            ]}
          >
            Análise de Gastos
          </Text>
        </TouchableOpacity>
      </View>

      {/* BARRA DE NAVEGAÇÃO DE DATAS (MÊS ANTERIOR / PRÓXIMO) */}
      <View style={styles.dateNavigator}>
        <TouchableOpacity
          style={styles.dateNavArrow}
          onPress={handlePrevMonth}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateNavCenter}
          onPress={handleSetCurrentMonth}
          activeOpacity={0.7}
        >
          <Ionicons name="calendar-outline" size={15} color={colors.primary} />
          <Text style={styles.dateNavLabel}>{periodLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.dateNavArrow}
          onPress={handleNextMonth}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* CHIPS DE FILTRO RÁPIDO DE DATAS */}
      <View style={styles.dateChipsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateChipsContainer}
        >
          {[
            { id: 'CURRENT_MONTH', label: 'Este Mês', action: handleSetCurrentMonth },
            { id: 'PREV_MONTH', label: 'Mês Anterior', action: handleSetPrevMonth },
            { id: 'LAST_30_DAYS', label: '30 Dias', action: () => setDateFilterMode('LAST_30_DAYS') },
            { id: 'ALL', label: 'Todas as Datas', action: () => setDateFilterMode('ALL') },
          ].map((item) => {
            const isActive = dateFilterMode === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.dateChip, isActive && styles.dateChipActive]}
                onPress={item.action}
                activeOpacity={0.7}
              >
                <Text style={[styles.dateChipText, isActive && styles.dateChipTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* CONTEÚDO PRINCIPAL: ANÁLISE DE GASTOS VS LISTA DE EXTRATO */}
      {viewMode === 'CHART' ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 90 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <CategoryPieChart
            transactions={dateFilteredTransactions}
            categories={categories}
            hideValues={false}
            periodLabel={periodLabel}
          />
        </ScrollView>
      ) : (
        <>
          {/* BARRA DE PESQUISA & FILTROS DE TIPO */}
          <View style={styles.filtersContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por descrição..."
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* CHIPS DE FILTRO DE TIPO */}
            <View style={styles.chipsRow}>
              {[
                { id: 'ALL', label: 'Todas' },
                { id: 'EXPENSE', label: 'Despesas' },
                { id: 'INCOME', label: 'Receitas' },
                { id: 'RECURRING', label: 'Fixas/Parcelas' },
              ].map((item) => {
                const active = filterType === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setFilterType(item.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* MINI RESUMO DE TOTAIS DO PERÍODO */}
            <View style={styles.periodSummaryBar}>
              <Text style={styles.periodSummaryCount}>
                {filteredTransactions.length} {filteredTransactions.length === 1 ? 'registro' : 'registros'}
              </Text>
              <View style={styles.periodSummaryMetrics}>
                <Text style={styles.periodIncomeText}>
                  + {formatCurrency(periodIncomeCents)}
                </Text>
                <Text style={styles.periodExpenseText}>
                  - {formatCurrency(periodExpenseCents)}
                </Text>
              </View>
            </View>
          </View>

          {/* LISTA DE TRANSAÇÕES */}
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadData();
                }}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListEmptyComponent={
              !loading && (
                <Card style={styles.emptyCard}>
                  <Ionicons name="receipt-outline" size={36} color={colors.textMuted} />
                  <Text style={styles.emptyTitle}>Nenhuma transação encontrada</Text>
                  <Text style={styles.emptySubtitle}>
                    {search
                      ? 'Tente mudar o termo da busca ou o filtro de data'
                      : 'Nenhum lançamento no período selecionado'}
                  </Text>
                </Card>
              )
            }
            renderItem={({ item: tx }) => {
              const isExpense = tx.type === 'EXPENSE';
              const isPending = tx.status === 'PENDING';
              const isRecurring = Boolean(tx.isRecurring || tx.recurringTransactionId);
              const isInstallment =
                typeof tx.notes === 'string' &&
                (tx.notes.includes('Parcela ') || tx.notes.includes('parcela'));

              const now = new Date();
              const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const isOverdue = isPending && new Date(tx.date) < startOfToday;

              return (
                <TouchableOpacity
                  style={[styles.txRow, isPending && styles.txRowPending]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedTx(tx)}
                >
                  <View
                    style={[
                      styles.txIconBox,
                      {
                        backgroundColor: isPending
                          ? isOverdue
                            ? colors.expenseGhost
                            : 'rgba(245, 158, 11, 0.15)'
                          : isExpense
                          ? colors.expenseGhost
                          : colors.incomeGhost,
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        isPending
                          ? isOverdue
                            ? 'alert-circle'
                            : 'time'
                          : isExpense
                          ? 'arrow-down'
                          : 'arrow-up'
                      }
                      size={18}
                      color={
                        isPending
                          ? isOverdue
                            ? colors.expense
                            : colors.warning
                          : isExpense
                          ? colors.expense
                          : colors.income
                      }
                    />
                  </View>

                  <View style={styles.txDetails}>
                    <View style={styles.txTitleRow}>
                      <Text style={styles.txTitle} numberOfLines={1} ellipsizeMode="tail">
                        {tx.description}
                      </Text>
                      {isPending && (
                        <View style={[styles.pendingBadge, isOverdue && styles.overdueBadge]}>
                          <Text style={[styles.pendingBadgeText, isOverdue && styles.overdueBadgeText]}>
                            {isOverdue ? 'VENCIDA' : 'A VENCER'}
                          </Text>
                        </View>
                      )}
                      {isRecurring && !isPending && (
                        <View style={[styles.recurringTag, styles.paidBadge]}>
                          <Text style={[styles.recurringTagText, styles.paidBadgeText]}>PAGA</Text>
                        </View>
                      )}
                      {isRecurring && isPending && (
                        <View style={styles.recurringTag}>
                          <Text style={styles.recurringTagText}>Fixa</Text>
                        </View>
                      )}
                      {isInstallment && (
                        <View style={styles.installmentTag}>
                          <Text style={styles.installmentTagText}>Parcela</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.txMetaRow}>
                      <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                      {tx.category && (
                        <>
                          <Text style={styles.metaDot}>•</Text>
                          <Text style={styles.txCategory} numberOfLines={1}>
                            {tx.category.name}
                          </Text>
                        </>
                      )}
                      {tx.account && (
                        <>
                          <Text style={styles.metaDot}>•</Text>
                          <Text style={styles.txAccount} numberOfLines={1}>
                            {tx.account.name}
                          </Text>
                        </>
                      )}
                      {tx.card && (
                        <>
                          <Text style={styles.metaDot}>•</Text>
                          <Text style={styles.txCard} numberOfLines={1}>
                            💳 {tx.card.name}
                          </Text>
                        </>
                      )}
                    </View>

                    {tx.notes && !isInstallment ? (
                      <Text style={styles.txNotes} numberOfLines={1}>
                        {tx.notes}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.txRightCol}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: isExpense ? colors.expense : colors.income },
                        isPending && { color: isOverdue ? colors.expense : colors.warning },
                      ]}
                      numberOfLines={1}
                    >
                      {isExpense ? '-' : '+'}
                      {formatCurrency(tx.amountCents)}
                    </Text>
                    {isPending ? (
                      <Text style={[styles.txPendingSub, isOverdue && { color: colors.expense }]}>
                        {isOverdue ? 'Vencida' : 'Previsto'}
                      </Text>
                    ) : isRecurring ? (
                      <Text style={styles.txPaidSub}>Paga ✓</Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </>
      )}

      {/* FAB ADICIONAR TRANSAÇÃO */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      {/* MODAL NOVA TRANSAÇÃO */}
      <NewTransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={() => loadData()}
        user={user}
        accounts={accounts}
        cards={cards}
        categories={categories}
      />

      {/* MODAL DETALHES DA TRANSAÇÃO */}
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
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  viewModeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  viewModeTabActive: {
    backgroundColor: colors.surfaceElevated,
  },
  viewModeTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  viewModeTabTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  dateNavArrow: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.primaryGhost,
  },
  dateNavCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateNavLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  dateChipsWrapper: {
    marginBottom: 10,
  },
  dateChipsContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  dateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  dateChipActive: {
    backgroundColor: colors.primaryGhost,
    borderColor: colors.primary,
  },
  dateChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  dateChipTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 10,
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    padding: 0,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  chipActive: {
    backgroundColor: colors.primaryGhost,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  periodSummaryBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    paddingHorizontal: 2,
  },
  periodSummaryCount: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  periodSummaryMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  periodIncomeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.income,
  },
  periodExpenseText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.expense,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 90,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHighlight,
  },
  txRowPending: {
    opacity: 0.85,
  },
  txIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txDetails: {
    flex: 1,
    marginRight: 10,
  },
  txTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  txTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    flexShrink: 1,
  },
  pendingBadge: {
    backgroundColor: colors.warning + '22',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.warning + '44',
  },
  pendingBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.warning,
  },
  overdueBadge: {
    backgroundColor: colors.expenseGhost,
    borderColor: colors.expense + '55',
  },
  overdueBadgeText: {
    color: colors.expense,
  },
  paidBadge: {
    backgroundColor: colors.incomeGhost,
    borderWidth: 1,
    borderColor: colors.income + '44',
  },
  paidBadgeText: {
    color: colors.income,
  },
  recurringTag: {
    backgroundColor: colors.primaryGhost,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  recurringTagText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.primary,
  },
  installmentTag: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  installmentTagText: {
    fontSize: 8,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  txMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  txDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  metaDot: {
    fontSize: 11,
    color: colors.textMuted,
  },
  txCategory: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  txAccount: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  txCard: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  txNotes: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  txRightCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  txPendingSub: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.warning,
  },
  txPaidSub: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.income,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
    marginTop: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
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
