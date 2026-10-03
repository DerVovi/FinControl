import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { api, formatCurrency } from '../services/api';
import {
  handleCurrencyInputChange,
  formatCentsToDisplay,
  parseFormattedToCents,
} from '../utils/currencyMask';

export function RecurringBillsModal({
  visible,
  onClose,
  user,
  accounts = [],
  categories = [],
  onUpdate,
}) {
  const [recurringList, setRecurringList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Formulário de Conta Fixa
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('0,00');
  const [type, setType] = useState('EXPENSE'); // 'EXPENSE' | 'INCOME'
  const [dayOfMonth, setDayOfMonth] = useState('5');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [saving, setSaving] = useState(false);

  const scrollRef = useRef(null);

  const loadRecurring = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await api.syncRecurring(user.id);
      const list = await api.getRecurring(user.id);
      setRecurringList(list || []);
    } catch (err) {
      console.warn('Erro ao carregar contas fixas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && user) {
      loadRecurring();
      if (accounts.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accounts[0].id);
      }
    }
  }, [visible, user, accounts]);

  useEffect(() => {
    const available = categories.filter((c) => c.type === type);
    if (available.length > 0) {
      setSelectedCategoryId(available[0].id);
    }
  }, [type, categories]);

  const handleAmountChange = (text) => {
    const { formatted } = handleCurrencyInputChange(text);
    setAmountStr(formatted);
  };

  const startEdit = (item) => {
    setEditingItem(item);
    setDescription(item.description || '');
    setAmountStr(formatCentsToDisplay(item.amountCents || 0));
    setType(item.type || 'EXPENSE');
    setDayOfMonth(String(item.dayOfMonth || 5));
    setSelectedAccountId(item.accountId || (accounts[0] ? accounts[0].id : ''));
    setSelectedCategoryId(item.categoryId || '');
    setShowAddForm(true);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 140, animated: true });
    }, 100);
  };

  const cancelForm = () => {
    setEditingItem(null);
    setDescription('');
    setAmountStr('0,00');
    setDayOfMonth('5');
    setShowAddForm(false);
  };

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert('Atenção', 'Informe o nome da conta fixa (ex: Aluguel, Luz).');
      return;
    }

    const cents = parseFormattedToCents(amountStr);
    if (cents <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido maior que zero.');
      return;
    }

    const day = parseInt(dayOfMonth, 10);
    if (isNaN(day) || day < 1 || day > 31) {
      Alert.alert('Atenção', 'O dia de vencimento deve estar entre 1 e 31.');
      return;
    }

    setSaving(true);
    try {
      let res;
      if (editingItem) {
        res = await api.updateRecurring({
          recurringId: editingItem.id,
          description: description.trim(),
          amountCents: cents,
          dayOfMonth: day,
          accountId: selectedAccountId || (accounts[0] ? accounts[0].id : null),
          categoryId: selectedCategoryId || null,
          type,
        });
      } else {
        res = await api.createRecurring({
          userId: user.id,
          accountId: selectedAccountId || (accounts[0] ? accounts[0].id : null),
          categoryId: selectedCategoryId || null,
          description: description.trim(),
          type,
          amountCents: cents,
          frequency: 'MONTHLY',
          dayOfMonth: day,
        });
      }

      if (res.success) {
        cancelForm();
        await loadRecurring();
        if (onUpdate) onUpdate();
        Alert.alert(
          'Sucesso',
          editingItem
            ? 'Conta fixa atualizada com sucesso!'
            : 'Conta fixa cadastrada! Ela será gerada automaticamente todo mês.'
        );
      } else {
        Alert.alert('Erro', res.error || 'Falha ao salvar conta fixa.');
      }
    } catch (err) {
      Alert.alert('Erro', err.message || 'Erro inesperado.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (item) => {
    Alert.alert(
      'Remover Conta Fixa',
      `Deseja realmente cancelar a recorrência "${item.description}"? Os lançamentos já confirmados no extrato serão mantidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await api.deleteRecurring(item.id);
            await loadRecurring();
            if (onUpdate) onUpdate();
          },
        },
      ]
    );
  };

  // Cálculo de total fixo mensal
  const totalExpenseCents = recurringList
    .filter((r) => r.type === 'EXPENSE')
    .reduce((acc, r) => acc + Number(r.amountCents || 0), 0);

  const totalIncomeCents = recurringList
    .filter((r) => r.type === 'INCOME')
    .reduce((acc, r) => acc + Number(r.amountCents || 0), 0);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContainer}>
          {/* HEADER */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="repeat" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.title}>Contas Fixas & Recorrências</Text>
                <Text style={styles.subtitle}>Aluguel, contas de consumo e salários</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* CARD DE RESUMO MENSAL PREVISTO */}
            <Card style={styles.summaryCard} elevated>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>Despesas Fixas / Mês</Text>
                  <Text style={styles.expenseText}>{formatCurrency(totalExpenseCents)}</Text>
                </View>
                {totalIncomeCents > 0 && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.summaryCol}>
                      <Text style={styles.summaryLabel}>Receitas Fixas / Mês</Text>
                      <Text style={styles.incomeText}>{formatCurrency(totalIncomeCents)}</Text>
                    </View>
                  </>
                )}
              </View>
              <Text style={styles.summaryInfo}>
                ⚡ O FinControl projeta e debita automaticamente no dia configurado.
              </Text>
            </Card>

            {/* BOTÃO ADICIONAR CONTA FIXA */}
            {!showAddForm ? (
              <Button
                title="+ Nova Conta Fixa"
                variant="primary"
                onPress={() => {
                  setEditingItem(null);
                  setDescription('');
                  setAmountStr('0,00');
                  setDayOfMonth('5');
                  setShowAddForm(true);
                  setTimeout(() => {
                    scrollRef.current?.scrollTo({ y: 120, animated: true });
                  }, 100);
                }}
                style={styles.addBtn}
                icon={<Ionicons name="add-circle-outline" size={20} color={colors.background} />}
              />
            ) : (
              /* FORMULÁRIO DE ADIÇÃO OU EDIÇÃO */
              <Card style={styles.formCard} elevated>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>
                    {editingItem ? 'Editar Conta Fixa' : 'Cadastrar Conta Fixa'}
                  </Text>
                  <TouchableOpacity onPress={cancelForm}>
                    <Text style={styles.cancelLink}>Cancelar</Text>
                  </TouchableOpacity>
                </View>

                {/* TIPO: DESPESA OU RECEITA */}
                <View style={styles.typeSelector}>
                  <TouchableOpacity
                    style={[styles.typeBtn, type === 'EXPENSE' && styles.typeBtnExpense]}
                    onPress={() => setType('EXPENSE')}
                  >
                    <Text style={[styles.typeBtnText, type === 'EXPENSE' && styles.typeBtnTextActive]}>
                      Despesa Fixa
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, type === 'INCOME' && styles.typeBtnIncome]}
                    onPress={() => setType('INCOME')}
                  >
                    <Text style={[styles.typeBtnText, type === 'INCOME' && styles.typeBtnTextActive]}>
                      Receita Fixa
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* NOME / DESCRIÇÃO */}
                <Text style={styles.inputLabel}>Nome da Conta</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Aluguel, Luz, Internet Fibra, Spotify..."
                  placeholderTextColor={colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                />

                {/* VALOR & DIA DO VENCIMENTO */}
                <View style={styles.rowInputs}>
                  <View style={{ flex: 1.4 }}>
                    <Text style={styles.inputLabel}>Valor Estimado (R$)</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0,00"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={amountStr}
                      onChangeText={handleAmountChange}
                      onFocus={() => {
                        setTimeout(() => {
                          scrollRef.current?.scrollTo({ y: 220, animated: true });
                        }, 120);
                      }}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Dia Vencimento</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Dia"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={dayOfMonth}
                      onChangeText={setDayOfMonth}
                      maxLength={2}
                      onFocus={() => {
                        setTimeout(() => {
                          scrollRef.current?.scrollTo({ y: 240, animated: true });
                        }, 120);
                      }}
                    />
                  </View>
                </View>

                {/* CONTA BANCÁRIA VINCULADA */}
                {accounts.length > 0 && (
                  <View style={styles.fieldSection}>
                    <Text style={styles.inputLabel}>Conta de Pagamento</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
                      {accounts.map((acc) => (
                        <TouchableOpacity
                          key={acc.id}
                          style={[
                            styles.accChip,
                            selectedAccountId === acc.id && styles.accChipActive,
                          ]}
                          onPress={() => setSelectedAccountId(acc.id)}
                        >
                          <Ionicons
                            name="wallet-outline"
                            size={14}
                            color={selectedAccountId === acc.id ? colors.primary : colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.accChipText,
                              selectedAccountId === acc.id && styles.accChipTextActive,
                            ]}
                          >
                            {acc.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* BOTÃO SALVAR */}
                <Button
                  title={saving ? 'Salvando...' : editingItem ? 'Atualizar Conta Fixa' : 'Salvar Conta Fixa'}
                  variant="primary"
                  onPress={handleSave}
                  disabled={saving}
                  style={styles.submitBtn}
                />
              </Card>
            )}

            {/* LISTA DE CONTAS CADASTRADAS */}
            <View style={styles.listSectionHeader}>
              <Text style={styles.listTitle}>Contas Fixas Cadastradas</Text>
              <Text style={styles.listCount}>{recurringList.length} ativa(s)</Text>
            </View>

            {loading ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: 20 }} />
            ) : recurringList.length === 0 ? (
              <Card style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={36} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>Nenhuma conta fixa cadastrada</Text>
                <Text style={styles.emptySubtitle}>
                  Cadastre contas como Aluguel, Luz e Internet para que o app lance automaticamente todo mês!
                </Text>
              </Card>
            ) : (
              recurringList.map((item) => {
                const isExpense = item.type === 'EXPENSE';
                const accountName = accounts.find((a) => a.id === item.accountId)?.name || 'Conta Principal';

                return (
                  <Card key={item.id} style={styles.recurringItemCard}>
                    <View style={styles.itemLeft}>
                      <View
                        style={[
                          styles.dayCircle,
                          isExpense ? styles.dayCircleExpense : styles.dayCircleIncome,
                        ]}
                      >
                        <Text style={styles.dayNumber}>
                          {String(item.dayOfMonth || 5).padStart(2, '0')}
                        </Text>
                        <Text style={styles.dayLabel}>DIA</Text>
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle}>{item.description}</Text>
                        <Text style={styles.itemMeta}>
                          Todo dia {item.dayOfMonth} • {accountName}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.itemRight}>
                      <Text
                        style={[
                          styles.itemAmount,
                          isExpense ? styles.textExpense : styles.textIncome,
                        ]}
                      >
                        {formatCurrency(item.amountCents)}
                      </Text>

                      <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                          onPress={() => startEdit(item)}
                          style={styles.editBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="pencil" size={16} color={colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleDelete(item)}
                          style={styles.trashBtn}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <Ionicons name="trash-outline" size={16} color={colors.expense} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </Card>
                );
              })
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
    minHeight: '65%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHighlight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryGhost,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  summaryCard: {
    marginBottom: 16,
    padding: 16,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  summaryCol: {
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: colors.borderHighlight,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  expenseText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.expense,
  },
  incomeText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.income,
  },
  summaryInfo: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.borderHighlight,
    paddingTop: 8,
  },
  addBtn: {
    marginBottom: 20,
  },
  formCard: {
    padding: 16,
    marginBottom: 20,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.primary + '55',
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  formTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  cancelLink: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeBtnExpense: {
    borderColor: colors.expense,
    backgroundColor: colors.expenseGhost,
  },
  typeBtnIncome: {
    borderColor: colors.income,
    backgroundColor: colors.incomeGhost,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  typeBtnTextActive: {
    color: colors.text,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 12,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  quickDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  quickDayChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickDayChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  quickDayText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  quickDayTextActive: {
    color: colors.primary,
    fontWeight: '900',
  },
  fieldSection: {
    marginBottom: 14,
  },
  chipsScroll: {
    flexDirection: 'row',
  },
  accChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 8,
  },
  accChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryGhost,
  },
  accChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  accChipTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  submitBtn: {
    marginTop: 4,
  },
  listSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  listCount: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  recurringItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dayCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleExpense: {
    backgroundColor: colors.expenseGhost,
  },
  dayCircleIncome: {
    backgroundColor: colors.incomeGhost,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  dayLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textMuted,
    marginTop: -2,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 11,
    color: colors.textMuted,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  itemAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  textExpense: {
    color: colors.expense,
  },
  textIncome: {
    color: colors.income,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: colors.primaryGhost,
  },
  trashBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: colors.expenseGhost,
  },
});
