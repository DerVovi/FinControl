import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export function Header({ user, onLogout }) {
  const topPadding = StatusBar.currentHeight ? StatusBar.currentHeight + 8 : 40;

  return (
    <View style={[styles.header, { paddingTop: topPadding }]}>
      <View style={styles.brandRow}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>🛡️</Text>
        </View>
        <View>
          <Text style={styles.title}>FinControl</Text>
          <View style={styles.statusRow}>
            <View style={styles.dot} />
            <Text style={styles.subtitle}>Supabase Nuvem Ativa</Text>
          </View>
        </View>
      </View>

      {user && (
        <View style={styles.userActions}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user.fullName || user.email || 'U')[0].toUpperCase()}
            </Text>
          </View>
          {onLogout && (
            <TouchableOpacity
              onPress={onLogout}
              style={styles.logoutBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderHighlight,
  },
  logoIcon: {
    fontSize: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: 0.3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primaryGhost,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 14,
  },
  logoutBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
  },
});
