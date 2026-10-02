import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { api, formatCurrency, formatDate } from '../services/api';
import { NewTransactionModal } from '../components/NewTransactionModal';
import { TransactionDetailsModal } from '../components/TransactionDetailsModal';

export function TransactionsScreen({ user }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'EXPENSE' | 'INCOME'
  const [search, setSearch] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [txs, accs, crds, cats] = await Promise.all([
        api.getTransactions(user.id, 100),
        api.getAccounts(user.id),
        api.getCards(user.id),
        api.getCategories(user.id),
      ]);
      setTransactions(txs);
      setAccounts(accs);
      setCards(crds);
      setCategories(cats);
    } catch (err) {
      console.warn('Erro ao carregar transações:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredTransactions = transactions.filter((tx) => {
    const matchesType =
      filterType === 'ALL' ? true : tx.type === filterType;
    const matchesSearch =
      search.trim() === ''
        ? true
        : (tx.description || '').toLowerCase().includes(search.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <View style={styles.container}>
      {/* BARRA DE PESQUISA & FILTROS */}
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

        {/* CHIPS DE FILTRO */}
        <View style={styles.chipsRow}>
          {[
            { id: 'ALL', label: 'Todas' },
            { id: 'EXPENSE', label: 'Despesas' },
            { id: 'INCOME', label: 'Receitas' },
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
                {search ? 'Tente mudar o termo da busca' : 'Toque no + para lançar uma nova transação'}
              </Text>
            </Card>
          )
        }
        renderItem={({ item: tx }) => {
          const isExpense = tx.type === 'EXPENSE';
          return (
            <TouchableOpacity
              style={styles.txRow}
              activeOpacity={0.7}
              onPress={() => setSelectedTx(tx)}
            >
              <View
                style={[
                  styles.txIconBox,
                  { backgroundColor: isExpense ? colors.expenseGhost : colors.incomeGhost },
                ]}
              >
                <Ionicons
                  name={isExpense ? 'arrow-down' : 'arrow-up'}
                  size={18}
                  color={isExpense ? colors.expense : colors.income}
                />
              </View>

              <View style={styles.txDetails}>
                <Text style={styles.txTitle} numberOfLines={1} ellipsizeMode="tail">
                  {tx.description}
                </Text>
                <Text style={styles.txDate} numberOfLines={1} ellipsizeMode="tail">
                  {formatDate(tx.date)}{tx.notes ? ` • ${tx.notes}` : ''}
                </Text>
              </View>

              <View style={styles.txRightCol}>
                <Text
                  style={[
                    styles.txValue,
                    { color: isExpense ? colors.expense : colors.income },
                  ]}
                  numberOfLines={1}
                >
                  {isExpense ? '-' : '+'} {formatCurrency(tx.amountCents)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* BOTÃO FLUTUANTE */}
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

      {/* MODAL NATIVO DETALHES DA TRANSAÇÃO / CONTA */}
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
  filtersContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
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
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  listContent: {
    padding: 20,
    paddingBottom: 90,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  txIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  txDetails: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  txTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
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
  txValue: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
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
