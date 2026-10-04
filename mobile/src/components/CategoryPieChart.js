import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
  periodLabel = '',
}) {
  // Tipo de visualização escolhido pelo usuário: 'DONUT' | 'BARS' | 'CARDS'
  const [viewType, setViewType] = useState('DONUT');

  const now = new Date();
  const currentMonth = now.getMonth();
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const displayPeriod = periodLabel || monthNames[currentMonth];

  // Filtra transações do tipo EXPENSE
  const expenseTransactions = transactions.filter((t) => t.type === 'EXPENSE');

  const totalExpenseCents = expenseTransactions.reduce(
    (acc, t) => acc + Number(t.amountCents || 0),
    0
  );

  // Agrupa gastos por categoria
  const categoryMap = {};

  expenseTransactions.forEach((t) => {
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

  // Métricas auxiliares para a visão de Barras
  const topCategory = categoriesWithColors[0] || null;
  const avgPerCategoryCents =
    categoriesWithColors.length > 0
      ? Math.round(totalExpenseCents / categoriesWithColors.length)
      : 0;

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

        <Text style={styles.subtitle} numberOfLines={1}>
          {displayPeriod} • Distribuição por categoria de despesa
        </Text>
      </View>

      {/* SELETOR DO TIPO DE VISUALIZAÇÃO */}
      <View style={styles.viewTypeSwitcher}>
        {[
          { id: 'DONUT', label: 'Rosca', icon: 'radio-button-on' },
          { id: 'BARS', label: 'Barras', icon: 'bar-chart' },
          { id: 'CARDS', label: 'Cartões', icon: 'grid' },
        ].map((item) => {
          const isActive = viewType === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.viewTypeBtn, isActive && styles.viewTypeBtnActive]}
              onPress={() => setViewType(item.id)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={item.icon}
                size={14}
                color={isActive ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.viewTypeBtnText,
                  isActive && styles.viewTypeBtnTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {categoriesWithColors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="stats-chart-outline" size={42} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Nenhuma despesa registrada no período selecionado.
          </Text>
          <Text style={styles.emptySub}>
            Lançamentos feitos neste período aparecerão aqui organizados por categoria.
          </Text>
        </View>
      ) : (
        <>
          {/* VISUALIZAÇÃO 1: ROSCA & PROPORÇÕES (DONUT) */}
          {viewType === 'DONUT' && (
            <View>
              {/* Card Central Donut */}
              <View style={styles.donutCard}>
                <View style={styles.donutRing}>
                  <View style={styles.donutHole}>
                    <Ionicons name="wallet-outline" size={18} color={colors.primary} />
                    <Text style={styles.donutHoleAmount} numberOfLines={1}>
                      {hideValues ? '••••' : formatCurrency(totalExpenseCents)}
                    </Text>
                    <Text style={styles.donutHoleSub}>
                      {categoriesWithColors.length}{' '}
                      {categoriesWithColors.length === 1 ? 'categoria' : 'categorias'}
                    </Text>
                  </View>
                </View>

                {/* Barra Multi-Segmentada Proporcional */}
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

              {/* Lista Detalhada */}
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
            </View>
          )}

          {/* VISUALIZAÇÃO 2: GRÁFICO DE BARRAS (BARS) */}
          {viewType === 'BARS' && (
            <View style={styles.barsContainer}>
              {/* Mini resumo comparativo */}
              {topCategory && (
                <View style={styles.comparativeRow}>
                  <View style={styles.compMetric}>
                    <Text style={styles.compLabel}>Maior Categoria</Text>
                    <Text style={[styles.compValue, { color: topCategory.color }]} numberOfLines={1}>
                      {topCategory.name} ({topCategory.percentage}%)
                    </Text>
                  </View>
                  <View style={styles.compDivider} />
                  <View style={styles.compMetric}>
                    <Text style={styles.compLabel}>Média por Categoria</Text>
                    <Text style={styles.compValue} numberOfLines={1}>
                      {hideValues ? '••••' : formatCurrency(avgPerCategoryCents)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Barras de Categoria */}
              <View style={styles.barsList}>
                {categoriesWithColors.map((cat) => {
                  const maxAmount = categoriesWithColors[0]?.amountCents || 1;
                  const barWidthPercent = Math.max(8, Math.round((cat.amountCents / maxAmount) * 100));

                  return (
                    <View key={cat.id} style={styles.barItem}>
                      <View style={styles.barItemHeader}>
                        <View style={styles.barItemLeft}>
                          <View style={[styles.barIconDot, { backgroundColor: cat.color + '22' }]}>
                            <Ionicons name={cat.icon || 'pricetag'} size={14} color={cat.color} />
                          </View>
                          <Text style={styles.barCatName} numberOfLines={1}>
                            {cat.name}
                          </Text>
                          <Text style={styles.barCatSub}>
                            • {cat.count} {cat.count === 1 ? 'item' : 'itens'}
                          </Text>
                        </View>

                        <View style={styles.barItemRight}>
                          <Text style={styles.barCatAmount}>
                            {hideValues ? '••••' : formatCurrency(cat.amountCents)}
                          </Text>
                          <View style={[styles.percentBadge, { backgroundColor: cat.color + '22' }]}>
                            <Text style={[styles.percentText, { color: cat.color }]}>
                              {cat.percentage}%
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Barra de Progresso Larga */}
                      <View style={styles.wideBarTrack}>
                        <View
                          style={[
                            styles.wideBarFill,
                            {
                              width: `${barWidthPercent}%`,
                              backgroundColor: cat.color,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* VISUALIZAÇÃO 3: CARTÕES / GRID (CARDS) */}
          {viewType === 'CARDS' && (
            <View style={styles.cardsGrid}>
              {categoriesWithColors.map((cat) => (
                <View
                  key={cat.id}
                  style={[styles.categoryCard, { borderTopColor: cat.color }]}
                >
                  <View style={styles.categoryCardHeader}>
                    <View style={[styles.categoryCardIconBox, { backgroundColor: cat.color + '22' }]}>
                      <Ionicons name={cat.icon || 'pricetag'} size={20} color={cat.color} />
                    </View>
                    <View style={[styles.percentBadge, { backgroundColor: cat.color + '22' }]}>
                      <Text style={[styles.percentText, { color: cat.color }]}>
                        {cat.percentage}%
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.categoryCardName} numberOfLines={1}>
                    {cat.name}
                  </Text>
                  <Text style={styles.categoryCardCount}>
                    {cat.count} {cat.count === 1 ? 'lançamento' : 'lançamentos'}
                  </Text>

                  <Text style={styles.categoryCardAmount} numberOfLines={1}>
                    {hideValues ? '••••' : formatCurrency(cat.amountCents)}
                  </Text>

                  <View style={styles.cardProgressTrack}>
                    <View
                      style={[
                        styles.cardProgressFill,
                        {
                          width: `${Math.min(100, Math.max(4, cat.percentage))}%`,
                          backgroundColor: cat.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}
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
  viewTypeSwitcher: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  viewTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 7,
  },
  viewTypeBtnActive: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  viewTypeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  viewTypeBtnTextActive: {
    color: colors.primary,
    fontWeight: '800',
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
  // ESTILOS VISUALIZAÇÃO DE BARRAS
  barsContainer: {
    gap: 14,
  },
  comparativeRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  compMetric: {
    flex: 1,
    alignItems: 'center',
  },
  compDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.borderHighlight,
  },
  compLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  compValue: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  barsList: {
    gap: 14,
  },
  barItem: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  barItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  barItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  barIconDot: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barCatName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  barCatSub: {
    fontSize: 10,
    color: colors.textMuted,
  },
  barItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  barCatAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  wideBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  wideBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  // ESTILOS VISUALIZAÇÃO DE CARTÕES / GRID
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryCard: {
    width: '48%',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderHighlight,
    borderTopWidth: 4,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryCardIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCardName: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  categoryCardCount: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 8,
  },
  categoryCardAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.text,
    marginBottom: 8,
  },
  cardProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  cardProgressFill: {
    height: '100%',
    borderRadius: 2,
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
