import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from './Card';
import { formatCurrency } from '../services/api';

let WebView = null;
try {
  WebView = require('react-native-webview').WebView;
} catch (e) {
  WebView = null;
}

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
        icon: catObj?.icon || CATEGORY_ICONS[name] || 'pricetag',
      };
    }
    categoryMap[catId].amountCents += amount;
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

  // Gera HTML SVG para o Gráfico de Pizza / Donut
  const generatePieHtml = () => {
    let accumulatedPercent = 0;
    const circles = categoriesWithColors
      .map((cat) => {
        const percent = cat.percentage;
        const strokeDash = `${percent} ${100 - percent}`;
        const strokeOffset = 100 - accumulatedPercent + 25; // 25 gira para começar no topo (12h)
        accumulatedPercent += percent;
        return `<circle cx="21" cy="21" r="15.915" fill="none" stroke="${cat.color}" stroke-width="7" stroke-dasharray="${strokeDash}" stroke-dashoffset="${strokeOffset}" />`;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              background-color: transparent;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              overflow: hidden;
              font-family: system-ui, -apple-system, sans-serif;
            }
            svg {
              width: 180px;
              height: 180px;
            }
          </style>
        </head>
        <body>
          <svg viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="15.915" fill="#0b0f19" stroke="#1e293b" stroke-width="7" />
            ${circles}
            <circle cx="21" cy="21" r="12" fill="#0b0f19" />
            <text x="21" y="19" font-size="3.2" font-weight="bold" fill="#94a3b8" text-anchor="middle">GASTOS</text>
            <text x="21" y="24" font-size="4.2" font-weight="900" fill="#f8fafc" text-anchor="middle">100%</text>
          </svg>
        </body>
      </html>
    `;
  };

  return (
    <Card style={styles.container} elevated>
      {/* HEADER DO GRÁFICO */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerIconBox}>
            <Ionicons name="pie-chart" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={styles.title}>Gráfico de Gastos por Categoria</Text>
            <Text style={styles.subtitle}>{currentMonthName} • Distribuição de despesas</Text>
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
          <Ionicons name="stats-chart-outline" size={36} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            Nenhuma despesa registrada neste mês ainda.
          </Text>
          <Text style={styles.emptySub}>
            Lançamentos feitos neste mês aparecerão aqui no gráfico de pizza.
          </Text>
        </View>
      ) : (
        <>
          {/* GRÁFICO DE PIZZA / DONUT SVG */}
          {WebView ? (
            <View style={styles.pieContainer}>
              <WebView
                originWhitelist={['*']}
                source={{ html: generatePieHtml() }}
                style={styles.webView}
                scrollEnabled={false}
                overScrollMode="never"
                javaScriptEnabled={true}
              />
            </View>
          ) : (
            /* Fallback de Barra Segmentada Multi-Cores */
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
          )}

          {/* BARRA HORIZONTAL COMPLEMENTAR */}
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

          {/* LISTA DETALHADA DAS FATIAS DA PIZZA */}
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
                  <View style={styles.catNameCol}>
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
    margin: 20,
    marginTop: 12,
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
    fontSize: 15,
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
  pieContainer: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  webView: {
    width: 190,
    height: 190,
    backgroundColor: 'transparent',
  },
  segmentedBar: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    marginBottom: 18,
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
  catNameCol: {
    flex: 1,
  },
  catName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  percentageTrack: {
    width: '100%',
    maxWidth: 120,
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
    paddingVertical: 28,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  emptySub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
