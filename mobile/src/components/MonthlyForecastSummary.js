import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from './Card';
import { formatCurrency } from '../services/api';

export function MonthlyForecastSummary({
  accounts = [],
  transactions = [],
  cards = [],
  recurringBills = [],
  hideValues = false,
}) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Nome do mês atual em português
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const currentMonthName = monthNames[currentMonth];

  // 1. Saldo atual disponível em todas as contas bancárias
  const currentTotalBalanceCents = accounts.reduce(
    (acc, a) => acc + Number(a.currentBalanceCents || 0),
    0
  );

  // 2. Transações do mês corrente
  const monthTxs = transactions.filter((t) => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // 3. Gastos com Cartão de Crédito do Mês (Transações com cardId ou parcelas de cartão)
  const cardExpensesCents = monthTxs
    .filter((t) => t.type === 'EXPENSE' && (t.cardId || (t.notes && t.notes.includes('Parcela'))))
    .reduce((acc, t) => acc + Number(t.amountCents || 0), 0);

  // 4. Contas Fixas & Despesas Pendentes a Vencer no restante do mês
  const pendingExpensesCents = monthTxs
    .filter((t) => t.type === 'EXPENSE' && t.status === 'PENDING')
    .reduce((acc, t) => acc + Number(t.amountCents || 0), 0);

  // 5. Receitas Previstas a Entrar (Salário pendente ou receitas a receber)
  const pendingIncomesCents = monthTxs
    .filter((t) => t.type === 'INCOME' && t.status === 'PENDING')
    .reduce((acc, t) => acc + Number(t.amountCents || 0), 0);

  // 6. Total de Compromissos do Mês (Fatura Cartão + Despesas Pendentes)
  // Se a despesa do cartão já for uma das pendentes, não duplica
  const totalObligationsCents = cardExpensesCents + pendingExpensesCents;

  // 7. Recursos Totais Disponíveis (Saldo em conta + Receitas por entrar)
  const totalResourcesCents = currentTotalBalanceCents + pendingIncomesCents;

  // 8. Saldo Projetado / Balanço do Mês
  const projectedBalanceCents = totalResourcesCents - totalObligationsCents;
  const isShortage = projectedBalanceCents < 0;
  const shortageAmountCents = Math.abs(projectedBalanceCents);

  // Percentual de cobertura das contas
  const coveragePercent =
    totalObligationsCents > 0
      ? Math.min(100, Math.round((totalResourcesCents / totalObligationsCents) * 100))
      : 100;

  return (
    <Card style={styles.container} elevated>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <Ionicons name="calendar" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.title}>Resumo do Mês • {currentMonthName}</Text>
            <Text style={styles.subtitle}>Previsão orçamentária e cobertura do cartão</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, isShortage ? styles.shortageBadge : styles.coveredBadge]}>
          <Ionicons
            name={isShortage ? 'alert-circle' : 'checkmark-circle'}
            size={14}
            color={isShortage ? colors.warning : colors.income}
          />
          <Text style={[styles.statusBadgeText, { color: isShortage ? colors.warning : colors.income }]}>
            {isShortage ? 'Faltam Recursos' : 'Contas Cobertas'}
          </Text>
        </View>
      </View>

      {/* BANNER PRINCIPAL DE RESULTADO */}
      <View style={[styles.forecastBanner, isShortage ? styles.forecastShortage : styles.forecastCovered]}>
        <View style={styles.bannerTop}>
          <Text style={styles.bannerLabel}>
            {isShortage ? 'Quanto ainda precisa receber:' : 'Saldo previsto ao final do mês:'}
          </Text>
          <Text
            style={[
              styles.bannerValue,
              { color: isShortage ? colors.warning : colors.income },
            ]}
          >
            {hideValues ? '••••' : formatCurrency(isShortage ? shortageAmountCents : projectedBalanceCents)}
          </Text>
        </View>

        <Text style={styles.bannerExplanation}>
          {isShortage
            ? `⚠️ Você precisa de mais ${formatCurrency(shortageAmountCents)} para quitar a fatura do cartão e as contas do mês.`
            : `🎉 Seu saldo disponível cobre todas as faturas e contas fixas deste mês, sobrando ${formatCurrency(projectedBalanceCents)}.`}
        </Text>

        {/* Barra de Progresso de Cobertura */}
        <View style={styles.coverageRow}>
          <View style={styles.coverageBarBg}>
            <View
              style={[
                styles.coverageBarFill,
                {
                  width: `${Math.max(5, coveragePercent)}%`,
                  backgroundColor: isShortage ? colors.warning : colors.income,
                },
              ]}
            />
          </View>
          <Text style={styles.coverageText}>{coveragePercent}% coberto</Text>
        </View>
      </View>

      {/* GRADE DETALHADA DE COMPROMISSOS & RECURSOS */}
      <View style={styles.breakdownGrid}>
        {/* Cartão de Crédito */}
        <View style={styles.gridItem}>
          <View style={styles.gridIconRow}>
            <Ionicons name="card-outline" size={16} color={colors.warning} />
            <Text style={styles.gridItemLabel}>Fatura Cartão</Text>
          </View>
          <Text style={[styles.gridItemValue, { color: colors.warning }]}>
            {hideValues ? '••••' : formatCurrency(cardExpensesCents)}
          </Text>
        </View>

        {/* Contas Fixas Pendentes */}
        <View style={styles.gridItem}>
          <View style={styles.gridIconRow}>
            <Ionicons name="time-outline" size={16} color={colors.expense} />
            <Text style={styles.gridItemLabel}>Contas a Vencer</Text>
          </View>
          <Text style={[styles.gridItemValue, { color: colors.expense }]}>
            {hideValues ? '••••' : formatCurrency(pendingExpensesCents)}
          </Text>
        </View>

        {/* Saldo Atual em Contas */}
        <View style={styles.gridItem}>
          <View style={styles.gridIconRow}>
            <Ionicons name="wallet-outline" size={16} color={colors.primary} />
            <Text style={styles.gridItemLabel}>Saldo em Contas</Text>
          </View>
          <Text style={[styles.gridItemValue, { color: colors.primary }]}>
            {hideValues ? '••••' : formatCurrency(currentTotalBalanceCents)}
          </Text>
        </View>

        {/* Receitas a Entrar */}
        <View style={styles.gridItem}>
          <View style={styles.gridIconRow}>
            <Ionicons name="arrow-up-circle-outline" size={16} color={colors.income} />
            <Text style={styles.gridItemLabel}>Receitas a Entrar</Text>
          </View>
          <Text style={[styles.gridItemValue, { color: colors.income }]}>
            {hideValues ? '••••' : formatCurrency(pendingIncomesCents)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    padding: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primaryGhost,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  shortageBadge: {
    backgroundColor: colors.warningGhost,
    borderWidth: 1,
    borderColor: colors.warning + '44',
  },
  coveredBadge: {
    backgroundColor: colors.incomeGhost,
    borderWidth: 1,
    borderColor: colors.income + '44',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  forecastBanner: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1.5,
  },
  forecastShortage: {
    backgroundColor: colors.warningGhost,
    borderColor: colors.warning + '66',
  },
  forecastCovered: {
    backgroundColor: colors.incomeGhost,
    borderColor: colors.income + '66',
  },
  bannerTop: {
    marginBottom: 6,
  },
  bannerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 2,
  },
  bannerValue: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  bannerExplanation: {
    fontSize: 12,
    color: colors.text,
    lineHeight: 17,
    fontWeight: '600',
    marginBottom: 12,
  },
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  coverageBarBg: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  coverageBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  coverageText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  gridIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  gridItemLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  gridItemValue: {
    fontSize: 14,
    fontWeight: '800',
  },
});
