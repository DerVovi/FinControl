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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatCurrency, formatDate, api } from '../services/api';
import {
  handleCurrencyInputChange,
  formatCentsToDisplay,
  parseFormattedToCents,
} from '../utils/currencyMask';

export function TransactionDetailsModal({
  visible,
  onClose,
  transaction,
  accounts = [],
  cards = [],
  categories = [],
  onDeleted,
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Estados de Edição
  const [editDesc, setEditDesc] = useState('');
  const [editAmountStr, setEditAmountStr] = useState('0,00');
  const [editNotes, setEditNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setEditDesc(transaction.description || '');
      setEditAmountStr(formatCentsToDisplay(transaction.amountCents || 0));
      setEditNotes(transaction.notes || '');
      setIsEditing(false);
    }
  }, [transaction, visible]);

  if (!transaction) return null;

  const isExpense = transaction.type === 'EXPENSE';
  const account = accounts.find((a) => a.id === transaction.accountId);
  const card = cards.find((c) => c.id === transaction.cardId);
  const category = categories.find((c) => c.id === transaction.categoryId);

  const accountName = card ? `Cartão: ${card.name}` : (account?.name || 'Conta Padrão');
  const accountColor = card ? (card.color || colors.primary) : (account?.color || colors.primary);

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const isOverdue =
    transaction.status === 'PENDING' && new Date(transaction.date) < startOfToday;

  const handleAmountChange = (text) => {
    const { formatted } = handleCurrencyInputChange(text);
    setEditAmountStr(formatted);
  };

  const handleSaveEdit = async () => {
    if (!editDesc.trim()) {
      Alert.alert('Atenção', 'Informe a descrição da transação.');
      return;
    }

    const cents = parseFormattedToCents(editAmountStr);
    if (cents <= 0) {
      Alert.alert('Atenção', 'Informe um valor válido maior que zero.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.updateTransaction({
        transactionId: transaction.id,
        description: editDesc.trim(),
        amountCents: cents,
        notes: editNotes.trim(),
      });

      if (res.success) {
        setIsEditing(false);
        if (onDeleted) onDeleted();
        Alert.alert('Sucesso', 'Lançamento atualizado com sucesso!');
        onClose();
      } else {
        Alert.alert('Erro', res.error || 'Falha ao atualizar lançamento.');
      }
    } catch (err) {
      Alert.alert('Erro', err.message || 'Erro inesperado ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmPayment = async () => {
    setConfirming(true);
    try {
      const res = await api.confirmPendingTransaction(transaction);
      if (res.success) {
        Alert.alert('Sucesso', 'Pagamento confirmado e saldo da conta atualizado!');
        if (onDeleted) onDeleted();
        onClose();
      } else {
        Alert.alert('Erro', res.error || 'Falha ao confirmar pagamento.');
      }
    } catch (err) {
      Alert.alert('Erro', err.message || 'Erro inesperado.');
    } finally {
      setConfirming(false);
    }
  };

  const handleRevertPayment = async () => {
    setConfirming(true);
    try {
      const res = await api.revertPendingTransaction(transaction);
      if (res.success) {
        Alert.alert('Sucesso', 'Pagamento desmarcado e saldo estornado!');
        if (onDeleted) onDeleted();
        onClose();
      } else {
        Alert.alert('Erro', res.error || 'Falha ao desmarcar pagamento.');
      }
    } catch (err) {
      Alert.alert('Erro', err.message || 'Erro inesperado.');
    } finally {
      setConfirming(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Transação',
      'Tem certeza que deseja apagar este lançamento? O saldo da conta será recalculado automaticamente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const res = await api.deleteTransaction(transaction);
              if (res.success) {
                if (onDeleted) onDeleted();
                onClose();
              } else {
                Alert.alert('Erro', res.error || 'Não foi possível excluir.');
              }
            } catch (err) {
              Alert.alert('Erro', err.message || 'Erro inesperado ao excluir.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIconBox,
                  { backgroundColor: isExpense ? colors.expenseGhost : colors.incomeGhost },
                ]}
              >
                <Ionicons
                  name={isExpense ? 'arrow-down' : 'arrow-up'}
                  size={20}
                  color={isExpense ? colors.expense : colors.income}
                />
              </View>
              <Text style={styles.headerTitle}>
                {isEditing ? 'Editar Lançamento' : 'Detalhes do Lançamento'}
              </Text>
            </View>

            <View style={styles.headerActions}>
              {!isEditing ? (
                <TouchableOpacity
                  onPress={() => setIsEditing(true)}
                  style={styles.editHeaderBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="pencil" size={16} color={colors.primary} />
                  <Text style={styles.editHeaderText}>Editar</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setIsEditing(false)}
                  style={styles.cancelHeaderBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelHeaderText}>Cancelar</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {isEditing ? (
              /* MODO EDIÇÃO */
              <View style={styles.editForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Descrição do Lançamento *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editDesc}
                    onChangeText={setEditDesc}
                    placeholder="Descrição..."
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Valor (R$) *</Text>
                  <View style={styles.amountInputRow}>
                    <Text style={styles.amountCurrencyPrefix}>R$</Text>
                    <TextInput
                      style={styles.amountTextInput}
                      value={editAmountStr}
                      onChangeText={handleAmountChange}
                      keyboardType="numeric"
                      placeholder="0,00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <Text style={styles.inputHint}>
                    💡 O FinControl completa os centavos automaticamente enquanto você digita.
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Observações</Text>
                  <TextInput
                    style={[styles.textInput, { height: 70, textAlignVertical: 'top' }]}
                    value={editNotes}
                    onChangeText={setEditNotes}
                    placeholder="Notas ou observações..."
                    placeholderTextColor={colors.textMuted}
                    multiline
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSaveEdit}
                  disabled={saving}
                  activeOpacity={0.8}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color={colors.textInverse} />
                      <Text style={styles.saveBtnText}>Salvar Alterações</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* MODO VISUALIZAÇÃO PADRÃO */
              <>
                {/* Bloco de Destaque do Valor */}
                <View style={styles.amountCard}>
                  <Text style={styles.amountLabel}>
                    {isExpense ? 'Despesa Lançada' : 'Receita Recebida'}
                  </Text>
                  <Text
                    style={[
                      styles.amountValue,
                      { color: isExpense ? colors.expense : colors.income },
                    ]}
                  >
                    {isExpense ? '-' : '+'} {formatCurrency(transaction.amountCents)}
                  </Text>

                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: isExpense ? colors.expenseGhost : colors.incomeGhost },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: isExpense ? colors.expense : colors.income },
                      ]}
                    >
                      {isExpense ? 'DESPESA' : 'RECEITA'}
                    </Text>
                  </View>
                </View>

                {/* Lista de Campos Detalhados */}
                <View style={styles.detailsGroup}>
                  {/* Descrição */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="document-text-outline" size={18} color={colors.primary} />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Descrição</Text>
                      <Text style={styles.detailValueText}>{transaction.description}</Text>
                    </View>
                  </View>

                  {/* Conta Bancária / Cartão */}
                  <View style={styles.detailRow}>
                    <View style={[styles.detailIconBox, { backgroundColor: accountColor + '22' }]}>
                      <Ionicons
                        name={card ? 'card-outline' : 'wallet-outline'}
                        size={18}
                        color={accountColor}
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>
                        {card ? 'Cartão Utilizado' : 'Conta Bancária'}
                      </Text>
                      <Text style={styles.detailValueText}>{accountName}</Text>
                    </View>
                  </View>

                  {/* Categoria */}
                  {category && (
                    <View style={styles.detailRow}>
                      <View style={styles.detailIconBox}>
                        <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.detailContent}>
                        <Text style={styles.detailLabel}>Categoria</Text>
                        <Text style={styles.detailValueText}>{category.name}</Text>
                      </View>
                    </View>
                  )}

                  {/* Data do Lançamento */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="calendar-outline" size={18} color={colors.info} />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Data da Transação</Text>
                      <Text style={styles.detailValueText}>
                        {formatDate(transaction.date)}
                      </Text>
                    </View>
                  </View>

                  {/* Observações / Notas */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailIconBox}>
                      <Ionicons name="document-text-outline" size={18} color={colors.warning} />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Observações</Text>
                      <Text
                        style={[
                          styles.detailValueText,
                          !transaction.notes && styles.detailValueMuted,
                        ]}
                      >
                        {transaction.notes || 'Nenhuma observação informada.'}
                      </Text>
                    </View>
                  </View>

                  {/* Status */}
                  <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.detailIconBox}>
                      <Ionicons
                        name={
                          transaction.status === 'CONFIRMED'
                            ? 'checkmark-circle-outline'
                            : isOverdue
                            ? 'alert-circle-outline'
                            : 'time-outline'
                        }
                        size={18}
                        color={
                          transaction.status === 'CONFIRMED'
                            ? colors.income
                            : isOverdue
                            ? colors.expense
                            : colors.warning
                        }
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Status da Transação</Text>
                      <View style={styles.statusBox}>
                        <Text
                          style={[
                            styles.statusText,
                            transaction.status === 'CONFIRMED' && { color: colors.income },
                            transaction.status === 'PENDING' && {
                              color: isOverdue ? colors.expense : colors.warning,
                            },
                          ]}
                        >
                          {transaction.status === 'CONFIRMED'
                            ? 'Paga / Confirmada'
                            : isOverdue
                            ? 'Vencida (Não Paga)'
                            : 'A Vencer'}
                        </Text>
                        {transaction.isRecurring && (
                          <Text style={styles.statusSub}> • 🔄 Conta Fixa</Text>
                        )}
                      </View>
                    </View>
                  </View>
                </View>

                {/* BOTÃO CONFIRMAR PAGAMENTO SE ESTIVER PENDENTE */}
                {transaction.status === 'PENDING' && (
                  <TouchableOpacity
                    style={[
                      styles.payBtn,
                      isOverdue && { backgroundColor: colors.expense },
                    ]}
                    onPress={handleConfirmPayment}
                    disabled={confirming}
                    activeOpacity={0.8}
                  >
                    {confirming ? (
                      <ActivityIndicator size="small" color={colors.textInverse} />
                    ) : (
                      <>
                        <Ionicons name="checkmark-done" size={20} color={colors.textInverse} />
                        <Text style={styles.payBtnText}>
                          {isOverdue ? 'Pagar Conta Vencida / Debitar' : 'Marcar como Paga / Debitar'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* BOTÃO DESMARCAR PAGAMENTO SE ESTIVER CONFIRMADA */}
                {transaction.status === 'CONFIRMED' && (
                  <TouchableOpacity
                    style={styles.revertBtn}
                    onPress={handleRevertPayment}
                    disabled={confirming}
                    activeOpacity={0.8}
                  >
                    {confirming ? (
                      <ActivityIndicator size="small" color={colors.warning} />
                    ) : (
                      <>
                        <Ionicons name="arrow-undo-outline" size={18} color={colors.warning} />
                        <Text style={styles.revertBtnText}>
                          Desmarcar Pagamento (Voltar para Pendente)
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}

                {/* Ações: Excluir */}
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDelete}
                  disabled={deleting}
                  activeOpacity={0.7}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color={colors.expense} />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={18} color={colors.expense} />
                      <Text style={styles.deleteBtnText}>Excluir Lançamento</Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Botão Fechar */}
                <TouchableOpacity
                  style={styles.closeActionBtn}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={styles.closeActionBtnText}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryGhost,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  cancelHeaderBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
  },
  cancelHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
  },
  scroll: {
    marginBottom: 10,
  },
  amountCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  amountLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  detailsGroup: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHighlight,
    gap: 12,
  },
  detailIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailValueText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
  },
  detailValueMuted: {
    color: colors.textMuted,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
  statusSub: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  payBtnText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '800',
  },
  revertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning + '18',
    borderWidth: 1,
    borderColor: colors.warning + '55',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginBottom: 10,
  },
  revertBtnText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '800',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.expenseGhost,
    borderWidth: 1,
    borderColor: colors.expense + '44',
    gap: 8,
    marginBottom: 10,
  },
  deleteBtnText: {
    color: colors.expense,
    fontSize: 14,
    fontWeight: '700',
  },
  closeActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceHighlight,
  },
  closeActionBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  // Estilos de Edição
  editForm: {
    gap: 16,
    paddingBottom: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  textInput: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
    fontWeight: '600',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  amountCurrencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMuted,
    marginRight: 8,
  },
  amountTextInput: {
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  inputHint: {
    fontSize: 11,
    color: colors.textMuted,
    lineHeight: 16,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 10,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textInverse,
  },
});
