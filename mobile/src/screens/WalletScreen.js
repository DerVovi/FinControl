import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { api, formatCurrency } from '../services/api';
import { NewCardModal } from '../components/NewCardModal';
import { AccountDetailsModal } from '../components/AccountDetailsModal';
import {
  handleCurrencyInputChange,
  parseFormattedToCents,
} from '../utils/currencyMask';

const ACCOUNT_TYPES = [
  { id: 'CHECKING', label: 'Corrente', icon: 'card-outline' },
  { id: 'SAVINGS', label: 'Poupança', icon: 'wallet-outline' },
  { id: 'INVESTMENT', label: 'Investimento', icon: 'trending-up-outline' },
  { id: 'CASH', label: 'Dinheiro', icon: 'cash-outline' },
];

const ACCOUNT_COLORS = [
  '#10B981', // Emerald FinControl
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#EF4444', // Red
  '#14B8A6', // Teal
];

export function WalletScreen({ user }) {
  const [activeTab, setActiveTab] = useState('ACCOUNTS'); // 'ACCOUNTS' | 'CARDS'
  const initialCache = api.getSyncMemoryCache();
  const hasInitialData = initialCache.accounts.length > 0 || initialCache.cards.length > 0;

  const [loading, setLoading] = useState(!hasInitialData);
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState(initialCache.accounts);
  const [cards, setCards] = useState(initialCache.cards);
  const [transactions, setTransactions] = useState(initialCache.transactions);

  // Modais
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [newAccountModalVisible, setNewAccountModalVisible] = useState(false);

  // Estado para criação de nova conta
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState('CHECKING');
  const [newAccountColor, setNewAccountColor] = useState(ACCOUNT_COLORS[0]);
  const [newAccountBalanceStr, setNewAccountBalanceStr] = useState('0,00');
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Hidratação imediata do cache local (0ms)
  useEffect(() => {
    let mounted = true;
    async function hydrateCache() {
      const cached = await api.loadAllCached();
      if (!mounted) return;
      if (cached.accounts.length > 0) setAccounts(cached.accounts);
      if (cached.cards.length > 0) setCards(cached.cards);
      if (cached.transactions.length > 0) setTransactions(cached.transactions);
      if (cached.accounts.length > 0 || cached.cards.length > 0) setLoading(false);
    }
    hydrateCache();
    return () => {
      mounted = false;
    };
  }, []);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [accs, crds, txs] = await Promise.all([
        api.getAccounts(user.id),
        api.getCards(user.id),
        api.getTransactions(user.id, 50),
      ]);
      setAccounts(accs);
      setCards(crds);
      setTransactions(txs);
    } catch (err) {
      console.warn('Erro ao carregar dados da Carteira:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
    const unsubscribe = api.subscribe(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [loadData]);

  // Cálculos de Resumo
  const totalAccountBalanceCents = accounts.reduce(
    (acc, a) => acc + Number(a.currentBalanceCents || 0),
    0
  );

  const totalCardLimitCents = cards.reduce(
    (acc, c) => acc + Number(c.limitCents || 0),
    0
  );

  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      Alert.alert('Atenção', 'Informe o nome da conta bancária.');
      return;
    }

    setCreatingAccount(true);
    try {
      const initialCents = parseFormattedToCents(newAccountBalanceStr);
      await api.createAccount({
        userId: user.id,
        name: newAccountName.trim(),
        type: newAccountType,
        color: newAccountColor,
        initialBalanceCents: initialCents,
      });

      // Limpa formulário
      setNewAccountName('');
      setNewAccountBalanceStr('0,00');
      setNewAccountType('CHECKING');
      setNewAccountColor(ACCOUNT_COLORS[0]);
      setNewAccountModalVisible(false);

      await loadData();
      Alert.alert('Sucesso', 'Conta cadastrada com sucesso!');
    } catch (err) {
      Alert.alert('Erro', err.message || 'Não foi possível cadastrar a conta.');
    } finally {
      setCreatingAccount(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
        {/* CABEÇALHO DA CARTEIRA */}
        <View style={styles.header}>
          <View style={styles.headerTitleBox}>
            <Text style={styles.title}>Minha Carteira</Text>
            <Text style={styles.subtitle}>
              Gestão centralizada de contas bancárias e cartões
            </Text>
          </View>
        </View>

        {/* CARD RESUMO DE PATRIMÔNIO / CARTEIRA */}
        <Card style={styles.summaryCard} elevated>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryIconBox}>
              <Ionicons name="wallet" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.summaryCardTitle}>Patrimônio na Carteira</Text>
              <Text style={styles.summaryCardSub}>
                {accounts.length} conta(s) • {cards.length} cartão(ões)
              </Text>
            </View>
          </View>

          <View style={styles.summaryMetricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Saldo em Contas</Text>
              <Text
                style={[
                  styles.metricValue,
                  totalAccountBalanceCents < 0 && { color: colors.expense },
                ]}
              >
                {formatCurrency(totalAccountBalanceCents)}
              </Text>
            </View>

            <View style={styles.metricDivider} />

            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Limite em Cartões</Text>
              <Text style={[styles.metricValue, { color: colors.warning }]}>
                {formatCurrency(totalCardLimitCents)}
              </Text>
            </View>
          </View>
        </Card>

        {/* SELETOR DE ABA: CONTAS BANCÁRIAS VS CARTÕES DE CRÉDITO */}
        <View style={styles.segmentContainer}>
          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'ACCOUNTS' && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab('ACCOUNTS')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="cash-outline"
              size={16}
              color={activeTab === 'ACCOUNTS' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'ACCOUNTS' && styles.segmentBtnTextActive,
              ]}
            >
              Contas ({accounts.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentBtn,
              activeTab === 'CARDS' && styles.segmentBtnActive,
            ]}
            onPress={() => setActiveTab('CARDS')}
            activeOpacity={0.8}
          >
            <Ionicons
              name="card-outline"
              size={16}
              color={activeTab === 'CARDS' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.segmentBtnText,
                activeTab === 'CARDS' && styles.segmentBtnTextActive,
              ]}
            >
              Cartões ({cards.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* CONTEÚDO DA ABA: CONTAS BANCÁRIAS */}
        {activeTab === 'ACCOUNTS' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionActionBar}>
              <Text style={styles.sectionHeading}>Suas Contas</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setNewAccountModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color={colors.textInverse} />
                <Text style={styles.addBtnText}>Nova Conta</Text>
              </TouchableOpacity>
            </View>

            {accounts.length === 0 && !loading ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="wallet-outline" size={44} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Nenhuma conta cadastrada</Text>
                <Text style={styles.emptySubtitle}>
                  Cadastre suas contas correntes, poupanças ou carteiras para acompanhar seus saldos e movimentações.
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => setNewAccountModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.emptyAddBtnText}>Cadastrar Primeira Conta</Text>
                </TouchableOpacity>
              </Card>
            ) : (
              accounts.map((acc) => {
                const balance = Number(acc.currentBalanceCents || 0);
                const isNegative = balance < 0;
                return (
                  <TouchableOpacity
                    key={acc.id}
                    activeOpacity={0.7}
                    onPress={() => setSelectedAccount(acc)}
                  >
                    <Card
                      style={[
                        styles.accountCard,
                        { borderLeftColor: acc.color || colors.primary },
                      ]}
                      elevated
                    >
                      <View style={styles.accountCardMain}>
                        <View style={styles.accountLeft}>
                          <View
                            style={[
                              styles.accountIconBox,
                              { backgroundColor: (acc.color || colors.primary) + '20' },
                            ]}
                          >
                            <Ionicons
                              name={
                                acc.type === 'CASH'
                                  ? 'cash'
                                  : acc.type === 'SAVINGS'
                                  ? 'file-tray-full'
                                  : acc.type === 'INVESTMENT'
                                  ? 'trending-up'
                                  : 'card'
                              }
                              size={20}
                              color={acc.color || colors.primary}
                            />
                          </View>
                          <View style={styles.accountInfo}>
                            <Text style={styles.accountName} numberOfLines={1}>
                              {acc.name}
                            </Text>
                            <Text style={styles.accountType}>
                              {acc.type === 'CHECKING'
                                ? 'Conta Corrente'
                                : acc.type === 'SAVINGS'
                                ? 'Poupança'
                                : acc.type === 'INVESTMENT'
                                ? 'Investimentos'
                                : acc.type === 'CASH'
                                ? 'Dinheiro / Carteira'
                                : acc.type}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.accountRight}>
                          <Text
                            style={[
                              styles.accountBalance,
                              isNegative && { color: colors.expense },
                            ]}
                          >
                            {formatCurrency(balance)}
                          </Text>
                          <View style={styles.editRow}>
                            <Text style={styles.editHint}>Editar</Text>
                            <Ionicons
                              name="chevron-forward"
                              size={12}
                              color={colors.textMuted}
                            />
                          </View>
                        </View>
                      </View>
                    </Card>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* CONTEÚDO DA ABA: CARTÕES DE CRÉDITO */}
        {activeTab === 'CARDS' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionActionBar}>
              <Text style={styles.sectionHeading}>Cartões de Crédito</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => setCardModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color={colors.textInverse} />
                <Text style={styles.addBtnText}>Novo Cartão</Text>
              </TouchableOpacity>
            </View>

            {cards.length === 0 && !loading ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="card-outline" size={44} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Nenhum cartão cadastrado</Text>
                <Text style={styles.emptySubtitle}>
                  Cadastre seus cartões de crédito para controlar limites, faturas e lançamentos diretamente pelo app.
                </Text>
                <TouchableOpacity
                  style={styles.emptyAddBtn}
                  onPress={() => setCardModalVisible(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.emptyAddBtnText}>Cadastrar Primeiro Cartão</Text>
                </TouchableOpacity>
              </Card>
            ) : (
              cards.map((card) => {
                const limit = Number(card.limitCents || 0);
                return (
                  <Card
                    key={card.id}
                    style={[
                      styles.creditCardContainer,
                      { borderColor: card.color || colors.primary },
                    ]}
                    elevated
                  >
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.cardName}>{card.name}</Text>
                        <Text style={styles.cardInstitution}>{card.institution}</Text>
                      </View>
                      <Ionicons
                        name="card"
                        size={28}
                        color={card.color || colors.primary}
                      />
                    </View>

                    <View style={styles.cardChipRow}>
                      <View style={styles.cardChip} />
                      <Text style={styles.cardNumber}>
                        •••• {card.lastFourDigits || '••••'}
                      </Text>
                    </View>

                    <View style={styles.cardDetailsRow}>
                      <View>
                        <Text style={styles.cardDetailLabel}>Limite Total</Text>
                        <Text style={styles.cardDetailValue}>{formatCurrency(limit)}</Text>
                      </View>
                      <View style={styles.datesBox}>
                        <Text style={styles.cardDetailLabel}>
                          Fecha dia {card.closingDay}
                        </Text>
                        <Text style={styles.cardDetailLabel}>
                          Vence dia {card.dueDay}
                        </Text>
                      </View>
                    </View>
                  </Card>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* FAB FLUTUANTE ADAPTATIVO */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          if (activeTab === 'ACCOUNTS') {
            setNewAccountModalVisible(true);
          } else {
            setCardModalVisible(true);
          }
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color={colors.textInverse} />
      </TouchableOpacity>

      {/* MODAL DETALHES / EDIÇÃO DE CONTA */}
      <AccountDetailsModal
        visible={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        account={selectedAccount}
        transactions={transactions}
        onUpdated={() => {
          setSelectedAccount(null);
          loadData();
        }}
        onDeleted={() => {
          setSelectedAccount(null);
          loadData();
        }}
      />

      {/* MODAL CADASTRO DE NOVO CARTÃO */}
      <NewCardModal
        visible={cardModalVisible}
        onClose={() => setCardModalVisible(false)}
        onSuccess={() => loadData()}
        user={user}
      />

      {/* MODAL CADASTRO DE NOVA CONTA BANCÁRIA */}
      <Modal
        visible={newAccountModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNewAccountModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Nova Conta</Text>
                <Text style={styles.modalSub}>Adicione uma conta à sua carteira</Text>
              </View>
              <TouchableOpacity
                onPress={() => setNewAccountModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* NOME DA CONTA */}
              <Text style={styles.inputLabel}>Nome da Conta</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: Nubank, Itaú, Carteira..."
                placeholderTextColor={colors.textMuted}
                value={newAccountName}
                onChangeText={setNewAccountName}
              />

              {/* SALDO INICIAL */}
              <Text style={styles.inputLabel}>Saldo Inicial (R$)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0,00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={newAccountBalanceStr}
                onChangeText={(text) => {
                  const { formatted } = handleCurrencyInputChange(text);
                  setNewAccountBalanceStr(formatted);
                }}
              />

              {/* TIPO DE CONTA */}
              <Text style={styles.inputLabel}>Tipo de Conta</Text>
              <View style={styles.typeGrid}>
                {ACCOUNT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.typeBtn,
                      newAccountType === t.id && styles.typeBtnActive,
                    ]}
                    onPress={() => setNewAccountType(t.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={t.icon}
                      size={18}
                      color={
                        newAccountType === t.id ? colors.primary : colors.textMuted
                      }
                    />
                    <Text
                      style={[
                        styles.typeBtnText,
                        newAccountType === t.id && styles.typeBtnTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* COR DA CONTA */}
              <Text style={styles.inputLabel}>Cor de Identificação</Text>
              <View style={styles.colorRow}>
                {ACCOUNT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c },
                      newAccountColor === c && styles.colorCircleActive,
                    ]}
                    onPress={() => setNewAccountColor(c)}
                    activeOpacity={0.7}
                  >
                    {newAccountColor === c && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* BOTÃO SALVAR */}
              <Button
                title={creatingAccount ? 'Cadastrando...' : 'Cadastrar Conta'}
                onPress={handleCreateAccount}
                loading={creatingAccount}
                style={styles.saveAccountBtn}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  header: {
    marginBottom: 16,
  },
  headerTitleBox: {
    flex: 1,
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
  summaryCard: {
    padding: 16,
    marginBottom: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  summaryIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  summaryCardSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  summaryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderHighlight,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.primary,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: 4,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: colors.surfaceElevated,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  segmentBtnTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  tabContent: {
    gap: 12,
  },
  sectionActionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addBtnText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '800',
  },
  accountCard: {
    padding: 14,
    borderLeftWidth: 4,
    marginBottom: 10,
  },
  accountCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  accountIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  accountType: {
    fontSize: 11,
    color: colors.textMuted,
  },
  accountRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  accountBalance: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  editHint: {
    fontSize: 10,
    color: colors.textMuted,
  },
  creditCardContainer: {
    marginBottom: 16,
    padding: 20,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  cardInstitution: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    marginTop: 2,
  },
  cardChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  cardChip: {
    width: 34,
    height: 24,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  cardNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 2,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: colors.borderHighlight,
    paddingTop: 14,
  },
  cardDetailLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  cardDetailValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    marginTop: 2,
  },
  datesBox: {
    alignItems: 'flex-end',
    gap: 2,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 10,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primaryGhost,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  emptyAddBtnText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 14,
  },
  textInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  typeBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  typeBtnTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  colorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleActive: {
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  saveAccountBtn: {
    marginTop: 24,
    marginBottom: 16,
  },
});
