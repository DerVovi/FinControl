import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatCurrency, formatDate, api } from '../services/api';

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

  if (!transaction) return null;

  const isExpense = transaction.type === 'EXPENSE';
  const account = accounts.find((a) => a.id === transaction.accountId);
  const card = cards.find((c) => c.id === transaction.cardId);
  const category = categories.find((c) => c.id === transaction.categoryId);

  const accountName = card ? `Cartão: ${card.name}` : (account?.name || 'Conta Padrão');
  const accountColor = card ? (card.color || colors.primary) : (account?.color || colors.primary);

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
              <Text style={styles.headerTitle}>Detalhes do Lançamento</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
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
                  <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Descrição / Título</Text>
                  <Text style={styles.detailValueText}>
                    {transaction.description || 'Sem descrição'}
                  </Text>
                </View>
              </View>

              {/* Conta ou Cartão de Pagamento */}
              <View style={styles.detailRow}>
                <View style={styles.detailIconBox}>
                  <Ionicons
                    name={card ? 'card-outline' : 'wallet-outline'}
                    size={18}
                    color={accountColor}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>
                    {card ? 'Cartão Utilizado' : (isExpense ? 'Conta de Saída' : 'Conta de Destino')}
                  </Text>
                  <View style={styles.accountBadgeRow}>
                    <View style={[styles.accountDot, { backgroundColor: accountColor }]} />
                    <Text style={styles.detailValueText}>{accountName}</Text>
                    {account?.type && !card && (
                      <Text style={styles.accountSubtype}>({account.type})</Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Categoria / Origem */}
              {category && (
                <View style={styles.detailRow}>
                  <View style={styles.detailIconBox}>
                    <Ionicons name="pricetag-outline" size={18} color={category.color || colors.primary} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>
                      {isExpense ? 'Categoria da Despesa' : 'Origem do Recebimento'}
                    </Text>
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
                    name={transaction.status === 'CONFIRMED' ? 'checkmark-circle-outline' : 'time-outline'}
                    size={18}
                    color={transaction.status === 'CONFIRMED' ? colors.primary : colors.warning}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Status da Transação</Text>
                  <View style={styles.statusBox}>
                    <Text
                      style={[
                        styles.statusText,
                        transaction.status === 'PENDING' && { color: colors.warning },
                      ]}
                    >
                      {transaction.status === 'CONFIRMED'
                        ? 'Confirmado / Pago'
                        : transaction.status === 'PENDING'
                        ? 'Pendente (A Vencer)'
                        : transaction.status}
                    </Text>
                    {transaction.isRecurring && (
                      <Text style={styles.statusSub}> • 🔄 Conta Fixa</Text>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Botões de Ação */}
            <View style={styles.actionsContainer}>
              {transaction.status === 'PENDING' && (
                <TouchableOpacity
                  style={styles.payBtn}
                  onPress={handleConfirmPayment}
                  disabled={confirming}
                  activeOpacity={0.8}
                >
                  {confirming ? (
                    <ActivityIndicator size="small" color={colors.textInverse} />
                  ) : (
                    <>
                      <Ionicons name="checkmark-done-circle" size={18} color={colors.textInverse} />
                      <Text style={styles.payBtnText}>Marcar como Paga / Debitar</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDelete}
                disabled={deleting}
                activeOpacity={0.8}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.expense} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color={colors.expense} />
                    <Text style={styles.deleteBtnText}>Excluir Transação</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeActionBtn}
                onPress={onClose}
                activeOpacity={0.8}
              >
                <Text style={styles.closeActionBtnText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 32,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
  },
  scroll: {
    marginBottom: 8,
  },
  amountCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: '900',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  detailsGroup: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  detailIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  detailValueText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  detailValueMuted: {
    color: colors.textMuted,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  accountBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  accountDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  accountSubtype: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
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
  },
  actionsContainer: {
    gap: 10,
    marginTop: 4,
  },
  payBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    gap: 8,
  },
  payBtnText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '800',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.expenseGhost,
    borderWidth: 1,
    borderColor: colors.expense,
    gap: 8,
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
});
