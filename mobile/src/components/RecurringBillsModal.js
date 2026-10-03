import React, { useState, useEffect } from 'react';
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

  // Formulário de Nova Conta Fixa
  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [type, setType] = useState('EXPENSE'); // 'EXPENSE' | 'INCOME'
  const [dayOfMonth, setDayOfMonth] = useState('5');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadRecurring = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Sincroniza instâncias do mês corrente
      await api.syncRecurring(user.id);
      // 2. Busca lista de regras ativas
      const list = await api.getRecurring(user.id);
      setRecurringList(list);
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

  const parseAmountToCents = (str) => {
    if (!str) return 0;
    const clean = str.replace(/[^\d.,]/g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  const handleSave = async () => {
    if (!description.trim()) {
      Alert.alert('Atenção', 'Informe o nome da conta fixa (ex: Aluguel, Luz).');
      return;
    }

    const cents = parseAmountToCents(amountStr);
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
      const res = await api.createRecurring({
        userId: user.id,
        accountId: selectedAccountId || (accounts[0] ? accounts[0].id : null),
        categoryId: selectedCategoryId || null,
        description: description.trim(),
        type,
        amountCents: cents,
        frequency: 'MONTHLY',
        dayOfMonth: day,
      });

      if (res.success) {
        setDescription('');
        setAmountStr('');
        setDayOfMonth('5');
        setShowAddForm(false);
        await loadRecurring();
        if (onUpdate) onUpdate();
        Alert.alert('Sucesso', 'Conta fixa cadastrada! Ela será gerada automaticamente todo mês.');
      } else {
        Alert.alert('Erro', res.error || 'Falha ao cadastrar conta fixa.');
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
                onPress={() => setShowAddForm(true)}
                style={styles.addBtn}
                icon={<Ionicons name="add-circle-outline" size={20} color={colors.background} />}
              />
            ) : (
              /* FORMULÁRIO DE ADIÇÃO */
              <Card style={styles.formCard} elevated>
                <View style={styles.formHeader}>
                  <Text style={styles.formTitle}>Cadastrar Conta Fixa</Text>
                  <TouchableOpacity onPress={() => setShowAddForm(false)}>
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
                      onChangeText={setAmountStr}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Dia Vencimento</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Dia (1 a 31)"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={dayOfMonth}
                      onChangeText={setDayOfMonth}
                      maxLength={2}
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
                  title={saving ? 'Salvando...' : 'Salvar Conta Fixa'}
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
                      <TouchableOpacity
                        onPress={() => handleDelete(item)}
                        style={styles.trashBtn}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={colors.danger} />
                      </TouchableOpacity>
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  summaryCard: {
    padding: 16,
    marginBottom: 18,
    backgroundColor: colors.cardHover,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryCol: {
    flex: 1,
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  expenseText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.expense,
    marginTop: 3,
  },
  incomeText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.income,
    marginTop: 3,
  },
  summaryInfo: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 10,
    lineHeight: 15,
  },
  addBtn: {
    marginBottom: 20,
  },
  formCard: {
    padding: 18,
    marginBottom: 24,
    borderColor: colors.primary,
    borderWidth: 1,
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeBtnExpense: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: colors.expense,
  },
  typeBtnIncome: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: colors.income,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
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
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 14,
    marginBottom: 14,
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.background,
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
    color: colors.textSecondary,
    fontWeight: '600',
  },
  accChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  submitBtn: {
    marginTop: 6,
  },
  listSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  listCount: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 17,
  },
  recurringItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    marginBottom: 10,
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  dayCircleExpense: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  dayCircleIncome: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
    lineHeight: 17,
  },
  dayLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.textMuted,
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  itemMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  itemAmount: {
    fontSize: 15,
    fontWeight: '800',
  },
  textExpense: {
    color: colors.expense,
  },
  textIncome: {
    color: colors.income,
  },
  trashBtn: {
    padding: 4,
  },
});
