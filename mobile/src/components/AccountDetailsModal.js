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
import { api, formatCurrency, formatDate } from '../services/api';
import {
  handleCurrencyInputChange,
  formatCentsToDisplay,
  parseFormattedToCents,
} from '../utils/currencyMask';

const COLOR_PALETTE = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#EF4444', // Red
  '#14B8A6', // Teal
];

const ACCOUNT_TYPES = [
  { id: 'CHECKING', label: 'Corrente', icon: 'card-outline' },
  { id: 'SAVINGS', label: 'Poupança', icon: 'wallet-outline' },
  { id: 'INVESTMENT', label: 'Investimento', icon: 'trending-up-outline' },
  { id: 'CASH', label: 'Dinheiro', icon: 'cash-outline' },
];

export function AccountDetailsModal({
  visible,
  onClose,
  account,
  transactions = [],
  onSelectTransaction,
  onUpdated,
  onDeleted,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState('');
  const [balanceStr, setBalanceStr] = useState('0,00');
  const [type, setType] = useState('CHECKING');
  const [color, setColor] = useState('#10B981');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (account) {
      setName(account.name || '');
      setBalanceStr(formatCentsToDisplay(account.currentBalanceCents || 0));
      setType(account.type || 'CHECKING');
      setColor(account.color || colors.primary);
      setIsEditing(false);
    }
  }, [account, visible]);

  if (!account) return null;

  const accountColor = color || colors.primary;
  const balanceCents = Number(account.currentBalanceCents || 0);
  const isNegative = balanceCents < 0;
  const initialBalance = Number(account.initialBalanceCents || 0);

  // Filtra transações associadas a esta conta
  const accountTransactions = transactions.filter(
    (t) => t.accountId === account.id
  );

  const handleAmountChange = (text) => {
    const { formatted } = handleCurrencyInputChange(text);
    setBalanceStr(formatted);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Informe o nome da conta.');
      return;
    }

    setSaving(true);
    try {
      const cents = parseFormattedToCents(balanceStr);
      const res = await api.updateAccount({
        accountId: account.id,
        name: name.trim(),
        type,
        color,
        currentBalanceCents: cents,
      });

      if (res.success) {
        setIsEditing(false);
        if (onUpdated) onUpdated();
        Alert.alert('Sucesso', 'Conta bancária atualizada com sucesso!');
      } else {
        Alert.alert('Erro', res.error || 'Falha ao atualizar conta.');
      }
    } catch (err) {
      Alert.alert('Erro', err.message || 'Erro inesperado ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Excluir Conta',
      `Tem certeza que deseja excluir a conta "${account.name}"? Ela será desvinculada dos lançamentos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir Conta',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const res = await api.deleteAccount(account.id);
              if (res.success) {
                if (onDeleted) onDeleted();
                onClose();
              } else {
                Alert.alert('Erro', res.error || 'Falha ao excluir conta.');
              }
            } catch (err) {
              Alert.alert('Erro', err.message);
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
              <View style={[styles.headerIconBox, { backgroundColor: accountColor + '22' }]}>
                <Ionicons name="wallet" size={20} color={accountColor} />
              </View>
              <Text style={styles.headerTitle}>
                {isEditing ? 'Editar Conta' : 'Detalhes da Conta'}
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
              /* FORMULÁRIO DE EDIÇÃO */
              <View style={styles.editForm}>
                {/* Nome da Conta */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nome da Conta / Banco *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={name}
                    onChangeText={setName}
                    placeholder="Ex: Nubank, Itaú, Carteira..."
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                {/* Saldo Atual com máscara automática ,00 */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Saldo Atual (R$) *</Text>
                  <View style={styles.amountInputRow}>
                    <Text style={styles.amountCurrencyPrefix}>R$</Text>
                    <TextInput
                      style={styles.amountTextInput}
                      value={balanceStr}
                      onChangeText={handleAmountChange}
                      keyboardType="numeric"
                      placeholder="0,00"
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                  <Text style={styles.inputHint}>
                    💡 Digite apenas os números: o FinControl completa os centavos automaticamente.
                  </Text>
                </View>

                {/* Tipo de Conta */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tipo de Conta</Text>
                  <View style={styles.typeGrid}>
                    {ACCOUNT_TYPES.map((t) => {
                      const active = type === t.id;
                      return (
                        <TouchableOpacity
                          key={t.id}
                          style={[
                            styles.typeChip,
                            active && { borderColor: accountColor, backgroundColor: accountColor + '18' },
                          ]}
                          onPress={() => setType(t.id)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name={t.icon}
                            size={16}
                            color={active ? accountColor : colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.typeChipText,
                              active && { color: colors.text, fontWeight: '800' },
                            ]}
                          >
                            {t.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Cor da Conta */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Cor de Identificação</Text>
                  <View style={styles.colorPaletteRow}>
                    {COLOR_PALETTE.map((c) => {
                      const selected = color.toLowerCase() === c.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={c}
                          style={[
                            styles.colorCircle,
                            { backgroundColor: c },
                            selected && styles.colorCircleSelected,
                          ]}
                          onPress={() => setColor(c)}
                          activeOpacity={0.7}
                        >
                          {selected && (
                            <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Botões de Ação */}
                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                  onPress={handleSave}
                  disabled={saving || deleting}
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

                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDelete}
                  disabled={saving || deleting}
                  activeOpacity={0.8}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color={colors.expense} />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={16} color={colors.expense} />
                      <Text style={styles.deleteBtnText}>Excluir esta Conta</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* MODO VISUALIZAÇÃO PADRÃO */
              <>
                {/* Bloco de Saldo da Conta */}
                <View style={[styles.balanceCard, { borderColor: accountColor + '55' }]}>
                  <View style={styles.accountTopRow}>
                    <View style={[styles.colorDot, { backgroundColor: accountColor }]} />
                    <Text style={styles.accountName}>{account.name}</Text>
                  </View>

                  <Text style={styles.balanceLabel}>Saldo Atual Disponível</Text>
                  <Text
                    style={[
                      styles.balanceValue,
                      { color: isNegative ? colors.expense : colors.income },
                    ]}
                  >
                    {formatCurrency(balanceCents)}
                  </Text>

                  <View style={styles.typeBadge}>
                    <Text style={[styles.typeBadgeText, { color: accountColor }]}>
                      {account.type || 'CONTA'}
                    </Text>
                  </View>
                </View>

                {/* Ficha Técnica */}
                <View style={styles.infoGroup}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Instituição / Nome</Text>
                    <Text style={styles.infoValue}>{account.name}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Tipo de Conta</Text>
                    <Text style={styles.infoValue}>{account.type || 'Corrente'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Saldo Inicial</Text>
                    <Text style={styles.infoValue}>{formatCurrency(initialBalance)}</Text>
                  </View>
                  <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.infoLabel}>Status no Sistema</Text>
                    <View style={styles.statusRow}>
                      <View style={styles.statusDot} />
                      <Text style={styles.statusText}>Ativa • Sincronizada</Text>
                    </View>
                  </View>
                </View>

                {/* Extrato Recente da Conta */}
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Transações desta Conta</Text>
                  <Text style={styles.sectionSubtitle}>
                    {accountTransactions.length} registro(s)
                  </Text>
                </View>

                {accountTransactions.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="receipt-outline" size={28} color={colors.textMuted} />
                    <Text style={styles.emptyText}>
                      Nenhuma transação vinculada a esta conta recentemente.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.txList}>
                    {accountTransactions.map((tx) => {
                      const isExp = tx.type === 'EXPENSE';
                      return (
                        <TouchableOpacity
                          key={tx.id}
                          style={styles.txRow}
                          activeOpacity={0.7}
                          onPress={() => {
                            if (onSelectTransaction) {
                              onClose();
                              onSelectTransaction(tx);
                            }
                          }}
                        >
                          <View
                            style={[
                              styles.txIconBox,
                              { backgroundColor: isExp ? colors.expenseGhost : colors.incomeGhost },
                            ]}
                          >
                            <Ionicons
                              name={isExp ? 'arrow-down' : 'arrow-up'}
                              size={14}
                              color={isExp ? colors.expense : colors.income}
                            />
                          </View>
                          <View style={styles.txDetails}>
                            <Text style={styles.txDesc} numberOfLines={1}>
                              {tx.description}
                            </Text>
                            <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
                          </View>
                          <Text
                            style={[
                              styles.txAmount,
                              { color: isExp ? colors.expense : colors.income },
                            ]}
                          >
                            {isExp ? '-' : '+'} {formatCurrency(tx.amountCents)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

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
  balanceCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    marginBottom: 16,
  },
  accountTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  infoGroup: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderHighlight,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textMuted,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '700',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  statusText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  emptyBox: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  txList: {
    gap: 8,
    marginBottom: 20,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
  },
  txIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDetails: {
    flex: 1,
  },
  txDesc: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 2,
  },
  txDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '800',
  },
  closeActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceHighlight,
    marginTop: 4,
  },
  closeActionBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },

  // Estilos do Modo Edição
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typeChipText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  colorPaletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  colorCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorCircleSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
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
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: colors.expenseGhost,
    borderWidth: 1,
    borderColor: colors.expense + '44',
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.expense,
  },
});
