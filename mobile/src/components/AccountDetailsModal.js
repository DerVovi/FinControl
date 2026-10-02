import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { formatCurrency, formatDate } from '../services/api';

export function AccountDetailsModal({
  visible,
  onClose,
  account,
  transactions = [],
  onSelectTransaction,
}) {
  if (!account) return null;

  const accountColor = account.color || colors.primary;
  const balanceCents = Number(account.currentBalanceCents || 0);
  const isNegative = balanceCents < 0;
  const initialBalance = Number(account.initialBalanceCents || 0);

  // Filtra transações associadas a esta conta
  const accountTransactions = transactions.filter(
    (t) => t.accountId === account.id
  );

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
              <Text style={styles.headerTitle}>Detalhes da Conta</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
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
                        onClose();
                        if (onSelectTransaction) onSelectTransaction(tx);
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
                        numberOfLines={1}
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
              activeOpacity={0.8}
            >
              <Text style={styles.closeActionBtnText}>Fechar</Text>
            </TouchableOpacity>
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
  balanceCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    borderWidth: 1,
  },
  accountTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  balanceValue: {
    fontSize: 30,
    fontWeight: '900',
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoGroup: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
});
