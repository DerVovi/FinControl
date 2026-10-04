import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from './Card';
import { formatCurrency } from '../services/api';

const CATEGORY_COLORS = [
  '#EF4444', // Red (Alimentação)
  '#F59E0B', // Amber (Transporte)
  '#3B82F6', // Blue (Moradia)
  '#10B981', // Emerald (Saúde)
  '#EC4899', // Pink (Lazer)
  '#8B5CF6', // Purple (Educação)
  '#06B6D4', // Cyan (Serviços)
  '#6366F1', // Indigo (Outros)
  '#14B8A6', // Teal
  '#F97316', // Orange
];

const CATEGORY_ICONS = {
  'Alimentação': 'restaurant',
  'Transporte': 'car',
  'Moradia': 'home',
  'Saúde': 'medkit',
  'Educação': 'book',
  'Lazer': 'film',
  'Salário': 'briefcase',
  'Freelance': 'laptop',
  'Investimentos': 'trending-up',
  'Outras Receitas': 'cash',
  'Serviços': 'construct',
  'Compras': 'cart',
};

export function CategoryPieChart({
  transactions = [],
  categories = [],
  hideValues = false,
}) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const currentMonthName = monthNames[currentMonth];

  // Filtra transações do mês corrente do tipo EXPENSE
  const monthExpenses = transactions.filter((t) => {
    if (t.type !== 'EXPENSE') return false;
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const totalExpenseCents = monthExpenses.reduce(
    (acc, t) => acc + Number(t.amountCents || 0),
    0
  );

  // Agrupa gastos por categoria
  const categoryMap = {};

  monthExpenses.forEach((t) => {
    const catId = t.categoryId || 'other';
    const amount = Number(t.amountCents || 0);

    if (!categoryMap[catId]) {
      const catObj = categories.find((c) => c.id === catId);
      const name = catObj ? catObj.name : 'Outros / Diversos';
      categoryMap[catId] = {
        id: catId,
        name,
        amountCents: 0,
        count: 0,
        icon: catObj?.icon || CATEGORY_ICONS[name] || 'pricetag',
      };
    }
    categoryMap[catId].amountCents += amount;
    categoryMap[catId].count += 1;
  });

  const categoryList = Object.values(categoryMap)
    .filter((c) => c.amountCents > 0)
    .sort((a, b) => b.amountCents - a.amountCents);

  // Atribui cores e percentuais
  const categoriesWithColors = categoryList.map((cat, idx) => {
    const assignedColor = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
    const percentage =
      totalExpenseCents > 0
        ? Math.round((cat.amountCents / totalExpenseCents) * 100)
        : 0;

    return {
      ...cat,
      color: assignedColor,
      percentage: Math.max(1, percentage),
    };
  });

  return (
    <Card style={styles.container} elevated>
      {/* HEADER PROFISSIONAL */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={styles.headerTitleBox}>
            <View style={styles.headerIconBox}>
              <Ionicons name="pie-chart" size={18} color={colors.primary} />
            </View>
            <View style={styles.titleTextCol}>
              <Text style={styles.title} numberOfLines={1}>
                Análise de Gastos
              </Text>
            </View>
          </View>

          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeLabel}>TOTAL GASTO</Text>
            <Text style={styles.totalBadgeText}>
              {hideValues ? '••••' : formatCurrency(totalExpenseCents)}
            </Text>
          </View>
        </View>

        <Text style={styles.subtitle}>
          {currentMonthName} • Distribuição por categoria de despesa
        </Text>
      </View>

      {categoriesWithColors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={42} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Nenhuma despesa registrada em {currentMonthName}.
          </Text>
          <Text style={styles.emptySub}>
            Lançamentos feitos neste mês aparecerão aqui organizados por categoria.
          </Text>
        </View>
      ) : (
        <>
          {/* VISUALIZADOR CENTRAL DE PROPORÇÕES (DONUT RING CARDS) */}
          <View style={styles.donutCard}>
            <View style={styles.donutRing}>
              <View style={styles.donutHole}>
                <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                <Text style={styles.donutHoleAmount} numberOfLines={1}>
                  {hideValues ? '••••' : formatCurrency(totalExpenseCents)}
                </Text>
                <Text style={styles.donutHoleSub}>
                  {categoriesWithColors.length} {categoriesWithColors.length === 1 ? 'categoria' : 'categorias'}
                </Text>
              </View>
            </View>

            {/* BARRA MULTI-SEGMENTADA PROPORCIONAL */}
            <View style={styles.barSection}>
              <View style={styles.segmentedBar}>
                {categoriesWithColors.map((cat, index) => {
                  const isFirst = index === 0;
                  const isLast = index === categoriesWithColors.length - 1;
                  return (
                    <View
                      key={cat.id}
                      style={[
                        styles.segment,
                        {
                          backgroundColor: cat.color,
                          flex: Math.max(1, cat.percentage),
                          borderTopLeftRadius: isFirst ? 6 : 0,
                          borderBottomLeftRadius: isFirst ? 6 : 0,
                          borderTopRightRadius: isLast ? 6 : 0,
                          borderBottomRightRadius: isLast ? 6 : 0,
                        },
                      ]}
                    />
                  );
                })}
              </View>
            </View>
          </View>

          {/* LISTA DETALHADA DAS CATEGORIAS */}
          <View style={styles.categoryList}>
            <Text style={styles.rankingHeader}>Detalhamento por Categoria</Text>
            {categoriesWithColors.map((cat) => (
              <View key={cat.id} style={styles.categoryRow}>
                <View style={styles.catLeft}>
                  <View style={[styles.colorDot, { backgroundColor: cat.color + '22' }]}>
                    <Ionicons
                      name={cat.icon || 'pricetag'}
                      size={16}
                      color={cat.color}
                    />
                  </View>
                  <View style={styles.catNameCol}>
                    <View style={styles.catNameRow}>
                      <Text style={styles.catName} numberOfLines={1}>
                        {cat.name}
                      </Text>
                      <Text style={styles.catCount}>
                        {cat.count} {cat.count === 1 ? 'lançamento' : 'lançamentos'}
                      </Text>
                    </View>
                    <View style={styles.percentageTrack}>
                      <View
                        style={[
                          styles.percentageFill,
                          {
                            width: `${Math.min(100, Math.max(4, cat.percentage))}%`,
                            backgroundColor: cat.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.catRight}>
                  <Text style={styles.catAmount} numberOfLines={1}>
                    {hideValues ? '••••' : formatCurrency(cat.amountCents)}
                  </Text>
                  <View style={[styles.percentBadge, { backgroundColor: cat.color + '20' }]}>
                    <Text style={[styles.percentText, { color: cat.color }]}>
                      {cat.percentage}%
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </Card>
  );
}

// Export alternativo para retrocompatibilidade
export const CategoryExpenseAnalysis = CategoryPieChart;

const styles = StyleSheet.create({
  container: {
    margin: 20,
    marginTop: 12,
    marginBottom: 24,
    padding: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  header: {
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  headerTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  titleTextCol: {
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
    marginTop: 2,
  },
  totalBadge: {
    backgroundColor: colors.expenseGhost,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: colors.expense + '33',
    flexShrink: 0,
  },
  totalBadgeLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.expense,
    letterSpacing: 0.5,
  },
  totalBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.expense,
  },
  donutCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  donutRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.background,
    borderWidth: 6,
    borderColor: colors.borderHighlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  donutHole: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 8,
  },
  donutHoleAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
  },
  donutHoleSub: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },
  barSection: {
    width: '100%',
  },
  segmentedBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  segment: {
    height: '100%',
    marginRight: 1,
  },
  rankingHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  categoryList: {
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 12,
  },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catNameCol: {
    flex: 1,
  },
  catNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  catName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 4,
  },
  catCount: {
    fontSize: 10,
    color: colors.textMuted,
  },
  percentageTrack: {
    width: '100%',
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  percentageFill: {
    height: '100%',
    borderRadius: 3,
  },
  catRight: {
    alignItems: 'flex-end',
    gap: 3,
    flexShrink: 0,
  },
  catAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  percentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  percentText: {
    fontSize: 10,
    fontWeight: '800',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
