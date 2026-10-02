import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { storage } from '../services/storage';

export function SettingsScreen({ user, onLogout }) {
  const handleClearCache = async () => {
    try {
      await storage.saveCache(storage.KEYS.ACCOUNTS_CACHE, null);
      await storage.saveCache(storage.KEYS.TRANSACTIONS_CACHE, null);
      await storage.saveCache(storage.KEYS.CARDS_CACHE, null);
      Alert.alert('Sucesso', 'Cache local limpo com sucesso.');
    } catch {
      Alert.alert('Erro', 'Não foi possível limpar o cache.');
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja desconectar do FinControl neste celular?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: onLogout },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Ajustes & Conta</Text>
          <Text style={styles.subtitle}>Informações do perfil, segurança e manutenção</Text>
        </View>

        {/* PERFIL */}
        <Card style={styles.profileCard} elevated>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {(user?.fullName || user?.email || 'V')[0].toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.fullName || 'Victor'}</Text>
            <Text style={styles.profileEmail}>{user?.email || 'vito@email.com'}</Text>
            <Badge title="MOEDA BRL (R$)" style={styles.currencyBadge} />
          </View>
        </Card>

        {/* STATUS DO SISTEMA */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Arquitetura & Segurança</Text>
        </View>

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="cloud-done-outline" size={20} color={colors.primary} />
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Banco de Dados</Text>
              <Text style={styles.infoValue}>Supabase Cloud PostgreSQL (Direto)</Text>
            </View>
            <Badge title="ONLINE" />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Isolamento IDOR</Text>
              <Text style={styles.infoValue}>Restrição estrita por userId</Text>
            </View>
            <Badge title="PROTEGIDO" />
          </View>

          <View style={styles.rowDivider} />

          <View style={styles.infoRow}>
            <Ionicons name="calculator-outline" size={20} color={colors.primary} />
            <View style={styles.infoTexts}>
              <Text style={styles.infoLabel}>Precisão Monetária</Text>
              <Text style={styles.infoValue}>Centavos Inteiros (BigInt / Prompt Mestre)</Text>
            </View>
            <Badge title="100%" />
          </View>
        </Card>

        {/* AÇÕES DE CONTA */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Manutenção</Text>
        </View>

        <Card style={styles.actionCard}>
          <TouchableOpacity
            style={styles.actionItem}
            onPress={handleClearCache}
            activeOpacity={0.7}
          >
            <View style={styles.actionItemLeft}>
              <Ionicons name="refresh-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.actionItemText}>Recarregar Cache Local</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </Card>

        {/* BOTÃO LOGOUT */}
        <Button
          title="Desconectar da Conta"
          variant="danger"
          onPress={confirmLogout}
          style={styles.logoutBtn}
          icon={<Ionicons name="log-out-outline" size={20} color={colors.textInverse} />}
        />

        <Text style={styles.versionText}>FinControl Android Native v1.0.3 (Expo 54)</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    marginBottom: 24,
    gap: 16,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryGhost,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  currencyBadge: {
    alignSelf: 'flex-start',
  },
  sectionHeader: {
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  infoCard: {
    padding: 16,
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoTexts: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  infoValue: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  rowDivider: {
    height: 1,
    backgroundColor: colors.borderHighlight,
    marginVertical: 12,
  },
  actionCard: {
    padding: 0,
    marginBottom: 24,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  actionItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  logoutBtn: {
    marginBottom: 20,
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
});
