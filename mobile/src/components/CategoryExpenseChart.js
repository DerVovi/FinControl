import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from './Card';
import { formatCurrency } from '../services/api';

const DEFAULT_CATEGORY_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
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

export function CategoryExpenseChart({
  transactions = [],
  categories = [],
  hideValues = false,
}) {
  // Filtra transações do mês corrente do tipo EXPENSE
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

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
        icon: catObj?.icon || CATEGORY_ICONS[name] || 'pricetag',
      };
    }
    categoryMap[catId].amountCents += amount;
  });

  // Converte em array e ordena do maior para o menor gasto
  const categoryList = Object.values(categoryMap)
    .filter((c) => c.amountCents > 0)
    .sort((a, b) => b.amountCents - a.amountCents);

  // Atribui cores distintas para cada categoria
  const categoriesWithColors = categoryList.map((cat, idx) => {
    const assignedColor =
      DEFAULT_CATEGORY_COLORS[idx % DEFAULT_CATEGORY_COLORS.length];
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
      {/* HEADER DA SEÇÃO */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <Ionicons name="pie-chart" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.title}>Onde o Dinheiro Está Indo</Text>
            <Text style={styles.subtitle}>Distribuição de gastos por categoria</Text>
          </View>
        </View>

        <View style={styles.totalBadge}>
          <Text style={styles.totalBadgeText}>
            {hideValues ? '••••' : formatCurrency(totalExpenseCents)}
          </Text>
        </View>
      </View>

      {categoriesWithColors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Nenhuma despesa registrada neste mês ainda.
          </Text>
          <Text style={styles.emptySub}>
            Conforme você registrar gastos, o gráfico de distribuição aparecerá aqui.
          </Text>
        </View>
      ) : (
        <>
          {/* BARRA SEGMENTADA MULTI-CORES (GRÁFICO HORIZONTAL) */}
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
                      flex: cat.amountCents,
                      borderTopLeftRadius: isFirst ? 8 : 0,
                      borderBottomLeftRadius: isFirst ? 8 : 0,
                      borderTopRightRadius: isLast ? 8 : 0,
                      borderBottomRightRadius: isLast ? 8 : 0,
                    },
                  ]}
                />
              );
            })}
          </View>

          {/* LISTA DE CATEGORIAS COM CORES E PERCENTUAIS */}
          <View style={styles.categoryList}>
            {categoriesWithColors.map((cat) => (
              <View key={cat.id} style={styles.categoryRow}>
                <View style={styles.catLeft}>
                  <View style={[styles.colorDot, { backgroundColor: cat.color }]}>
                    <Ionicons
                      name={CATEGORY_ICONS[cat.name] || 'pricetag'}
                      size={12}
                      color="#FFFFFF"
                    />
                  </View>
                  <View>
                    <Text style={styles.catName} numberOfLines={1}>
                      {cat.name}
                    </Text>
                    <View style={styles.percentageTrack}>
                      <View
                        style={[
                          styles.percentageFill,
                          {
                            width: `${Math.min(100, cat.percentage)}%`,
                            backgroundColor: cat.color,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.catRight}>
                  <Text style={styles.catAmount}>
                    {hideValues ? '••••' : formatCurrency(cat.amountCents)}
                  </Text>
                  <View style={[styles.percentBadge, { backgroundColor: cat.color + '22' }]}>
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
  totalBadge: {
    backgroundColor: colors.expenseGhost,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.expense,
  },
  segmentedBar: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  segment: {
    height: '100%',
  },
  categoryList: {
    gap: 12,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  catLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  colorDot: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  percentageTrack: {
    width: 110,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
  },
  percentageFill: {
    height: '100%',
    borderRadius: 2,
  },
  catRight: {
    alignItems: 'flex-end',
    gap: 2,
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
    paddingVertical: 24,
    gap: 6,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  emptySub: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});
