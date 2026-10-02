import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export function Badge({ title, variant = 'primary', style }) {
  const getColors = () => {
    switch (variant) {
      case 'income':
        return { bg: colors.incomeGhost, text: colors.income };
      case 'expense':
        return { bg: colors.expenseGhost, text: colors.expense };
      case 'warning':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: colors.warning };
      default:
        return { bg: colors.primaryGhost, text: colors.primary };
    }
  };

  const c = getColors();

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }, style]}>
      <Text style={[styles.text, { color: c.text }]}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
  },
});
